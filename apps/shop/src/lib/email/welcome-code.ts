// The 10% first-order code a subscriber gets in File 01. Pure — no I/O.
// Tied to one email address, so it can't spread on coupon sites.
import { randomInt } from "node:crypto";
import { CODE_DISCOUNT_PCT } from "@/lib/partners/tiers";

export const WELCOME_PCT = CODE_DISCOUNT_PCT; // 10, same math as a partner code
export const WELCOME_CODE_DAYS = 14;
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I/L
const FORMAT = new RegExp(`^AURA-[${ALPHABET}]{4}$`);

export function generateWelcomeCode(rand: (n: number) => number = randomInt): string {
  let s = "AURA-";
  for (let i = 0; i < 4; i++) s += ALPHABET[rand(ALPHABET.length)];
  return s;
}

export function normalizeWelcomeCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export function isWelcomeCodeFormat(raw: string): boolean {
  return FORMAT.test(normalizeWelcomeCode(raw));
}

// End-of-day UTC on the expiry date (not confirmedAtMs + 14 days exactly) so
// the code never ends before the date shown in the email, which is a UTC
// calendar date with no time of day.
export function welcomeExpiry(confirmedAtMs: number): string {
  const d = new Date(confirmedAtMs + WELCOME_CODE_DAYS * 24 * 3600 * 1000);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999)).toISOString();
}

export type WelcomeRow = {
  email: string; status: string; welcome_code: string | null;
  welcome_code_expires_at: string | null; welcome_code_used_order_id: string | null;
};
export type WelcomeCheck = { ok: true; code: string } | { ok: false; message: string };

const INVALID = "This code isn't valid.";

export function checkWelcomeCode(input: {
  code: string; buyerEmail: string; row: WelcomeRow | null; hasPaidOrder: boolean; nowMs?: number;
}): WelcomeCheck {
  const code = normalizeWelcomeCode(input.code);
  const r = input.row;
  if (!r || r.welcome_code !== code || r.status === "pending") return { ok: false, message: INVALID };
  if (r.email !== input.buyerEmail.trim().toLowerCase()) {
    return { ok: false, message: "This code belongs to a different email address. Sign in with the email it was sent to." };
  }
  if (r.welcome_code_used_order_id) return { ok: false, message: "This code has already been used." };
  if (!r.welcome_code_expires_at || Date.parse(r.welcome_code_expires_at) < (input.nowMs ?? Date.now())) {
    return { ok: false, message: "This code has expired." };
  }
  if (input.hasPaidOrder) return { ok: false, message: "This code is for a first order only." };
  return { ok: true, code };
}
