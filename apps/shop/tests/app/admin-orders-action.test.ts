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
vi.mock("@/lib/dal", () => ({ requirePermission }));
vi.mock("@/lib/audit/data", () => audit);
vi.mock("@/lib/orders", () => ({ getOrderById, transitionOrder }));
vi.mock("@/lib/notify", () => ({ sendOrAlert, alertOwner }));
vi.mock("@/lib/partners/ledger", () => ({ markCommissionClearing }));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/stripe-events", () => ({ afterOrderRefunded }));
vi.mock("@/lib/catalog-ops/data", () => ({ orderItemLots, recordShipped }));
vi.mock("@/lib/catalog-live", () => ({ catalogStockChanged }));

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

describe("refundCreditOrderAction", () => {
  const creditOrder = (status: string, over: Record<string, unknown> = {}) => ({
    id, order_number: "AP-1009", status, stripe_session_id: null, store_credit_cents: 6950, total_cents: 6950, ...over,
  });
  beforeEach(() => { vi.resetModules(); for (const f of [audit.logAdminEvent, audit.recordAdminEvent, requirePermission, getOrderById, transitionOrder, alertOwner, afterOrderRefunded, revalidatePath]) f.mockReset(); });

  it("is owner-only", async () => {
    requirePermission.mockRejectedValue(new Error("NOT_FOUND"));
    const { refundCreditOrderAction } = await import("@/app/admin/orders/actions");
    await expect(refundCreditOrderAction(fd({ orderId: id }))).rejects.toThrow("NOT_FOUND");
    expect(transitionOrder).not.toHaveBeenCalled();
  });

  it("refunds a paid or shipped order paid fully in store credit, then runs the refund follow-ups", async () => {
    requirePermission.mockResolvedValue(ownerStaff({ id: "owner" }));
    getOrderById.mockResolvedValue(creditOrder("shipped"));
    transitionOrder.mockResolvedValue(true);
    const { refundCreditOrderAction } = await import("@/app/admin/orders/actions");
    await refundCreditOrderAction(fd({ orderId: id }));
    expect(transitionOrder).toHaveBeenCalledWith(id, "shipped", "refunded");
    expect(afterOrderRefunded).toHaveBeenCalledWith(expect.objectContaining({ id, order_number: "AP-1009" }));
    expect(revalidatePath).toHaveBeenCalledWith("/admin/orders");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/orders/AP-1009");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/partners/[id]", "page");
  });

  it("refuses orders Stripe charged (those are refunded in Stripe) and unpaid ones", async () => {
    requirePermission.mockResolvedValue(ownerStaff({ id: "owner" }));
    const { refundCreditOrderAction } = await import("@/app/admin/orders/actions");
    for (const o of [creditOrder("paid", { stripe_session_id: "cs_1" }), creditOrder("paid", { store_credit_cents: 5000 }), creditOrder("cancelled")]) {
      getOrderById.mockResolvedValue(o);
      await refundCreditOrderAction(fd({ orderId: id }));
    }
    expect(transitionOrder).not.toHaveBeenCalled();
    expect(afterOrderRefunded).not.toHaveBeenCalled();
  });
});
