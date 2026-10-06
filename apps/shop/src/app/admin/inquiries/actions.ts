"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOwner } from "@/lib/dal";
import { SUPPORT_EMAIL } from "@/lib/constants";
import { accountIdByEmail } from "@/lib/account/data";
import { alertOwner } from "@/lib/notify";
import {
  applyInquiryEvent, claimReply, closeUnmatched, deleteSavedReply, finishReply, getInquiry, getUnmatched, logInquiryEvent,
  recordInbound, recordInquiryEvent, releaseReply, saveSavedReply, setCustomer, setTopic, threadMessageIds,
} from "@/lib/inquiries/data";
import { replyBlockedMessage, replyViolation } from "@/lib/inquiries/checks";
import { replyEmail } from "@/lib/inquiries/emails";
import { sendInquiryEmail } from "@/lib/inquiries/send";
import { sameEmail } from "@/lib/inquiries/match";
import { INQUIRY_REPLY_MAX, SAVED_REPLY_MAX, SAVED_REPLY_NAME_MAX } from "@/lib/inquiries/constants";
import { parseRef, refLabel } from "@/lib/inquiries/rules";
import { TOPIC_LABEL, parseTopic } from "@/lib/inquiries/topics";

export type InquiryActionState = { ok?: string; error?: string; phrase?: string } | null;

const STALE = "That inquiry changed or doesn't exist. Reload the page.";
const uuid = (v: FormDataEntryValue | null) => z.string().uuid().safeParse(v);
const text = (v: FormDataEntryValue | null) => String(v ?? "").replace(/\r\n?/g, "\n").trim();

function refresh(ref?: number) {
  revalidatePath("/admin/inquiries");
  if (ref) revalidatePath(`/admin/inquiries/${refLabel(ref)}`);
  revalidatePath("/admin");
}

// Reply (and "Send and close"). Compliance first; then claim → send → finish,
// so a double click sends once and a failed send leaves no trace.
export async function replyAction(_prev: InquiryActionState, f: FormData): Promise<InquiryActionState> {
  const owner = await requireOwner();
  const id = uuid(f.get("id")), key = uuid(f.get("clientKey"));
  if (!id.success || !key.success) return { error: STALE };
  const body = text(f.get("body"));
  const close = f.get("mode") === "close";
  if (!body) return { error: "Write a reply first." };
  if (body.length > INQUIRY_REPLY_MAX) return { error: `Keep it under ${INQUIRY_REPLY_MAX.toLocaleString("en-US")} characters.` };
  const inq = await getInquiry({ id: id.data });
  if (!inq) return { error: STALE };
  const hit = replyViolation(body, [inq.name, inq.email]);
  if (hit) return { error: replyBlockedMessage(hit.phrase), phrase: hit.phrase };

  const claim = await claimReply({ inquiryId: inq.id, clientKey: key.data, body, authorId: owner.id, fromEmail: SUPPORT_EMAIL });
  if (claim === "duplicate") return { ok: "Already sent." };
  const ids = await threadMessageIds(inq.id);
  let sent: { messageId: string; headerId: string };
  try {
    sent = await sendInquiryEmail({
      to: inq.email, ...replyEmail({ ref: inq.ref, subject: inq.subject, body }), token: inq.token,
      inReplyTo: ids.at(-1) ?? null, references: ids, ignore: [inq.name, inq.email],
    });
  } catch (err) {
    await releaseReply(claim);
    return { error: `The email didn't send: ${err instanceof Error ? err.message : String(err)}. Nothing was recorded — try again.` };
  }
  try {
    await finishReply(claim, sent.messageId, sent.headerId);
    await applyInquiryEvent(inq.id, close ? "owner_replied_close" : "owner_replied", { actorId: owner.id });
  } catch (err) {
    await alertOwner("Inquiry reply sent but not recorded", `${refLabel(inq.ref)} · SES ${sent.messageId}: ${String(err)}`);
    throw err;
  }
  await recordInquiryEvent({ inquiryId: inq.id, action: "replied", actorId: owner.id });
  if (close) await recordInquiryEvent({ inquiryId: inq.id, action: "closed", actorId: owner.id });
  refresh(inq.ref);
  return { ok: close ? "Sent and closed." : "Sent." };
}

// Close / Re-open. A stale move throws (app/admin/error.tsx), as everywhere in the admin.
export async function statusAction(f: FormData): Promise<void> {
  const owner = await requireOwner();
  const id = uuid(f.get("id"));
  const op = f.get("op");
  if (!id.success || (op !== "close" && op !== "reopen")) throw new Error(STALE);
  const moved = await applyInquiryEvent(id.data, op, { actorId: owner.id });
  if (!moved) throw new Error(STALE);
  await logInquiryEvent({ inquiryId: id.data, action: op === "close" ? "closed" : "reopened", actorId: owner.id });
  const inq = await getInquiry({ id: id.data });
  refresh(inq?.ref);
}

