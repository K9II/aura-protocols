import { describe, it, expect, vi, beforeEach } from "vitest";
import { inquiry } from "../helpers/inquiry-fixtures";
import { ownerStaff } from "../helpers/staff";

const OWNER = ownerStaff({ id: "00000000-0000-4000-8000-0000000000aa", fullName: "Kearney Adams" });
const ID = "11111111-1111-4111-8111-111111111111";
const KEY = "22222222-2222-4222-8222-222222222222";
const d = vi.hoisted(() => ({
  requirePermission: vi.fn(), getInquiry: vi.fn(), claimReply: vi.fn(), finishReply: vi.fn(), releaseReply: vi.fn(), threadMessageIds: vi.fn(),
  applyInquiryEvent: vi.fn(), logInquiryEvent: vi.fn(), recordInquiryEvent: vi.fn(), setTopic: vi.fn(), setCustomer: vi.fn(),
  getUnmatched: vi.fn(), closeUnmatched: vi.fn(), recordInbound: vi.fn(), saveSavedReply: vi.fn(), deleteSavedReply: vi.fn(),
  saveInquiryDraft: vi.fn(), clearInquiryDraft: vi.fn(), getCustomerBasics: vi.fn(),
  sendInquiryEmail: vi.fn(), accountIdByEmail: vi.fn(), alertOwner: vi.fn(), revalidatePath: vi.fn(),
}));
vi.mock("@/lib/dal", () => ({ requirePermission: d.requirePermission }));
vi.mock("@/lib/inquiries/data", () => ({
  getInquiry: d.getInquiry, claimReply: d.claimReply, finishReply: d.finishReply, releaseReply: d.releaseReply, threadMessageIds: d.threadMessageIds,
  applyInquiryEvent: d.applyInquiryEvent, logInquiryEvent: d.logInquiryEvent, recordInquiryEvent: d.recordInquiryEvent, setTopic: d.setTopic,
  setCustomer: d.setCustomer, getUnmatched: d.getUnmatched, closeUnmatched: d.closeUnmatched, recordInbound: d.recordInbound,
  saveSavedReply: d.saveSavedReply, deleteSavedReply: d.deleteSavedReply, saveInquiryDraft: d.saveInquiryDraft, clearInquiryDraft: d.clearInquiryDraft,
}));
vi.mock("@/lib/inquiries/send", () => ({ sendInquiryEmail: d.sendInquiryEmail }));
vi.mock("@/lib/account/data", () => ({ accountIdByEmail: d.accountIdByEmail }));
vi.mock("@/lib/customers/data", () => ({ getCustomerBasics: d.getCustomerBasics }));
vi.mock("@/lib/notify", () => ({ alertOwner: d.alertOwner }));
vi.mock("next/cache", () => ({ revalidatePath: d.revalidatePath }));

const fd = (o: Record<string, string>) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.set(k, v); return f; };
const thread = { ...inquiry({ id: ID }), token: "0123456789abcdef0123456789abcdef" };

