// Stripe objects → our rows. Pure (type-only Stripe import).
import type Stripe from "stripe";

export const idOf = (x: string | { id: string } | null | undefined): string | null => (typeof x === "string" ? x : x?.id ?? null);
const iso = (unix: number): string => new Date(unix * 1000).toISOString();

// Stripe event time, used to ignore events older than the one already applied.
export const eventAt = (e: { created?: number }): string => (e.created ? iso(e.created) : new Date().toISOString());

// Net fee from the dispute's balance transactions (a reinstatement can return it).
export const feeCents = (d: Stripe.Dispute): number => (d.balance_transactions ?? []).reduce((s, bt) => s + (bt?.fee ?? 0), 0);

export type DisputeParams = {
  p_stripe_id: string; p_order: string; p_charge: string; p_pi: string | null; p_amount: number; p_currency: string;
  p_reason: string; p_status: string; p_due: string | null; p_submitted: boolean; p_fee: number; p_opened: string; p_event_at: string;
};
export function disputeParams(d: Stripe.Dispute, orderId: string, eventAtIso: string): DisputeParams {
  return {
    p_stripe_id: d.id, p_order: orderId, p_charge: idOf(d.charge) ?? "", p_pi: idOf(d.payment_intent),
    p_amount: d.amount, p_currency: d.currency, p_reason: d.reason, p_status: d.status,
    p_due: d.evidence_details?.due_by ? iso(d.evidence_details.due_by) : null,
    p_submitted: (d.evidence_details?.submission_count ?? 0) > 0,
    p_fee: feeCents(d), p_opened: d.created ? iso(d.created) : eventAtIso, p_event_at: eventAtIso,
  };
}

export type ChargeInfo = { cardBrand: string | null; cardLast4: string | null; billingAddress: string | null; paymentIntent: string | null };
export function chargeInfo(c: Stripe.Charge): ChargeInfo {
  const a = c.billing_details?.address ?? null;
  const has = !!(a && (a.line1 || a.city || a.postal_code));
  const cityLine = a ? [a.city, [a.state, a.postal_code].filter(Boolean).join(" ")].filter(Boolean).join(", ") : "";
  return {
    cardBrand: c.payment_method_details?.card?.brand ?? null,
    cardLast4: c.payment_method_details?.card?.last4 ?? null,
    billingAddress: has ? [c.billing_details?.name, a!.line1, a!.line2, cityLine, a!.country].filter(Boolean).join(", ") : null,
    paymentIntent: idOf(c.payment_intent),
  };
}

export type WarningParams = { stripe_efw_id: string; order_id: string; charge_id: string; fraud_type: string; actionable: boolean; created_at: string };
export const warningParams = (w: Stripe.Radar.EarlyFraudWarning, orderId: string): WarningParams => ({
  stripe_efw_id: w.id, order_id: orderId, charge_id: idOf(w.charge) ?? "", fraud_type: w.fraud_type, actionable: w.actionable, created_at: iso(w.created),
});
