// Every number the Inquiries module uses. Pure — the screens and the Guide
// read these, never typed numbers (standing rule).

// A "Waiting on customer" thread closes after this many days without a reply.
export const INQUIRY_AUTO_CLOSE_DAYS = 14;
// An open thread is late (red) once the customer has waited this many
// Mon–Fri shop days (Mountain) — Today's business-day helper.
export const INQUIRY_LATE_BUSINESS_DAYS = 1;

// Form limits (/contact and /wholesale).
export const INQUIRY_NAME_MAX = 120;
export const INQUIRY_ORG_MAX = 160;
export const INQUIRY_ORDER_MAX = 20;
export const INQUIRY_MESSAGE_MAX = 4000;
// Per-IP limit on new inquiries (counted from the inquiries table).
export const INQUIRY_RATE_LIMITS = [
  { windowMs: 60 * 60 * 1000, max: 5 },
  { windowMs: 24 * 60 * 60 * 1000, max: 20 },
] as const;
// Per-recipient limit on acknowledgement emails: the form takes any address,
// so without this, one requester could make SES repeatedly email a stranger.
// Past this many in 24h for the same (lower-cased) email, the inquiry is
// still saved and the owner still notified — only the ack is skipped.
export const INQUIRY_ACKS_PER_EMAIL_DAY = 3;

// Owner replies and saved replies.
export const INQUIRY_REPLY_MAX = 10_000;
export const SAVED_REPLY_NAME_MAX = 80;
export const SAVED_REPLY_MAX = 4000;

// Attachments on customer emails: kept when one of these types, up to this
// size, at most this many per email. Inline signature images below
// INLINE_IGNORE_BYTES are ignored entirely.
export const ATTACHMENT_TYPES = ["image/jpeg", "image/png", "image/heic", "image/heif", "application/pdf"] as const;
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const ATTACHMENTS_PER_EMAIL = 5;
export const INLINE_IGNORE_BYTES = 50 * 1024;
// Raw emails stay in S3 this long (bucket lifecycle rule, Task 21).
export const RAW_MAIL_KEEP_DAYS = 90;
// Signed links to stored files expire after this many seconds.
export const FILE_LINK_SECONDS = 600;

// Reply-address local part: r-<32 hex>.
export const REPLY_PREFIX = "r-";
export const THREAD_REFS_MAX = 20;

export const INQUIRIES_PER_PAGE = 50;
export const PREVIEW_CHARS = 90;

// Every owner reply is signed by the business persona, never the owner's
// account name (owner rule 2026-10-06: always "Alvester").
export const REPLY_SIGNATURE = "— Alvester, Aura Protocols";
