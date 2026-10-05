export const EXTERNAL_REL = "noopener noreferrer";

// Research guides (/blog) are unpublished while they're rewritten as
// research-literature summaries. Content stays in data/posts.ts.
// Imported by next.config.ts — keep this file free of "@/" imports.
export const BLOG_PUBLISHED = false;

// Customer support mailbox — Kearney must confirm it receives mail before unpause.
export const SUPPORT_EMAIL = "support@auraprotocols.com";

// The purity the site promises (homepage "99% purity floor"). The receive-a-lot
// dialog warns below it.
export const PURITY_FLOOR_PCT = 99;
// Shown at sign-in to a blocked account (admin Customers → Block).
export const ACCOUNT_CLOSED_MESSAGE = `This account is closed. If you think this is a mistake, email ${SUPPORT_EMAIL} from the address on the account.`;

// Launch placeholders for the policy pages. RELEASE_CHECK fails while null.
// State whose law governs the Terms — set after the LLC's Wyoming move.
export const GOVERNING_STATE: string | null = null;
// Business days from order to dispatch — set once Rapid Fulfillment confirms.
export const DISPATCH_BUSINESS_DAYS: number | null = null;
