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
const recordDispute = vi.fn();
const recordDisputeCard = vi.fn();
const recordFunds = vi.fn();
const logDisputeEvent = vi.fn();
const recordWarning = vi.fn();
const resolveWarningsForCharge = vi.fn();
const fetchChargeInfo = vi.fn();
vi.mock("@/lib/partners/data", () => ({ getPartnerById }));
vi.mock("@/lib/orders", () => ({ getOrderById, getOrderByPaymentIntent, transitionOrder }));
vi.mock("@/lib/notify", () => ({ sendOrAlert, alertOwner, alertAddress: () => "owner@example.com" }));
vi.mock("@/lib/order-paid", () => ({ afterOrderPaid }));
vi.mock("@/lib/commerce", () => ({ getCommerceAdapter: () => ({ reverseTax }) }));
vi.mock("@/lib/partners/ledger", () => ({ reverseCommission, refundCredit }));
vi.mock("@/lib/disputes/data", () => ({ recordDispute, recordDisputeCard, recordFunds, logDisputeEvent, recordWarning, resolveWarningsForCharge }));
vi.mock("@/lib/disputes/stripe", () => ({ fetchChargeInfo }));

const order = (status: string, over: Record<string, unknown> = {}) => ({ id: "o1", order_number: "AP-1001", customer_id: "u1", email: "j@lab.org", status, order_items: [], total_cents: 11850,
  ship_name: "J", ship_line1: "1", ship_line2: null, ship_city: "A", ship_state: "TX", ship_zip: "78701", subtotal_cents: 9800, shipping_cents: 1500, insurance_cents: 550, tax_cents: 0,
  store_credit_cents: 0, tax_calculation_id: null, tax_transaction_id: null, ...over });
const session = (over: Record<string, unknown> = {}) => ({ object: "checkout.session", id: "cs_1", metadata: { order_id: "o1" }, payment_status: "paid",
  amount_total: 12658, total_details: { amount_tax: 808 }, payment_intent: "pi_1", ...over });
const ev = (type: string, object: unknown) => ({ id: "evt_1", type, data: { object } }) as never;

