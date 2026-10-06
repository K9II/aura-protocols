// The raw email from S3 → what the inbox needs. postal-mime parses MIME
// (encodings, charsets, multipart) in Node and the browser alike.
import PostalMime from "postal-mime";
import type { MailPart } from "@/lib/inquiries/attachments";
import { htmlToText } from "@/lib/inquiries/quote";

export type ParsedEmail = {
  fromEmail: string; fromName: string | null; to: string[]; cc: string[];
  subject: string; messageId: string | null;
  headers: Record<string, string>;   // lower-case name → first value
  text: string; html: string;
  attachments: MailPart[];
};

type Addr = { address?: string; name?: string; group?: Addr[] };
const flat = (xs: Addr[] | undefined): string[] =>
  (xs ?? []).flatMap((a) => (a.group ? flat(a.group) : a.address ? [a.address.toLowerCase()] : []));

// An RFC 5322 msg-id, loosely: "<...>" with no inner "<", ">" or whitespace.
// Anything else (missing brackets, garbage) is stored as no id rather than a
// value that would break In-Reply-To/References threading downstream.
const MESSAGE_ID_RE = /^<[^<>\s]{1,250}>$/;
const validMessageId = (id: string | null | undefined): string | null => (id && MESSAGE_ID_RE.test(id) ? id : null);

export async function parseRawEmail(raw: Uint8Array): Promise<ParsedEmail> {
  const e = await PostalMime.parse(raw);
  const headers: Record<string, string> = {};
  for (const h of e.headers ?? []) if (!(h.key in headers)) headers[h.key.toLowerCase()] = h.value;
  return {
    fromEmail: (e.from?.address ?? "").toLowerCase(),
    fromName: e.from?.name || null,
    to: flat(e.to as Addr[] | undefined),
    cc: flat(e.cc as Addr[] | undefined),
    subject: e.subject ?? "",
    messageId: validMessageId(e.messageId),
    headers,
    text: e.text ?? "",
    html: e.html ?? "",
    attachments: (e.attachments ?? []).map((a) => {
      const content = typeof a.content === "string" ? new TextEncoder().encode(a.content) : new Uint8Array(a.content);
      return { filename: a.filename ?? null, mimeType: a.mimeType, size: content.byteLength, inline: a.disposition === "inline" && !!a.contentId, content };
    }),
  };
}

export const bodyText = (p: Pick<ParsedEmail, "text" | "html">): string => (p.text.trim() ? p.text : htmlToText(p.html));
