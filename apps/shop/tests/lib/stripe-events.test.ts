import { describe, it, expect, vi, beforeEach } from "vitest";

const getOrderById = vi.fn();
const getOrderByPaymentIntent = vi.fn();
const transitionOrder = vi.fn();
const sendOrAlert = vi.fn();
const alertOwner = vi.fn();
const afterOrderPaid = vi.fn();
const reverseCommission = vi.fn();
const refundCredit = vi.fn();
const reverseTax = vi.fn();
const getPartnerById = vi.fn();
vi.mock("@/lib/partners/data", () => ({ getPartnerById }));
vi.mock("@/lib/orders", () => ({ getOrderById, getOrderByPaymentIntent, transitionOrder }));
vi.mock("@/lib/notify", () => ({ sendOrAlert, alertOwner, alertAddress: () => "owner@example.com" }));
vi.mock("@/lib/order-paid", () => ({ afterOrderPaid }));
vi.mock("@/lib/commerce", () => ({ getCommerceAdapter: () => ({ reverseTax }) }));
vi.mock("@/lib/partners/ledger", () => ({ reverseCommission, refundCredit }));

const order = (status: string, over: Record<string, unknown> = {}) => ({ id: "o1", order_number: "AP-1001", customer_id: "u1", email: "j@lab.org", status, order_items: [], total_cents: 11850,
  ship_name: "J", ship_line1: "1", ship_line2: null, ship_city: "A", ship_state: "TX", ship_zip: "78701", subtotal_cents: 9800, shipping_cents: 1500, insurance_cents: 550, tax_cents: 0,
  store_credit_cents: 0, tax_calculation_id: null, tax_transaction_id: null, ...over });
const session = (over: Record<string, unknown> = {}) => ({ object: "checkout.session", id: "cs_1", metadata: { order_id: "o1" }, payment_status: "paid",
  amount_total: 12658, total_details: { amount_tax: 808 }, payment_intent: "pi_1", ...over });
const ev = (type: string, object: unknown) => ({ id: "evt_1", type, data: { object } }) as never;

