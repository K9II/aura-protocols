// apps/shop/src/data/pendingVendors.ts
//
// Staging area for vendors that are wired but NOT yet live (awaiting affiliate
// approval). Everything here is dormant until a single flag is flipped, so the
// production build is byte-for-byte identical to today while EVOLVE_ENABLED === false.
//
// ─────────────────────────────────────────────────────────────────────────────
//  EVOLVE PEPTIDES — applied 2026-08-23, awaiting approval
//  Program: 15% commission (recurring on repeat orders), 15% customer discount,
//           180-day cookie, monthly PayPal payouts. WooCommerce storefront.
//  Portal:  https://affiliates.evolvepeptides.com/  (login on file in AIOS)
//
//  ┌─────────────────────  GO-LIVE CHECKLIST (once approved)  ─────────────────┐
//  │ 1. Fill EVOLVE_REF_TOKEN below with the real referral token from the      │
//  │    affiliate dashboard (the id/slug in your unique referral link).        │
//  │ 2. Confirm EVOLVE_REF_PARAM is the correct query key for that link        │
//  │    (open your referral link and read the ?<key>=<token> it carries).      │
//  │ 3. Set EVOLVE_ENABLED = true.                                             │
//  │ 4. Rebuild + deploy the shop. Evolve then appears on all 24 covered       │
//  │    products, /go/aura-evolve-* redirects generate automatically, and the  │
//  │    vendor profile shows on compare pages — no other file needs editing.   │
//  │ (A build-time guard throws if you enable it while the token is PENDING.)  │
//  └───────────────────────────────────────────────────────────────────────────┘
// ─────────────────────────────────────────────────────────────────────────────

import type { ProductVendor } from "./products";
import type { VendorProfile } from "./vendorProfiles";

/** Master switch. Flip to true on approval (see checklist above). */
export const EVOLVE_ENABLED = true;

/** Referral token from the Evolve affiliate dashboard. Approved 2026-08-24;
 *  Evolve runs on GoAffPro (same as Mile High), whose ref param carries the
 *  coupon code — so ?ref=auraproto, matching the confirmed `auraproto` coupon.
 *  The coupon is the primary, guaranteed attribution regardless of link param. */
const EVOLVE_REF_TOKEN = "auraproto";

/** Query-string key that carries the referral token in Evolve's referral link.
 *  WooCommerce affiliate plugins commonly use "ref"; VERIFY against the real
 *  link before go-live and change if different. */
const EVOLVE_REF_PARAM = "ref";

/** Customer discount code (15% off) — confirmed by Kearney 2026-08-23. */
const EVOLVE_DISCOUNT_CODE = "auraproto";

export const EVOLVE_VENDOR_NAME = "Evolve Peptides";
const EVOLVE_COMMISSION = "15%";

// Our product id → Evolve product-page slug (verified against Evolve's product
// sitemap 2026-08-23). Only the 24 products Evolve actually carries are listed;
// retatrutide-cagrilintide and cagrisema are intentionally absent — Evolve does
// not stock those two combination products.
const EVOLVE_PRODUCT_SLUGS: Record<string, string> = {
  "bpc-157": "bpc-157-10-mg",
  "tb-500": "tb-500-10-mg",
  semaglutide: "sema-10-mg",
  tirzepatide: "tirz-10-mg",
  "cjc-1295-ipamorelin": "cjc-1295-ipamorelin-10-10-mg-no-dac",
  "bpc-157-tb-500-blend": "bpc-157-tb-500-blend-5-5-mg",
  "glow-stack": "glow-70-mg",
  "klow-stack": "kglow-50-10-10-10", // KGLOW = KLOW (BPC/TB/GHK/KPV) — confirmed by Kearney 2026-08-23
  "pt-141": "pt-141-10-mg",
  retatrutide: "reta-10mg",
  cagrilintide: "cagrilintide-10-mg",
  tesamorelin: "tesa-10-mg",
  "ss-31": "ss-31-10mg",
  "slu-pp-332": "slu-pp-332-capsules-250-mcg-100-capsules",
  "aod-9604": "aod-9604-10-mg",
  epithalon: "epithalon-50-mg",
  sermorelin: "sermorelin-10-mg",
  "mots-c": "mots-c-10-mg",
  "ghk-cu": "ghk-cu-50-mg",
  "igf-1-lr3": "igf-1-lr3-1-mg",
  "nad-plus": "nad-500-mg",
  kpv: "kpv-10-mg",
  dsip: "dsip-5-mg",
  glutathione: "l-glutathione-600-mg",
};

function evolveUrl(productSlug: string): string {
  const base = `https://www.evolvepeptides.com/product/${productSlug}/`;
  return `${base}?${EVOLVE_REF_PARAM}=${EVOLVE_REF_TOKEN}`;
}

/**
 * Returns the Evolve vendor entry to append to a product's vendor list, or null
 * when Evolve is disabled or does not carry that product. When null, the caller
 * leaves the product untouched — this is what keeps the build unchanged pre-launch.
 */
export function evolveVendorFor(productId: string): ProductVendor | null {
  if (!EVOLVE_ENABLED) return null;
  const slug = EVOLVE_PRODUCT_SLUGS[productId];
  if (!slug) return null;
  return {
    vendor: EVOLVE_VENDOR_NAME,
    url: evolveUrl(slug),
    commission: EVOLVE_COMMISSION,
    note: `Use code ${EVOLVE_DISCOUNT_CODE} for 15% off`,
  };
}

/** Vendor profile, surfaced on compare pages only when Evolve is live. */
export const evolveProfile: VendorProfile = {
  vendor: EVOLVE_VENDOR_NAME,
  summary:
    "Evolve Peptides is a USA-manufactured research peptide supplier working with WHO/GMP and ISO 9001:2015-certified facilities. Every batch is independently lab-tested and screened for endotoxins, with results publicly verifiable through their COA lookup tool — added as a broad-catalog source spanning GLP-1 class compounds, recovery peptides, blends, and research accessories.",
  pros: [
    "Publicly verifiable batch COAs via a self-serve COA lookup tool",
    "USA-manufactured with same-day domestic shipping on orders placed before the daily cutoff",
    "Very broad catalog — GLP-1 class compounds, blends, capsules, and bacteriostatic water",
    "Customer discount of 15% off with code auraproto",
  ],
  cons: [
    "Newer addition — shipping speed and full catalog depth not yet independently confirmed; treat this profile as provisional",
    "Ships within the United States only",
  ],
};

/** Names of vendors staged here but not yet live — used to keep data contracts in sync. */
export const evolveIsLive = EVOLVE_ENABLED;
