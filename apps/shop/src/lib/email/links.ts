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

export function unsubscribeSig(email: string): string {
  return createHmac("sha256", secret()).update(`unsub:${normalizeEmail(email)}`).digest("base64url");
}

export function verifyUnsubscribe(email: string, sig: string | null | undefined): boolean {
  if (!sig) return false;
  const expected = Buffer.from(unsubscribeSig(email));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function unsubscribeUrl(site: string, email: string): string {
  const e = normalizeEmail(email);
  return `${site}/api/unsubscribe?e=${encodeURIComponent(e)}&s=${unsubscribeSig(e)}`;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function newConfirmToken(): { token: string; hash: string } {
  const token = randomBytes(24).toString("base64url");
  return { token, hash: hashToken(token) };
}
