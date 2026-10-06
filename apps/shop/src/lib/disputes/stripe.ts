import "server-only";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { chargeInfo, type ChargeInfo } from "@/lib/disputes/stripe-map";

// Every Stripe call the Disputes module makes. Errors are not caught here:
// webhook handlers let them throw (Stripe retries); owner actions turn them
// into a message and record nothing.

export async function fetchChargeInfo(chargeId: string): Promise<ChargeInfo> {
  return chargeInfo(await getStripe().charges.retrieve(chargeId));
}

export async function uploadEvidencePdf(bytes: Uint8Array, name: string): Promise<string> {
  const file = await getStripe().files.create({ purpose: "dispute_evidence", file: { data: bytes, name, type: "application/pdf" } });
  return file.id;
}

// submit false = a draft staged on the dispute (Save draft); true = sent to the bank (final).
export async function sendEvidence(stripeDisputeId: string, evidence: Stripe.DisputeUpdateParams.Evidence, submit: boolean): Promise<void> {
  await getStripe().disputes.update(stripeDisputeId, { evidence, submit });
}

// Early fraud warning before shipping: refund in full. Reason "fraudulent"
// also tells Stripe Radar about the card. The key makes a double click one refund.
export async function refundPaymentIntent(paymentIntent: string, idempotencyKey: string): Promise<string> {
  const refund = await getStripe().refunds.create({ payment_intent: paymentIntent, reason: "fraudulent" }, { idempotencyKey });
  return refund.id;
}

// Stripe's message without its closing period (the caller adds the sentence end).
export const stripeMessage = (err: unknown): string => (err instanceof Error ? err.message : String(err)).slice(0, 300).replace(/[.\s]+$/, "");
