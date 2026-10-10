import { describe, it, expect, vi, beforeEach } from "vitest";

const m = vi.hoisted(() => ({
  requirePermission: vi.fn(), alertOwner: vi.fn(), sendOrAlert: vi.fn(), catalogStockChanged: vi.fn(), revalidatePath: vi.fn(),
  getOrderById: vi.fn(), stampWholesaleCancel: vi.fn(), transitionOrder: vi.fn(), refundCard: vi.fn(), lotById: vi.fn(), variantRow: vi.fn(),
  draftLotsFor: vi.fn(), failLine: vi.fn(), fillLotCostFromLine: vi.fn(), getRun: vi.fn(), lineById: vi.fn(), linkLot: vi.fn(), logEvent: vi.fn(), passLine: vi.fn(),
  recordLineOrder: vi.fn(), resourceLine: vi.fn(), runByCutoff: vi.fn(), runLines: vi.fn(), runOrders: vi.fn(), saveRunNotes: vi.fn(),
  afterLineFailed: vi.fn(), releaseReadyOrders: vi.fn(), saveWholesaleSettings: vi.fn(),
}));
vi.mock("@/lib/dal", () => ({ requirePermission: m.requirePermission }));
vi.mock("@/lib/notify", () => ({ alertOwner: m.alertOwner, sendOrAlert: m.sendOrAlert }));
vi.mock("@/lib/catalog-live", () => ({ catalogStockChanged: m.catalogStockChanged }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));
vi.mock("@/lib/orders", () => ({ getOrderById: m.getOrderById, stampWholesaleCancel: m.stampWholesaleCancel, transitionOrder: m.transitionOrder }));
vi.mock("@/lib/refunds/stripe", () => ({ refundCard: m.refundCard }));
vi.mock("@/lib/catalog-ops/data", () => ({ lotDefaults: async () => ({ testCents: 25000, inboundPerBoxCents: 1500, labelPerVialCents: 40 }), lotById: m.lotById, variantRow: m.variantRow }));
vi.mock("@/lib/wholesale/runs-data", () => ({
  draftLotsFor: m.draftLotsFor, failLine: m.failLine, fillLotCostFromLine: m.fillLotCostFromLine, getRun: m.getRun, lineById: m.lineById, linkLot: m.linkLot, logEvent: m.logEvent, passLine: m.passLine,
  recordLineOrder: m.recordLineOrder, resourceLine: m.resourceLine, runByCutoff: m.runByCutoff, runLines: m.runLines, runOrders: m.runOrders, saveRunNotes: m.saveRunNotes,
}));
vi.mock("@/lib/wholesale/balance", () => ({ afterLineFailed: m.afterLineFailed, releaseReadyOrders: m.releaseReadyOrders }));
vi.mock("@/lib/wholesale/data", () => ({ saveWholesaleSettings: m.saveWholesaleSettings }));
vi.mock("@/lib/clock", () => ({ currentMs: () => Date.parse("2026-10-09T18:00:00Z") }));

const RUN = "11111111-1111-4111-8111-111111111111", LINE = "22222222-2222-4222-8222-222222222222", LOT = "33333333-3333-4333-8333-333333333333", ORDER = "44444444-4444-4444-8444-444444444444";
const fd = (o: Record<string, string>) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.set(k, v); return f; };
const run = { id: RUN, number: "R-1002", cutoff_on: "2026-10-05", notes: "", created_at: "x" };
const line = (o: Record<string, unknown> = {}) => ({ id: LINE, run_id: RUN, slug: "bpc-157", variant_id: "10mg", kits_ordered: 10, extra_boxes: 0, supplier: "LKZ", cost_cents: 1, supplier_ref: null,
  ordered_at: "x", lot_id: LOT, result: "pending", result_at: null, fail_note: null, ...o });
