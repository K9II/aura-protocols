import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ownerStaff, assistantStaff } from "../helpers/staff";

const m = vi.hoisted(() => ({
  requirePermission: vi.fn(), getWholesaleSettings: vi.fn(), listRuns: vi.fn(), runLines: vi.fn(), runOrders: vi.fn(), getRun: vi.fn(),
  runEvents: vi.fn(), draftLotsFor: vi.fn(), lotById: vi.fn(), notFound: vi.fn(() => { throw new Error("NOT_FOUND"); }),
}));
vi.mock("@/lib/dal", () => ({ requirePermission: m.requirePermission }));
vi.mock("@/lib/wholesale/data", () => ({ getWholesaleSettings: m.getWholesaleSettings }));
vi.mock("@/lib/wholesale/runs-data", () => ({ listRuns: m.listRuns, runLines: m.runLines, runOrders: m.runOrders, getRun: m.getRun, runEvents: m.runEvents, draftLotsFor: m.draftLotsFor }));
vi.mock("@/lib/catalog-ops/data", () => ({ lotById: m.lotById }));
vi.mock("@/lib/clock", () => ({ currentMs: () => Date.parse("2026-10-30T16:00:00Z") }));
vi.mock("next/navigation", () => ({ notFound: m.notFound, useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/app/admin/wholesale/actions", () => ({
  recordLineOrderAction: vi.fn(), linkLotAction: vi.fn(), passLineAction: vi.fn(), failLineAction: vi.fn(), resourceLineAction: vi.fn(),
  saveRunNotesAction: vi.fn(), cancelDepositAction: vi.fn(), saveWholesaleSettingsAction: vi.fn(),
}));

const RUN = "11111111-1111-4111-8111-111111111111";
const settings = { open: false, tiers: [{ minKits: 5, pct: 20 }, { minKits: 10, pct: 25 }, { minKits: 20, pct: 30 }], depositPct: 40, balanceDays: 7, runDays: 14, leadDays: 28, nextCutoffOverride: null, minKits: 5 };
const run = { id: RUN, number: "R-1002", cutoff_on: "2026-10-05", notes: "Claim filed with Uther", created_at: "x" };
const order = (o: Record<string, unknown> = {}) => ({ id: "o1", order_number: "AP-1050", status: "deposit_paid", email: "d@h.org", ship_name: "Dana Whitfield", customer_id: "c1",
  deposit_cents: 314560, balance_cents: 472490, total_cents: 787050, balance_due_at: null, balance_session_id: null, created_at: "x", wholesale_cutoff_on: "2026-10-05",
  items: [{ compound_slug: "bpc-157", variant_id: "10mg", quantity: 5 }, { compound_slug: "retatrutide", variant_id: "10mg", quantity: 3 }], ...o });
const line = (o: Record<string, unknown> = {}) => ({ id: "l1", slug: "bpc-157", variant_id: "10mg", kits_ordered: 5, extra_boxes: 2, supplier: "LKZ", cost_cents: 114000, supplier_ref: "PO-LKZ-0412",
  ordered_at: "x", lot_id: "lot1", result: "pending", result_at: null, fail_note: null, ...o });

