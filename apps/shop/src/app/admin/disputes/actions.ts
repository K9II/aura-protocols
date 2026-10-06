"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOwner } from "@/lib/dal";
import { currentMs } from "@/lib/clock";
import { getDisputeCase, getWarning, logDisputeEvent, markSubmitted, resolveWarning, saveDraft } from "@/lib/disputes/data";
import { buildEvidence, customerStrings, evidenceChars, fileFields, toStripeEvidence, type FileField } from "@/lib/disputes/evidence";
import { evidenceViolations } from "@/lib/disputes/checks";
import { buildEvidencePdf } from "@/lib/disputes/pdf";
import { refundPaymentIntent, sendEvidence, stripeMessage, uploadEvidencePdf } from "@/lib/disputes/stripe";
import { parseDraft } from "@/lib/disputes/fields";
import { EVIDENCE_TOTAL_MAX } from "@/lib/disputes/constants";
import { respondRefusal } from "@/lib/disputes/rules";
import { getOrderById, transitionOrder } from "@/lib/orders";
import { STATUS_LABEL } from "@/lib/order-status";
import { afterOrderRefunded } from "@/lib/stripe-events";
import { sendOrAlert } from "@/lib/notify";
import { orderRefundedEmail } from "@/lib/emails";

export type DisputeActionState = { ok?: string; error?: string; fieldErrors?: Record<string, string> } | null;

const STALE = "That chargeback changed or doesn't exist. Reload the page.";
const STALE_WARNING = "That warning changed or doesn't exist. Reload the page.";
const uuid = (v: FormDataEntryValue | null) => z.string().uuid().safeParse(v);

function refresh(disputeId?: string) {
  revalidatePath("/admin/disputes");
  if (disputeId) revalidatePath(`/admin/disputes/${disputeId}`);
  revalidatePath("/admin");
}

// Save draft (submit false) and Submit (true) share every step: the evidence
// is the records rebuilt now plus the owner's edits; it passes the compliance
// scan; the PDF is uploaded (once per unchanged PDF); then Stripe gets it.
// A Stripe error is returned as a message and nothing is recorded.
async function respond(f: FormData, submit: boolean): Promise<DisputeActionState> {
  const owner = await requireOwner();
  const id = uuid(f.get("id"));
  if (!id.success) return { error: STALE };
  const draft = parseDraft((k) => f.get(k));
  if (!draft.ok) return { fieldErrors: draft.fieldErrors, error: "Fix the highlighted fields first." };
  const c = await getDisputeCase(id.data);
  if (!c) return { error: STALE };
  const refusal = respondRefusal(c.dispute, currentMs());
  if (refusal) return { error: refusal };
  const evidence = { ...buildEvidence(c.facts), ...draft.value };
  const bad = evidenceViolations(evidence, customerStrings(c.facts));
  if (Object.keys(bad).length) return { fieldErrors: bad, error: "Fix the highlighted text first." };
  if (evidenceChars(evidence) > EVIDENCE_TOTAL_MAX) {
    return { error: `All the evidence together is over Stripe's ${EVIDENCE_TOTAL_MAX.toLocaleString("en-US")}-character limit. Shorten the cover letter.` };
  }
  const pdf = await buildEvidencePdf(c.facts);
  const sha = createHash("sha256").update(pdf.bytes).digest("hex");
  const files: Partial<Record<FileField, string>> = c.dispute.evidence_file_sha === sha ? { ...c.dispute.evidence_files } : {};
  try {
    for (const field of fileFields(c.facts.reason, !!c.facts.order.shippedAt)) {
      files[field] ??= await uploadEvidencePdf(pdf.bytes, `${c.facts.order.number}-dispute-evidence.pdf`);
    }
    await sendEvidence(c.dispute.stripe_dispute_id, toStripeEvidence(evidence, files), submit);
  } catch (err) {
    return { error: `Stripe didn't accept the ${submit ? "evidence" : "draft"}: ${stripeMessage(err)}. Nothing was ${submit ? "submitted" : "saved"}; try again.` };
  }
  const saved = { draft: draft.value, files, sha };
  if (submit) await markSubmitted(c.dispute.id, saved, owner.id);
  else await saveDraft(c.dispute.id, saved);
  await logDisputeEvent({ disputeId: c.dispute.id, action: submit ? "submitted" : "draft_saved", actor: owner.id });
  refresh(c.dispute.id);
  return { ok: submit ? "Evidence submitted to Stripe" : "Draft saved to Stripe" };
}

export async function saveDisputeDraftAction(_prev: DisputeActionState, f: FormData): Promise<DisputeActionState> {
  return respond(f, false);
}

export async function submitDisputeAction(_prev: DisputeActionState, f: FormData): Promise<DisputeActionState> {
  return respond(f, true);
}

// Early fraud warning on an order that hasn't shipped: refund the card in
// Stripe, then the same follow-ups as a Stripe refund (the order is refunded,
// its vials return to stock, commission reversed, store credit returned).
// The charge.refunded webhook re-runs those follow-ups idempotently.
export async function refundEarlyWarningAction(_prev: DisputeActionState, f: FormData): Promise<DisputeActionState> {
  const owner = await requireOwner();
  const id = uuid(f.get("id"));
  if (!id.success) return { error: STALE_WARNING };
  const w = await getWarning(id.data);
  if (!w || w.resolved_at) return { error: STALE_WARNING };
  const order = await getOrderById(w.order_id);
  if (!order) return { error: STALE_WARNING };
  if (order.status !== "paid") {
    return { error: `${order.order_number} is ${STATUS_LABEL[order.status].toLowerCase()} now, so it can't be cancelled and refunded here. After shipping the policy is no refunds. Reload the page.` };
  }
  if (!order.stripe_payment_intent) return { error: `${order.order_number} has no card payment to refund.` };
  try {
    await refundPaymentIntent(order.stripe_payment_intent, `efw-refund-${w.id}`);
  } catch (err) {
    return { error: `Stripe didn't refund ${order.order_number}: ${stripeMessage(err)}. Nothing changed.` };
  }
  if (await transitionOrder(order.id, "paid", "refunded")) {
    await afterOrderRefunded(order);
    await sendOrAlert({ to: order.email, ...orderRefundedEmail(order) }, `early fraud warning refund ${order.order_number}`);
  }
  await resolveWarning(w.id, "refunded", owner.id);
  refresh();
  revalidatePath("/admin/orders");
  return { ok: `${order.order_number} was cancelled and refunded.` };
}

// Watch a shipped order's warning (no refund after shipping), or close one
// whose order is already refunded or cancelled.
export async function watchEarlyWarningAction(f: FormData): Promise<void> {
  const owner = await requireOwner();
  const id = uuid(f.get("id"));
  if (!id.success) throw new Error(STALE_WARNING);
  const w = await getWarning(id.data);
  if (!w) throw new Error(STALE_WARNING);
  if (!w.resolved_at) {
    const order = await getOrderById(w.order_id);
    const done = !!order && (order.status === "refunded" || order.status === "cancelled");
    await resolveWarning(w.id, done ? "closed" : "watching", owner.id);
  }
  refresh();
}
