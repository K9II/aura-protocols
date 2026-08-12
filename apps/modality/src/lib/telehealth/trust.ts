// Trust signals for the marketing surface — wired now, populated later.
//
// These arrays/values are intentionally EMPTY/null today. The homepage renders
// the proof bar, testimonials, and star ratings ONLY when the corresponding
// entry here is non-empty. That means we never publish invented visit counts,
// ratings, or reviews on a live medical page (an FTC problem). The moment we
// have verified figures, fill these in and the sections light up — no page
// edits required.

export type ProofStat = { n: string; label: string };
export type Testimonial = { quote: string; who: string };
export type Rating = { value: number; count: number };

/** Aggregate star rating. `null` until we have a real, verifiable rating.
 *  When set, drives the ribbon rating chip, the hero microtrust stars, and the
 *  star row on testimonial cards. */
export const RATING: Rating | null = null;

/** Proof-bar stats (e.g. { n: "12,400+", label: "visits completed" }).
 *  Empty until verified — an empty array hides the whole proof bar. */
export const PROOF_STATS: ProofStat[] = [];

/** Member testimonials. Empty until we have real, attributable reviews —
 *  an empty array hides the whole testimonials section. */
export const TESTIMONIALS: Testimonial[] = [];

/** Ribbon claims we can stand behind today with no invented numbers. The
 *  rating chip is appended automatically when RATING is set. Keep every item
 *  here defensible against the disclosures on /disclosures. */
export const RIBBON_CLAIMS: string[] = [
  "Licensed U.S. clinicians",
  "HIPAA-secure intake",
  "Prescribed only when appropriate",
];