describe("Admin → Wholesale pages", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const f of Object.values(m)) if (f !== m.notFound) f.mockReset();
    m.requirePermission.mockResolvedValue(ownerStaff());
    m.getWholesaleSettings.mockResolvedValue(settings);
    m.listRuns.mockResolvedValue([run]);
    m.getRun.mockResolvedValue(run);
    m.runEvents.mockResolvedValue([]);
    m.draftLotsFor.mockResolvedValue([]);
    m.lotById.mockResolvedValue({ lot_number: "BPC-2611A", coa_path: "x.pdf", held: 0 });
  });

  it("list: the collecting run on top, every run with its derived status and next step", async () => {
    m.runOrders.mockResolvedValue([order(), order({ id: "o2", order_number: "AP-1056", wholesale_cutoff_on: "2026-11-02", items: [{ compound_slug: "tb-500", variant_id: "10mg", quantity: 7 }] })]);
    m.runLines.mockResolvedValue([line({ result: "failed", fail_note: "Purity 91%" }), line({ id: "l2", slug: "retatrutide", lot_id: null })]);
    const { default: Page } = await import("@/app/admin/wholesale/page");
    const { container } = render(await Page());
    expect(m.requirePermission).toHaveBeenCalledWith("wholesale.view");
    expect(container.textContent).toMatch(/Wholesale ordering is off/);
    expect(container.textContent).toMatch(/order by Nov 2/);
    expect(container.textContent).toMatch(/TB-500 10 mg/);
    expect(container.textContent).toMatch(/Lot failed: BPC-157 10 mg — re-source/);
    expect(screen.getAllByText("In production").length).toBeGreaterThan(0);
  });

  it("run page: stage buttons for the owner (record, pass/fail), APro designation with the scientific name, notes", async () => {
    m.runOrders.mockResolvedValue([order()]);
    m.runLines.mockResolvedValue([line()]);
    const { default: Page } = await import("@/app/admin/wholesale/runs/[id]/page");
    const { container } = render(await Page({ params: Promise.resolve({ id: RUN }) }));
    expect(container.textContent).toMatch(/Run R-1002/);
    expect(screen.getByText("APro-G3RT")).toBeTruthy();
    expect(container.textContent).toMatch(/Retatrutide · 10 mg/);
    expect(screen.getByRole("button", { name: "Record order" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Pass" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Fail…" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancel deposit…" })).toBeTruthy();
    expect(container.textContent).toMatch(/1 of 2 suppliers · LKZ/);
    expect(screen.getByDisplayValue("Claim filed with Uther")).toBeTruthy();
  });

  it("run page: the Assistant sees everything and no controls", async () => {
    m.requirePermission.mockResolvedValue(assistantStaff());
    m.runOrders.mockResolvedValue([order()]);
    m.runLines.mockResolvedValue([line()]);
    const { default: Page } = await import("@/app/admin/wholesale/runs/[id]/page");
    const { container } = render(await Page({ params: Promise.resolve({ id: RUN }) }));
    expect(container.textContent).toMatch(/BPC-2611A/);
    expect(screen.queryByRole("button", { name: "Pass" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Record order" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Cancel deposit…" })).toBeNull();
  });

  it("run page: a re-sourced line shows the kits the run needs now, with Record order", async () => {
    m.runOrders.mockResolvedValue([order({ items: [{ compound_slug: "bpc-157", variant_id: "10mg", quantity: 5 }] })]);
    m.runLines.mockResolvedValue([line({ kits_ordered: 10, ordered_at: null, lot_id: null })]);
    const { default: Page } = await import("@/app/admin/wholesale/runs/[id]/page");
    const { container } = render(await Page({ params: Promise.resolve({ id: RUN }) }));
    const row = [...container.querySelectorAll("tbody tr")].find((r) => r.textContent?.includes("BPC-157"))!;
    expect(row.querySelectorAll("td")[1].textContent).toBe("5");
    expect(screen.getByRole("button", { name: "Record order" })).toBeTruthy();
  });

  it("run page: an unknown run is a 404", async () => {
    m.getRun.mockResolvedValue(null);
    const { default: Page } = await import("@/app/admin/wholesale/runs/[id]/page");
    await expect(Page({ params: Promise.resolve({ id: RUN }) })).rejects.toThrow("NOT_FOUND");
  });

  it("settings: the owner gets the form; the Assistant sees the values", async () => {
    const { default: Page } = await import("@/app/admin/wholesale/settings/page");
    render(await Page());
    expect(screen.getByRole("button", { name: "Save settings" })).toBeTruthy();
    m.requirePermission.mockResolvedValue(assistantStaff());
    const { container } = render(await Page());
    expect(container.textContent).toMatch(/5–9 kits 20% · 10–19 kits 25% · 20\+ kits 30%/);
  });
});