describe("handleStripeEvent", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const f of [getOrderById, getOrderByPaymentIntent, transitionOrder, sendOrAlert, alertOwner, afterOrderPaid, reverseCommission, refundCredit, reverseTax, getPartnerById,
      recordDispute, recordDisputeCard, recordFunds, logDisputeEvent, recordWarning, resolveWarningsForCharge, fetchChargeInfo]) f.mockReset();
    transitionOrder.mockResolvedValue(true);
    recordDispute.mockResolvedValue("d1");
    fetchChargeInfo.mockResolvedValue({ cardBrand: "visa", cardLast4: "4242", billingAddress: null, paymentIntent: "pi_1" });
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
    expect(alertOwner).toHaveBeenCalledWith("Tax transaction not reversed", expect.stringMatching(/^AP-1001: [\s\S]*stripe down/));
  });

  it("a failed commission reversal alerts by name and still runs the credit and tax steps", async () => {
    getOrderByPaymentIntent.mockResolvedValue(order("shipped", { store_credit_cents: 5000, tax_transaction_id: "tax_txn_1" }));
    reverseCommission.mockRejectedValue(new Error("db down"));
    const { handleStripeEvent } = await import("@/lib/stripe-events");
    await expect(handleStripeEvent(ev("charge.refunded", { object: "charge", refunded: true, payment_intent: "pi_1" }))).resolves.toBeUndefined();
    expect(alertOwner).toHaveBeenCalledWith("Commission not reversed", expect.stringMatching(/^AP-1001: [\s\S]*db down/));
    expect(refundCredit).toHaveBeenCalledWith("u1", 5000, "o1");
    expect(reverseTax).toHaveBeenCalledWith("tax_txn_1");
  });

  it("a partial refund leaves the order and its commission untouched", async () => {
    getOrderByPaymentIntent.mockResolvedValue(order("paid"));
    const { handleStripeEvent } = await import("@/lib/stripe-events");
    await handleStripeEvent(ev("charge.refunded", { object: "charge", refunded: false, payment_intent: "pi_1" }));
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

  it("throws for a full refund whose order isn't matched yet, so Stripe retries it", async () => {
    getOrderByPaymentIntent.mockResolvedValue(null);
    const { handleStripeEvent } = await import("@/lib/stripe-events");
    await expect(handleStripeEvent(ev("charge.refunded", { object: "charge", refunded: true, payment_intent: "pi_9" })))
      .rejects.toThrow(/pi_9/);
  });

  it("tells the owner about a partial refund (commission stays at the full amount)", async () => {
    getOrderByPaymentIntent.mockResolvedValue(order("shipped"));
    const { handleStripeEvent } = await import("@/lib/stripe-events");
    await handleStripeEvent(ev("charge.refunded", { object: "charge", refunded: false, amount_refunded: 2000, payment_intent: "pi_1" }));
    expect(transitionOrder).not.toHaveBeenCalled();
    expect(reverseCommission).not.toHaveBeenCalled();
    expect(alertOwner).toHaveBeenCalledWith(expect.stringMatching(/partial refund/i), expect.stringContaining("$20.00"));
  });

  it("alerts the owner when a payment arrives for an order that was already cancelled", async () => {
    getOrderById.mockResolvedValue(order("cancelled"));
    const { handleStripeEvent } = await import("@/lib/stripe-events");
    await handleStripeEvent(ev("checkout.session.completed", session()));
    expect(transitionOrder).not.toHaveBeenCalled();
    expect(alertOwner).toHaveBeenCalledWith("Payment received for a closed order", expect.stringMatching(/AP-1001[\s\S]*is cancelled/));
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

  // ---------- disputes and early fraud warnings (Part 6) ----------
  const dispute = (o: Record<string, unknown> = {}) => ({
    object: "dispute", id: "dp_1", amount: 41200, currency: "usd", reason: "product_not_received", status: "needs_response",
    charge: "ch_1", payment_intent: "pi_1", created: 1790892720,
    evidence_details: { due_by: 1791590399, submission_count: 0 }, balance_transactions: [{ fee: 1500 }], ...o,
  });
  const at = (type: string, object: unknown) => ({ id: "evt_2", type, created: 1790892725, data: { object } }) as never;

  it("chargeback opened → recorded, logged once, card details kept, its early warning closed, alert with reason, amount and deadline", async () => {
    getOrderByPaymentIntent.mockResolvedValue(order("shipped"));
    const { handleStripeEvent } = await import("@/lib/stripe-events");
    await handleStripeEvent(at("charge.dispute.created", dispute()));
    expect(recordDispute).toHaveBeenCalledWith(expect.objectContaining({ p_stripe_id: "dp_1", p_order: "o1", p_status: "needs_response", p_event_at: "2026-10-01T22:12:05.000Z" }));
    expect(logDisputeEvent).toHaveBeenCalledWith({ disputeId: "d1", action: "opened", note: "product_not_received", key: "opened:dp_1" });
    expect(fetchChargeInfo).toHaveBeenCalledWith("ch_1");
    expect(recordDisputeCard).toHaveBeenCalledWith("d1", { cardBrand: "visa", cardLast4: "4242", billingAddress: null, paymentIntent: "pi_1" });
    expect(resolveWarningsForCharge).toHaveBeenCalledWith("ch_1");
    expect(alertOwner).toHaveBeenCalledWith("Chargeback opened", "Order AP-1001 · Not received · $412.00 · respond by Oct 9. The evidence is ready in Disputes: review it, then submit it to Stripe before the deadline.");
  });

  it("a replayed chargeback event writes the same keyed rows (no duplicates)", async () => {
    getOrderByPaymentIntent.mockResolvedValue(order("shipped"));
    const { handleStripeEvent } = await import("@/lib/stripe-events");
    await handleStripeEvent(at("charge.dispute.created", dispute()));
    await handleStripeEvent(at("charge.dispute.created", dispute()));
    expect(recordDispute.mock.calls[0]).toEqual(recordDispute.mock.calls[1]);
    expect(logDisputeEvent.mock.calls.map((c) => c[0].key)).toEqual(["opened:dp_1", "opened:dp_1"]);
  });

  it("dispute updated → refreshed only; closed → logged once and the owner alerted with the outcome", async () => {
    getOrderByPaymentIntent.mockResolvedValue(order("shipped"));
    const { handleStripeEvent } = await import("@/lib/stripe-events");
    await handleStripeEvent(at("charge.dispute.updated", dispute({ status: "under_review", evidence_details: { due_by: 1791590399, submission_count: 1 } })));
    expect(recordDispute).toHaveBeenCalledWith(expect.objectContaining({ p_status: "under_review", p_submitted: true }));
    expect(logDisputeEvent).not.toHaveBeenCalled();
    expect(alertOwner).not.toHaveBeenCalled();
    await handleStripeEvent(at("charge.dispute.closed", dispute({ status: "won" })));
    expect(logDisputeEvent).toHaveBeenCalledWith({ disputeId: "d1", action: "closed", note: "Won · $412.00 returned", key: "closed:dp_1" });
    expect(alertOwner).toHaveBeenCalledWith("Chargeback decided", "Order AP-1001 · Won · $412.00 returned. See it in Disputes.");
    expect(reverseCommission).not.toHaveBeenCalled();
  });

  it("funds withdrawn / reinstated are recorded once with the event time", async () => {
    getOrderByPaymentIntent.mockResolvedValue(order("shipped"));
    const { handleStripeEvent } = await import("@/lib/stripe-events");
    await handleStripeEvent(at("charge.dispute.funds_withdrawn", dispute()));
    expect(recordFunds).toHaveBeenCalledWith("d1", "withdrawn", "2026-10-01T22:12:05.000Z");
    expect(logDisputeEvent).toHaveBeenCalledWith({ disputeId: "d1", action: "funds_withdrawn", note: "$412.00 + $15.00 fee", key: "funds_withdrawn:dp_1" });
    await handleStripeEvent(at("charge.dispute.funds_reinstated", dispute()));
    expect(recordFunds).toHaveBeenCalledWith("d1", "reinstated", "2026-10-01T22:12:05.000Z");
  });

  it("a dispute update whose order isn't matched yet throws, so Stripe retries it", async () => {
    getOrderByPaymentIntent.mockResolvedValue(null);
    const { handleStripeEvent } = await import("@/lib/stripe-events");
    await expect(handleStripeEvent(at("charge.dispute.closed", dispute()))).rejects.toThrow(/pi_1/);
    expect(recordDispute).not.toHaveBeenCalled();
  });

  it("early fraud warning → recorded and the owner told the next step; an update doesn't alert again", async () => {
    getOrderByPaymentIntent.mockResolvedValue(order("paid", { total_cents: 18450 }));
    const w = { object: "radar.early_fraud_warning", id: "issfr_1", charge: "ch_2", payment_intent: "pi_2", fraud_type: "unauthorized_use_of_card", actionable: true, created: 1790892725 };
    const { handleStripeEvent } = await import("@/lib/stripe-events");
    await handleStripeEvent(at("radar.early_fraud_warning.created", w));
    expect(getOrderByPaymentIntent).toHaveBeenCalledWith("pi_2");
    expect(recordWarning).toHaveBeenCalledWith({ stripe_efw_id: "issfr_1", order_id: "o1", charge_id: "ch_2", fraud_type: "unauthorized_use_of_card", actionable: true, created_at: "2026-10-01T22:12:05.000Z" });
    expect(alertOwner).toHaveBeenCalledWith("Early fraud warning", "Order AP-1001 · Unauthorized use of card · $184.50 · Not shipped yet: cancel and refund it in Disputes to avoid a chargeback.");
    alertOwner.mockClear();
    await handleStripeEvent(at("radar.early_fraud_warning.updated", { ...w, actionable: false }));
    expect(recordWarning).toHaveBeenLastCalledWith(expect.objectContaining({ actionable: false }));
    expect(alertOwner).not.toHaveBeenCalled();
  });

  it("a warning without a payment intent is matched through its charge; unmatched throws", async () => {
    fetchChargeInfo.mockResolvedValue({ cardBrand: null, cardLast4: null, billingAddress: null, paymentIntent: "pi_3" });
    getOrderByPaymentIntent.mockResolvedValue(null);
    const { handleStripeEvent } = await import("@/lib/stripe-events");
    await expect(handleStripeEvent(at("radar.early_fraud_warning.created", { id: "issfr_2", charge: "ch_3", fraud_type: "misc", actionable: true, created: 1790892725 })))
      .rejects.toThrow(/early fraud warning on pi_3: no order matched yet/);
    expect(fetchChargeInfo).toHaveBeenCalledWith("ch_3");
    expect(recordWarning).not.toHaveBeenCalled();
  });
});
