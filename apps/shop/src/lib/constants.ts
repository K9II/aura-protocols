export const EXTERNAL_REL = "noopener noreferrer";

// Research guides (/blog) are unpublished while they're rewritten as
// research-literature summaries. Content stays in data/posts.ts.
// Imported by next.config.ts — keep this file free of "@/" imports.
export const BLOG_PUBLISHED = false;

// Customer mailboxes (aliases; admin@ gets internal mail only). support@ is
// general questions; orders@ is anything about a placed order — order emails'
// Reply-To and footer, and the refund/damage steps on the Refund Policy.
export const SUPPORT_EMAIL = "support@auraprotocols.com";
export const ORDERS_EMAIL = "orders@auraprotocols.com";

// The purity the site promises (homepage "99% purity floor"). The receive-a-lot
// dialog warns below it.
export const PURITY_FLOOR_PCT = 99;
// The seven tests (identity, purity, quantity, endotoxin, sterility, heavy metals,
// fentanyl) as a claim about EVERY lot. Off since 2026-10-20 (Alvester): core lots get all
// seven, the smaller range lots get Vanguard Gold (no heavy metals or fentanyl), so the
// footer and the order plate say "up to a seven-point panel" and Fig. 3 shows each lot's own
// results. While on, RELEASE_CHECK fails if a live lot lacks a passing result for any of the
// seven (going live itself still needs only purity + endotoxin — the owner's call).
// The hero's green ring names the seven either way (it describes the panel, not each lot).
export const SEVEN_TEST_PANEL = false;
// Shown at sign-in to a blocked account (admin Customers → Block).
export const ACCOUNT_CLOSED_MESSAGE = `This account is closed. If you think this is a mistake, email ${SUPPORT_EMAIL} from the address on the account.`;

// Launch placeholders for the policy pages. RELEASE_CHECK fails while null.
// State whose law governs the Terms — set after the LLC's Wyoming move.
export const GOVERNING_STATE: string | null = null;
// Business days from order to dispatch — set once Rapid Fulfillment confirms.
export const DISPATCH_BUSINESS_DAYS: number | null = null;
// A Stripe checkout page stays open this long; until then its vials, code use
// and store credit stay held (lib/commerce.ts).
export const CHECKOUT_EXPIRY_HOURS = 23;