export async function topicAction(f: FormData): Promise<void> {
  const owner = await requireOwner();
  const id = uuid(f.get("id"));
  const topic = parseTopic(f.get("topic"));
  if (!id.success || !topic) throw new Error(STALE);
  if (await setTopic(id.data, topic)) await logInquiryEvent({ inquiryId: id.data, action: "topic_changed", actorId: owner.id, detail: TOPIC_LABEL[topic] });
  const inq = await getInquiry({ id: id.data });
  refresh(inq?.ref);
}

export async function linkAction(_prev: InquiryActionState, f: FormData): Promise<InquiryActionState> {
  const owner = await requireOwner();
  const id = uuid(f.get("id"));
  const email = z.string().trim().toLowerCase().email().safeParse(f.get("email"));
  if (!id.success) return { error: STALE };
  if (!email.success) return { error: "Enter the account's email address." };
  const customerId = await accountIdByEmail(email.data);
  if (!customerId) return { error: "No account uses that email." };
  await setCustomer(id.data, customerId);
  await logInquiryEvent({ inquiryId: id.data, action: "linked", actorId: owner.id, detail: email.data });
  const inq = await getInquiry({ id: id.data });
  refresh(inq?.ref);
  return { ok: "Linked." };
}

export async function unlinkAction(f: FormData): Promise<void> {
  const owner = await requireOwner();
  const id = uuid(f.get("id"));
  if (!id.success) throw new Error(STALE);
  await setCustomer(id.data, null);
  await logInquiryEvent({ inquiryId: id.data, action: "unlinked", actorId: owner.id });
  const inq = await getInquiry({ id: id.data });
  refresh(inq?.ref);
}

export async function dismissUnmatchedAction(f: FormData): Promise<void> {
  const owner = await requireOwner();
  const id = uuid(f.get("id"));
  if (!id.success) throw new Error(STALE);
  const u = await getUnmatched(id.data);
  if (!u || !(await closeUnmatched(id.data, { dismissedBy: owner.id }))) throw new Error("That email was already handled. Reload the page.");
  await logInquiryEvent({ inquiryId: null, action: "unmatched_dismissed", actorId: owner.id, detail: u.from_email });
  refresh();
}

// Copies the stored text into the chosen thread as a customer message (the
// SQL function logs "unmatched_attached" with the owner and moves the status).
export async function attachUnmatchedAction(_prev: InquiryActionState, f: FormData): Promise<InquiryActionState> {
  const owner = await requireOwner();
  const id = uuid(f.get("id"));
  const ref = parseRef(String(f.get("ref") ?? ""));
  if (!id.success) return { error: "That email was already handled. Reload the page." };
  if (!ref) return { error: "Enter a Q-number, like Q-1047." };
  const [inq, u] = await Promise.all([getInquiry({ ref }), getUnmatched(id.data)]);
  if (!inq) return { error: `There's no ${refLabel(ref)}.` };
  if (!u) return { error: "That email was already handled. Reload the page." };
  await recordInbound({
    inquiryId: inq.id, sesMessageId: u.ses_message_id, fromEmail: u.from_email, body: u.body_text, full: u.full_text, rawKey: u.raw_key,
    emailMessageId: null, flags: sameEmail(u.from_email, inq.email) ? [] : ["other_sender"], dropped: u.attachment_names, files: [], actorId: owner.id,
  });
  await closeUnmatched(id.data, { attachedTo: inq.id });
  refresh(inq.ref);
  return { ok: `Attached to ${refLabel(inq.ref)}.` };
}

export async function saveReplyAction(_prev: InquiryActionState, f: FormData): Promise<InquiryActionState> {
  const owner = await requireOwner();
  const idRaw = f.get("id");
  const id = idRaw ? uuid(idRaw) : null;
  if (id && !id.success) return { error: STALE };
  const name = text(f.get("name")), body = text(f.get("body"));
  if (!name || name.length > SAVED_REPLY_NAME_MAX) return { error: `Give it a name (up to ${SAVED_REPLY_NAME_MAX} characters).` };
  if (!body || body.length > SAVED_REPLY_MAX) return { error: `Write the text (up to ${SAVED_REPLY_MAX.toLocaleString("en-US")} characters).` };
  const hit = replyViolation(`${name}\n${body}`, []);
  if (hit) return { error: `Remove "${hit.phrase}" — saved replies pass the same check as every reply.`, phrase: hit.phrase };
  const r = await saveSavedReply({ id: id?.success ? id.data : null, name, body, actorId: owner.id });
  if (r === "name_taken") return { error: "A saved reply already has that name." };
  if (r === "missing") return { error: STALE };
  await logInquiryEvent({ inquiryId: null, action: "reply_saved", actorId: owner.id, detail: name });
  revalidatePath("/admin/inquiries", "layout");
  return { ok: "Saved." };
}

export async function deleteReplyAction(f: FormData): Promise<void> {
  const owner = await requireOwner();
  const id = uuid(f.get("id"));
  if (!id.success) throw new Error(STALE);
  const name = await deleteSavedReply(id.data);
  if (!name) throw new Error("That saved reply was already deleted. Reload the page.");
  await logInquiryEvent({ inquiryId: null, action: "reply_deleted", actorId: owner.id, detail: name });
  revalidatePath("/admin/inquiries", "layout");
}
