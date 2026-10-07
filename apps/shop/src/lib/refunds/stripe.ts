import "server-only";
import { getStripe } from "@/lib/stripe";

// Stripe calls for refunds from the admin. refundCard's errors are not caught
// here: the action shows them to the owner and records nothing.

const FALLBACK = "the original payment";

// The card part only (equals the full charge): passing the amount guards
// against refunding more than we think we took. The key makes a double click
// one refund. Early-fraud-warning refunds stay in Disputes (reason "fraudulent").
export async function refundCard(paymentIntent: string, cents: number, orderId: string): Promise<string> {
  const refund = await getStripe().refunds.create(
    { payment_intent: paymentIntent, amount: cents, reason: "requested_by_customer" },
    { idempotencyKey: `order-refund-${orderId}` },
  );
  return refund.id;
}

// "Visa ••4242" for the refund dialog. Never throws: a Stripe read error must
// not break the order page, so it falls back to "the original payment".
export async function paymentLabel(paymentIntent: string): Promise<string> {
  try {
    const pi = await getStripe().paymentIntents.retrieve(paymentIntent, { expand: ["latest_charge"] });
    const charge = pi.latest_charge;
    if (!charge || typeof charge === "string") return FALLBACK;
    const d = charge.payment_method_details;
    if (d?.type === "card" && d.card?.last4) {
      const brand = d.card.brand ?? "";
      const name = brand ? brand.charAt(0).toUpperCase() + brand.slice(1) : "Card";
      return `${name} ••${d.card.last4}`;
    }
    if (d?.type === "us_bank_account" && d.us_bank_account?.last4) return `bank account ••${d.us_bank_account.last4}`;
    return FALLBACK;
  } catch {
    return FALLBACK;
  }
}
