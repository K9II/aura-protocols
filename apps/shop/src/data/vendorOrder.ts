// apps/shop/src/data/vendorOrder.ts
//
// Controls the display order of vendors in the "where to buy" list on product
// pages. By default the product page sorts vendors by commission (descending);
// vendorPins() returns an explicit vendor order that overrides that sort for a
// product. Vendors named in the returned list float to the top in that order
// (skipping any that don't carry the product); everyone else keeps the default
// commission-descending order below them.

import { EVOLVE_ENABLED } from "./pendingVendors";

// GLP-1 / incretin products. Evolve leads, Limitless second — but this activates
// only WITH Evolve go-live (gated on EVOLVE_ENABLED). Until Evolve flips on, GLP-1
// pages keep their current commission-desc ordering; otherwise pinning
// "Limitless 2nd" would reorder the live retatrutide page prematurely.
// NOTE: cagrilintide is intentionally NOT here — it's a pure amylin analog, not a
// GLP-1, so per Kearney (2026-08-23) it falls under the non-GLP-1 rule below
// (Mile High / American). The two combos stay in this set because each contains a
// GLP-1 component (cagrisema = +semaglutide, retatrutide-cagrilintide = +retatrutide).
const GLP1_PRODUCT_IDS = new Set<string>([
  "semaglutide",
  "tirzepatide",
  "retatrutide",
  "cagrisema",
  "retatrutide-cagrilintide",
]);
// NOTE: Limitless was REMOVED from this pin list (Kearney, 2026-08-28) — it is now
// demoted to the BOTTOM on every product (see DEMOTED_TO_BOTTOM below), so pinning
// it 2nd here would contradict that. Evolve still leads GLP-1 pages.
const GLP1_PINNED_ORDER = ["Evolve Peptides"];

// Every NON-GLP-1 product: American Peptides leads. Mile High Compounds was
// REMOVED from the pin list (Kearney, 2026-08-26) — Mile High no longer receives
// ANY priority in any category and now falls to the default commission-desc
// ordering with everyone else. (Possible full discontinuation pending.)
const NON_GLP1_PINNED_ORDER = ["American Peptides"];

// Vendors under review for possible removal — pinned to the BOTTOM of every
// product's vendor list regardless of commission or category pins, until Kearney
// decides whether to keep them. Demotion takes precedence over vendorPins(), so a
// demoted vendor sinks even on a page where it would otherwise be pinned.
//
// NOTE: Ignite was briefly added here on a stale "summary-only COA" belief, then
// REMOVED (Kearney, 2026-08-28) once its actual reta COA was read — an ISO/IEC
// 17025 accredited ILS Labs full panel (identity, purity, mass, sterility,
// endotoxin, heavy metals, fentanyl screen), in fact the most complete COA in
// the roster. Ignite keeps its normal commission-based ordering.
//
// Limitless Life Nootropics was removed from the site entirely 2026-08-29
// (no public COA, billing gate) rather than left demoted — see vendor registry.
const DEMOTED_TO_BOTTOM: string[] = [];

/**
 * Ordered list of vendor names to pin to the top of a product's vendor list.
 * Empty array = no override (fall back to commission-desc). Absent pinned
 * vendors are simply skipped, so e.g. a product Mile High doesn't carry will
 * show American Peptides first.
 */
export function vendorPins(productId: string): string[] {
  if (GLP1_PRODUCT_IDS.has(productId)) {
    return EVOLVE_ENABLED ? GLP1_PINNED_ORDER : [];
  }
  return NON_GLP1_PINNED_ORDER;
}

/**
 * Vendor names to force to the BOTTOM of every product's vendor list, in the
 * order given, ahead of the normal pin/commission sort. Used to park vendors
 * that are under review for removal without unwiring them. Takes precedence
 * over vendorPins().
 */
export function vendorDemotions(): string[] {
  return DEMOTED_TO_BOTTOM;
}
