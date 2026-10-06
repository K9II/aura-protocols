import { describe, it, expect } from "vitest";
import type Stripe from "stripe";
import { chargeInfo, disputeParams, eventAt, feeCents, idOf, warningParams } from "@/lib/disputes/stripe-map";

const dispute = (o: Record<string, unknown> = {}) => ({
  id: "dp_1", object: "dispute", amount: 41200, currency: "usd", reason: "product_not_received", status: "needs_response",
  charge: "ch_1", payment_intent: "pi_1", created: 1790892720,
  evidence_details: { due_by: 1791590399, submission_count: 0, has_evidence: false, past_due: false },
  balance_transactions: [{ fee: 1500 }], ...o,
}) as unknown as Stripe.Dispute;

describe("Stripe → dispute rows", () => {
  it("maps a dispute to record_dispute's parameters", () => {
    expect(disputeParams(dispute(), "o1", "2026-10-01T22:12:05.000Z")).toEqual({
      p_stripe_id: "dp_1", p_order: "o1", p_charge: "ch_1", p_pi: "pi_1", p_amount: 41200, p_currency: "usd", p_reason: "product_not_received",
      p_status: "needs_response", p_due: "2026-10-09T23:59:59.000Z", p_submitted: false, p_fee: 1500,
      p_opened: "2026-10-01T22:12:00.000Z", p_event_at: "2026-10-01T22:12:05.000Z",
    });
    expect(disputeParams(dispute({ evidence_details: { due_by: null, submission_count: 1 }, payment_intent: { id: "pi_2" }, charge: { id: "ch_2" } }), "o1", "x"))
      .toMatchObject({ p_due: null, p_submitted: true, p_pi: "pi_2", p_charge: "ch_2" });
    expect(feeCents(dispute({ balance_transactions: [{ fee: 1500 }, { fee: -1500 }] }))).toBe(0);
  });

  it("the event time comes from the event", () => {
    expect(eventAt({ created: 1790892725 })).toBe("2026-10-01T22:12:05.000Z");
  });

  it("charge info: card and billing address when Stripe has them", () => {
    expect(chargeInfo({
      payment_intent: "pi_1", payment_method_details: { card: { brand: "visa", last4: "4242" } },
      billing_details: { name: "Dana Whitfield", address: { line1: "1420 Elm St", line2: null, city: "Boulder", state: "CO", postal_code: "80302", country: "US" } },
    } as unknown as Stripe.Charge)).toEqual({ cardBrand: "visa", cardLast4: "4242", billingAddress: "Dana Whitfield, 1420 Elm St, Boulder, CO 80302, US", paymentIntent: "pi_1" });
    expect(chargeInfo({
      payment_intent: null, billing_details: { name: "X", address: { line1: null, line2: null, city: null, state: null, postal_code: null, country: null } },
    } as unknown as Stripe.Charge)).toEqual({ cardBrand: null, cardLast4: null, billingAddress: null, paymentIntent: null });
  });

  it("maps an early fraud warning", () => {
    expect(warningParams({ id: "issfr_1", charge: "ch_2", fraud_type: "unauthorized_use_of_card", actionable: true, created: 1790892725 } as unknown as Stripe.Radar.EarlyFraudWarning, "o2"))
      .toEqual({ stripe_efw_id: "issfr_1", order_id: "o2", charge_id: "ch_2", fraud_type: "unauthorized_use_of_card", actionable: true, created_at: "2026-10-01T22:12:05.000Z" });
    expect(idOf(null)).toBeNull();
    expect(idOf({ id: "x" })).toBe("x");
  });
});
