// Registry of real vendor-supplied marketing collateral (banners, logos, ready-made ads).
// Grows as vendors populate their affiliate "Creatives" dashboards — see growth-plan
// vendor status table (apps/shop/src/app/demo/vendor-collateral/page.tsx) for what's
// still missing per vendor. Every entry here is a real, vendor-sourced file, never a
// placeholder — un-invented copy/codes only.

export type CreativeAsset = {
  vendorId: string; // matches VENDOR_IDS values in @/lib/affiliate
  vendor: string;
  /** "photo" = raw product photography, needs a template built around it.
   *  "ready-made" = finished single-product ad with its own headline/CTA baked in.
   *  "logo" = standalone brand mark only.
   *  "catalog" = multi-product roundup graphic — vendor-level placement (profile,
   *  blog roundup, email), NOT a per-product featured-banner slot. */
  type: "photo" | "ready-made" | "logo" | "catalog";
  /** Path under /public, e.g. "/vendor-creative/apollo/retatrutide-15mg.jpg" */
  path: string;
  width: number;
  height: number;
  /** Product slug(s) from products.ts this asset depicts, if any. */
  productSlugs?: string[];
  /** Real discount code shown/confirmed for this asset, if any — never invent one. */
  code?: string;
  obtained: string; // YYYY-MM-DD
  /** Anything that needs verifying before this ships to a live page. */
  caveat?: string;
};

export const vendorCreative: CreativeAsset[] = [
  {
    vendorId: "apollo",
    vendor: "Apollo Peptide Sciences",
    type: "logo",
    path: "/vendor-creative/apollo/logo.jpg",
    width: 1045,
    height: 1264,
    obtained: "2026-07-30",
  },
  {
    vendorId: "apollo",
    vendor: "Apollo Peptide Sciences",
    type: "photo",
    path: "/vendor-creative/apollo/retatrutide-15mg.jpg",
    width: 1000,
    height: 1000,
    productSlugs: ["retatrutide"],
    obtained: "2026-07-30",
    caveat: "No discount code on file for Apollo — don't imply one.",
  },
  {
    vendorId: "apollo",
    vendor: "Apollo Peptide Sciences",
    type: "photo",
    path: "/vendor-creative/apollo/semaglutide-15mg.jpg",
    width: 1000,
    height: 1000,
    productSlugs: ["semaglutide"],
    obtained: "2026-07-30",
    caveat: "No discount code on file for Apollo. Also: art says 15mg, but Apollo's wired URL in products.ts is the 5mg SKU (glp-1s-5mg) — same cosmetic mismatch as the Retatrutide asset, not a functional problem.",
  },
  {
    vendorId: "apollo",
    vendor: "Apollo Peptide Sciences",
    type: "photo",
    path: "/vendor-creative/apollo/tirzepatide-15mg.jpg",
    width: 1000,
    height: 1000,
    productSlugs: ["tirzepatide"],
    obtained: "2026-07-30",
    caveat: "No discount code on file for Apollo. Also: art says 15mg, Apollo's wired URL is glp-2t-15m (their actual product is labeled 15mg too, unlike the Retatrutide/Semaglutide assets — no mismatch here).",
  },
  {
    vendorId: "mile-high",
    vendor: "Mile High Compounds",
    type: "logo",
    path: "/vendor-creative/mile-high/logo.png",
    width: 11867,
    height: 7167,
    obtained: "2026-07-30",
    caveat: "Huge canvas (11867×7167) with the mark centered in mostly empty transparent space — crop tight to the logo before use, don't ship the full file.",
  },
  {
    vendorId: "mile-high",
    vendor: "Mile High Compounds",
    type: "photo",
    path: "/vendor-creative/mile-high/slu-pp-332.jpg",
    width: 4500,
    height: 3000,
    productSlugs: ["slu-pp-332"],
    code: "auraproto",
    obtained: "2026-07-30",
    caveat: "Source is 4500×3000 (~2-3MB) — compress before production use.",
  },
  {
    vendorId: "mile-high",
    vendor: "Mile High Compounds",
    type: "photo",
    path: "/vendor-creative/mile-high/ss-31.jpg",
    width: 4500,
    height: 3000,
    productSlugs: ["ss-31"],
    code: "auraproto",
    obtained: "2026-07-30",
    caveat: "Source is 4500×3000 (~2-3MB) — compress before production use.",
  },
  {
    vendorId: "mile-high",
    vendor: "Mile High Compounds",
    type: "photo",
    path: "/vendor-creative/mile-high/mots-c.jpg",
    width: 4500,
    height: 3000,
    productSlugs: ["mots-c"],
    code: "auraproto",
    obtained: "2026-07-30",
    caveat: "Source is 4500×3000 (~2-3MB) — compress before production use.",
  },
  {
    vendorId: "main-peptides",
    vendor: "Main Peptides",
    type: "ready-made",
    path: "/vendor-creative/main-peptides/nad-plus-promo.png",
    width: 1600,
    height: 900,
    productSlugs: ["nad-plus"],
    code: "aurapro",
    obtained: "2026-07-30",
    caveat:
      "Banner art says \"15% off\" but the confirmed real code (aurapro, added 2026-07-30) is 10% off — use the real number if this ships, not the number printed on the banner.",
  },
  {
    vendorId: "main-peptides",
    vendor: "Main Peptides",
    type: "photo",
    path: "/vendor-creative/main-peptides/ghk-cu-50mg.png",
    width: 5625,
    height: 5625,
    productSlugs: ["ghk-cu"],
    obtained: "2026-07-30",
    caveat: "Source is 5625×5625 (~6.5MB) — compress before production use. No discount code confirmed for Main Peptides yet — don't imply one.",
  },
  {
    vendorId: "main-peptides",
    vendor: "Main Peptides",
    type: "catalog",
    path: "/vendor-creative/main-peptides/best-sellers.png",
    width: 3375,
    height: 4219,
    productSlugs: [
      "tesamorelin",
      "tb-500",
      "nad-plus",
      "retatrutide", // shown as "GLP-3" — Main Peptides' own name for it
      "mots-c",
      "ghk-cu",
      "cjc-1295-ipamorelin",
      "bpc-157",
      "aod-9604",
    ],
    obtained: "2026-07-30",
    caveat:
      "Covers 9 compounds in one graphic — not a per-product featured banner. Use on a vendor-level surface (Main Peptides profile, a blog roundup, or an email send), not a single product page.",
  },
];

/** Multi-product roundup graphics only — vendor-level placements, never a per-product feature slot. */
export function catalogAssets(vendorId?: string): CreativeAsset[] {
  return vendorCreative.filter((a) => a.type === "catalog" && (!vendorId || a.vendorId === vendorId));
}

/** Single-product assets only (photo / ready-made / logo) — excludes multi-product
 *  catalog graphics, which are never appropriate for a per-product featured slot. */
export function creativeFor(productSlug: string): CreativeAsset[] {
  return vendorCreative.filter((a) => a.type !== "catalog" && a.productSlugs?.includes(productSlug));
}
