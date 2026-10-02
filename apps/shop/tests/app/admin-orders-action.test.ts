import { describe, it, expect, vi, beforeEach } from "vitest";

const requireOwner = vi.fn();
const getOrderById = vi.fn();
const transitionOrder = vi.fn();
const sendOrAlert = vi.fn();
const alertOwner = vi.fn();
const markCommissionClearing = vi.fn();
const afterOrderRefunded = vi.fn();
vi.mock("@/lib/dal", () => ({ requireOwner }));
vi.mock("@/lib/orders", () => ({ getOrderById, transitionOrder }));
vi.mock("@/lib/notify", () => ({ sendOrAlert, alertOwner }));
vi.mock("@/lib/partners/ledger", () => ({ markCommissionClearing }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/stripe-events", () => ({ afterOrderRefunded }));

function fd(v: Record<string, string>) { const f = new FormData(); for (const [k, x] of Object.entries(v)) f.set(k, x); return f; }
const id = "11111111-1111-4111-8111-111111111111";

describe("markShippedAction", () => {
  beforeEach(() => { vi.resetModules(); for (const f of [requireOwner, getOrderById, transitionOrder, sendOrAlert, alertOwner, markCommissionClearing]) f.mockReset(); });

  it("is owner-only", async () => {
    requireOwner.mockRejectedValue(new Error("NOT_FOUND"));
    const { markShippedAction } = await import("@/app/admin/orders/actions");
    await expect(markShippedAction(fd({ orderId: id, tracking: "9400111899223344556677", carrier: "usps" }))).rejects.toThrow("NOT_FOUND");
    expect(transitionOrder).not.toHaveBeenCalled();
  });

  it("marks a paid order shipped with tracking and emails the customer", async () => {
    requireOwner.mockResolvedValue({ id: "owner" });
    const ship = { ship_name: "J. Rivera", ship_line1: "1 A St", ship_line2: null, ship_city: "Austin", ship_state: "TX", ship_zip: "78701" };
    getOrderById.mockResolvedValueOnce({ id, status: "paid", email: "j@lab.org", order_number: "AP-1001", ...ship })
      .mockResolvedValueOnce({ id, status: "shipped", email: "j@lab.org", order_number: "AP-1001", tracking_number: "9400111899223344556677", carrier: "usps", ...ship });
    transitionOrder.mockResolvedValue(true);
    const { markShippedAction } = await import("@/app/admin/orders/actions");
    await markShippedAction(fd({ orderId: id, tracking: " 9400 1118 9922 3344 5566 77 ", carrier: "usps" }));
    expect(transitionOrder).toHaveBeenCalledWith(id, "paid", "shipped", { tracking_number: "9400111899223344556677", carrier: "usps" });
    expect(sendOrAlert.mock.calls[0][0]).toMatchObject({ to: "j@lab.org", subject: "Order AP-1001 has shipped" });
    expect(markCommissionClearing).toHaveBeenCalledWith(id, expect.any(String));
  });

  it("still ships and emails the customer when clearing the commission fails", async () => {
    requireOwner.mockResolvedValue({ id: "owner" });
    const ship = { ship_name: "J. Rivera", ship_line1: "1 A St", ship_line2: null, ship_city: "Austin", ship_state: "TX", ship_zip: "78701" };
    getOrderById.mockResolvedValueOnce({ id, status: "paid", email: "j@lab.org", order_number: "AP-1001", ...ship })
      .mockResolvedValueOnce({ id, status: "shipped", email: "j@lab.org", order_number: "AP-1001", tracking_number: "9400111899223344556677", carrier: "usps", ...ship });
    transitionOrder.mockResolvedValue(true);
    markCommissionClearing.mockRejectedValue(new Error("db down"));
    const { markShippedAction } = await import("@/app/admin/orders/actions");
    await markShippedAction(fd({ orderId: id, tracking: "9400111899223344556677", carrier: "usps" }));
    expect(alertOwner).toHaveBeenCalledWith("Commission not cleared for AP-1001", expect.stringContaining("db down"));
    expect(sendOrAlert.mock.calls[0][0]).toMatchObject({ to: "j@lab.org", subject: "Order AP-1001 has shipped" });
  });

  it("ignores bad input and non-paid orders", async () => {
    requireOwner.mockResolvedValue({ id: "owner" });
    const { markShippedAction } = await import("@/app/admin/orders/actions");
    await markShippedAction(fd({ orderId: id, tracking: "x", carrier: "usps" }));
    getOrderById.mockResolvedValue({ id, status: "cancelled" });
    await markShippedAction(fd({ orderId: id, tracking: "9400111899223344556677", carrier: "usps" }));
    expect(transitionOrder).not.toHaveBeenCalled();
    expect(markCommissionClearing).not.toHaveBeenCalled();
  });
});

describe("refundCreditOrderAction", () => {
  const creditOrder = (status: string, over: Record<string, unknown> = {}) => ({
    id, order_number: "AP-1009", status, stripe_session_id: null, store_credit_cents: 6950, total_cents: 6950, ...over,
  });
  beforeEach(() => { vi.resetModules(); for (const f of [requireOwner, getOrderById, transitionOrder, alertOwner, afterOrderRefunded]) f.mockReset(); });

  it("is owner-only", async () => {
    requireOwner.mockRejectedValue(new Error("NOT_FOUND"));
    const { refundCreditOrderAction } = await import("@/app/admin/orders/actions");
    await expect(refundCreditOrderAction(fd({ orderId: id }))).rejects.toThrow("NOT_FOUND");
    expect(transitionOrder).not.toHaveBeenCalled();
  });

  it("refunds a paid or shipped order paid fully in store credit, then runs the refund follow-ups", async () => {
    requireOwner.mockResolvedValue({ id: "owner" });
    getOrderById.mockResolvedValue(creditOrder("shipped"));
    transitionOrder.mockResolvedValue(true);
    const { refundCreditOrderAction } = await import("@/app/admin/orders/actions");
    await refundCreditOrderAction(fd({ orderId: id }));
    expect(transitionOrder).toHaveBeenCalledWith(id, "shipped", "refunded");
    expect(afterOrderRefunded).toHaveBeenCalledWith(expect.objectContaining({ id, order_number: "AP-1009" }));
  });

  it("refuses orders Stripe charged (those are refunded in Stripe) and unpaid ones", async () => {
    requireOwner.mockResolvedValue({ id: "owner" });
    const { refundCreditOrderAction } = await import("@/app/admin/orders/actions");
    for (const o of [creditOrder("paid", { stripe_session_id: "cs_1" }), creditOrder("paid", { store_credit_cents: 5000 }), creditOrder("cancelled")]) {
      getOrderById.mockResolvedValue(o);
      await refundCreditOrderAction(fd({ orderId: id }));
    }
    expect(transitionOrder).not.toHaveBeenCalled();
    expect(afterOrderRefunded).not.toHaveBeenCalled();
  });
});
