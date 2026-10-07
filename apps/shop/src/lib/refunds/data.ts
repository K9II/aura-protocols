import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import type { RefundDestination, RefundReason } from "@/lib/refunds/rules";

const db = () => getSupabaseAdminClient();
const isDuplicate = (e: unknown) => (e as { code?: string } | null)?.code === "23505";
const dbError = (context: string, error: unknown): Error => new Error(`${context} failed: ${JSON.stringify(error)}`);

// Who refunded, why, where the money went and the card's label ("Visa ••4242",
// kept so the order page never asks Stripe again). First writer wins (a
// webhook never stamps, so a Stripe-dashboard refund leaves these null).
// True when this call saved it; false when another refund already had.
export async function stampRefund(orderId: string, f: { destination: RefundDestination; reason: RefundReason; note: string | null; by: string; stripeRefundId: string | null; paymentLabel: string | null }): Promise<boolean> {
  const { data, error } = await db().from("orders")
    .update({ refund_destination: f.destination, refund_reason: f.reason, refund_note: f.note, refunded_by: f.by, stripe_refund_id: f.stripeRefundId, refund_payment_label: f.paymentLabel })
    .eq("id", orderId)
    .is("refund_reason", null)
    .select("id");
  if (error) throw dbError("refund stamp", error);
  return ((data as unknown[] | null) ?? []).length > 0;
}

// The card part of a shipped exception given as store credit. One row per
// order (unique index store_credit_ledger_order_once): a repeat is a no-op.
export async function creditCardPart(customerId: string, cents: number, orderId: string): Promise<void> {
  if (cents <= 0) return;
  const { error } = await db().from("store_credit_ledger").insert({
    customer_id: customerId, amount_cents: cents, reason: "refund_to_credit", ref_id: orderId, note: "Refund (card part) as store credit",
  });
  if (error && !isDuplicate(error)) throw dbError("refund to credit insert", error);
}
