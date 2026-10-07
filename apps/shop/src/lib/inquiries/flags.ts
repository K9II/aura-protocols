// Flags on an inbound message. auto_reply and spam are stored on the thread
// but never move its status (no reply loops); other_sender is a warning.
import { sameEmail } from "@/lib/inquiries/match";

export type Flag = "auto_reply" | "spam" | "other_sender";
const ROBOT = /^(mailer-daemon|postmaster|no-?reply)@/i;

export function messageFlags(m: { headers: Record<string, string>; fromEmail: string; spam: boolean }, inquiryEmail: string | null): Flag[] {
  const h = m.headers;
  const auto =
    (h["auto-submitted"] !== undefined && h["auto-submitted"].trim().toLowerCase() !== "no") ||
    h["x-autoreply"] !== undefined || h["x-autorespond"] !== undefined ||
    /^(auto_reply|bulk|junk)$/i.test((h["precedence"] ?? "").trim()) ||
    /^multipart\/report/i.test(h["content-type"] ?? "") ||
    ROBOT.test(m.fromEmail.trim());
  const flags: Flag[] = [];
  if (auto) flags.push("auto_reply");
  if (m.spam) flags.push("spam");
  if (inquiryEmail && !sameEmail(inquiryEmail, m.fromEmail)) flags.push("other_sender");
  return flags;
}
