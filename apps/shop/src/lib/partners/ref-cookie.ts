import { createHmac, timingSafeEqual } from "node:crypto";
import { REF_WINDOW_DAYS } from "@/lib/partners/tiers";

// Signed first-party referral cookie: CODE.timestampMs.hmac. Holds the code,
// not the partner id; checkout re-checks that the partner is still approved.
// No "server-only" import: proxy.ts reads and writes it.
export const REF_COOKIE = "aura_ref";
export const REF_MAX_AGE_S = REF_WINDOW_DAYS * 24 * 3600;

function mac(payload: string): string {
  const secret = process.env.PARTNER_REF_SECRET;
  if (!secret) throw new Error("Missing PARTNER_REF_SECRET environment variable");
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function signRef(code: string, nowMs: number = Date.now()): string {
  const payload = `${code}.${nowMs}`;
  return `${payload}.${mac(payload)}`;
}

export function readRef(value: string | undefined, nowMs: number = Date.now()): string | null {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const [code, ts, sig] = parts;
  const expected = Buffer.from(mac(`${code}.${ts}`));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  const age = nowMs - Number(ts);
  if (!Number.isFinite(age) || age < 0 || age > REF_MAX_AGE_S * 1000) return null;
  return code;
}
