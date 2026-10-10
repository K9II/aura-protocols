import "server-only";
import { getStripe } from "@/lib/stripe";

// Stripe calls for refunds from the admin. refundCard's errors are not caught
// here: the action shows them to the owner and records nothing.

// What paymentLabel says when Stripe gave no card/bank detail.
export const NO_PAYMENT_LABEL = "the original payment";
const FALLBACK = NO_PAYMENT_LABEL;

// The card part of one payment (equals that charge): passing the amount guards
// against refunding more than we think we took. `key` makes a double click one
// refund — a wholesale order has one key per payment (cardPayments in rules.ts).
// Early-fraud-warning refunds stay in Disputes (reason "fraudulent").
export async function refundCard(paymentIntent: string, cents: number, key: string): Promise<string> {
  const refund = await getStripe().refunds.create(
    { payment_intent: paymentIntent, amount: cents, reason: "requested_by_customer" },
    { idempotencyKey: key },
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
