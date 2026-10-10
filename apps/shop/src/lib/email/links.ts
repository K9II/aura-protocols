import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// Unsubscribe links are signed (HMAC of the email) so nobody can unsubscribe
// someone else by typing their address into the URL.
function secret(): string {
  const s = process.env.EMAIL_LINK_SECRET;
  if (!s) throw new Error("Missing EMAIL_LINK_SECRET environment variable");
  return s;
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

// The optional tag (c=) says which email the link came from, for per-email
// unsubscribe counts. It's signed together with the address, so it can't be
// swapped. Links sent before tags existed carry no tag and still verify.
export function unsubscribeSig(email: string, tag?: string | null): string {
  return createHmac("sha256", secret()).update(`unsub:${normalizeEmail(email)}${tag ? `|${tag}` : ""}`).digest("base64url");
}

export function verifyUnsubscribe(email: string, sig: string | null | undefined, tag?: string | null): boolean {
  if (!sig) return false;
  const expected = Buffer.from(unsubscribeSig(email, tag));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function unsubscribeUrl(site: string, email: string, tag?: string): string {
  const e = normalizeEmail(email);
  return `${site}/api/unsubscribe?e=${encodeURIComponent(e)}${tag ? `&c=${encodeURIComponent(tag)}` : ""}&s=${unsubscribeSig(e, tag)}`;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export function parseUnsubTag(tag: string | null | undefined): { kind: string; ref: string | null } | null {
  if (!tag) return null;
  if (/^(welcome_[1-5]|cart_[1-3]|confirm)$/.test(tag)) return { kind: tag, ref: null };
  const m = /^campaign\.(.+)$/.exec(tag);
  if (m && UUID.test(m[1])) return { kind: "campaign", ref: m[1] };
  return null;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function newConfirmToken(): { token: string; hash: string } {
  const token = randomBytes(24).toString("base64url");
  return { token, hash: hashToken(token) };
}
