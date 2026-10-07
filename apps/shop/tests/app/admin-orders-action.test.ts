import { describe, it, expect, vi, beforeEach } from "vitest";

import { ownerStaff } from "../helpers/staff";
const requirePermission = vi.fn();
const audit = vi.hoisted(() => ({ logAdminEvent: vi.fn(), recordAdminEvent: vi.fn() }));
const getOrderById = vi.fn();
const transitionOrder = vi.fn();
const sendOrAlert = vi.fn();
const alertOwner = vi.fn();
const markCommissionClearing = vi.fn();
const afterOrderRefunded = vi.fn();
const orderItemLots = vi.fn();
const recordShipped = vi.fn();
const catalogStockChanged = vi.fn();
const revalidatePath = vi.fn();
const holdVials = vi.fn();
const nc = vi.hoisted(() => ({ recipient: vi.fn(), stockOptions: vi.fn(), createNoChargeOrder: vi.fn(), orderIdByNumber: vi.fn(), orderByNoChargeKey: vi.fn() }));
const afterOrderPaid = vi.fn();
const redirect = vi.fn((url: string) => { throw new Error(`REDIRECT ${url}`); });
vi.mock("@/lib/dal", () => ({ requirePermission }));
vi.mock("@/lib/audit/data", () => audit);
vi.mock("@/lib/orders", () => ({ getOrderById, transitionOrder }));
vi.mock("@/lib/notify", () => ({ sendOrAlert, alertOwner }));
vi.mock("@/lib/partners/ledger", () => ({ markCommissionClearing }));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/stripe-events", () => ({ afterOrderRefunded }));
vi.mock("@/lib/catalog-ops/data", () => ({ orderItemLots, recordShipped, holdVials }));
vi.mock("@/lib/no-charge/data", () => nc);
vi.mock("@/lib/order-paid", () => ({ afterOrderPaid }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/catalog-live", () => ({ catalogStockChanged }));
const refunds = vi.hoisted(() => ({ refundCard: vi.fn(), paymentLabel: vi.fn(), stampRefund: vi.fn(), creditCardPart: vi.fn(), orderFlags: vi.fn() }));
vi.mock("@/lib/refunds/stripe", () => ({ refundCard: refunds.refundCard, paymentLabel: refunds.paymentLabel, NO_PAYMENT_LABEL: "the original payment" }));
vi.mock("@/lib/refunds/data", () => ({ stampRefund: refunds.stampRefund, creditCardPart: refunds.creditCardPart }));
vi.mock("@/lib/orders/detail", () => ({ orderFlags: refunds.orderFlags }));
vi.mock("@/lib/disputes/stripe", () => ({ stripeMessage: (err: unknown) => (err instanceof Error ? err.message : String(err)).slice(0, 300).replace(/[.\s]+$/, "") }));

function fd(v: Record<string, string>) { const f = new FormData(); for (const [k, x] of Object.entries(v)) f.set(k, x); return f; }
const id = "11111111-1111-4111-8111-111111111111";

describe("markShippedAction", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const f of [audit.logAdminEvent, audit.recordAdminEvent, requirePermission, getOrderById, transitionOrder, sendOrAlert, alertOwner, markCommissionClearing, orderItemLots, recordShipped, catalogStockChanged, revalidatePath]) f.mockReset();
    orderItemLots.mockResolvedValue(new Map());
  });

  it("is owner-only", async () => {
    requirePermission.mockRejectedValue(new Error("NOT_FOUND"));
    const { markShippedAction } = await import("@/app/admin/orders/actions");
    await expect(markShippedAction(null, fd({ orderId: id, tracking: "9400111899223344556677", carrier: "usps" }))).rejects.toThrow("NOT_FOUND");
    expect(transitionOrder).not.toHaveBeenCalled();
  });

  it("marks a paid order shipped with tracking and emails the customer", async () => {
    requirePermission.mockResolvedValue(ownerStaff({ id: "owner" }));
    const ship = { ship_name: "J. Rivera", ship_line1: "1 A St", ship_line2: null, ship_city: "Austin", ship_state: "TX", ship_zip: "78701" };
    getOrderById.mockResolvedValueOnce({ id, status: "paid", email: "j@lab.org", order_number: "AP-1001", ...ship })
      .mockResolvedValueOnce({ id, status: "shipped", email: "j@lab.org", order_number: "AP-1001", tracking_number: "9400111899223344556677", carrier: "usps", ...ship });
    transitionOrder.mockResolvedValue(true);
    const { markShippedAction } = await import("@/app/admin/orders/actions");
    await markShippedAction(null, fd({ orderId: id, tracking: " 9400 1118 9922 3344 5566 77 ", carrier: "usps" }));
    expect(requirePermission).toHaveBeenCalledWith("orders.ship");
    expect(transitionOrder).toHaveBeenCalledWith(id, "paid", "shipped", { tracking_number: "9400111899223344556677", carrier: "usps" });
    expect(sendOrAlert.mock.calls[0][0]).toMatchObject({ to: "j@lab.org", subject: "Order AP-1001 has shipped" });
    expect(markCommissionClearing).toHaveBeenCalledWith(id, expect.any(String));
  });

  it("still ships and emails the customer when clearing the commission fails", async () => {
    requirePermission.mockResolvedValue(ownerStaff({ id: "owner" }));
    const ship = { ship_name: "J. Rivera", ship_line1: "1 A St", ship_line2: null, ship_city: "Austin", ship_state: "TX", ship_zip: "78701" };
    getOrderById.mockResolvedValueOnce({ id, status: "paid", email: "j@lab.org", order_number: "AP-1001", ...ship })
      .mockResolvedValueOnce({ id, status: "shipped", email: "j@lab.org", order_number: "AP-1001", tracking_number: "9400111899223344556677", carrier: "usps", ...ship });
    transitionOrder.mockResolvedValue(true);
    markCommissionClearing.mockRejectedValue(new Error("db down"));
    const { markShippedAction } = await import("@/app/admin/orders/actions");
    await markShippedAction(null, fd({ orderId: id, tracking: "9400111899223344556677", carrier: "usps" }));
    expect(alertOwner).toHaveBeenCalledWith("Commission not cleared at shipping", expect.stringMatching(/^AP-1001: [\s\S]*db down/));
    expect(sendOrAlert.mock.calls[0][0]).toMatchObject({ to: "j@lab.org", subject: "Order AP-1001 has shipped" });
  });

  it("marking shipped records each line's allocated lots as shipped (manual)", async () => {
    requirePermission.mockResolvedValue(ownerStaff({ id: "owner" }));
    const ship = { ship_name: "J. Rivera", ship_line1: "1 A St", ship_line2: null, ship_city: "Austin", ship_state: "TX", ship_zip: "78701" };
    getOrderById.mockResolvedValueOnce({ id, status: "paid", email: "j@lab.org", order_number: "AP-1001", order_items: [{ id: "i1" }], ...ship })
      .mockResolvedValueOnce({ id, status: "shipped", email: "j@lab.org", order_number: "AP-1001", tracking_number: "778122104410", carrier: "fedex", ...ship });
    transitionOrder.mockResolvedValue(true);
    orderItemLots.mockResolvedValue(new Map([["i1", { allocated: [{ lotNumber: "BPC-1", qty: 6 }, { lotNumber: "BPC-2", qty: 4 }], shipped: [] }]]));
    recordShipped.mockResolvedValue("ok");
    const { markShippedAction } = await import("@/app/admin/orders/actions");
    await markShippedAction(null, fd({ orderId: id, tracking: "778122104410", carrier: "fedex" }));
    expect(recordShipped).toHaveBeenCalledWith("i1", [{ lotNumber: "BPC-1", qty: 6 }, { lotNumber: "BPC-2", qty: 4 }], "manual");
    expect(alertOwner).not.toHaveBeenCalled();
    expect(sendOrAlert).toHaveBeenCalled();
    expect(audit.recordAdminEvent).toHaveBeenCalledWith({ area: "orders", action: "order_shipped", targetId: id, label: "AP-1001", detail: "FEDEX 778122104410", actorId: "owner" });
  });

  it("skips a line already recorded as shipped", async () => {
    requirePermission.mockResolvedValue(ownerStaff({ id: "owner" }));
    const ship = { ship_name: "J. Rivera", ship_line1: "1 A St", ship_line2: null, ship_city: "Austin", ship_state: "TX", ship_zip: "78701" };
    getOrderById.mockResolvedValueOnce({ id, status: "paid", email: "j@lab.org", order_number: "AP-1001", order_items: [{ id: "i1" }], ...ship })
      .mockResolvedValueOnce({ id, status: "shipped", email: "j@lab.org", order_number: "AP-1001", tracking_number: "778122104410", carrier: "fedex", ...ship });
    transitionOrder.mockResolvedValue(true);
    orderItemLots.mockResolvedValue(new Map([["i1", { allocated: [{ lotNumber: "BPC-1", qty: 6 }], shipped: [{ lotNumber: "BPC-1", qty: 6 }] }]]));
    const { markShippedAction } = await import("@/app/admin/orders/actions");
    await markShippedAction(null, fd({ orderId: id, tracking: "778122104410", carrier: "fedex" }));
    expect(recordShipped).not.toHaveBeenCalled();
  });

  it("'moved' expires the live catalog", async () => {
    requirePermission.mockResolvedValue(ownerStaff({ id: "owner" }));
    const ship = { ship_name: "J. Rivera", ship_line1: "1 A St", ship_line2: null, ship_city: "Austin", ship_state: "TX", ship_zip: "78701" };
    getOrderById.mockResolvedValueOnce({ id, status: "paid", email: "j@lab.org", order_number: "AP-1001", order_items: [{ id: "i1" }], ...ship })
      .mockResolvedValueOnce({ id, status: "shipped", email: "j@lab.org", order_number: "AP-1001", tracking_number: "778122104410", carrier: "fedex", ...ship });
    transitionOrder.mockResolvedValue(true);
    orderItemLots.mockResolvedValue(new Map([["i1", { allocated: [{ lotNumber: "BPC-1", qty: 6 }], shipped: [] }]]));
    recordShipped.mockResolvedValue("moved");
    const { markShippedAction } = await import("@/app/admin/orders/actions");
    await markShippedAction(null, fd({ orderId: id, tracking: "778122104410", carrier: "fedex" }));
    expect(catalogStockChanged).toHaveBeenCalled();
    expect(alertOwner).not.toHaveBeenCalled();
    expect(sendOrAlert).toHaveBeenCalled();
  });

  it("'alert' notifies the owner by order and line, but the shipment still stands", async () => {
    requirePermission.mockResolvedValue(ownerStaff({ id: "owner" }));
    const ship = { ship_name: "J. Rivera", ship_line1: "1 A St", ship_line2: null, ship_city: "Austin", ship_state: "TX", ship_zip: "78701" };
    getOrderById.mockResolvedValueOnce({ id, status: "paid", email: "j@lab.org", order_number: "AP-1001", order_items: [{ id: "i1" }], ...ship })
      .mockResolvedValueOnce({ id, status: "shipped", email: "j@lab.org", order_number: "AP-1001", tracking_number: "778122104410", carrier: "fedex", ...ship });
    transitionOrder.mockResolvedValue(true);
    orderItemLots.mockResolvedValue(new Map([["i1", { allocated: [{ lotNumber: "BPC-1", qty: 6 }], shipped: [] }]]));
    recordShipped.mockResolvedValue("alert");
    const { markShippedAction } = await import("@/app/admin/orders/actions");
    await markShippedAction(null, fd({ orderId: id, tracking: "778122104410", carrier: "fedex" }));
    expect(alertOwner).toHaveBeenCalledWith("Shipped lots don't match what was held", expect.stringMatching(/^AP-1001 · line i1/));
    expect(catalogStockChanged).not.toHaveBeenCalled();
    expect(sendOrAlert).toHaveBeenCalled();
  });

  it("a thrown recordShipped for one line alerts the owner by line, but other lines and the shipment still go through", async () => {
    requirePermission.mockResolvedValue(ownerStaff({ id: "owner" }));
    const ship = { ship_name: "J. Rivera", ship_line1: "1 A St", ship_line2: null, ship_city: "Austin", ship_state: "TX", ship_zip: "78701" };
    getOrderById.mockResolvedValueOnce({ id, status: "paid", email: "j@lab.org", order_number: "AP-1001", order_items: [{ id: "i1" }, { id: "i2" }], ...ship })
      .mockResolvedValueOnce({ id, status: "shipped", email: "j@lab.org", order_number: "AP-1001", tracking_number: "778122104410", carrier: "fedex", ...ship });
    transitionOrder.mockResolvedValue(true);
    orderItemLots.mockResolvedValue(new Map([
      ["i1", { allocated: [{ lotNumber: "BPC-1", qty: 6 }], shipped: [] }],
      ["i2", { allocated: [{ lotNumber: "BPC-2", qty: 4 }], shipped: [] }],
    ]));
    recordShipped.mockImplementation(async (itemId: string) => { if (itemId === "i1") throw new Error("db down"); return "ok"; });
    const { markShippedAction } = await import("@/app/admin/orders/actions");
    await markShippedAction(null, fd({ orderId: id, tracking: "778122104410", carrier: "fedex" }));
    expect(alertOwner).toHaveBeenCalledWith("Shipped lots not recorded", expect.stringMatching(/^AP-1001 · line i1/));
    expect(recordShipped).toHaveBeenCalledWith("i2", [{ lotNumber: "BPC-2", qty: 4 }], "manual");
    expect(sendOrAlert).toHaveBeenCalled();
  });

  it("a failed shipped-lot record alerts the owner but the shipment stands", async () => {
    requirePermission.mockResolvedValue(ownerStaff({ id: "owner" }));
    const ship = { ship_name: "J. Rivera", ship_line1: "1 A St", ship_line2: null, ship_city: "Austin", ship_state: "TX", ship_zip: "78701" };
    getOrderById.mockResolvedValueOnce({ id, status: "paid", email: "j@lab.org", order_number: "AP-1001", order_items: [{ id: "i1" }], ...ship })
      .mockResolvedValueOnce({ id, status: "shipped", email: "j@lab.org", order_number: "AP-1001", tracking_number: "778122104410", carrier: "fedex", ...ship });
    transitionOrder.mockResolvedValue(true);
    orderItemLots.mockRejectedValue(new Error("down"));
    const { markShippedAction } = await import("@/app/admin/orders/actions");
    await markShippedAction(null, fd({ orderId: id, tracking: "778122104410", carrier: "fedex" }));
    expect(alertOwner).toHaveBeenCalledWith("Shipped lots not recorded", expect.stringMatching(/^AP-1001: /));
    expect(sendOrAlert).toHaveBeenCalled();
  });

  it("ignores bad input and non-paid orders", async () => {
    requirePermission.mockResolvedValue(ownerStaff({ id: "owner" }));
    const { markShippedAction } = await import("@/app/admin/orders/actions");
    await markShippedAction(null, fd({ orderId: id, tracking: "x", carrier: "usps" }));
    getOrderById.mockResolvedValue({ id, status: "cancelled" });
    await markShippedAction(null, fd({ orderId: id, tracking: "9400111899223344556677", carrier: "usps" }));
    expect(transitionOrder).not.toHaveBeenCalled();
    expect(markCommissionClearing).not.toHaveBeenCalled();
  });

  it("reports a bad tracking number to the dialog instead of ignoring it", async () => {
    requirePermission.mockResolvedValue(ownerStaff({ id: "owner" }));
    const { markShippedAction } = await import("@/app/admin/orders/actions");
    expect(await markShippedAction(null, fd({ orderId: id, tracking: "1Z-99", carrier: "ups" }))).toEqual({ error: "Use 8–40 letters and numbers.", field: "tracking" });
    expect(transitionOrder).not.toHaveBeenCalled();
  });

  it("reports an order that is no longer waiting to ship", async () => {
    requirePermission.mockResolvedValue(ownerStaff({ id: "owner" }));
    getOrderById.mockResolvedValue({ id, status: "shipped", order_number: "AP-1001" });
    const { markShippedAction } = await import("@/app/admin/orders/actions");
    expect(await markShippedAction(null, fd({ orderId: id, tracking: "9400111899223344556677", carrier: "usps" }))).toEqual({ error: "This order is no longer waiting to ship." });
  });

  it("returns ok and revalidates the list and the order page", async () => {
    requirePermission.mockResolvedValue(ownerStaff({ id: "owner" }));
    const ship = { ship_name: "J. Rivera", ship_line1: "1 A St", ship_line2: null, ship_city: "Austin", ship_state: "TX", ship_zip: "78701" };
    getOrderById.mockResolvedValueOnce({ id, status: "paid", email: "j@lab.org", order_number: "AP-1001", ...ship })
      .mockResolvedValueOnce({ id, status: "shipped", email: "j@lab.org", order_number: "AP-1001", tracking_number: "9400111899223344556677", carrier: "usps", ...ship });
    transitionOrder.mockResolvedValue(true);
    const { markShippedAction } = await import("@/app/admin/orders/actions");
    expect(await markShippedAction(null, fd({ orderId: id, tracking: "9400111899223344556677", carrier: "usps" }))).toEqual({ ok: true });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/orders");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/orders/AP-1001");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/partners/[id]", "page");
  });
});

