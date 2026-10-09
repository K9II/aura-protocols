// Refunds from the admin (pure): what's offered, where the money goes, form
// parsing. Spec 2026-10-07-admin-refunds-design.md. Before shipping = the
// policy's Cancel and refund; after shipping = a recorded exception.
import type { OrderStatus } from "@/lib/order-status";

export const REFUND_REASONS = ["customer_cancelled", "damaged", "not_received", "wrong_item", "goodwill", "other"] as const;
export type RefundReason = (typeof REFUND_REASONS)[number];
export const REFUND_REASON_LABEL: Record<RefundReason, string> = {
  customer_cancelled: "Customer asked to cancel", damaged: "Damaged in transit", not_received: "Not received",
  wrong_item: "Wrong item", goodwill: "Goodwill", other: "Other",
};
export const CARD_CONFIRM_TEXT = "I understand the refund policy: once an order ships the sale is final and claims are settled by replacement only — no cash refunds. Sending this money back to the card goes against that policy.";
export const CARD_CONFIRM_ERROR = "Tick the box to confirm a cash refund after shipping.";
export const REFUND_NOTE_MAX = 300;
export type RefundDestination = "card" | "store_credit";
export type RefundMode = "cancel" | "exception";

type PaymentFields = {
  id?: string; channel?: "retail" | "wholesale"; total_cents: number; store_credit_cents: number; stripe_payment_intent: string | null;
  deposit_payment_intent?: string | null; deposit_cents?: number | null; balance_payment_intent?: string | null; balance_cents?: number | null;
};
type OrderMoney = PaymentFields & { status: OrderStatus; kind: "sale" | "no_charge" };

// Each card payment behind an order, with its own refund idempotency key:
// one for a retail order; deposit and (once paid) balance for a wholesale one.
export function cardPayments(o: PaymentFields): Array<{ pi: string; cents: number; key: string }> {
  if (o.channel === "wholesale") {
    const out: Array<{ pi: string; cents: number; key: string }> = [];
    if (o.deposit_payment_intent && o.deposit_cents) out.push({ pi: o.deposit_payment_intent, cents: o.deposit_cents, key: `order-refund-${o.id}-deposit` });
    if (o.balance_payment_intent && o.balance_cents) out.push({ pi: o.balance_payment_intent, cents: o.balance_cents, key: `order-refund-${o.id}-balance` });
    return out;
  }
  return o.stripe_payment_intent ? [{ pi: o.stripe_payment_intent, cents: o.total_cents - o.store_credit_cents, key: `order-refund-${o.id}` }] : [];
}

// An open chargeback or fraud warning → refunded from Disputes; a lost
// chargeback → the bank already returned the money, so never again.
export type RefundFlags = { dispute: boolean; warning: boolean; lostDispute: boolean };
export function refundOffer(o: OrderMoney, flags: RefundFlags): { mode: RefundMode | null; blockedBy?: "dispute" | "dispute_lost" | "warning" } {
  if (o.kind !== "sale" || (o.status !== "paid" && o.status !== "shipped")) return { mode: null };
  if (flags.dispute) return { mode: null, blockedBy: "dispute" };
  if (flags.lostDispute) return { mode: null, blockedBy: "dispute_lost" };
  if (flags.warning) return { mode: null, blockedBy: "warning" };
  return { mode: o.status === "paid" ? "cancel" : "exception" };
}

// cardCents → back to the card through Stripe; creditBackCents → the part paid
// with store credit, returned by afterOrderRefunded; cardToCreditCents → the
// card part given as store credit instead (shipped exceptions only).
export function splitRefund(o: OrderMoney, destination: RefundDestination) {
  const card = cardPayments(o).reduce((s, p) => s + p.cents, 0);
  const toCard = destination === "card" ? card : 0;
  return { cardCents: toCard, creditBackCents: o.store_credit_cents, cardToCreditCents: card - toCard, totalCents: o.total_cents };
}

export type RefundInput = { reason: RefundReason; note: string | null; destination: RefundDestination };
export type RefundErrors = Partial<Record<"reason" | "note" | "destination" | "confirm", string>>;

// hasCard: the order has a Stripe payment. Before shipping the destination is
// always the original payment (card if any, else store credit).
export function parseRefund(get: (k: string) => string | null, mode: RefundMode, hasCard: boolean): { ok: true; value: RefundInput } | { ok: false; errors: RefundErrors } {
  const errors: RefundErrors = {};
  const reasonRaw = get("reason") ?? "";
  const reason = (REFUND_REASONS as readonly string[]).includes(reasonRaw) ? (reasonRaw as RefundReason) : null;
  if (!reason) errors.reason = "Pick a reason.";
  const note = (get("note") ?? "").trim() || null;
  if (note && note.length > REFUND_NOTE_MAX) errors.note = `Keep it under ${REFUND_NOTE_MAX} characters.`;
  let destination: RefundDestination = hasCard ? "card" : "store_credit";
  if (mode === "exception") {
    if (!note && !errors.note) errors.note = "Say why this order is an exception.";
    const d = get("destination");
    if (d !== "card" && d !== "store_credit") errors.destination = "Pick where the money goes.";
    else if (d === "card" && !hasCard) errors.destination = "This order has no card payment — refund it to store credit.";
    else destination = d;
    // Cash back to the card after shipping goes against the published policy
    // (claims are settled by replacement only) — the owner ticks that they
    // understand it. Store credit needs no box.
    if (d === "card" && hasCard && get("confirm") !== "on") errors.confirm = CARD_CONFIRM_ERROR;
  }
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { reason: reason!, note, destination } };
}

// A Stripe connection/API error (incl. a timeout) means Stripe didn't answer:
// the refund may have gone through. Card and invalid-request errors are a
// definite no.
export function stripeNoAnswer(err: unknown): boolean {
  const t = (err as { type?: unknown } | null)?.type;
  return t === "StripeConnectionError" || t === "StripeAPIError";
}
