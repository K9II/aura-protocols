import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const m = vi.hoisted(() => ({
  requirePermission: vi.fn(async () => (await import("../helpers/staff")).ownerStaff()),
  searchRecipients: vi.fn(), recipient: vi.fn(), stockOptions: vi.fn(), monthTotal: vi.fn(), saleOrders: vi.fn(),
  notFound: vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }),
}));
vi.mock("@/lib/dal", () => ({ requirePermission: m.requirePermission }));
vi.mock("@/lib/no-charge/data", () => ({ searchRecipients: m.searchRecipients, recipient: m.recipient, stockOptions: m.stockOptions, monthTotal: m.monthTotal, saleOrders: m.saleOrders }));
vi.mock("@/lib/clock", () => ({ currentMs: () => Date.parse("2026-10-06T18:00:00Z") }));
vi.mock("next/navigation", () => ({ notFound: m.notFound }));
vi.mock("@/components/admin/orders/NoChargeForm", () => ({
  default: ({ customer, stock, originals, month, submitKey, recipientCard }: { customer: { id: string }; stock: unknown[]; originals: unknown[]; month: { orders: number }; submitKey: string; recipientCard: React.ReactNode }) =>
    <>{recipientCard}<div data-testid="nc-form" data-key={submitKey}>form for {customer.id} · {stock.length} options · {originals.length} originals · {month.orders} this month</div></>,
}));
import NewNoChargePage from "@/app/admin/orders/new/page";

const ship = { name: "Dana Whitfield", line1: "418 E Speedway Blvd", line2: null, city: "Tucson", state: "AZ", zip: "85705" };
const C1 = "11111111-1111-4111-8111-111111111111";
const dana = { id: C1, name: "Dana Whitfield", email: "dana.w@example.com", verified: true, blocked: false, agreedAt: "2026-09-01T00:00:00Z", ship };
const sp = (o: Record<string, string>) => ({ searchParams: Promise.resolve(o) });

describe("/admin/orders/new", () => {
  beforeEach(() => {
    m.searchRecipients.mockReset(); m.recipient.mockReset();
    m.searchRecipients.mockResolvedValue([{ id: C1, name: "Dana Whitfield", email: "dana.w@example.com", verified: true, orders: 3 }]);
    m.recipient.mockResolvedValue(dana);
    m.stockOptions.mockResolvedValue([{ slug: "bpc-157", variantId: "10mg", name: "BPC-157", strength: "10 mg", priceCents: 4800, available: 84, hidden: false }]);
    m.monthTotal.mockResolvedValue({ orders: 4, retailCents: 61_200 });
    m.saleOrders.mockResolvedValue([{ number: "AP-1052", createdAt: "2026-10-01T18:00:00Z" }, { number: "AP-1040", createdAt: "2026-09-20T18:00:00Z" }, { number: "AP-1031", createdAt: "2026-09-10T18:00:00Z" }]);
  });

  it("requires orders.no_charge", async () => {
    m.requirePermission.mockRejectedValueOnce(new Error("NOT_FOUND"));
    await expect(NewNoChargePage(sp({}))).rejects.toThrow("NOT_FOUND");
    expect(m.requirePermission).toHaveBeenLastCalledWith("orders.no_charge");
  });

  it("without a customer shows only the search step", async () => {
    render(await NewNoChargePage(sp({})));
    expect(screen.getByRole("heading", { level: 1, name: "New no-charge order" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Recipient" })).toBeInTheDocument();
    const box = screen.getByRole("searchbox", { name: "Search accounts" });
    expect(box.closest("form")).toHaveAttribute("action", "/admin/orders/new");
    expect(box).toHaveAttribute("name", "q");
    expect(m.searchRecipients).not.toHaveBeenCalled();
    expect(screen.queryByTestId("nc-form")).toBeNull();
    expect(screen.queryByRole("heading", { name: "Reason" })).toBeNull();
  });

  it("with q lists matches, each with Choose", async () => {
    render(await NewNoChargePage(sp({ q: " dana " })));
    expect(m.searchRecipients).toHaveBeenCalledWith("dana");
    expect(screen.getByText("Dana Whitfield")).toBeInTheDocument();
    expect(screen.getByText(/dana\.w@example\.com · 3 orders/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Choose" })).toHaveAttribute("href", `/admin/orders/new?customer=${C1}`);
    expect(screen.queryByTestId("nc-form")).toBeNull();
  });

  it("says when nothing matches", async () => {
    m.searchRecipients.mockResolvedValue([]);
    render(await NewNoChargePage(sp({ q: "zed" })));
    expect(screen.getByText(/No accounts match/)).toBeInTheDocument();
  });

  it("with a customer shows the recipient card and the form", async () => {
    render(await NewNoChargePage(sp({ customer: C1 })));
    expect(m.recipient).toHaveBeenCalledWith(C1);
    expect(m.saleOrders).toHaveBeenCalledWith(C1);
    expect(screen.getByText("Dana Whitfield").closest(".a-pick")).toHaveTextContent("dana.w@example.com · 3 orders · Verified");
    expect(screen.getByRole("link", { name: "Change" })).toHaveAttribute("href", "/admin/orders/new");
    expect(screen.getByTestId("nc-form")).toHaveTextContent(`form for ${C1} · 1 options · 3 originals · 4 this month`);
    // A fresh one-time key per render (a double submit of one render can't make two orders).
    expect(screen.getByTestId("nc-form").dataset.key).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("404s an unknown customer id", async () => {
    m.recipient.mockResolvedValue(null);
    await expect(NewNoChargePage(sp({ customer: "nope" }))).rejects.toThrow("NEXT_NOT_FOUND");
    expect(m.recipient).not.toHaveBeenCalled();
    await expect(NewNoChargePage(sp({ customer: "00000000-0000-4000-8000-000000000000" }))).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("refuses a blocked account (no form)", async () => {
    m.recipient.mockResolvedValue({ ...dana, blocked: true });
    render(await NewNoChargePage(sp({ customer: C1 })));
    expect(screen.getByText(/can't receive orders/)).toBeInTheDocument();
    expect(screen.queryByTestId("nc-form")).toBeNull();
  });
});