describe("refundOrderAction", () => {
  // $228.00 total, $40.00 of it paid with store credit, $188.00 on the card.
  const sale = (over: Record<string, unknown> = {}) => ({
    id, order_number: "AP-1047", customer_id: "c1", email: "j@lab.org", status: "paid", kind: "sale",
    total_cents: 22800, store_credit_cents: 4000, stripe_payment_intent: "pi_1", stripe_session_id: "cs_1", ...over,
  });
  const cancelForm = (over: Record<string, string> = {}) => fd({ orderId: id, mode: "cancel", reason: "customer_cancelled", ...over });
  const exceptionForm = (over: Record<string, string> = {}) => fd({ orderId: id, mode: "exception", reason: "damaged", note: "Two vials cracked", destination: "store_credit", confirm: "on", ...over });
  beforeEach(() => {
    vi.resetModules();
    for (const f of [audit.logAdminEvent, audit.recordAdminEvent, requirePermission, getOrderById, transitionOrder, sendOrAlert, alertOwner, afterOrderRefunded, catalogStockChanged, revalidatePath, refunds.refundCard, refunds.paymentLabel, refunds.stampRefund, refunds.creditCardPart, refunds.orderFlags]) f.mockReset();
    requirePermission.mockResolvedValue(ownerStaff({ id: "owner" }));
    refunds.orderFlags.mockResolvedValue({ dispute: false, warning: false, lostDispute: false });
    refunds.refundCard.mockResolvedValue("re_1");
    refunds.paymentLabel.mockResolvedValue("Visa ••4242");
    refunds.stampRefund.mockResolvedValue(true);
    transitionOrder.mockResolvedValue(true);
  });

  it("is owner-only (orders.refund)", async () => {
    requirePermission.mockRejectedValue(new Error("NOT_FOUND"));
    const { refundOrderAction } = await import("@/app/admin/orders/actions");
    await expect(refundOrderAction(null, cancelForm())).rejects.toThrow("NOT_FOUND");
    expect(requirePermission).toHaveBeenCalledWith("orders.refund");
    expect(transitionOrder).not.toHaveBeenCalled();
  });

  it("a stale mode (the order shipped since the page loaded) → form error, no Stripe call", async () => {
    getOrderById.mockResolvedValue(sale({ status: "shipped" }));
    const { refundOrderAction } = await import("@/app/admin/orders/actions");
    expect(await refundOrderAction(null, cancelForm())).toEqual({ errors: { form: "This order changed — reload the page." } });
    expect(refunds.refundCard).not.toHaveBeenCalled();
    expect(transitionOrder).not.toHaveBeenCalled();
  });

  it("an open dispute → refund it from Disputes", async () => {
    getOrderById.mockResolvedValue(sale());
    refunds.orderFlags.mockResolvedValue({ dispute: true, warning: false, lostDispute: false });
    const { refundOrderAction } = await import("@/app/admin/orders/actions");
    const r = await refundOrderAction(null, cancelForm());
    expect(r?.errors?.form).toMatch(/AP-1047.*Disputes/);
    expect(refunds.orderFlags).toHaveBeenCalledWith(id);
    expect(refunds.refundCard).not.toHaveBeenCalled();
  });

  it("a lost chargeback → no refund (the bank already returned the money)", async () => {
    getOrderById.mockResolvedValue(sale({ status: "shipped" }));
    refunds.orderFlags.mockResolvedValue({ dispute: false, warning: false, lostDispute: true });
    const { refundOrderAction } = await import("@/app/admin/orders/actions");
    expect(await refundOrderAction(null, exceptionForm())).toEqual({ errors: { form: "A chargeback on AP-1047 was lost — the bank already returned the money. No refund." } });
    expect(refunds.refundCard).not.toHaveBeenCalled();
    expect(transitionOrder).not.toHaveBeenCalled();
  });

  it("returns parse errors as is, with no Stripe call", async () => {
    getOrderById.mockResolvedValue(sale({ status: "shipped" }));
    const { refundOrderAction } = await import("@/app/admin/orders/actions");
    const r = await refundOrderAction(null, exceptionForm({ note: "", confirm: "" }));
    expect(r).toEqual({ errors: { note: "Say why this order is an exception." } });
    expect(refunds.refundCard).not.toHaveBeenCalled();
  });

  it("cancel and refund: card part to Stripe, paid → refunded, follow-ups, stamp, email, event, stock", async () => {
    getOrderById.mockResolvedValue(sale());
    const { refundOrderAction } = await import("@/app/admin/orders/actions");
    expect(await refundOrderAction(null, cancelForm({ note: "Changed their mind" }))).toEqual({ ok: "AP-1047 was refunded." });
    expect(refunds.refundCard).toHaveBeenCalledWith("pi_1", 18800, id);
    expect(transitionOrder).toHaveBeenCalledWith(id, "paid", "refunded");
    expect(afterOrderRefunded).toHaveBeenCalledTimes(1);
    expect(refunds.creditCardPart).not.toHaveBeenCalled();
    expect(refunds.stampRefund).toHaveBeenCalledWith(id, { destination: "card", reason: "customer_cancelled", note: "Changed their mind", by: "owner", stripeRefundId: "re_1", paymentLabel: "Visa ••4242" });
    expect(refunds.paymentLabel).toHaveBeenCalledWith("pi_1");
    expect(sendOrAlert.mock.calls[0][0]).toMatchObject({ to: "j@lab.org", subject: "Order AP-1047 was cancelled and refunded" });
    expect(sendOrAlert.mock.calls[0][1]).toBe("refund AP-1047");
    expect(audit.recordAdminEvent).toHaveBeenCalledWith({ area: "orders", action: "order_refunded", targetId: id, label: "AP-1047", detail: "$228.00 · card + store credit · Customer asked to cancel", actorId: "owner" });
    expect(catalogStockChanged).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/admin/orders");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/orders/AP-1047");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/partners/[id]", "page");
  });

  it("a credit-only order (no Stripe payment): no Stripe call, store credit back, shipped or not", async () => {
    getOrderById.mockResolvedValue(sale({ stripe_payment_intent: null, stripe_session_id: null, total_cents: 6950, store_credit_cents: 6950 }));
    const { refundOrderAction } = await import("@/app/admin/orders/actions");
    expect(await refundOrderAction(null, cancelForm())).toEqual({ ok: "AP-1047 was refunded." });
    expect(refunds.refundCard).not.toHaveBeenCalled();
    expect(transitionOrder).toHaveBeenCalledWith(id, "paid", "refunded");
    expect(afterOrderRefunded).toHaveBeenCalledWith(expect.objectContaining({ id, order_number: "AP-1047" }));
    expect(refunds.stampRefund).toHaveBeenCalledWith(id, expect.objectContaining({ destination: "store_credit", stripeRefundId: null, paymentLabel: null }));
    expect(refunds.paymentLabel).not.toHaveBeenCalled();
    expect(audit.recordAdminEvent).toHaveBeenCalledWith(expect.objectContaining({ detail: "$69.50 · to store credit · Customer asked to cancel" }));

    getOrderById.mockResolvedValue(sale({ status: "shipped", stripe_payment_intent: null, stripe_session_id: null, total_cents: 6950, store_credit_cents: 6950 }));
    expect(await refundOrderAction(null, exceptionForm({ destination: "card" }))).toEqual({ errors: { destination: "This order has no card payment — refund it to store credit." } });
    expect(await refundOrderAction(null, exceptionForm())).toEqual({ ok: "AP-1047 was refunded." });
    expect(transitionOrder).toHaveBeenLastCalledWith(id, "shipped", "refunded");
    expect(refunds.refundCard).not.toHaveBeenCalled();
    expect(refunds.creditCardPart).not.toHaveBeenCalled();
  });

  it("shipped exception to store credit: no Stripe call, card part credited, after-ship email, no stock change", async () => {
    getOrderById.mockResolvedValue(sale({ status: "shipped" }));
    const { refundOrderAction } = await import("@/app/admin/orders/actions");
    expect(await refundOrderAction(null, exceptionForm())).toEqual({ ok: "AP-1047 was refunded." });
    expect(refunds.refundCard).not.toHaveBeenCalled();
    expect(transitionOrder).toHaveBeenCalledWith(id, "shipped", "refunded");
    expect(refunds.creditCardPart).toHaveBeenCalledWith("c1", 18800, id);
    expect(refunds.stampRefund).toHaveBeenCalledWith(id, { destination: "store_credit", reason: "damaged", note: "Two vials cracked", by: "owner", stripeRefundId: null, paymentLabel: null });
    expect(sendOrAlert.mock.calls[0][0]).toMatchObject({ subject: "Order AP-1047 was refunded" });
    expect(sendOrAlert.mock.calls[0][0].html).toContain("$228.00 to your store credit");
    expect(audit.recordAdminEvent).toHaveBeenCalledWith(expect.objectContaining({ detail: "$228.00 · to store credit · Damaged in transit" }));
    expect(catalogStockChanged).not.toHaveBeenCalled();
  });

  it("shipped exception to the card without the cash-refund box: refused, no Stripe call", async () => {
    getOrderById.mockResolvedValue(sale({ status: "shipped", store_credit_cents: 0 }));
    const { refundOrderAction } = await import("@/app/admin/orders/actions");
    expect(await refundOrderAction(null, exceptionForm({ destination: "card", confirm: "" }))).toEqual({ errors: { confirm: "Tick the box to confirm a cash refund after shipping." } });
    expect(refunds.refundCard).not.toHaveBeenCalled();
  });

  it("shipped exception to the card: refunds the card part through Stripe", async () => {
    getOrderById.mockResolvedValue(sale({ status: "shipped", store_credit_cents: 0 }));
    const { refundOrderAction } = await import("@/app/admin/orders/actions");
    expect(await refundOrderAction(null, exceptionForm({ destination: "card" }))).toEqual({ ok: "AP-1047 was refunded." });
    expect(refunds.refundCard).toHaveBeenCalledWith("pi_1", 22800, id);
    expect(refunds.creditCardPart).not.toHaveBeenCalled();
    expect(audit.recordAdminEvent).toHaveBeenCalledWith(expect.objectContaining({ detail: "$228.00 · to card · Damaged in transit" }));
  });

  it("Stripe throws → form error, nothing changes here", async () => {
    getOrderById.mockResolvedValue(sale());
    refunds.refundCard.mockRejectedValue(new Error("Charge ch_1 has already been refunded."));
    const { refundOrderAction } = await import("@/app/admin/orders/actions");
    expect(await refundOrderAction(null, cancelForm())).toEqual({ errors: { form: "Stripe didn't refund AP-1047: Charge ch_1 has already been refunded. Nothing changed here — reload the page." } });
    expect(transitionOrder).not.toHaveBeenCalled();
    expect(refunds.stampRefund).not.toHaveBeenCalled();
    expect(sendOrAlert).not.toHaveBeenCalled();
  });

  it("the webhook won the race: no second afterOrderRefunded, the email still goes", async () => {
    getOrderById.mockResolvedValueOnce(sale()).mockResolvedValueOnce(sale({ status: "refunded" }));
    transitionOrder.mockResolvedValue(false);
    const { refundOrderAction } = await import("@/app/admin/orders/actions");
    expect(await refundOrderAction(null, cancelForm())).toEqual({ ok: "AP-1047 was refunded." });
    expect(afterOrderRefunded).not.toHaveBeenCalled();
    expect(refunds.stampRefund).toHaveBeenCalled();
    expect(sendOrAlert).toHaveBeenCalledTimes(1);
    expect(alertOwner).not.toHaveBeenCalled();
  });

  it("refunded in Stripe but the order moved elsewhere → owner alert + form error", async () => {
    getOrderById.mockResolvedValueOnce(sale()).mockResolvedValueOnce(sale({ status: "shipped" }));
    transitionOrder.mockResolvedValue(false);
    const { refundOrderAction } = await import("@/app/admin/orders/actions");
    expect(await refundOrderAction(null, cancelForm())).toEqual({ errors: { form: "AP-1047 was refunded in Stripe but couldn't be updated here. You've been alerted — reconcile it by hand." } });
    expect(alertOwner).toHaveBeenCalledWith("Refund needs a look", "AP-1047: refunded in Stripe ($188.00) but the order is shipped here — reconcile it by hand.");
    expect(afterOrderRefunded).not.toHaveBeenCalled();
    expect(sendOrAlert).not.toHaveBeenCalled();
  });

  it("no money moved and the order changed → the plain stale error, no alert", async () => {
    getOrderById.mockResolvedValueOnce(sale({ status: "shipped" })).mockResolvedValueOnce(sale({ status: "refunded" }));
    transitionOrder.mockResolvedValue(false);
    const { refundOrderAction } = await import("@/app/admin/orders/actions");
    expect(await refundOrderAction(null, exceptionForm())).toEqual({ errors: { form: "This order changed — reload the page." } });
    expect(alertOwner).not.toHaveBeenCalled();
    expect(refunds.creditCardPart).not.toHaveBeenCalled();
  });

  it("creditCardPart throws → owner alerted, the refund still succeeds", async () => {
    getOrderById.mockResolvedValue(sale({ status: "shipped" }));
    refunds.creditCardPart.mockRejectedValue(new Error("db down"));
    const { refundOrderAction } = await import("@/app/admin/orders/actions");
    expect(await refundOrderAction(null, exceptionForm())).toEqual({ ok: "AP-1047 was refunded." });
    expect(alertOwner).toHaveBeenCalledWith("Refund credit not added", expect.stringMatching(/^AP-1047: [\s\S]*db down/));
    expect(sendOrAlert).toHaveBeenCalledTimes(1);
  });

  it("stampRefund throws → owner alerted, the refund still succeeds", async () => {
    getOrderById.mockResolvedValue(sale());
    refunds.stampRefund.mockRejectedValue(new Error("db down"));
    const { refundOrderAction } = await import("@/app/admin/orders/actions");
    expect(await refundOrderAction(null, cancelForm())).toEqual({ ok: "AP-1047 was refunded." });
    expect(alertOwner).toHaveBeenCalledWith("Refund details not saved", expect.stringMatching(/^AP-1047: [\s\S]*db down/));
    // We can't tell whether another submit saved it: the customer is still told.
    expect(sendOrAlert).toHaveBeenCalledTimes(1);
    expect(audit.recordAdminEvent).toHaveBeenCalledTimes(1);
  });

  it("a second submit (the refund was already stamped) sends no second email or activity", async () => {
    getOrderById.mockResolvedValueOnce(sale()).mockResolvedValueOnce(sale({ status: "refunded" }));
    transitionOrder.mockResolvedValue(false);
    refunds.stampRefund.mockResolvedValue(false);
    const { refundOrderAction } = await import("@/app/admin/orders/actions");
    expect(await refundOrderAction(null, cancelForm())).toEqual({ ok: "AP-1047 was refunded." });
    expect(sendOrAlert).not.toHaveBeenCalled();
    expect(audit.recordAdminEvent).not.toHaveBeenCalled();
    expect(alertOwner).not.toHaveBeenCalled();
  });

  it("a card label Stripe couldn't read is saved as null", async () => {
    getOrderById.mockResolvedValue(sale());
    refunds.paymentLabel.mockResolvedValue("the original payment");
    const { refundOrderAction } = await import("@/app/admin/orders/actions");
    await refundOrderAction(null, cancelForm());
    expect(refunds.stampRefund).toHaveBeenCalledWith(id, expect.objectContaining({ paymentLabel: null }));
  });

  it("Stripe didn't answer (connection/API error) → may have refunded: owner alerted, check Stripe", async () => {
    getOrderById.mockResolvedValue(sale());
    refunds.refundCard.mockRejectedValue(Object.assign(new Error("Request timed out"), { type: "StripeConnectionError" }));
    const { refundOrderAction } = await import("@/app/admin/orders/actions");
    expect(await refundOrderAction(null, cancelForm())).toEqual({ errors: { form: "Stripe didn't answer — the refund may have gone through. Check the order in Stripe before trying again." } });
    expect(alertOwner).toHaveBeenCalledWith("Refund needs a look", expect.stringMatching(/^AP-1047: Stripe didn't answer[\s\S]*Request timed out/));
    expect(transitionOrder).not.toHaveBeenCalled();
  });

  it("anything failing after Stripe refunded → owner alerted, form error, nothing thrown", async () => {
    getOrderById.mockResolvedValue(sale());
    afterOrderRefunded.mockRejectedValue(new Error("db down"));
    const { refundOrderAction } = await import("@/app/admin/orders/actions");
    expect(await refundOrderAction(null, cancelForm())).toEqual({ errors: { form: "AP-1047 was refunded in Stripe but not finished here. You've been alerted — check the order." } });
    expect(alertOwner).toHaveBeenCalledWith("Refund needs a look", expect.stringMatching(/^AP-1047: refunded in Stripe \(re_1\) but not finished here — [\s\S]*db down/));

    alertOwner.mockReset();
    afterOrderRefunded.mockReset();
    transitionOrder.mockRejectedValue(new Error("conn reset"));
    getOrderById.mockResolvedValue(sale({ stripe_payment_intent: null, total_cents: 6950, store_credit_cents: 6950 }));
    expect(await refundOrderAction(null, cancelForm())).toEqual({ errors: { form: "AP-1047 wasn't fully refunded here. You've been alerted — check the order." } });
    expect(alertOwner).toHaveBeenCalledWith("Refund needs a look", expect.stringMatching(/^AP-1047: [\s\S]*conn reset/));
  });
});

describe("createNoChargeOrderAction", () => {
  const cust = "22222222-2222-4222-8222-222222222222";
  const ship = { name: "Dr. Mara Lin", line1: "1 Lab Way", line2: null, city: "Austin", state: "TX" as const, zip: "78701" };
  const KEY = "3b241101-e2bb-4255-8caf-4136c566a962";
  const NOT_RESERVED = "Stock couldn't be reserved. Nothing was sent — try again.";
  const who = { id: cust, name: "Mara Lin", email: "mara@lab.org", verified: true, blocked: false, agreedAt: "2026-10-01T00:00:00Z", ship };
  const stock = [
    { slug: "bpc-157", variantId: "10mg", name: "BPC-157", strength: "10 mg", priceCents: 4800, available: 84, hidden: false },
    { slug: "mots-c", variantId: "40mg", name: "MOTS-c", strength: "40 mg", priceCents: 9600, available: 3, hidden: true },
  ];
  const form = (over: Record<string, string | string[]> = {}) => {
    const v: Record<string, string | string[]> = {
      customer: cust, key: KEY, reason: "replacement", replaces: "AP-1040", note: "Vial cracked in transit", email: "on",
      line: ["bpc-157:10mg:2", "mots-c:40mg:1"],
      ship_name: ship.name, ship_line1: ship.line1, ship_line2: "", ship_city: ship.city, ship_state: "tx", ship_zip: ship.zip, ...over,
    };
    const f = new FormData();
    for (const [k, x] of Object.entries(v)) for (const y of Array.isArray(x) ? x : [x]) f.append(k, y);
    return f;
  };

  beforeEach(() => {
    vi.resetModules();
    for (const f of [audit.recordAdminEvent, requirePermission, transitionOrder, alertOwner, catalogStockChanged, revalidatePath, holdVials, afterOrderPaid, redirect, nc.recipient, nc.stockOptions, nc.createNoChargeOrder, nc.orderIdByNumber, nc.orderByNoChargeKey]) f.mockReset();
    redirect.mockImplementation((url: string) => { throw new Error(`REDIRECT ${url}`); });
    requirePermission.mockResolvedValue(ownerStaff({ id: "owner" }));
    nc.recipient.mockResolvedValue(who);
    nc.stockOptions.mockResolvedValue(stock);
    nc.orderIdByNumber.mockResolvedValue("orig-id");
    nc.createNoChargeOrder.mockResolvedValue({ id: "o9", orderNumber: "AP-1061" });
    holdVials.mockResolvedValue({ ok: true });
    transitionOrder.mockResolvedValue(true);
    afterOrderPaid.mockResolvedValue({ emailed: true });
  });

  it("an email that didn't go is recorded as email: failed", async () => {
    afterOrderPaid.mockResolvedValue({ emailed: false });
    const { createNoChargeOrderAction } = await import("@/app/admin/orders/actions");
    await expect(createNoChargeOrderAction(null, form())).rejects.toThrow("REDIRECT");
    expect(audit.recordAdminEvent).toHaveBeenCalledWith(expect.objectContaining({ detail: "Replacement · $192.00 retail · email: failed" }));
  });

  it("requires orders.no_charge", async () => {
    requirePermission.mockRejectedValue(new Error("NOT_FOUND"));
    const { createNoChargeOrderAction } = await import("@/app/admin/orders/actions");
    await expect(createNoChargeOrderAction(null, form())).rejects.toThrow("NOT_FOUND");
    expect(requirePermission).toHaveBeenCalledWith("orders.no_charge");
    expect(nc.createNoChargeOrder).not.toHaveBeenCalled();
  });

  it.each([
    ["unknown", null],
    ["blocked", { ...who, blocked: true }],
    ["never agreed", { ...who, agreedAt: null }],
  ])("refuses a recipient who can't receive orders (%s)", async (_label, r) => {
    nc.recipient.mockResolvedValue(r);
    const { createNoChargeOrderAction } = await import("@/app/admin/orders/actions");
    expect(await createNoChargeOrderAction(null, form())).toEqual({ errors: { form: "That customer can't receive orders. Pick someone else." } });
    expect(nc.createNoChargeOrder).not.toHaveBeenCalled();
  });

  it("refuses a malformed customer id without reading anything", async () => {
    const { createNoChargeOrderAction } = await import("@/app/admin/orders/actions");
    expect(await createNoChargeOrderAction(null, form({ customer: "nope" }))).toEqual({ errors: { form: "That customer can't receive orders. Pick someone else." } });
    expect(nc.recipient).not.toHaveBeenCalled();
  });

  it("returns the parse errors and inserts nothing", async () => {
    const { createNoChargeOrderAction } = await import("@/app/admin/orders/actions");
    const r = await createNoChargeOrderAction(null, form({ reason: "", line: [] }));
    expect(r).toEqual({ errors: { reason: "Pick a reason.", lines: "Add at least one item." } });
    expect(nc.createNoChargeOrder).not.toHaveBeenCalled();
  });

  it("refuses a replacement for an order that isn't this customer's", async () => {
    nc.orderIdByNumber.mockResolvedValue(null);
    const { createNoChargeOrderAction } = await import("@/app/admin/orders/actions");
    expect(await createNoChargeOrderAction(null, form())).toEqual({ errors: { replaces: "That order isn't this customer's." } });
    expect(nc.orderIdByNumber).toHaveBeenCalledWith("AP-1040", cust);
    expect(nc.createNoChargeOrder).not.toHaveBeenCalled();
  });

  it("refuses an incomplete address", async () => {
    const { createNoChargeOrderAction } = await import("@/app/admin/orders/actions");
    expect(await createNoChargeOrderAction(null, form({ ship_zip: "7870" }))).toEqual({ errors: { form: "Please complete the shipping address." } });
    expect(nc.createNoChargeOrder).not.toHaveBeenCalled();
  });

  it("creates, holds, marks paid, runs the paid steps, logs and opens the order", async () => {
    const { createNoChargeOrderAction } = await import("@/app/admin/orders/actions");
    await expect(createNoChargeOrderAction(null, form())).rejects.toThrow("REDIRECT /admin/orders/AP-1061");
    expect(nc.createNoChargeOrder).toHaveBeenCalledWith({
      customerId: cust, email: "mara@lab.org", ship: { ...ship, state: "TX" },
      lines: [
        { compoundSlug: "bpc-157", compoundName: "BPC-157", variantId: "10mg", strength: "10 mg", packQty: 1, quantity: 2, unitPriceCents: 0, lineTotalCents: 0, retailUnitCents: 4800 },
        { compoundSlug: "mots-c", compoundName: "MOTS-c", variantId: "40mg", strength: "40 mg", packQty: 1, quantity: 1, unitPriceCents: 0, lineTotalCents: 0, retailUnitCents: 9600 },
      ],
      retailCents: 19200, reason: "replacement", note: "Vial cracked in transit", replacesOrderId: "orig-id", actorId: "owner", agreedAt: "2026-10-01T00:00:00Z", key: KEY,
    });
    expect(holdVials).toHaveBeenCalledWith("o9");
    expect(transitionOrder).toHaveBeenCalledWith("o9", "awaiting_payment", "paid");
    expect(afterOrderPaid).toHaveBeenCalledWith("o9", { notify: true });
    expect(catalogStockChanged).toHaveBeenCalled();
    expect(audit.recordAdminEvent).toHaveBeenCalledWith({ area: "orders", action: "no_charge_created", targetId: "o9", label: "AP-1061", detail: "Replacement · $192.00 retail · email: sent", actorId: "owner" });
    expect(holdVials.mock.invocationCallOrder[0]).toBeLessThan(transitionOrder.mock.invocationCallOrder[0]);
    expect(transitionOrder.mock.invocationCallOrder[0]).toBeLessThan(afterOrderPaid.mock.invocationCallOrder[0]);
  });

  it("no email box → notify false, recorded as email: off; non-replacement ignores replaces", async () => {
    const f = form({ reason: "seeding", note: "", replaces: "" });
    f.delete("email");
    const { createNoChargeOrderAction } = await import("@/app/admin/orders/actions");
    await expect(createNoChargeOrderAction(null, f)).rejects.toThrow("REDIRECT");
    expect(nc.orderIdByNumber).not.toHaveBeenCalled();
    expect(nc.createNoChargeOrder).toHaveBeenCalledWith(expect.objectContaining({ reason: "seeding", note: null, replacesOrderId: null }));
    expect(afterOrderPaid).toHaveBeenCalledWith("o9", { notify: false });
    expect(audit.recordAdminEvent).toHaveBeenCalledWith(expect.objectContaining({ detail: "Seeding · $192.00 retail · email: off" }));
  });

  it("sold out while creating → cancels and names the short item", async () => {
    holdVials.mockResolvedValue({ ok: false, reason: "sold_out", short: [{ slug: "mots-c", variantId: "40mg" }] });
    const { createNoChargeOrderAction } = await import("@/app/admin/orders/actions");
    expect(await createNoChargeOrderAction(null, form())).toEqual({ errors: { lines: "Not enough MOTS-c 40 mg left — someone just bought it. Lower the count." }, key: expect.any(String) });
    expect(transitionOrder).toHaveBeenCalledWith("o9", "awaiting_payment", "cancelled");
    expect(transitionOrder).not.toHaveBeenCalledWith("o9", "awaiting_payment", "paid");
    expect(afterOrderPaid).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("a hold that throws → cancels, nothing sent, a fresh form key", async () => {
    holdVials.mockRejectedValue(new Error("db down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { createNoChargeOrderAction } = await import("@/app/admin/orders/actions");
    const r = await createNoChargeOrderAction(null, form());
    expect(r).toEqual({ errors: { form: NOT_RESERVED }, key: expect.any(String) });
    expect(r!.key).not.toBe(KEY);
    expect(transitionOrder).toHaveBeenCalledWith("o9", "awaiting_payment", "cancelled");
    expect(afterOrderPaid).not.toHaveBeenCalled();
  });

  it("refuses a form without its one-time key", async () => {
    const { createNoChargeOrderAction } = await import("@/app/admin/orders/actions");
    expect(await createNoChargeOrderAction(null, form({ key: "" }))).toEqual({ errors: { form: "This form is out of date — reload the page." } });
    expect(nc.createNoChargeOrder).not.toHaveBeenCalled();
  });

  it("a double submit opens the order the first submit created — no second order, no second hold", async () => {
    nc.createNoChargeOrder.mockResolvedValue({ duplicate: true });
    nc.orderByNoChargeKey.mockResolvedValue({ id: "o9", orderNumber: "AP-1061", status: "paid" });
    const { createNoChargeOrderAction } = await import("@/app/admin/orders/actions");
    await expect(createNoChargeOrderAction(null, form())).rejects.toThrow("REDIRECT /admin/orders/AP-1061");
    expect(nc.orderByNoChargeKey).toHaveBeenCalledWith(KEY);
    expect(holdVials).not.toHaveBeenCalled();
    expect(transitionOrder).not.toHaveBeenCalled();
    expect(afterOrderPaid).not.toHaveBeenCalled();
    expect(audit.recordAdminEvent).not.toHaveBeenCalled();
  });

  it("a resubmit of a form whose order was cancelled asks to try again with a fresh key", async () => {
    nc.createNoChargeOrder.mockResolvedValue({ duplicate: true });
    nc.orderByNoChargeKey.mockResolvedValue({ id: "o9", orderNumber: "AP-1061", status: "cancelled" });
    const { createNoChargeOrderAction } = await import("@/app/admin/orders/actions");
    const r = await createNoChargeOrderAction(null, form());
    expect(r).toEqual({ errors: { form: NOT_RESERVED }, key: expect.any(String) });
    expect(r!.key).not.toBe(KEY);
    expect(redirect).not.toHaveBeenCalled();
  });

  it("an order insert that throws → nothing sent, nothing to cancel", async () => {
    const { NoChargeCreateError } = await import("@/lib/no-charge/rules");
    nc.createNoChargeOrder.mockRejectedValue(new NoChargeCreateError("no-charge order insert failed", null));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { createNoChargeOrderAction } = await import("@/app/admin/orders/actions");
    expect(await createNoChargeOrderAction(null, form())).toEqual({ errors: { form: NOT_RESERVED }, key: expect.any(String) });
    expect(transitionOrder).not.toHaveBeenCalled();
    expect(alertOwner).not.toHaveBeenCalled();
    expect(holdVials).not.toHaveBeenCalled();
  });

  it("a create that leaves an order behind cancels it; a failed cancel alerts the owner by order number", async () => {
    const { NoChargeCreateError } = await import("@/lib/no-charge/rules");
    nc.createNoChargeOrder.mockRejectedValue(new NoChargeCreateError("order_items insert failed; order delete failed", { id: "o9", orderNumber: "AP-1061" }));
    transitionOrder.mockRejectedValue(new Error("db down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { createNoChargeOrderAction } = await import("@/app/admin/orders/actions");
    expect(await createNoChargeOrderAction(null, form())).toEqual({ errors: { form: NOT_RESERVED }, key: expect.any(String) });
    expect(transitionOrder).toHaveBeenCalledWith("o9", "awaiting_payment", "cancelled");
    expect(alertOwner).toHaveBeenCalledWith("No-charge order not cancelled", expect.stringMatching(/^AP-1061: [\s\S]*db down/));
  });

  it("the paid transition throwing → cancels the order, nothing sent", async () => {
    transitionOrder.mockImplementation(async (_id: string, _from: string, to: string) => { if (to === "paid") throw new Error("db down"); return true; });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { createNoChargeOrderAction } = await import("@/app/admin/orders/actions");
    expect(await createNoChargeOrderAction(null, form())).toEqual({ errors: { form: NOT_RESERVED }, key: expect.any(String) });
    expect(transitionOrder).toHaveBeenCalledWith("o9", "awaiting_payment", "cancelled");
    expect(afterOrderPaid).not.toHaveBeenCalled();
    expect(alertOwner).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("a cancel that finds the order already moved alerts the owner", async () => {
    transitionOrder.mockResolvedValue(false);
    const { createNoChargeOrderAction } = await import("@/app/admin/orders/actions");
    expect(await createNoChargeOrderAction(null, form())).toEqual({ errors: { form: NOT_RESERVED }, key: expect.any(String) });
    expect(alertOwner).toHaveBeenCalledWith("No-charge order not cancelled", expect.stringMatching(/^AP-1061: /));
  });

  it("an inactive strength → cancels and asks to reload", async () => {
    holdVials.mockResolvedValue({ ok: false, reason: "inactive" });
    const { createNoChargeOrderAction } = await import("@/app/admin/orders/actions");
    expect(await createNoChargeOrderAction(null, form())).toEqual({ errors: { form: "One of these strengths is no longer available — reload the page." }, key: expect.any(String) });
    expect(transitionOrder).toHaveBeenCalledWith("o9", "awaiting_payment", "cancelled");
    expect(afterOrderPaid).not.toHaveBeenCalled();
  });

  it("paid steps failing alerts the owner and still opens the order", async () => {
    afterOrderPaid.mockRejectedValue(new Error("email down"));
    const { createNoChargeOrderAction } = await import("@/app/admin/orders/actions");
    await expect(createNoChargeOrderAction(null, form())).rejects.toThrow("REDIRECT /admin/orders/AP-1061");
    expect(alertOwner).toHaveBeenCalledWith("No-charge order follow-up failed", expect.stringMatching(/^AP-1061: [\s\S]*email down/));
    expect(audit.recordAdminEvent).toHaveBeenCalledWith(expect.objectContaining({ detail: "Replacement · $192.00 retail · email: failed" }));
  });
});

describe("cancelNoChargeOrderAction", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const f of [audit.recordAdminEvent, requirePermission, getOrderById, transitionOrder, sendOrAlert, catalogStockChanged, afterOrderRefunded, revalidatePath]) f.mockReset();
    requirePermission.mockResolvedValue(ownerStaff({ id: "owner" }));
    transitionOrder.mockResolvedValue(true);
  });
  const nco = (over: Record<string, unknown> = {}) => ({ id, order_number: "AP-1061", kind: "no_charge", status: "paid", ...over });

  it("requires orders.no_charge", async () => {
    requirePermission.mockRejectedValue(new Error("NOT_FOUND"));
    const { cancelNoChargeOrderAction } = await import("@/app/admin/orders/actions");
    await expect(cancelNoChargeOrderAction(fd({ orderId: id }))).rejects.toThrow("NOT_FOUND");
    expect(requirePermission).toHaveBeenCalledWith("orders.no_charge");
    expect(transitionOrder).not.toHaveBeenCalled();
  });

  it("moves a paid no-charge order to refunded (stock returns), logs it, sends no email", async () => {
    getOrderById.mockResolvedValue(nco());
    const { cancelNoChargeOrderAction } = await import("@/app/admin/orders/actions");
    await cancelNoChargeOrderAction(fd({ orderId: id }));
    expect(transitionOrder).toHaveBeenCalledWith(id, "paid", "refunded");
    expect(catalogStockChanged).toHaveBeenCalled();
    expect(audit.recordAdminEvent).toHaveBeenCalledWith(expect.objectContaining({ area: "orders", action: "no_charge_cancelled", targetId: id, label: "AP-1061", actorId: "owner" }));
    expect(sendOrAlert).not.toHaveBeenCalled();
    expect(afterOrderRefunded).not.toHaveBeenCalled();
  });

  it("refuses a shipped one", async () => {
    getOrderById.mockResolvedValue(nco({ status: "shipped" }));
    const { cancelNoChargeOrderAction } = await import("@/app/admin/orders/actions");
    await expect(cancelNoChargeOrderAction(fd({ orderId: id }))).rejects.toThrow("This order has shipped — it can't be cancelled.");
    expect(transitionOrder).not.toHaveBeenCalled();
  });

  it.each([["a sale", nco({ kind: "sale" })], ["missing", null], ["already cancelled", nco({ status: "refunded" })]])("throws on a stale order (%s)", async (_l, o) => {
    getOrderById.mockResolvedValue(o);
    const { cancelNoChargeOrderAction } = await import("@/app/admin/orders/actions");
    await expect(cancelNoChargeOrderAction(fd({ orderId: id }))).rejects.toThrow();
    expect(transitionOrder).not.toHaveBeenCalled();
  });

  it("throws when the order moved meanwhile", async () => {
    getOrderById.mockResolvedValue(nco());
    transitionOrder.mockResolvedValue(false);
    const { cancelNoChargeOrderAction } = await import("@/app/admin/orders/actions");
    await expect(cancelNoChargeOrderAction(fd({ orderId: id }))).rejects.toThrow();
    expect(audit.recordAdminEvent).not.toHaveBeenCalled();
  });
});
