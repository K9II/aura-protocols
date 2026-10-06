import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "node:crypto";
import { DISPUTE_ID, NOW, WARNING_ID, disputeCase, facts } from "../helpers/dispute-fixtures";
import { buildEvidence, editable } from "@/lib/disputes/evidence";

const m = vi.hoisted(() => ({
  requireOwner: vi.fn(), revalidatePath: vi.fn(),
  getDisputeCase: vi.fn(), saveDraft: vi.fn(), markSubmitted: vi.fn(), logDisputeEvent: vi.fn(), getWarning: vi.fn(), resolveWarning: vi.fn(),
  uploadEvidencePdf: vi.fn(), sendEvidence: vi.fn(), refundPaymentIntent: vi.fn(), buildEvidencePdf: vi.fn(),
  getOrderById: vi.fn(), transitionOrder: vi.fn(), afterOrderRefunded: vi.fn(), sendOrAlert: vi.fn(),
}));
vi.mock("@/lib/dal", () => ({ requireOwner: m.requireOwner }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));
vi.mock("@/lib/clock", () => ({ currentMs: () => Date.parse("2026-10-07T15:42:00Z") }));
vi.mock("@/lib/disputes/data", () => ({
  getDisputeCase: m.getDisputeCase, saveDraft: m.saveDraft, markSubmitted: m.markSubmitted, logDisputeEvent: m.logDisputeEvent,
  getWarning: m.getWarning, resolveWarning: m.resolveWarning,
}));
vi.mock("@/lib/disputes/stripe", () => ({
  uploadEvidencePdf: m.uploadEvidencePdf, sendEvidence: m.sendEvidence, refundPaymentIntent: m.refundPaymentIntent,
  stripeMessage: (e: unknown) => (e instanceof Error ? e.message : String(e)).replace(/[.\s]+$/, ""),
}));
vi.mock("@/lib/disputes/pdf", () => ({ buildEvidencePdf: m.buildEvidencePdf }));
vi.mock("@/lib/orders", () => ({ getOrderById: m.getOrderById, transitionOrder: m.transitionOrder }));
vi.mock("@/lib/stripe-events", () => ({ afterOrderRefunded: m.afterOrderRefunded }));
vi.mock("@/lib/notify", () => ({ sendOrAlert: m.sendOrAlert }));

const PDF = new Uint8Array([1, 2, 3]);
const SHA = createHash("sha256").update(PDF).digest("hex");
const draft = editable(buildEvidence(facts()));
const fd = (o: Record<string, string>) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.append(k, v); return f; };
const form = (o: Record<string, string> = {}) => fd({ id: DISPUTE_ID, ...draft, ...o });
const paidOrder = (o: Record<string, unknown> = {}) => ({ id: "o2", order_number: "AP-1044", email: "r.alvarez@example.com", status: "paid", stripe_payment_intent: "pi_2", total_cents: 18450, store_credit_cents: 0, ...o });

