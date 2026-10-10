import "server-only";
import { randomBytes } from "node:crypto";
import { sendEmail } from "@/lib/ses";
import { assertCompliant } from "@/lib/email/compliance";
import { THREAD_REFS_MAX } from "@/lib/inquiries/constants";
import { replyAddress } from "@/lib/inquiries/match";

// The only way an inquiry email leaves: compliance scan first, then SES as
// "Aura Protocols" with the thread's own Reply-To, so the answer comes back
// into the thread (SES receiving → /api/ses/inbound).
export const INQUIRY_FROM_NAME = "Aura Protocols";
export const newToken = (): string => randomBytes(16).toString("hex");

export function inboundDomain(): string {
  const d = process.env.INBOUND_MAIL_DOMAIN;
  if (!d) throw new Error("Missing INBOUND_MAIL_DOMAIN environment variable");
  return d.toLowerCase();
}

// support@auraprotocols.com once that domain is verified in SES (Task 21);
// until then the shop's verified sender.
function fromAddress(): string {
  const f = process.env.INQUIRY_FROM_EMAIL || process.env.SES_FROM_EMAIL;
  if (!f) throw new Error("Missing SES_FROM_EMAIL environment variable");
  return f;
}

// SES replaces our Message-ID with its own. Format checked in the live check.
export function sesHeaderId(messageId: string, region: string = process.env.AWS_REGION ?? "us-east-1"): string {
  return `<${messageId}@${region === "us-east-1" ? "email" : region}.amazonses.com>`;
}

export async function sendInquiryEmail(m: {
  to: string; subject: string; html: string; text: string; token: string;
  inReplyTo?: string | null; references?: string[]; ignore?: string[];
}): Promise<{ messageId: string; headerId: string }> {
  assertCompliant(m.subject, m.html, m.ignore ?? []);
  const replyTo = replyAddress(m.token, inboundDomain());
  const refs = (m.references ?? []).slice(-THREAD_REFS_MAX);
  const headers = [
    ...(m.inReplyTo ? [{ name: "In-Reply-To", value: m.inReplyTo }] : []),
    ...(refs.length ? [{ name: "References", value: refs.join(" ") }] : []),
  ];
  const r = await sendEmail({ to: m.to, subject: m.subject, html: m.html, text: m.text, fromName: INQUIRY_FROM_NAME, fromEmail: fromAddress(), replyTo, headers });
  if (!r.messageId) throw new Error("SES returned no message id");
  return { messageId: r.messageId, headerId: sesHeaderId(r.messageId) };
}
