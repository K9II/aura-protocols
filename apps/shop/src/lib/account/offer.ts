// The new-account offer: 15% off a first order placed within 3 days of
// opening the account. Automatic — no code. Pure; safe on client and server.
import { CODE_DISCOUNT_PCT } from "@/lib/partners/tiers";

export const NEW_ACCOUNT_PCT = 15;
export const NEW_ACCOUNT_DAYS: number = 3; // Kearney 2026-10-04: was 14

// Copy states the offer in days, never as a date (Kearney tunes the window).
// Every "15%" / "3 days" shown anywhere is built from these two fragments.
export const OFFER_PCT_TEXT = `${NEW_ACCOUNT_PCT}%`;
export const OFFER_DAYS_TEXT = `${NEW_ACCOUNT_DAYS} day${NEW_ACCOUNT_DAYS === 1 ? "" : "s"}`;

export type FirstOrderOffer = { endsAt: string } | null;

export function offerEndsAt(createdAtMs: number): string {
  return new Date(createdAtMs + NEW_ACCOUNT_DAYS * 24 * 3600 * 1000).toISOString();
}

export function offerLive(input: { createdAt: string; hasPaidOrder: boolean; nowMs?: number }): FirstOrderOffer {
  if (input.hasPaidOrder) return null;
  const endsAt = offerEndsAt(Date.parse(input.createdAt));
  return (input.nowMs ?? Date.now()) <= Date.parse(endsAt) ? { endsAt } : null;
}

// Which percent wins when a customer may have both the automatic new-account
// offer and a typed partner code (one discount per line, never stacked): the
// larger percent. `newAccount` is true only when the offer's own percent is
// the one used — checkout and its display split new-account vs. partner-code
// handling on it. Takes the two percents as arguments so it can be tested
// independently of whichever is currently configured; `discountPct` below is
// what callers use.
export function discountPctWith(newPct: number, codePct: number, offerLive: boolean, partnerCode: boolean): { pct: number; newAccount: boolean } | null {
  if (!offerLive && !partnerCode) return null;
  if (offerLive && !partnerCode) return { pct: newPct, newAccount: true };
  if (!offerLive && partnerCode) return { pct: codePct, newAccount: false };
  return newPct >= codePct ? { pct: newPct, newAccount: true } : { pct: codePct, newAccount: false };
}

export function discountPct(offerLive: boolean, partnerCode: boolean): { pct: number; newAccount: boolean } | null {
  return discountPctWith(NEW_ACCOUNT_PCT, CODE_DISCOUNT_PCT, offerLive, partnerCode);
}
