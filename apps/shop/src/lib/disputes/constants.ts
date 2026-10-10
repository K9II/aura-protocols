// Every number the Disputes module uses (spec 2026-10-05-admin-disputes-design.md). Pure.
export const DISPUTE_DUE_SOON_DAYS = 3;              // a deadline this close (or closer) shows red
export const DISPUTE_REMIND_DAYS = [3, 1] as const;  // the daily reconcile alerts this many days before an unsubmitted deadline, once each
export const DISPUTE_RATE_DAYS = 90;                 // the dispute rate covers this many days
export const DISPUTE_RATE_REVIEW_PCT = 0.75;         // card networks consider this rate excessive; Stripe reviews accounts there
export const DISPUTE_WON_DAYS = 365;                 // "Won · 12 months"
export const DISPUTE_FEE_CENTS = 1500;               // Stripe's US dispute fee (check Stripe's pricing page if it changes)
export const BANK_DECISION_DAYS = [60, 75] as const; // how long banks usually take after evidence is submitted
export const CLOCK_DRIFT_MS = 2 * 60_000;            // server vs Stripe clock: a deadline within this is left to Stripe to judge
export const EVIDENCE_TOTAL_MAX = 150_000;           // Stripe: all evidence text together
export const DISPUTES_LIST_MAX = 500;
export const SHOP_LEGAL_NAME = "Aura Protocols LLC";