describe("inquiry actions", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const f of Object.values(d)) f.mockReset();
    d.requirePermission.mockResolvedValue(OWNER);
    d.getInquiry.mockResolvedValue(thread);
    d.claimReply.mockResolvedValue("m1");
    d.threadMessageIds.mockResolvedValue(["<CAF@gmail>"]);
    d.sendInquiryEmail.mockResolvedValue({ messageId: "0100x", headerId: "<0100x@us-east-2.amazonses.com>" });
    d.applyInquiryEvent.mockResolvedValue({ from: "needs_reply", to: "waiting" });
  });

  it("is owner-only", async () => {
    d.requirePermission.mockRejectedValue(new Error("NOT_FOUND"));
    const { replyAction } = await import("@/app/admin/inquiries/actions");
    await expect(replyAction(null, fd({ id: ID, clientKey: KEY, body: "hi" }))).rejects.toThrow("NOT_FOUND");
  });

  it("a banned phrase blocks the send and names the word — nothing claimed or sent", async () => {
    const { replyAction } = await import("@/app/admin/inquiries/actions");
    const r = await replyAction(null, fd({ id: ID, clientKey: KEY, body: "Most people reconstitute with 2 ml" }));
    expect(r).toEqual({ error: expect.stringMatching(/^Not sent\. Remove "reconstitute" before sending/), phrase: "reconstitute" });
    expect(d.claimReply).not.toHaveBeenCalled();
    expect(d.sendInquiryEmail).not.toHaveBeenCalled();
  });

  it("sends: claim → email with threading → finish → waiting → logged", async () => {
    const { replyAction } = await import("@/app/admin/inquiries/actions");
    expect(await replyAction(null, fd({ id: ID, clientKey: KEY, body: "Replacements ship tomorrow.", mode: "send" }))).toEqual({ ok: "Sent." });
    expect(d.claimReply).toHaveBeenCalledWith({ inquiryId: ID, clientKey: KEY, body: "Replacements ship tomorrow.", authorId: OWNER.id, fromEmail: "support@auraprotocols.com" });
    expect(d.sendInquiryEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: "dana.w@example.com", subject: "Re: Order question — AP-1052 [Q-1047]", token: thread.token,
      inReplyTo: "<CAF@gmail>", references: ["<CAF@gmail>"], ignore: ["Dana Whitfield", "dana.w@example.com"],
    }));
    expect(d.finishReply).toHaveBeenCalledWith("m1", "0100x", "<0100x@us-east-2.amazonses.com>");
    expect(d.applyInquiryEvent).toHaveBeenCalledWith(ID, "owner_replied", { actorId: OWNER.id });
    expect(d.recordInquiryEvent).toHaveBeenCalledWith({ inquiryId: ID, action: "replied", actorId: OWNER.id });
    expect(d.revalidatePath).toHaveBeenCalledWith("/admin/inquiries/Q-1047");
  });

  it("Send and close closes too", async () => {
    const { replyAction } = await import("@/app/admin/inquiries/actions");
    expect(await replyAction(null, fd({ id: ID, clientKey: KEY, body: "Done.", mode: "close" }))).toEqual({ ok: "Sent and closed." });
    expect(d.applyInquiryEvent).toHaveBeenCalledWith(ID, "owner_replied_close", { actorId: OWNER.id });
    expect(d.recordInquiryEvent).toHaveBeenCalledWith({ inquiryId: ID, action: "closed", actorId: OWNER.id });
  });

  it("a double click sends once", async () => {
    d.claimReply.mockResolvedValue("duplicate");
    const { replyAction } = await import("@/app/admin/inquiries/actions");
    expect(await replyAction(null, fd({ id: ID, clientKey: KEY, body: "x" }))).toEqual({ ok: "Already sent." });
    expect(d.sendInquiryEmail).not.toHaveBeenCalled();
  });

  it("reads the thread's message ids before claiming — a DB error there leaves no hidden 'sending' row", async () => {
    d.threadMessageIds.mockRejectedValue(new Error("db down"));
    const { replyAction } = await import("@/app/admin/inquiries/actions");
    await expect(replyAction(null, fd({ id: ID, clientKey: KEY, body: "x" }))).rejects.toThrow("db down");
    expect(d.claimReply).not.toHaveBeenCalled();
    expect(d.sendInquiryEmail).not.toHaveBeenCalled();
  });

  it("an SES failure releases the claim and says nothing was recorded", async () => {
    d.sendInquiryEmail.mockRejectedValue(new Error("Throttling"));
    const { replyAction } = await import("@/app/admin/inquiries/actions");
    expect(await replyAction(null, fd({ id: ID, clientKey: KEY, body: "x" }))).toEqual({ error: "The email didn't send: Throttling. Nothing was recorded — try again." });
    expect(d.releaseReply).toHaveBeenCalledWith("m1");
    expect(d.applyInquiryEvent).not.toHaveBeenCalled();
  });

  it("sent but not recorded → owner alerted, error thrown", async () => {
    d.finishReply.mockRejectedValue(new Error("db down"));
    const { replyAction } = await import("@/app/admin/inquiries/actions");
    await expect(replyAction(null, fd({ id: ID, clientKey: KEY, body: "x" }))).rejects.toThrow("db down");
    expect(d.alertOwner).toHaveBeenCalledWith("Inquiry reply sent but not recorded", expect.stringContaining("Q-1047"));
  });

  it("empty or stale", async () => {
    const { replyAction } = await import("@/app/admin/inquiries/actions");
    expect(await replyAction(null, fd({ id: ID, clientKey: KEY, body: "  " }))).toEqual({ error: "Write a reply first." });
    d.getInquiry.mockResolvedValue(null);
    expect((await replyAction(null, fd({ id: ID, clientKey: KEY, body: "x" })))?.error).toMatch(/Reload the page/);
  });

  it("close / re-open: a stale move throws (admin pattern)", async () => {
    const { statusAction } = await import("@/app/admin/inquiries/actions");
    d.applyInquiryEvent.mockResolvedValue({ from: "needs_reply", to: "closed" });
    await statusAction(fd({ id: ID, op: "close" }));
    expect(d.logInquiryEvent).toHaveBeenCalledWith({ inquiryId: ID, action: "closed", actorId: OWNER.id });
    d.applyInquiryEvent.mockResolvedValue(null);
    await expect(statusAction(fd({ id: ID, op: "reopen" }))).rejects.toThrow(/Reload the page/);
  });

  it("topic change logs the new label", async () => {
    d.setTopic.mockResolvedValue(true);
    const { topicAction } = await import("@/app/admin/inquiries/actions");
    await topicAction(fd({ id: ID, topic: "wholesale" }));
    expect(d.logInquiryEvent).toHaveBeenCalledWith({ inquiryId: ID, action: "topic_changed", actorId: OWNER.id, detail: "Wholesale" });
  });

  it("link: refuses an email with no account", async () => {
    d.accountIdByEmail.mockResolvedValue(null);
    const { linkAction } = await import("@/app/admin/inquiries/actions");
    expect(await linkAction(null, fd({ id: ID, email: "nobody@example.com" }))).toEqual({ error: "No account uses that email." });
    d.accountIdByEmail.mockResolvedValue("c1");
    expect(await linkAction(null, fd({ id: ID, email: "Dana@Example.com" }))).toEqual({ ok: "Linked." });
    expect(d.setCustomer).toHaveBeenCalledWith(ID, "c1");
  });

  it("attach an unmatched email to Q-1047 (flagged when the sender differs)", async () => {
    d.getUnmatched.mockResolvedValue({ id: "u1", ses_message_id: "s9", from_email: "peter@gmail.com", body_text: "From my other address", full_text: "From my other address", raw_key: "raw/s9", attachment_names: ["a.docx"] });
    d.recordInbound.mockResolvedValue("recorded");
    d.closeUnmatched.mockResolvedValue(true);
    const { attachUnmatchedAction } = await import("@/app/admin/inquiries/actions");
    expect(await attachUnmatchedAction(null, fd({ id: "33333333-3333-4333-8333-333333333333", ref: "Q-1047" }))).toEqual({ ok: "Attached to Q-1047." });
    expect(d.getInquiry).toHaveBeenCalledWith({ ref: 1047 });
    expect(d.recordInbound).toHaveBeenCalledWith(expect.objectContaining({ inquiryId: ID, sesMessageId: "s9", flags: ["other_sender"], dropped: ["a.docx"], files: [], actorId: OWNER.id }));
    expect(d.closeUnmatched).toHaveBeenCalledWith("33333333-3333-4333-8333-333333333333", { attachedTo: ID });
  });

  it("saved replies: scanned, unique names", async () => {
    const { saveReplyAction } = await import("@/app/admin/inquiries/actions");
    expect((await saveReplyAction(null, fd({ name: "Use", body: "The usual dosing is…" })))?.error).toMatch(/Remove "dosing"/);
    d.saveSavedReply.mockResolvedValue("name_taken");
    expect(await saveReplyAction(null, fd({ name: "Finding a COA", body: "x" }))).toEqual({ error: "A saved reply already has that name." });
    d.saveSavedReply.mockResolvedValue("ok");
    expect(await saveReplyAction(null, fd({ name: "Hello", body: "Thanks for writing." }))).toEqual({ ok: "Saved." });
    expect(d.logInquiryEvent).toHaveBeenCalledWith({ inquiryId: null, action: "reply_saved", actorId: OWNER.id, detail: "Hello" });
  });

  it("a reply always clears any draft, and credits the drafter by first name when it wasn't the sender", async () => {
    d.getInquiry.mockResolvedValue({ ...thread, draft_by: "asst1" });
    d.getCustomerBasics.mockResolvedValue({ id: "asst1", fullName: "Assistant (Claude)" });
    const { replyAction } = await import("@/app/admin/inquiries/actions");
    expect(await replyAction(null, fd({ id: ID, clientKey: KEY, body: "Replacements ship tomorrow.", mode: "send" }))).toEqual({ ok: "Sent." });
    expect(d.clearInquiryDraft).toHaveBeenCalledWith(ID);
    expect(d.getCustomerBasics).toHaveBeenCalledWith("asst1");
    expect(d.recordInquiryEvent).toHaveBeenCalledWith({ inquiryId: ID, action: "replied", actorId: OWNER.id, detail: "drafted by Assistant" });
  });

  it("no draft on the thread: nothing to credit, no extra lookup", async () => {
    const { replyAction } = await import("@/app/admin/inquiries/actions");
    await replyAction(null, fd({ id: ID, clientKey: KEY, body: "x" }));
    expect(d.clearInquiryDraft).toHaveBeenCalledWith(ID);
    expect(d.getCustomerBasics).not.toHaveBeenCalled();
  });

  it("saveDraftAction: requires inquiries.draft, guards empty/compliance, saves and logs", async () => {
    const { saveDraftAction } = await import("@/app/admin/inquiries/actions");
    expect(await saveDraftAction(null, fd({ id: ID, body: "  " }))).toEqual({ error: "Write a draft first." });
    expect(d.requirePermission).toHaveBeenCalledWith("inquiries.draft");
    expect(await saveDraftAction(null, fd({ id: ID, body: "Most people reconstitute with 2 ml" })))
      .toEqual({ error: expect.stringMatching(/^Not saved\. Remove "reconstitute" before sending/), phrase: "reconstitute" });
    expect(d.saveInquiryDraft).not.toHaveBeenCalled();
    expect(await saveDraftAction(null, fd({ id: ID, body: "Thanks, Dana — shipping replacements." })))
      .toEqual({ ok: "Draft saved — Alvester will review and send it." });
    expect(d.saveInquiryDraft).toHaveBeenCalledWith({ id: ID, body: "Thanks, Dana — shipping replacements.", actorId: OWNER.id });
    expect(d.recordInquiryEvent).toHaveBeenCalledWith({ inquiryId: ID, action: "draft_saved", actorId: OWNER.id });
  });

  it("discardDraftAction: requires inquiries.draft, clears and logs; a stale id throws", async () => {
    const { discardDraftAction } = await import("@/app/admin/inquiries/actions");
    await discardDraftAction(fd({ id: ID }));
    expect(d.requirePermission).toHaveBeenCalledWith("inquiries.draft");
    expect(d.clearInquiryDraft).toHaveBeenCalledWith(ID);
    expect(d.logInquiryEvent).toHaveBeenCalledWith({ inquiryId: ID, action: "draft_discarded", actorId: OWNER.id });
    await expect(discardDraftAction(fd({ id: "not-a-uuid" }))).rejects.toThrow(/Reload the page/);
  });
});
