import "server-only";
import { getInquiry, recordInbound, recordUnmatched, seenSesMessage, uploadInquiryFile, type InboundFile } from "@/lib/inquiries/data";
import { getRawEmail } from "@/lib/inquiries/s3";
import { bodyText, parseRawEmail } from "@/lib/inquiries/mime";
import { cutQuoted } from "@/lib/inquiries/quote";
import { matchPlan, refFromSubject, sameEmail } from "@/lib/inquiries/match";
import { messageFlags } from "@/lib/inquiries/flags";
import { sortAttachments } from "@/lib/inquiries/attachments";
import { inboundDomain } from "@/lib/inquiries/send";

// SES receiving → S3 → SNS → here. Every step is safe to repeat (SNS retries
// on a 500): the SES message id is checked first and is unique in both
// inquiry_messages and inquiry_unmatched; file paths are fixed per message.
export type SesReceived = {
  notificationType?: string;
  mail?: { messageId?: string };
  receipt?: {
    recipients?: string[];
    spamVerdict?: { status?: string }; virusVerdict?: { status?: string };
    action?: { type?: string; bucketName?: string; objectKey?: string };
  };
};
export type InboundResult = "recorded" | "duplicate" | "dropped" | "unmatched" | "ignored";

export async function handleInbound(n: SesReceived): Promise<InboundResult> {
  if (n.notificationType !== "Received") return "ignored";
  const sesId = n.mail?.messageId;
  const bucket = n.receipt?.action?.bucketName;
  const key = n.receipt?.action?.objectKey;
  if (!sesId || !bucket || !key) throw new Error("inbound notification without a message id or S3 location");
  if (bucket !== process.env.INBOUND_MAIL_BUCKET) throw new Error(`inbound mail from unexpected bucket ${bucket}`);
  if (await seenSesMessage(sesId)) return "duplicate";
  if (n.receipt?.virusVerdict?.status === "FAIL") {
    console.error(`inbound ${sesId}: virus verdict FAIL — dropped`);
    return "dropped";
  }

  const p = await parseRawEmail(await getRawEmail(bucket, key));
  const spam = n.receipt?.spamVerdict?.status === "FAIL";
  const full = bodyText(p);
  const { body } = cutQuoted(full);
  const files = sortAttachments(p.attachments);

  // The token in the reply address decides. Failing that, "[Q-1047]" in the
  // subject — a weak match, accepted only from the inquiry's own address.
  const plan = matchPlan({ recipients: [...(n.receipt?.recipients ?? []), ...p.to, ...p.cc], subject: p.subject }, inboundDomain());
  let inquiry = plan.kind === "token" ? await getInquiry({ token: plan.token }) : null;
  const ref = refFromSubject(p.subject);
  if (!inquiry && ref) {
    const byRef = await getInquiry({ ref });
    if (byRef && sameEmail(byRef.email, p.fromEmail)) inquiry = byRef;
  }

  if (!inquiry) {
    await recordUnmatched({
      ses_message_id: sesId, from_email: p.fromEmail || "unknown", from_name: p.fromName, to_address: n.receipt?.recipients?.[0] ?? p.to[0] ?? null,
      subject: p.subject, body_text: body || "(no text)", full_text: full, raw_key: key, spam,
      attachment_names: [...files.keep.map((f) => f.filename), ...files.dropped],
    });
    return "unmatched";
  }

  const stored: InboundFile[] = [];
  for (const f of files.keep) {
    const path = `${inquiry.id}/${sesId}/${f.index + 1}-${f.safeName}`;
    await uploadInquiryFile(path, f.content, f.mimeType);
    stored.push({ filename: f.filename, content_type: f.mimeType, size_bytes: f.size, storage_path: path });
  }
  return recordInbound({
    inquiryId: inquiry.id, sesMessageId: sesId, fromEmail: p.fromEmail || "unknown", body: body || "(no text)", full, rawKey: key,
    emailMessageId: p.messageId, flags: messageFlags({ headers: p.headers, fromEmail: p.fromEmail, spam }, inquiry.email),
    dropped: files.dropped, files: stored,
  });
}
