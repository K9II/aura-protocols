import { describe, it, expect, vi, beforeEach } from "vitest";

const getOrderById = vi.fn();
const getOrderByPaymentIntent = vi.fn();
const transitionOrder = vi.fn();
const sendOrAlert = vi.fn();
const alertOwner = vi.fn();
vi.mock("@/lib/orders", () => ({ getOrderById, getOrderByPaymentIntent, transitionOrder }));
vi.mock("@/lib/notify", () => ({ sendOrAlert, alertOwner, alertAddress: () => "owner@example.com" }));

const order = (status: string) => ({ id: "o1", order_number: "AP-1001", email: "j@lab.org", status, order_items: [], total_cents: 11300,
  ship_name: "J", ship_line1: "1", ship_line2: null, ship_city: "A", ship_state: "TX", ship_zip: "78701", subtotal_cents: 9800, shipping_cents: 1500, tax_cents: 0 });
const session = (over: Record<string, unknown> = {}) => ({ object: "checkout.session", id: "cs_1", metadata: { order_id: "o1" }, payment_status: "paid",
  amount_total: 12108, total_details: { amount_tax: 808 }, payment_intent: "pi_1", ...over });
const ev = (type: string, object: unknown) => ({ id: "evt_1", type, data: { object } }) as never;

describe("handleStripeEvent", () => {
  beforeEach(() => { vi.resetModules(); for (const f of [getOrderById, getOrderByPaymentIntent, transitionOrder, sendOrAlert, alertOwner]) f.mockReset(); transitionOrder.mockResolvedValue(true); });

  it("card payment completed → paid with Stripe's tax and total, then emails customer and owner", async () => {
    getOrderById.mockResolvedValueOnce(order("awaiting_payment")).mockResolvedValueOnce({ ...order("paid"), tax_cents: 808, total_cents: 12108 });
    const { handleStripeEvent } = await import("@/lib/stripe-events");
    await handleStripeEvent(ev("checkout.session.completed", session()));
    expect(transitionOrder).toHaveBeenCalledWith("o1", "awaiting_payment", "paid", { tax_cents: 808, total_cents: 12108, stripe_payment_intent: "pi_1" });
    expect(sendOrAlert).toHaveBeenCalledTimes(2);
    expect(sendOrAlert.mock.calls[0][0]).toMatchObject({ to: "j@lab.org", subject: "Order AP-1001 confirmed" });
    expect(sendOrAlert.mock.calls[1][0]).toMatchObject({ to: "owner@example.com" });
  });

  it("bank payment submitted (unpaid) → processing, no emails", async () => {
    getOrderById.mockResolvedValue(order("awaiting_payment"));
    const { handleStripeEvent } = await import("@/lib/stripe-events");
    await handleStripeEvent(ev("checkout.session.completed", session({ payment_status: "unpaid" })));
    expect(transitionOrder).toHaveBeenCalledWith("o1", "awaiting_payment", "processing", { stripe_payment_intent: "pi_1" });
    expect(sendOrAlert).not.toHaveBeenCalled();
  });

  it("bank payment succeeds later → paid; fails → cancelled + customer email", async () => {
    getOrderById.mockResolvedValue(order("processing"));
    const { handleStripeEvent } = await import("@/lib/stripe-events");
    await handleStripeEvent(ev("checkout.session.async_payment_succeeded", session()));
    expect(transitionOrder).toHaveBeenCalledWith("o1", "processing", "paid", expect.any(Object));
    transitionOrder.mockClear(); sendOrAlert.mockClear();
    await handleStripeEvent(ev("checkout.session.async_payment_failed", session({ payment_status: "unpaid" })));
    expect(transitionOrder).toHaveBeenCalledWith("o1", "processing", "cancelled");
    expect(sendOrAlert.mock.calls[0][0].subject).toMatch(/didn't go through/);
  });

  it("an already-paid order is not paid twice", async () => {
    getOrderById.mockResolvedValue(order("paid"));
    const { handleStripeEvent } = await import("@/lib/stripe-events");
    await handleStripeEvent(ev("checkout.session.completed", session()));
    expect(transitionOrder).not.toHaveBeenCalled();
    expect(sendOrAlert).not.toHaveBeenCalled();
  });

  it("expired session → cancelled quietly; full refund → refunded", async () => {
    getOrderById.mockResolvedValue(order("awaiting_payment"));
    const { handleStripeEvent } = await import("@/lib/stripe-events");
    await handleStripeEvent(ev("checkout.session.expired", session({ payment_status: "unpaid" })));
    expect(transitionOrder).toHaveBeenCalledWith("o1", "awaiting_payment", "cancelled");
    getOrderByPaymentIntent.mockResolvedValue(order("shipped"));
    await handleStripeEvent(ev("charge.refunded", { object: "charge", refunded: true, payment_intent: "pi_1" }));
    expect(transitionOrder).toHaveBeenLastCalledWith("o1", "shipped", "refunded");
  });

  it("throws for a paid session whose order can't be found (so it's retried and alerted)", async () => {
    getOrderById.mockResolvedValue(null);
    const { handleStripeEvent } = await import("@/lib/stripe-events");
    await expect(handleStripeEvent(ev("checkout.session.completed", session()))).rejects.toThrow(/order o1 not found/);
  });
});
