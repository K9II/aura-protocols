import { describe, it, expect } from "vitest";
import { REFUND_REASONS, REFUND_REASON_LABEL, refundOffer, splitRefund, parseRefund, REFUND_NOTE_MAX, stripeNoAnswer } from "@/lib/refunds/rules";

const base = { status: "paid" as const, kind: "sale" as const, total_cents: 22800, store_credit_cents: 4000, stripe_payment_intent: "pi_1" };
const get = (v: Record<string, string>) => (k: string) => v[k] ?? null;

describe("refund rules", () => {
  it("reasons in mock order", () => {
    expect(REFUND_REASONS).toEqual(["customer_cancelled", "damaged", "not_received", "wrong_item", "goodwill", "other"]);
    expect(REFUND_REASON_LABEL.customer_cancelled).toBe("Customer asked to cancel");
    expect(REFUND_REASON_LABEL.damaged).toBe("Damaged in transit");
  });
  it("offers Cancel and refund before shipping, the exception after, nothing otherwise", () => {
    expect(refundOffer(base, { dispute: false, warning: false, lostDispute: false })).toEqual({ mode: "cancel" });
    expect(refundOffer({ ...base, status: "shipped" }, { dispute: false, warning: false, lostDispute: false })).toEqual({ mode: "exception" });
    expect(refundOffer({ ...base, status: "refunded" }, { dispute: false, warning: false, lostDispute: false })).toEqual({ mode: null });
    expect(refundOffer({ ...base, status: "awaiting_payment" }, { dispute: false, warning: false, lostDispute: false })).toEqual({ mode: null });
    expect(refundOffer({ ...base, kind: "no_charge" }, { dispute: false, warning: false, lostDispute: false })).toEqual({ mode: null });
    expect(refundOffer(base, { dispute: true, warning: false, lostDispute: false })).toEqual({ mode: null, blockedBy: "dispute" });
    expect(refundOffer(base, { dispute: false, warning: true, lostDispute: false })).toEqual({ mode: null, blockedBy: "warning" });
    // A lost chargeback: the bank already returned the money — never refund it again.
    expect(refundOffer(base, { dispute: false, warning: false, lostDispute: true })).toEqual({ mode: null, blockedBy: "dispute_lost" });
    expect(refundOffer({ ...base, status: "shipped" }, { dispute: false, warning: true, lostDispute: true })).toEqual({ mode: null, blockedBy: "dispute_lost" });
  });
  it("splits the money by destination", () => {
    expect(splitRefund(base, "card")).toEqual({ cardCents: 18800, creditBackCents: 4000, cardToCreditCents: 0, totalCents: 22800 });
    expect(splitRefund(base, "store_credit")).toEqual({ cardCents: 0, creditBackCents: 4000, cardToCreditCents: 18800, totalCents: 22800 });
    const creditOnly = { ...base, store_credit_cents: 22800, stripe_payment_intent: null };
    expect(splitRefund(creditOnly, "card")).toEqual({ cardCents: 0, creditBackCents: 22800, cardToCreditCents: 0, totalCents: 22800 });
  });
  it("parses the cancel form: reason defaults allowed, note optional", () => {
    expect(parseRefund(get({ reason: "customer_cancelled" }), "cancel", true)).toEqual({ ok: true, value: { reason: "customer_cancelled", note: null, destination: "card" } });
    expect(parseRefund(get({ reason: "bogus" }), "cancel", true)).toMatchObject({ ok: false, errors: { reason: "Pick a reason." } });
  });
  it("the exception needs a note, a destination and the policy box", () => {
    expect(parseRefund(get({ reason: "goodwill", destination: "store_credit" }), "exception", true)).toMatchObject({ ok: false, errors: { note: "Say why this order is an exception.", confirm: "Tick the box to confirm the exception." } });
    expect(parseRefund(get({ reason: "goodwill", destination: "store_credit", note: "held 3 weeks", confirm: "on" }), "exception", true))
      .toEqual({ ok: true, value: { reason: "goodwill", note: "held 3 weeks", destination: "store_credit" } });
    expect(parseRefund(get({ reason: "goodwill", destination: "card", note: "x", confirm: "on" }), "exception", false)).toMatchObject({ ok: false, errors: { destination: "This order has no card payment — refund it to store credit." } });
    expect(parseRefund(get({ reason: "other", note: "x".repeat(REFUND_NOTE_MAX + 1), destination: "store_credit", confirm: "on" }), "exception", true)).toMatchObject({ ok: false, errors: { note: `Keep it under ${REFUND_NOTE_MAX} characters.` } });
  });
  it("a credit-only order always refunds to store credit", () => {
    expect(parseRefund(get({ reason: "customer_cancelled" }), "cancel", false)).toEqual({ ok: true, value: { reason: "customer_cancelled", note: null, destination: "store_credit" } });
  });
  it("stripeNoAnswer: a connection or API error may have refunded; a card/invalid-request error didn't", () => {
    expect(stripeNoAnswer({ type: "StripeConnectionError" })).toBe(true);
    expect(stripeNoAnswer({ type: "StripeAPIError" })).toBe(true);
    expect(stripeNoAnswer({ type: "StripeInvalidRequestError" })).toBe(false);
    expect(stripeNoAnswer({ type: "StripeCardError" })).toBe(false);
    expect(stripeNoAnswer(new Error("x"))).toBe(false);
    expect(stripeNoAnswer(null)).toBe(false);
  });
});