describe("handleStripeEvent", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const f of [getOrderById, getOrderByPaymentIntent, transitionOrder, sendOrAlert, alertOwner, afterOrderPaid, reverseCommission, refundCredit, reverseTax, getPartnerById]) f.mockReset();
    transitionOrder.mockResolvedValue(true);
  });

  it("card payment completed → paid with Stripe's tax and total, then the after-payment steps", async () => {
    getOrderById.mockResolvedValue(order("awaiting_payment"));
    const { handleStripeEvent } = await import("@/lib/stripe-events");
    await handleStripeEvent(ev("checkout.session.completed", session()));
    expect(transitionOrder).toHaveBeenCalledWith("o1", "awaiting_payment", "paid", { tax_cents: 808, total_cents: 12658, stripe_payment_intent: "pi_1" });
    expect(afterOrderPaid).toHaveBeenCalledWith("o1");
  });

  it("keeps the pre-computed tax and total on store-credit orders", async () => {
    getOrderById.mockResolvedValue(order("awaiting_payment", { tax_calculation_id: "taxcalc_1", tax_cents: 426, total_cents: 7376, store_credit_cents: 7326 }));
    const { handleStripeEvent } = await import("@/lib/stripe-events");
    await handleStripeEvent(ev("checkout.session.completed", session({ amount_total: 50, total_details: { amount_tax: 0 } })));
    expect(transitionOrder).toHaveBeenCalledWith("o1", "awaiting_payment", "paid", { stripe_payment_intent: "pi_1" });
  });

  it("bank payment submitted (unpaid) → processing, nothing else", async () => {
    getOrderById.mockResolvedValue(order("awaiting_payment"));
    const { handleStripeEvent } = await import("@/lib/stripe-events");
    await handleStripeEvent(ev("checkout.session.completed", session({ payment_status: "unpaid" })));
    expect(transitionOrder).toHaveBeenCalledWith("o1", "awaiting_payment", "processing", { stripe_payment_intent: "pi_1" });
    expect(afterOrderPaid).not.toHaveBeenCalled();
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
    expect(afterOrderPaid).not.toHaveBeenCalled();
  });

  it("expired session → cancelled quietly", async () => {
    getOrderById.mockResolvedValue(order("awaiting_payment"));
    const { handleStripeEvent } = await import("@/lib/stripe-events");
    await handleStripeEvent(ev("checkout.session.expired", session({ payment_status: "unpaid" })));
    expect(transitionOrder).toHaveBeenCalledWith("o1", "awaiting_payment", "cancelled");
  });

  it("full refund → refunded, commission reversed, store credit returned", async () => {
    getOrderByPaymentIntent.mockResolvedValue(order("shipped", { store_credit_cents: 5000 }));
    const { handleStripeEvent } = await import("@/lib/stripe-events");
    await handleStripeEvent(ev("charge.refunded", { object: "charge", refunded: true, payment_intent: "pi_1" }));
    expect(transitionOrder).toHaveBeenLastCalledWith("o1", "shipped", "refunded");
    expect(reverseCommission).toHaveBeenCalledWith("o1", "refund");
    expect(refundCredit).toHaveBeenCalledWith("u1", 5000, "o1");
    expect(reverseTax).not.toHaveBeenCalled();
  });

  it("full refund of a store-credit order reverses its recorded tax transaction", async () => {
    getOrderByPaymentIntent.mockResolvedValue(order("shipped", { tax_transaction_id: "tax_txn_1" }));
    const { handleStripeEvent } = await import("@/lib/stripe-events");
    await handleStripeEvent(ev("charge.refunded", { object: "charge", refunded: true, payment_intent: "pi_1" }));
    expect(reverseTax).toHaveBeenCalledWith("tax_txn_1");
  });

  it("does not reverse tax when only the (spent) calculation id is set, not a recorded transaction id", async () => {
    getOrderByPaymentIntent.mockResolvedValue(order("shipped", { tax_calculation_id: "taxcalc_1", tax_transaction_id: null }));
    const { handleStripeEvent } = await import("@/lib/stripe-events");
    await handleStripeEvent(ev("charge.refunded", { object: "charge", refunded: true, payment_intent: "pi_1" }));
    expect(reverseTax).not.toHaveBeenCalled();
  });

  it("a failed tax reversal alerts the owner by name and does not throw", async () => {
    getOrderByPaymentIntent.mockResolvedValue(order("shipped", { tax_transaction_id: "tax_txn_1" }));
    reverseTax.mockRejectedValue(new Error("stripe down"));
    const { handleStripeEvent } = await import("@/lib/stripe-events");
    await expect(handleStripeEvent(ev("charge.refunded", { object: "charge", refunded: true, payment_intent: "pi_1" }))).resolves.toBeUndefined();
    expect(alertOwner).toHaveBeenCalledWith("Tax transaction not reversed for AP-1001", expect.stringContaining("stripe down"));
  });

  it("a failed commission reversal alerts by name and still runs the credit and tax steps", async () => {
    getOrderByPaymentIntent.mockResolvedValue(order("shipped", { store_credit_cents: 5000, tax_transaction_id: "tax_txn_1" }));
    reverseCommission.mockRejectedValue(new Error("db down"));
    const { handleStripeEvent } = await import("@/lib/stripe-events");
    await expect(handleStripeEvent(ev("charge.refunded", { object: "charge", refunded: true, payment_intent: "pi_1" }))).resolves.toBeUndefined();
    expect(alertOwner).toHaveBeenCalledWith("Commission not reversed for AP-1001", expect.stringContaining("db down"));
    expect(refundCredit).toHaveBeenCalledWith("u1", 5000, "o1");
    expect(reverseTax).toHaveBeenCalledWith("tax_txn_1");
  });

  it("a partial refund leaves the order and its commission untouched", async () => {
    const { handleStripeEvent } = await import("@/lib/stripe-events");
    await handleStripeEvent(ev("charge.refunded", { object: "charge", refunded: false, payment_intent: "pi_1" }));
    expect(getOrderByPaymentIntent).not.toHaveBeenCalled();
    expect(transitionOrder).not.toHaveBeenCalled();
    expect(reverseCommission).not.toHaveBeenCalled();
    expect(reverseTax).not.toHaveBeenCalled();
  });

  it("a retried refund event on an already-refunded order still runs the idempotent follow-up steps", async () => {
    getOrderByPaymentIntent.mockResolvedValue(order("refunded", { store_credit_cents: 5000, tax_transaction_id: "tax_txn_1" }));
    const { handleStripeEvent } = await import("@/lib/stripe-events");
    await handleStripeEvent(ev("charge.refunded", { object: "charge", refunded: true, payment_intent: "pi_1" }));
    expect(transitionOrder).not.toHaveBeenCalled();
    expect(reverseCommission).toHaveBeenCalledWith("o1", "refund");
    expect(refundCredit).toHaveBeenCalledWith("u1", 5000, "o1");
    expect(reverseTax).toHaveBeenCalledWith("tax_txn_1");
  });

  it("chargeback opened → commission reversed and the owner alerted; order status unchanged", async () => {
    getOrderByPaymentIntent.mockResolvedValue(order("shipped"));
    const { handleStripeEvent } = await import("@/lib/stripe-events");
    await handleStripeEvent(ev("charge.dispute.created", { object: "dispute", payment_intent: "pi_1", reason: "fraudulent" }));
    expect(reverseCommission).toHaveBeenCalledWith("o1", "chargeback");
    expect(transitionOrder).not.toHaveBeenCalled();
    expect(alertOwner).toHaveBeenCalledWith(expect.stringContaining("Chargeback"), expect.stringContaining("AP-1001"));
  });

  it("alerts the owner when a payment arrives for an order that was already cancelled", async () => {
    getOrderById.mockResolvedValue(order("cancelled"));
    const { handleStripeEvent } = await import("@/lib/stripe-events");
    await handleStripeEvent(ev("checkout.session.completed", session()));
    expect(transitionOrder).not.toHaveBeenCalled();
    expect(alertOwner).toHaveBeenCalledWith(expect.stringMatching(/cancelled order/i), expect.stringContaining("AP-1001"));
  });

  it("throws for a dispute whose order isn't matched yet, so Stripe retries it", async () => {
    getOrderByPaymentIntent.mockResolvedValue(null);
    const { handleStripeEvent } = await import("@/lib/stripe-events");
    await expect(handleStripeEvent(ev("charge.dispute.created", { object: "dispute", payment_intent: "pi_1", reason: "fraudulent" })))
      .rejects.toThrow(/pi_1/);
    expect(alertOwner).not.toHaveBeenCalled();
  });

  it("throws (before alerting) when a partner order's commission isn't recorded yet, so the retry reverses it", async () => {
    getOrderByPaymentIntent.mockResolvedValue(order("paid", { partner_id: "p1", attributed_by: "code" }));
    reverseCommission.mockResolvedValue("none");
    getPartnerById.mockResolvedValue({ id: "p1", status: "approved" });
    const { handleStripeEvent } = await import("@/lib/stripe-events");
    await expect(handleStripeEvent(ev("charge.dispute.created", { object: "dispute", payment_intent: "pi_1", reason: "fraudulent" })))
      .rejects.toThrow(/AP-1001/);
    expect(alertOwner).not.toHaveBeenCalled();
  });

  it("alerts without retrying when the order's partner was never approved (no commission is expected)", async () => {
    getOrderByPaymentIntent.mockResolvedValue(order("paid", { partner_id: "p1", attributed_by: "code" }));
    reverseCommission.mockResolvedValue("none");
    getPartnerById.mockResolvedValue({ id: "p1", status: "suspended" });
    const { handleStripeEvent } = await import("@/lib/stripe-events");
    await handleStripeEvent(ev("charge.dispute.created", { object: "dispute", payment_intent: "pi_1", reason: "fraudulent" }));
    expect(alertOwner).toHaveBeenCalledWith(expect.stringContaining("Chargeback"), expect.stringContaining("AP-1001"));
  });

  it("throws for a paid session whose order can't be found (so it's retried and alerted)", async () => {
    getOrderById.mockResolvedValue(null);
    const { handleStripeEvent } = await import("@/lib/stripe-events");
    await expect(handleStripeEvent(ev("checkout.session.completed", session()))).rejects.toThrow(/order o1 not found/);
  });
});
