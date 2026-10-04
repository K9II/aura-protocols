// Client-safe gate constants. Bump TERMS_VERSION whenever Terms, the Refund &
// Dispute Policy, or the sign-up agreement wording changes.
export const TERMS_VERSION = "2026-10-04";

// No gate on the legal pages the sign-up agreement links to, the pages a
// visitor needs to get into an account, or pages landed on from an email.
export const GATE_EXEMPT_PATHS = [
  "/terms", "/refund-policy", "/privacy", "/shipping", "/ruo",
  "/sign-in", "/forgot-password", "/reset-password", "/verified", "/unsubscribed",
] as const;
const GATE_EXEMPT_PREFIXES = ["/auth/"];

export function isGateExempt(pathname: string): boolean {
  return (GATE_EXEMPT_PATHS as readonly string[]).includes(pathname) || GATE_EXEMPT_PREFIXES.some((p) => pathname.startsWith(p));
}

// Kearney 2026-10-04: one required box at sign-up; marketing email is the
// default (sent only once the address is verified) with this notice under
// the box — every marketing email carries an unsubscribe link.
export const MARKETING_NOTICE = "We’ll update you on promotions, research news, and new lots/SKUs as they’re released — unsubscribe anytime.";

const CRAWLER_RE = /googlebot|bingbot|duckduckbot|yandexbot|baiduspider|applebot|slurp/i;

export function isCrawler(userAgent: string): boolean {
  return CRAWLER_RE.test(userAgent);
}
