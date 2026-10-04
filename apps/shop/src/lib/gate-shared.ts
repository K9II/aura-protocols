// Client-safe gate constants. Bump TERMS_VERSION whenever Terms, the Refund &
// Dispute Policy, or the gate wording changes — every visitor is re-gated.
export const TERMS_VERSION = "2026-10-02";
export const GATE_COOKIE = "aura_gate";       // HttpOnly, signed (audit token)
export const GATE_HINT_COOKIE = "aura_gate_v"; // readable, terms version only
export const GATE_MAX_AGE_S = 60 * 60 * 24 * 365;

// Policy pages the gate itself links to (Terms, Refund & Dispute Policy) plus
// the other legal/compliance pages — a visitor must be able to read these
// without first clearing the gate that asks them to. /subscribed and
// /unsubscribed are landed on straight from an email link, often before the
// gate cookie exists on that device.
export const GATE_EXEMPT_PATHS = ["/terms", "/refund-policy", "/privacy", "/shipping", "/ruo", "/subscribed", "/unsubscribed"] as const;

const CRAWLER_RE = /googlebot|bingbot|duckduckbot|yandexbot|baiduspider|applebot|slurp/i;

export function isCrawler(userAgent: string): boolean {
  return CRAWLER_RE.test(userAgent);
}

export function hasCurrentGateHint(cookieHeader: string): boolean {
  return cookieHeader
    .split(";")
    .map((p) => p.trim())
    .includes(`${GATE_HINT_COOKIE}=${TERMS_VERSION}`);
}
