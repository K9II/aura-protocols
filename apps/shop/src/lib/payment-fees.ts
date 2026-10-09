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
    if (!bt || typeof bt === "string") return false;
    const { error } = await getSupabaseAdminClient().from("payment_fees")
      .upsert({ order_id: orderId, payment, fee_cents: bt.fee }, { onConflict: "order_id,payment" });
    if (error) throw new Error(error.message);
    return true;
  } catch (err) {
    console.error(`payment fee not recorded (${orderId} ${payment}):`, err);
    return false;
  }
}
