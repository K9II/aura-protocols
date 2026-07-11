# Dynamic Vendor Comparison — Design Spec

**Date:** 2026-07-11
**Status:** Draft, pending review
**App:** `apps/shop`

## Problem

Every product on shop.auraprotocols.com carries 2–6 vendors (see `data/products.ts`). Today the only way to compare vendors is a single hand-written page, `compare/limitless-life-nootropics-vs-swiss-chems`, covering exactly one of the 21 possible pairs among the site's 7 active vendors (Apollo Peptide Sciences, Behemoth Labz, GLP-1 Research Lab, Ignite Peptides, Limitless Life Nootropics, Main Peptides, Swiss Chems). A product page's sidebar previously linked to that one page (or the generic `/compare` index) regardless of which vendors actually carried the product — see prior session's `matchingComparison` logic in `products/[slug]/page.tsx`.

The user wants: (1) a way to pick specific vendors on a product page and compare them, and (2) confirmation that comparison content exists (or will exist) for every vendor, not just the two covered today.

## Vendor overlap analysis

Computed from `products.ts`: **all 21 possible vendor pairs already co-occur on at least one shared product** (ranging from 3 shared products for the sparsest pair to 11 for the densest — Behemoth Labz × Main Peptides). This matters for SEO: every generated comparison page is anchored to real, shared product inventory, not a fabricated pairing — avoiding the "thin/doorway page" risk flagged in the broader marketing plan (auto-generated pages with no underlying relevance are what draw Google manual actions; these all have genuine relevance).

## Non-goals

- No price or commission-rate data anywhere in the comparison UI or generated pages (standing rule — commission is internal-only).
- No fabricated qualitative claims about a vendor. Profile content for the 5 vendors without existing writeups must trace back to what's already documented in the vendor registry (catalog breadth, shipping terms, COA/testing practices) and needs the user's sign-off before publishing.
- Not rewriting or removing the existing hand-written Limitless-vs-Swiss-Chems page's unique editorial content (headline, verdict, FAQ).
- Not touching `ProductCard.tsx`, `Navbar.tsx`, or `products.ts` beyond what's already shipped (the `matchingComparison` sidebar link from the prior session).

## Data model

New file: `apps/shop/src/data/vendorProfiles.ts`

```ts
export type VendorProfile = {
  vendor: string; // must exactly match ProductVendor.vendor strings used in products.ts
  summary: string;
  pros: string[];
  cons: string[];
  scores: {
    catalogBreadth: number;   // 1-5
    shippingSpeed: number;    // 1-5
    coaPractices: number;     // 1-5
  };
};

export const vendorProfiles: VendorProfile[] = [ /* 7 entries */ ];
```

Seven profiles, one per vendor. Two (Limitless Life Nootropics, Swiss Chems) are extracted from the existing `vendorASummary`/`vendorAPros`/`vendorACons`/`scores` fields already written in `comparisons.ts` — no new authoring, just a data-shape migration. The other five (Apollo, Behemoth Labz, GLP-1 Research Lab, Ignite Peptides, Main Peptides) need net-new profiles, drafted from what's already recorded in the vendor registry memory (catalog size, shipping/payout terms, COA/testing practices per vendor) and presented to the user for approval before merge — not invented from general knowledge of the vendors.

## Comparison page generation

New dynamic route: `apps/shop/src/app/compare/[slug]/page.tsx` is extended (not replaced) to serve two kinds of pages from `generateStaticParams`:

1. **Curated pairs** — entries already in `comparisons.ts` (currently just the one). Rendered exactly as today: full narrative (headline, intro, winner, scores, pros/cons, verdict, FAQ).
2. **Generated pairs** — every other vendor pair among the 7 (20 pairs), rendered from a lighter template: intro sentence naming the shared products, side-by-side profile table (summary/pros/cons/scores pulled from `vendorProfiles.ts`), list of shared products with links to their product pages, and a disclosure that no price/commission comparison is shown. No fabricated FAQ.

Slug scheme reuses the existing `vendorId()` map from `lib/affiliate.ts` for consistency with `/go/` slugs: `{vendorIdA}-vs-{vendorIdB}` (alphabetically ordered vendor IDs to avoid duplicate routes for the same pair in either order), e.g. `apollo-vs-behemoth`, `ignite-vs-main-peptides`. The existing curated slug (`limitless-life-nootropics-vs-swiss-chems`) is a special case kept as-is for backward-compat (already indexed/linked); new generated pairs use the vendor-ID scheme.

A build-time check (mirroring the existing collision guard in `buildAffiliateRedirects()`) throws if a `vendorProfiles.ts` entry is missing for any vendor referenced in `products.ts`, so an unprofile vendor can't ship silently.

## Product page UI

In `products/[slug]/page.tsx`, the "Where to Buy" vendor list gains a checkbox next to each vendor (only rendered when the product has 3+ vendors — with exactly 2, the existing `matchingComparison` single link from the prior session already covers it, no picker needed). A "Compare Selected" button appears once 2+ boxes are checked, expanding an inline N-way table below the vendor list — one column per checked vendor, rows for summary/pros/cons/scores from `vendorProfiles.ts`. No navigation required; this is an inline expand, not a page transition, since the goal is quick browsing comparison, not a separate SEO-indexed artifact (the generated `/compare/[slug]` pages serve that purpose independently for organic search).

## Testing / verification

- `npx next build` must succeed with all 21 pair routes statically generated.
- Spot-check: a product with exactly 2 vendors still shows the single-link sidebar (no checkboxes). A product with 3+ vendors shows checkboxes and the inline compare table renders correctly for 2-way and full N-way selections.
- Confirm no `commission` or price field appears anywhere in `vendorProfiles.ts`, the generated comparison template, or the inline product-page table.
- Manual content review: user approves the 5 new vendor profiles before the generated comparison pages go live.

## Rollout sequencing

1. Extract Limitless/Swiss Chems profiles from `comparisons.ts` into `vendorProfiles.ts` (no new content).
2. Draft the 5 missing profiles from vendor registry data, present for user approval.
3. Build the generated-pair comparison template and dynamic routes.
4. Build the product-page checkbox/compare UI.
5. Full build verification, then commit.
