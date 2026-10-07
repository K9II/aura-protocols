import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { alertsSection, lotsSection, ordersSection, SLOT_INFO, SLOT_KEYS, type Slot, type SlotKey, type TodoSection } from "@/lib/today/todos";
import { numbersView } from "@/lib/today/numbers";
import { periodRanges } from "@/lib/today/periods";

const m = vi.hoisted(() => ({ requireOwner: vi.fn(), loadTodos: vi.fn(), loadNumbers: vi.fn() }));
vi.mock("@/lib/dal", () => ({ requireOwner: m.requireOwner }));
vi.mock("@/lib/today/today", () => ({ loadTodos: m.loadTodos, loadNumbers: m.loadNumbers }));
vi.mock("@/lib/clock", () => ({ currentMs: () => Date.parse("2026-10-06T15:42:00Z") }));
vi.mock("@/app/admin/actions", () => ({ resolveAlertAction: vi.fn() }));
vi.mock("@/app/admin/email/actions", () => ({ announceAction: vi.fn() }));
vi.mock("@/app/admin/disputes/actions", () => ({ refundEarlyWarningAction: vi.fn(), watchEarlyWarningAction: vi.fn() }));
import TodayPage from "@/app/admin/page";

const NOW = Date.parse("2026-10-06T15:42:00Z");
const slots = (o: Partial<Record<SlotKey, TodoSection[] | null>> = {}): Slot[] =>
  SLOT_KEYS.map((key) => ({ key, ...SLOT_INFO[key], sections: key in o ? o[key]! : [] }));
const order = (n: number, paid: string) => ({ order_number: `AP-10${n}`, ship_name: `Customer ${n}`, total_cents: 41200, paid_at: paid, created_at: paid, items: 3 });
const summary = (o: Record<string, unknown> = {}) => ({
  salesCents: 0, orders: 0, chargedCents: 0, shippingCents: 0, taxCents: 0, refundedCents: 0, refundedOrders: 0,
  firstTimeOrders: 0, repeatOrders: 0, newAccounts: 0, buckets: [], top: [], ...o,
});
const view = numbersView("today", periodRanges("today", NOW), summary({ salesCents: 134650, orders: 5, chargedCents: 143118, shippingCents: 2750, taxCents: 5718 }), summary({ salesCents: 110369, orders: 3 }), NOW);
const props = (p?: string) => ({ searchParams: Promise.resolve(p ? { p } : {}) });

describe("/admin (Today)", () => {
  beforeEach(() => {
    for (const f of Object.values(m)) f.mockReset();
    m.requireOwner.mockResolvedValue({ id: "owner1" });
    m.loadNumbers.mockResolvedValue({ ok: true, view });
  });

  it("is owner-only", async () => {
    m.requireOwner.mockRejectedValue(new Error("NOT_FOUND"));
    await expect(TodayPage(props())).rejects.toThrow("NOT_FOUND");
  });

  it("a busy day: alerts with Done, orders capped with 'and 1 more', Announce, numbers with the period switch", async () => {
    m.loadTodos.mockResolvedValue(slots({
      alerts: [alertsSection([{ id: "0b6f1c2e-1111-4222-8333-944455556666", title: "Shipped lots don't match what was held", detail: "AP-1042 · line i1", count: 1, first_at: "2026-10-06T14:15:00Z", last_at: "2026-10-06T14:15:00Z", resolved_at: null, resolved_by_name: null, note: null }], NOW)!],
      orders: [ordersSection([38, 40, 41, 42, 43, 44].map((n, i) => order(n, `2026-10-0${i < 1 ? 1 : 5}T1${i}:00:00Z`)), NOW)!],
      catalog: [lotsSection([], () => "", [{ compoundName: "Semaglutide", slug: "semaglutide", strengths: "5 mg", lot: "AP-SEM-2609", purityPct: 99.2, method: "HPLC+MS", testedOn: "2026-09-30", coaFile: "/coa/a.pdf" }])!],
    }));
    render(await TodayPage(props()));
    expect(screen.getByRole("heading", { level: 1, name: "Today" })).toBeInTheDocument();
    expect(screen.getByText("Tuesday, Oct 6 · shop time (Mountain) · 9:42 am")).toBeInTheDocument();

    const alerts = screen.getByRole("region", { name: "Alerts" });
    expect(within(alerts).getByRole("button", { name: "Done" })).toBeInTheDocument();
    expect(within(alerts).getByRole("link", { name: "Past alerts" })).toHaveAttribute("href", "/admin/alerts");

    const orders = screen.getByRole("region", { name: "Orders to ship" });
    expect(within(orders).getAllByRole("link", { name: "Pick list" })).toHaveLength(5);
    expect(within(orders).getByRole("link", { name: "and 1 more →" })).toHaveAttribute("href", "/admin/orders");
    expect(within(orders).getByRole("link", { name: "AP-1038" })).toHaveAttribute("href", "/admin/orders/AP-1038");

    expect(within(screen.getByRole("region", { name: "Lots" })).getByRole("button", { name: "Announce" })).toBeInTheDocument();

    const nums = screen.getByRole("region", { name: "Numbers" });
    expect(within(nums).getByText("$1,346.50")).toBeInTheDocument();
    expect(within(nums).getByRole("link", { name: /7 days/ })).toHaveAttribute("href", "/admin?p=7d");
    expect(within(nums).getByRole("link", { name: /^Today/ })).toHaveAttribute("aria-current", "page");
    expect(screen.queryByText(/All/, { selector: ".big" })).toBeNull();
    expect(m.loadNumbers).toHaveBeenCalledWith("today");
  });

  it("all clear when every section loaded and none has anything", async () => {
    m.loadTodos.mockResolvedValue(slots());
    render(await TodayPage(props("30d")));
    expect(screen.getByText(/No alerts, nothing to ship/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Past alerts" })).toHaveAttribute("href", "/admin/alerts");
    expect(m.loadNumbers).toHaveBeenCalledWith("30d");
  });

  it("a section that couldn't load says so in place (never zeros), and so do the numbers; no All clear", async () => {
    m.loadTodos.mockResolvedValue(slots({ catalog: null }));
    m.loadNumbers.mockResolvedValue({ ok: false });
    render(await TodayPage(props("7d")));
    const messages = screen.getAllByRole("alert").map((a) => a.textContent);
    expect(messages).toContain("Couldn't load stock and lots. The rest of the page is current.Reload");
    expect(messages).toContain("Couldn't load the numbers.Reload");
    expect(screen.getAllByRole("link", { name: "Reload" })[0]).toHaveAttribute("href", "/admin?p=7d");
    expect(screen.queryByText(/No alerts, nothing to ship/)).toBeNull();
  });
});