describe("admin Disputes actions", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const f of Object.values(m)) f.mockReset();
    m.requireOwner.mockResolvedValue({ id: "owner1" });
    m.getDisputeCase.mockResolvedValue(disputeCase());
    m.buildEvidencePdf.mockResolvedValue({ bytes: PDF, pages: 1 });
    m.uploadEvidencePdf.mockResolvedValueOnce("file_a").mockResolvedValueOnce("file_b");
    m.getWarning.mockResolvedValue({ id: WARNING_ID, order_id: "o2", resolved_at: null });
    m.getOrderById.mockResolvedValue(paidOrder());
    m.transitionOrder.mockResolvedValue(true);
    m.resolveWarning.mockResolvedValue(true);
  });

  it("every action is owner-only", async () => {
    m.requireOwner.mockRejectedValue(new Error("NOT_FOUND"));
    const a = await import("@/app/admin/disputes/actions");
    await expect(a.saveDisputeDraftAction(null, form())).rejects.toThrow("NOT_FOUND");
    await expect(a.submitDisputeAction(null, form())).rejects.toThrow("NOT_FOUND");
    await expect(a.refundEarlyWarningAction(null, fd({ id: WARNING_ID }))).rejects.toThrow("NOT_FOUND");
    await expect(a.watchEarlyWarningAction(fd({ id: WARNING_ID }))).rejects.toThrow("NOT_FOUND");
    expect(m.sendEvidence).not.toHaveBeenCalled();
    expect(m.refundPaymentIntent).not.toHaveBeenCalled();
  });

  it("Save draft: uploads the PDF for each file field, stages the evidence in Stripe (submit false), records the draft", async () => {
    const { saveDisputeDraftAction } = await import("@/app/admin/disputes/actions");
    const edited = "To the card issuer,\n\nDelivered on September 25, 2026 at 2:14 pm.\n\nAura Protocols LLC";
    expect(await saveDisputeDraftAction(null, form({ uncategorized_text: edited }))).toEqual({ ok: "Draft saved to Stripe" });
    expect(m.uploadEvidencePdf).toHaveBeenCalledTimes(2); // uncategorized_file + shipping_documentation (not received, shipped)
    expect(m.uploadEvidencePdf).toHaveBeenCalledWith(PDF, "AP-1031-dispute-evidence.pdf");
    const [stripeId, evidence, submit] = m.sendEvidence.mock.calls[0];
    expect(stripeId).toBe("dp_1Q7Xz");
    expect(submit).toBe(false);
    expect(evidence).toMatchObject({ uncategorized_text: edited, uncategorized_file: "file_a", shipping_documentation: "file_b", customer_name: "Dana Whitfield" });
    expect(evidence.access_activity_log).toContain("Agreement accepted: 2026-09-15 01:02:41 UTC");
    expect(m.saveDraft).toHaveBeenCalledWith(DISPUTE_ID, { draft: { ...draft, uncategorized_text: edited }, files: { uncategorized_file: "file_a", shipping_documentation: "file_b" }, sha: SHA });
    expect(m.markSubmitted).not.toHaveBeenCalled();
    expect(m.logDisputeEvent).toHaveBeenCalledWith({ disputeId: DISPUTE_ID, action: "draft_saved", actor: "owner1" });
    expect(m.revalidatePath).toHaveBeenCalledWith(`/admin/disputes/${DISPUTE_ID}`);
  });

  it("an unchanged PDF isn't uploaded again", async () => {
    m.getDisputeCase.mockResolvedValue(disputeCase({ evidence_file_sha: SHA, evidence_files: { uncategorized_file: "file_x", shipping_documentation: "file_y" } }));
    const { saveDisputeDraftAction } = await import("@/app/admin/disputes/actions");
    await saveDisputeDraftAction(null, form());
    expect(m.uploadEvidencePdf).not.toHaveBeenCalled();
    expect(m.sendEvidence.mock.calls[0][1]).toMatchObject({ uncategorized_file: "file_x", shipping_documentation: "file_y" });
  });

  it("Submit: the same, with submit true, then marked submitted", async () => {
    const { submitDisputeAction } = await import("@/app/admin/disputes/actions");
    expect(await submitDisputeAction(null, form())).toEqual({ ok: "Evidence submitted to Stripe" });
    expect(m.sendEvidence.mock.calls[0][2]).toBe(true);
    expect(m.markSubmitted).toHaveBeenCalledWith(DISPUTE_ID, expect.objectContaining({ sha: SHA }), "owner1");
    expect(m.saveDraft).not.toHaveBeenCalled();
    expect(m.logDisputeEvent).toHaveBeenCalledWith({ disputeId: DISPUTE_ID, action: "submitted", actor: "owner1" });
  });

  it("a Stripe error is shown and nothing is recorded; the dispute stays unsubmitted", async () => {
    m.sendEvidence.mockRejectedValue(new Error("This dispute is already closed."));
    const { submitDisputeAction } = await import("@/app/admin/disputes/actions");
    expect(await submitDisputeAction(null, form())).toEqual({ error: "Stripe didn't accept the evidence: This dispute is already closed. Nothing was submitted; try again." });
    expect(m.markSubmitted).not.toHaveBeenCalled();
    expect(m.logDisputeEvent).not.toHaveBeenCalled();
  });

  it("a banned word in the cover letter stops the save before Stripe", async () => {
    const { saveDisputeDraftAction } = await import("@/app/admin/disputes/actions");
    const r = await saveDisputeDraftAction(null, form({ uncategorized_text: "The customer asked about the dose." }));
    expect(r?.fieldErrors).toEqual({ uncategorized_text: 'Cover letter: "dose" is a banned phrase. Change the wording to save.' });
    expect(m.sendEvidence).not.toHaveBeenCalled();
  });

  it("required fields, a stale id, an already submitted or past-deadline chargeback are refused before Stripe", async () => {
    const { saveDisputeDraftAction, submitDisputeAction } = await import("@/app/admin/disputes/actions");
    expect((await saveDisputeDraftAction(null, form({ customer_name: " " })))?.fieldErrors).toEqual({ customer_name: "Required." });
    expect(await saveDisputeDraftAction(null, form({ id: "nope" }))).toEqual({ error: "That chargeback changed or doesn't exist. Reload the page." });
    m.getDisputeCase.mockResolvedValue(disputeCase({ evidence_submitted: true }));
    expect((await submitDisputeAction(null, form()))?.error).toMatch(/already submitted/);
    m.getDisputeCase.mockResolvedValue(disputeCase({ evidence_due_by: new Date(NOW - 10 * 60_000).toISOString() }));
    expect((await submitDisputeAction(null, form()))?.error).toMatch(/deadline has passed/);
    expect(m.sendEvidence).not.toHaveBeenCalled();
  });

  it("Cancel and refund: refunds in Stripe once (idempotency key), refunds the order, emails the customer, resolves the warning", async () => {
    const { refundEarlyWarningAction } = await import("@/app/admin/disputes/actions");
    expect(await refundEarlyWarningAction(null, fd({ id: WARNING_ID }))).toEqual({ ok: "AP-1044 was cancelled and refunded." });
    expect(m.refundPaymentIntent).toHaveBeenCalledWith("pi_2", `efw-refund-${WARNING_ID}`);
    expect(m.transitionOrder).toHaveBeenCalledWith("o2", "paid", "refunded");
    expect(m.afterOrderRefunded).toHaveBeenCalledWith(expect.objectContaining({ id: "o2" }));
    expect(m.sendOrAlert.mock.calls[0][0]).toMatchObject({ to: "r.alvarez@example.com", subject: "Order AP-1044 was cancelled and refunded" });
    expect(m.resolveWarning).toHaveBeenCalledWith(WARNING_ID, "refunded", "owner1");
  });

  it("refuses to refund once the order has shipped, and a Stripe error changes nothing", async () => {
    const { refundEarlyWarningAction } = await import("@/app/admin/disputes/actions");
    m.getOrderById.mockResolvedValue(paidOrder({ status: "shipped" }));
    expect((await refundEarlyWarningAction(null, fd({ id: WARNING_ID })))?.error).toMatch(/AP-1044 is shipped now[\s\S]*no refunds/);
    m.getOrderById.mockResolvedValue(paidOrder());
    m.refundPaymentIntent.mockRejectedValue(new Error("card_declined"));
    expect((await refundEarlyWarningAction(null, fd({ id: WARNING_ID })))?.error).toBe("Stripe didn't refund AP-1044: card_declined. Nothing changed.");
    expect(m.transitionOrder).not.toHaveBeenCalled();
    expect(m.resolveWarning).not.toHaveBeenCalled();
  });

  it("Watch marks a shipped order's warning watched; an already refunded order's warning is closed", async () => {
    const { watchEarlyWarningAction } = await import("@/app/admin/disputes/actions");
    m.getOrderById.mockResolvedValue(paidOrder({ status: "shipped" }));
    await watchEarlyWarningAction(fd({ id: WARNING_ID }));
    expect(m.resolveWarning).toHaveBeenLastCalledWith(WARNING_ID, "watching", "owner1");
    m.getOrderById.mockResolvedValue(paidOrder({ status: "refunded" }));
    await watchEarlyWarningAction(fd({ id: WARNING_ID }));
    expect(m.resolveWarning).toHaveBeenLastCalledWith(WARNING_ID, "closed", "owner1");
    await expect(watchEarlyWarningAction(fd({ id: "nope" }))).rejects.toThrow(/Reload the page/);
  });
});
