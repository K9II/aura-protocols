// The new-account offer: 15% off a first order placed within 14 days of
// opening the account. Automatic — no code. Pure; safe on client and server.
export const NEW_ACCOUNT_PCT = 15;
export const NEW_ACCOUNT_DAYS = 14;

// Copy states the offer in days, never as a date (Kearney tunes the window).
// Every "15%" / "14 days" shown anywhere is built from these two fragments.
export const OFFER_PCT_TEXT = `${NEW_ACCOUNT_PCT}%`;
export const OFFER_DAYS_TEXT = `${NEW_ACCOUNT_DAYS} days`;

export type FirstOrderOffer = { endsAt: string } | null;

export function offerEndsAt(createdAtMs: number): string {
  return new Date(createdAtMs + NEW_ACCOUNT_DAYS * 24 * 3600 * 1000).toISOString();
}

export function offerLive(input: { createdAt: string; hasPaidOrder: boolean; nowMs?: number }): FirstOrderOffer {
  if (input.hasPaidOrder) return null;
  const endsAt = offerEndsAt(Date.parse(input.createdAt));
  return (input.nowMs ?? Date.now()) <= Date.parse(endsAt) ? { endsAt } : null;
}
