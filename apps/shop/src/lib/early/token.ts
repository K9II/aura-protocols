import { createHmac, timingSafeEqual } from "node:crypto";
import { parseReferralCode } from "@/lib/waitlist/codes";
export { EARLY_PREFIX, earlyCode } from "@/lib/early/rules";

// Early access (pre-launch email 3, 2026-10-23). The link carries the waitlister's invite
// code signed with EMAIL_LINK_SECRET (never their email); the cookie carries the same code,
// the time it was set and a signature. No "server-only": proxy.ts reads the cookie.
export const EARLY_COOKIE = "aura_early";
export const EARLY_COOKIE_MAX_AGE_S = 30 * 24 * 3600;

function mac(payload: string): string {
  const s = process.env.EMAIL_LINK_SECRET;
  if (!s) throw new Error("Missing EMAIL_LINK_SECRET environment variable");
  return createHmac("sha256", s).update(payload).digest("base64url");
}

function same(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function earlyLinkUrl(site: string, ref: string): string {
  return `${site}/early?t=${ref}.${mac(`early-link:${ref}`)}`;
}

// The invite code a link's token unlocks, or null.
export function verifyEarlyToken(t: string | null | undefined): string | null {
  const parts = (t ?? "").split(".");
  if (parts.length !== 2) return null;
  const [raw, sig] = parts;
  const ref = parseReferralCode(raw);
  if (!ref || raw !== ref) return null;
  return same(sig, mac(`early-link:${ref}`)) ? ref : null;
}

export function signEarlyCookie(ref: string, nowMs: number = Date.now()): string {
  const payload = `${ref}.${nowMs}`;
  return `${payload}.${mac(`early-cookie:${payload}`)}`;
}

export function readEarlyCookie(v: string | undefined, nowMs: number = Date.now()): string | null {
  if (!v) return null;
  const parts = v.split(".");
  if (parts.length !== 3) return null;
  const [ref, ts, sig] = parts;
  if (parseReferralCode(ref) !== ref || !same(sig, mac(`early-cookie:${ref}.${ts}`))) return null;
  const age = nowMs - Number(ts);
  return Number.isFinite(age) && age >= 0 && age <= EARLY_COOKIE_MAX_AGE_S * 1000 ? ref : null;
}
