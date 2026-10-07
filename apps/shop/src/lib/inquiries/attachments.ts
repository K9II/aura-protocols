// What we keep from a customer email: images and PDFs, within size and count
// limits. Everything else is named in the thread ("1 attachment not kept").
import { ATTACHMENT_MAX_BYTES, ATTACHMENT_TYPES, ATTACHMENTS_PER_EMAIL, INLINE_IGNORE_BYTES } from "@/lib/inquiries/constants";

export type MailPart = { filename: string | null; mimeType: string; size: number; inline: boolean; content: Uint8Array };
export type KeptPart = MailPart & { filename: string; safeName: string; index: number };

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/heic": "heic", "image/heif": "heif", "application/pdf": "pdf" };

export function safeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const cleaned = base.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^[-.]+|[-.]+(?=\.)|-+$/g, "").slice(0, 100);
  return /[A-Za-z0-9]/.test(cleaned) ? cleaned : "file";
}

export function sortAttachments(parts: MailPart[]): { keep: KeptPart[]; dropped: string[] } {
  const keep: KeptPart[] = [];
  const dropped: string[] = [];
  parts.forEach((p, i) => {
    const type = p.mimeType.toLowerCase();
    if (p.inline && type.startsWith("image/") && p.size < INLINE_IGNORE_BYTES) return;
    const filename = p.filename?.trim() || `attachment-${i + 1}.${EXT[type] ?? "bin"}`;
    const ok = (ATTACHMENT_TYPES as readonly string[]).includes(type) && p.size <= ATTACHMENT_MAX_BYTES && keep.length < ATTACHMENTS_PER_EMAIL;
    if (ok) keep.push({ ...p, mimeType: type, filename, safeName: safeFileName(filename), index: keep.length });
    else dropped.push(filename);
  });
  return { keep, dropped };
}