const deposit = (o: Record<string, unknown> = {}) => ({ id: ORDER, order_number: "AP-1053", channel: "wholesale", status: "deposit_paid", email: "t@k.org",
  deposit_payment_intent: "pi_d", deposit_cents: 120000, wholesale_cutoff_on: "2026-10-05", stripe_refund_id: null, order_items: [], ...o });

describe("Admin → Wholesale actions", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const f of Object.values(m)) f.mockReset();
    m.requirePermission.mockResolvedValue({ id: "owner" });
    m.getRun.mockResolvedValue(run);
    m.variantRow.mockResolvedValue({ strength: "10 mg", shown: true, archived_at: null });
    m.sendOrAlert.mockResolvedValue(true);
  });

  it("record order: owner only; kits from the run's orders; a third supplier is refused", async () => {
    m.runLines.mockResolvedValue([line({ id: "a", supplier: "LKZ" }), line({ id: "b", slug: "tb-500", supplier: "Uther" })]);
    m.runOrders.mockResolvedValue([{ id: "o1", status: "deposit_paid", items: [{ compound_slug: "kpv", variant_id: "10mg", quantity: 6 }] }]);
    const { recordLineOrderAction } = await import("@/app/admin/wholesale/actions");
    const base = { runId: RUN, slug: "kpv", variantId: "10mg", extraBoxes: "1", cost: "440", ref: "PO-1" };
    expect(await recordLineOrderAction(null, fd({ ...base, supplier: "Nana" }))).toEqual({ fieldErrors: { supplier: "A run uses at most 2 suppliers." } });
    expect(await recordLineOrderAction(null, fd({ ...base, supplier: "LKZ" }))).toEqual({ ok: "Order recorded." });
    expect(m.requirePermission).toHaveBeenCalledWith("wholesale.manage");
    expect(m.recordLineOrder).toHaveBeenCalledWith({ runId: RUN, slug: "kpv", variantId: "10mg", kits: 6, extraBoxes: 1, supplier: "LKZ", costCents: 44000, ref: "PO-1" }, "owner");
  });

  it("link lot: only a draft lot of that strength", async () => {
    m.lineById.mockResolvedValue(line({ lot_id: null }));
    m.draftLotsFor.mockResolvedValue([{ id: LOT }]);
    m.linkLot.mockResolvedValue(true);
    const { linkLotAction } = await import("@/app/admin/wholesale/actions");
    expect((await linkLotAction(null, fd({ lineId: LINE, lotId: "55555555-5555-4555-8555-555555555555" })))?.fieldErrors?.lotId).toBeTruthy();
    expect((await linkLotAction(null, fd({ lineId: LINE, lotId: LOT })))?.ok).toMatch(/Lot linked/);
    expect(m.linkLot).toHaveBeenCalledWith(LINE, LOT, "owner");
    expect(m.fillLotCostFromLine).toHaveBeenCalledWith(LOT, expect.objectContaining({ id: LINE }), { testCents: 25000, inboundPerBoxCents: 1500, labelPerVialCents: 40 });
  });

  it("pass: a refusal is explained; a pass refreshes stock, alerts a short lot and releases ready orders", async () => {
    m.lineById.mockResolvedValue(line());
    const { passLineAction } = await import("@/app/admin/wholesale/actions");
    m.passLine.mockResolvedValueOnce({ ok: false, reason: "no_certificate" });
    expect((await passLineAction(null, fd({ lineId: LINE })))?.error).toMatch(/certificate first/);
    m.passLine.mockResolvedValueOnce({ ok: true, held: 2, short: ["AP-1060"] });
    m.lotById.mockResolvedValue({ lot_number: "BPC-2611A" });
    m.releaseReadyOrders.mockResolvedValue(["AP-1051"]);
    expect((await passLineAction(null, fd({ lineId: LINE })))?.ok).toBe("Passed — held for 2 order lines; 1 order now owes the balance.");
    expect(m.catalogStockChanged).toHaveBeenCalled();
    expect(m.alertOwner).toHaveBeenCalledWith("Wholesale lot short", expect.stringContaining("AP-1060"));
    expect(m.releaseReadyOrders).toHaveBeenCalledWith(run);
  });

  it("fail: a note is required; buyers with that strength are emailed", async () => {
    m.lineById.mockResolvedValue(line());
    const { failLineAction } = await import("@/app/admin/wholesale/actions");
    expect((await failLineAction(null, fd({ lineId: LINE, note: "" })))?.fieldErrors?.note).toBeTruthy();
    m.failLine.mockResolvedValue(RUN);
    m.afterLineFailed.mockResolvedValue(1);
    expect((await failLineAction(null, fd({ lineId: LINE, note: "Purity 91%" })))?.ok).toBe("Marked failed — 1 buyer emailed.");
    expect(m.afterLineFailed).toHaveBeenCalledWith(run, { id: LINE, slug: "bpc-157", variant_id: "10mg", strength: "10 mg", name: "BPC-157" });
  });

  it("cancel deposit: refunds the deposit under its own key, marks refunded with the reason, emails the buyer", async () => {
    m.getOrderById.mockResolvedValue(deposit());
    m.refundCard.mockResolvedValue("re_1");
    m.transitionOrder.mockResolvedValue(true);
    m.runByCutoff.mockResolvedValue(run);
    const { cancelDepositAction } = await import("@/app/admin/wholesale/actions");
    expect((await cancelDepositAction(null, fd({ orderId: ORDER, reason: "" })))?.fieldErrors?.reason).toBeTruthy();
    expect((await cancelDepositAction(null, fd({ orderId: ORDER, reason: "customer_cancelled", note: "lot failed, buyer chose refund" })))?.ok).toMatch(/cancelled — deposit refunded/);
    expect(m.refundCard).toHaveBeenCalledWith("pi_d", 120000, `order-refund-${ORDER}-deposit`);
    expect(m.transitionOrder).toHaveBeenCalledWith(ORDER, "deposit_paid", "refunded", expect.objectContaining({ refund_reason: "customer_cancelled", refunded_by: "owner", stripe_refund_id: "re_1" }));
    expect(m.sendOrAlert).toHaveBeenCalledTimes(1);
    expect(m.logEvent).toHaveBeenCalledWith(expect.objectContaining({ kind: "order_cancelled", orderId: ORDER }));
  });

  it("cancel deposit: a Stripe card error changes nothing", async () => {
    m.getOrderById.mockResolvedValue(deposit());
    m.refundCard.mockRejectedValue(Object.assign(new Error("charge already refunded"), { type: "StripeInvalidRequestError" }));
    const { cancelDepositAction } = await import("@/app/admin/wholesale/actions");
    expect((await cancelDepositAction(null, fd({ orderId: ORDER, reason: "other" })))?.error).toMatch(/didn't refund/);
    expect(m.transitionOrder).not.toHaveBeenCalled();
    expect(m.sendOrAlert).not.toHaveBeenCalled();
  });

  it("settings: errors come back per field; a valid form saves", async () => {
    const { saveWholesaleSettingsAction } = await import("@/app/admin/wholesale/actions");
    const good = { open: "on", minKits: "5", tierPct0: "20", tierKits1: "10", tierPct1: "25", tierKits2: "20", tierPct2: "30", depositPct: "40", balanceDays: "7", runDays: "14", leadDays: "28", nextCutoff: "" };
    expect((await saveWholesaleSettingsAction(null, fd({ ...good, depositPct: "95" })))?.fieldErrors?.depositPct).toBeTruthy();
    expect(m.saveWholesaleSettings).not.toHaveBeenCalled();
    expect(await saveWholesaleSettingsAction(null, fd(good))).toEqual({ ok: "Settings saved." });
    expect(m.saveWholesaleSettings).toHaveBeenCalledWith(expect.objectContaining({ open: true, minKits: 5, depositPct: 40 }));
  });
});
