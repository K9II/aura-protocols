# Modality Product Picker — Design Spec

**Date:** 2026-08-15
**Status:** Approved, ready for implementation plan
**App:** `apps/modality` (branch `feat/modality-telehealth-surface`)

## Problem

The front-door protocol index (`page.tsx`) collapses every category's full product list down to a single "representative" product — the cheapest one (or cheapest GLP-1 match, for Weight Loss). The row's caption names up to 3 products as plain text, but clicking the row always hands off to the one representative product, regardless of which name the visitor was looking at.

This is invisible for the small categories (Women's Health and Hair Loss have 3 products each — the caption already names all of them) but breaks down for Weight Loss, which has **11** products spanning $174/mo (Sublingual Semaglutide) to $2,599/mo (Wegovy): 8 of 11 are never shown, and a visitor who wanted a branded product never learns it was an option. Men's Health has the same shape at smaller scale (5 products, including brand names Cialis and Viagra alongside compounded Sildenafil/Tadalafil/Enclomiphene).

**Goal:** every purchasable product in a category must be visible and individually selectable before the visitor reaches the existing "save your match" email modal / `/go` hand-off — not just implied by a truncated caption.

## Non-goals

- No backend/API changes. `/go/[category]/[id]/route.ts` already resolves *any* product id within a category (`res.products.find(p => p.id === id)`) — this is purely a front-end change.
- No change to the email-capture modal's fields, copy, or `/api/optin` payload shape.
- No change to `sub` / utm attribution plumbing — it continues to flow through unchanged.
- No new "compare products" or filtering UI (price sort, format filter) beyond the two static groups defined below.
- No copy changes to the FAQ or `/disclosures` page.
- Not touching `ProductCard`-equivalent styling outside `apps/modality` (this app has no shared component with `apps/shop`).

## Approved direction: split by category size

Two interaction patterns, chosen per-lane by product count (using the same threshold everywhere, not hardcoded per category name, so it self-adjusts if the catalog changes):

- **≤ 6 purchasable products → expand inline.** Clicking the row opens a panel directly beneath it, on the same page. Covers Women's Health (3), Hair Loss (3), Men's Health (5), Wellness (6) today.
- **> 6 purchasable products → picker modal.** Clicking the row opens a focused modal listing every product. Covers Weight Loss (11) today.

`PICKER_THRESHOLD = 6`, defined once in `ProductPicker.tsx`.

**Edge case:** if a lane has exactly 1 purchasable product after filtering, skip both patterns — clicking the row goes straight to the existing email modal for that product, same as today's behavior. A picker with one option is friction with no payoff.

Both patterns render the *same* grouped product list (see below) — only the container differs (inline panel vs. modal). This keeps the information architecture identical regardless of category size.

## Grouping: compounded vs. brand-name

Within a lane's product list, split into up to two groups:

- **Brand-name** — products matching a curated lookup of known trade names.
- **Compounded** — everything else.

If no products match the brand-name lookup, render a single ungrouped list (no group heading) — this is the common case (Women's Health, Hair Loss, Wellness today).

```ts
// apps/modality/src/lib/telehealth/groups.ts

// Curated, not derived from the API — LegUpRx's catalog has no brand/generic
// flag. Small, well-known drug classes (GLP-1s, ED meds) mean this list
// changes rarely; revisit when new products are onboarded.
const BRAND_NAMES = new Set([
  "Ozempic", "Wegovy", "Mounjaro", "Zepbound", // GLP-1
  "Cialis", "Viagra",                          // ED
]);

export type ProductGroup = { heading: string | null; products: CatalogProduct[] };

export function groupProducts(products: CatalogProduct[]): ProductGroup[] {
  const purchasable = products.filter((p) => p.fromPrice);
  const brand = purchasable.filter((p) => BRAND_NAMES.has(p.name));
  const compounded = purchasable.filter((p) => !BRAND_NAMES.has(p.name));
  const byPrice = (a: CatalogProduct, b: CatalogProduct) =>
    (a.fromPrice!.amount) - (b.fromPrice!.amount);

  const groups: ProductGroup[] = [];
  if (compounded.length && brand.length) {
    groups.push({ heading: "Compounded", products: compounded.sort(byPrice) });
    groups.push({ heading: "Brand-name", products: brand.sort(byPrice) });
  } else {
    groups.push({ heading: null, products: purchasable.sort(byPrice) });
  }
  return groups;
}
```

This deliberately does **not** attempt an oral/sublingual vs. injectable split — delivery route isn't reliably inferable from the product name alone (e.g. "Microdose Semaglutide + B12" is injectable despite not saying so), and a wrong guess is worse than no guess. Compounded-vs-brand is binary, reliable, and matches the business's actual preference ordering (compounded = higher margin, already the thing `PREFER` in `page.tsx` biases toward for the row's teaser price).

## Data model changes

`Lane` (in `page.tsx`) gains a `groups: ProductGroup[]` field carrying every purchasable product, grouped:

```ts
type Lane = {
  category: string;
  code: string;
  label: string;
  fromAmount: number | null;
  productId: string;      // unchanged: PREFER-biased representative, drives the row's teaser price and the ≤1-product shortcut
  groups: ProductGroup[]; // NEW: full purchasable list, grouped
};
```

`buildLane()` keeps its existing `PREFER`-biased representative-pick logic for `fromAmount`/`productId` (the row's teaser price stays business-curated, not just "cheapest overall") and additionally calls `groupProducts(products)` to populate `groups`.

The row's caption changes from naming up to 3 products to a truthful count:
- `"11 products, incl. brand-name"` when a brand group exists
- `"3 products"` otherwise
- Omitted entirely when there's exactly 1 (the shortcut case has no picker to advertise)

## Component architecture

**New: `apps/modality/src/lib/telehealth/groups.ts`** — `groupProducts()`, `BRAND_NAMES`, `ProductGroup` type. Pure function, server-safe (per [[rsc_client_function_boundary]] — keep it out of any `"use client"` file). Called from `page.tsx` (Server Component), so grouping happens server-side and ships to the client as plain serializable data.

**New: `apps/modality/src/app/ProductPicker.tsx`** (`"use client"`) — replaces the current inline `<StartVisit>` wrapper block in `page.tsx` (lines ~236–248). Per lane, owns:
- The row itself (code chip, label, count caption, price chip, chevron) — `aria-expanded` reflects open state.
- `PICKER_THRESHOLD = 6` check → renders either an inline `<div class="expand-panel">` or a modal (`.m-scrim`/`.m-modal`, reusing the existing shell from `StartVisit.tsx` for visual consistency) containing the grouped product cards.
- The ≤1-product shortcut: skips rendering any panel/modal, opens the email modal directly.
- On a specific product card click: closes its own panel/modal and opens `StartVisit` scoped to that product's id + name.

**Modified: `apps/modality/src/app/StartVisit.tsx`** — currently owns its own `open` state and renders the row button + children itself. Changes to: accept `open: boolean` and `onClose: () => void` props instead of internal state; drop the button/`children` wrapper (that's now `ProductPicker`'s job); keep the email form, skip-link, and `/api/optin` best-effort POST logic unchanged. `label` prop becomes the *specific chosen product's* name, not the lane label, so the modal heading reads e.g. "Save your Sublingual Semaglutide match" instead of "Save your Weight Loss match" — more accurate once the visitor has actually chosen a product.

**Modified: `apps/modality/src/app/page.tsx`** — `buildLane()` returns the extended `Lane` shape; the protocols-index `.map()` renders `<ProductPicker lane={l} sub={sub} key={l.category} />` instead of the current `<StartVisit>` block.

**Modified: `apps/modality/src/app/globals.css`** — add `.expand-panel`, `.grp`, `.grp-h`, `.pgrid`, `.pcard`, `.chev` rules, ported from the approved mockup (bordeaux-on-bone tokens already defined, no new colors needed).

## Visual design

Directly ports the two patterns validated in the mockup (Artifact `ac25f1c6-dc5d-4ba5-acda-b567ae3626a3`), styled with the app's existing tokens — no new palette:

- **Inline panel:** opens beneath the row, indented under the row's code chip. Group heading (mono, uppercase, `--ink-faint`) above a `pgrid` of `pcard`s (name + `from $X/mo`, bordered `--line`, hover/active states in `--accent`/`--tint`).
- **Picker modal:** reuses `.m-scrim`/`.m-modal` from the current email-gate modal (same overlay + card shell, sized wider to fit the grid), heading reads "Choose your {label} protocol", same `pgrid`/`pcard` list inside.
- Chevron on the row rotates 90° when expanded/open (`aria-expanded="true"`).

## Testing

Matches the existing test convention in this app — `tests/lib/telehealth/*.test.ts` unit-tests pure logic; there is no existing precedent for component-level tests on `StartVisit.tsx` or `LeadCapture.tsx`, so this doesn't introduce new test infrastructure.

**New: `apps/modality/tests/lib/telehealth/groups.test.ts`**
- Splits into Compounded + Brand-name groups when the input contains a `BRAND_NAMES` match (fixture: Weight-Loss-shaped list with Ozempic present).
- Returns a single group with `heading: null` when no product matches `BRAND_NAMES` (fixture: Women's-Health-shaped list).
- Excludes products with `fromPrice: null` entirely.
- Sorts each group ascending by `fromPrice.amount`.

**Manual verification during implementation** (consistent with how `StartVisit`/`LeadCapture` are currently verified — visually, against the running dev server, not via automated component tests):
- Weight Loss (11 products) opens the picker modal; Women's Health (3) expands inline.
- Picking a product closes the picker/panel and opens the email modal with that product's name in the heading; "Skip and continue" and "Continue to my visit" both hand off to `/go/{category}/{that product's id}` (verify via network tab / final redirect URL, same check used for the click-through demo).
- Keyboard: row is a `<button>` (existing pattern), modal traps focus via the existing `.m-modal` `role="dialog"` pattern.

## Open questions for implementation review

None — threshold, grouping rule, and component boundaries are all fixed above. If live catalog data changes shape enough that a category crosses the 6-product threshold or a new brand-name product appears, that's a config update (`PICKER_THRESHOLD`, `BRAND_NAMES`), not a design change.
