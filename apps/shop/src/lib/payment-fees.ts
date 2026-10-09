import "server-only";
import { getStripe } from "@/lib/stripe";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export type FeePayment = "order" | "deposit" | "balance";

// Records the actual Stripe fee of a payment (lot-costs.sql payment_fees) from
// its charge's balance transaction. Never throws: profit then estimates that
// payment's fee (2.9% + 30¢) and the order page says "estimated". A pay-by-bank
// payment can land before its balance transaction exists — nothing is recorded.
export async function recordPaymentFee(orderId: string, payment: FeePayment, paymentIntentId: string | null): Promise<boolean> {
  if (!paymentIntentId) return false;
  try {
    const pi = await getStripe().paymentIntents.retrieve(paymentIntentId, { expand: ["latest_charge.balance_transaction"] });
    const charge = pi.latest_charge;
    const bt = charge && typeof charge !== "string" ? charge.balance_transaction : null;
    if (!bt || typeof bt === "string") {
      // Stripe can report the payment before its fee is settled; the
      // reconcile cron fills it in later (backfillPaymentFees).
      console.warn(`payment fee not available yet (${orderId} ${payment}) — reconcile will retry`);
      return false;
    }
    const { error } = await getSupabaseAdminClient().from("payment_fees")
      .upsert({ order_id: orderId, payment, fee_cents: bt.fee }, { onConflict: "order_id,payment" });
    if (error) throw new Error(error.message);
    return true;
  } catch (err) {
    console.error(`payment fee not recorded (${orderId} ${payment}):`, err);
    return false;
  }
}

// Reconcile cron: record the fee of every payment on sales paid since `sinceIso`
// that doesn't have one yet (Stripe hadn't settled it when the payment landed).
// Returns how many were filled; one failure doesn't stop the rest.
export async function backfillPaymentFees(sinceIso: string): Promise<{ filled: number; tried: number }> {
  const db = getSupabaseAdminClient();
  const { data, error } = await db.from("orders")
    .select("id, channel, stripe_payment_intent, deposit_payment_intent, balance_payment_intent, payment_fees(payment)")
    .eq("kind", "sale").in("status", ["paid", "shipped"]).gte("paid_at", sinceIso).limit(500);
  if (error) throw new Error(`fee backfill read failed: ${error.message}`);
  let filled = 0, tried = 0;
  for (const o of (data ?? []) as Array<{ id: string; channel: string; stripe_payment_intent: string | null; deposit_payment_intent: string | null; balance_payment_intent: string | null; payment_fees: Array<{ payment: FeePayment }> | null }>) {
    const have = new Set((o.payment_fees ?? []).map((f) => f.payment));
    const want: Array<[FeePayment, string | null]> = o.channel === "wholesale"
      ? [["deposit", o.deposit_payment_intent], ["balance", o.balance_payment_intent]]
      : [["order", o.stripe_payment_intent]];
    for (const [payment, pi] of want) {
      if (have.has(payment) || !pi) continue;
      tried++;
      if (await recordPaymentFee(o.id, payment, pi)) filled++;
    }
  }
  return { filled, tried };
}
