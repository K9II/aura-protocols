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
const GLP1_PINNED_ORDER = ["Evolve Peptides", "Limitless Life Nootropics"];

// Every NON-GLP-1 product: Mile High first, American Peptides second, wherever
// each is a vendor on that product (Kearney, 2026-08-23). Both are already-live
// vendors, so this is NOT gated — it takes effect on the next deploy.
const NON_GLP1_PINNED_ORDER = ["Mile High Compounds", "American Peptides"];

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
