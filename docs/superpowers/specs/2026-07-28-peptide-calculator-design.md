# Peptide Reconstitution Calculator — Design Spec

**Date:** 2026-07-28
**Status:** Approved, ready for implementation plan
**App:** `apps/shop`

## Problem

Aura wants a "Reconstitution Calculator" page, modeled functionally on a competitor tool (peptideclock.com/tools/peptide-calculator): given a vial's peptide strength, the bacteriostatic (BAC) water used to reconstitute it, and a target dose, tell the user the resulting concentration and exactly how many syringe units to draw. This is a pure trust/SEO play — a genuinely useful, correctly-computed tool that keeps the site's "we hold peptides to the standard the research deserves" positioning, with a light affiliate nudge at the end, not a hard sell.

## Non-goals

- No compound presets or auto-fill (e.g. "click BPC-157 to fill typical values"). Manual entry only, everything computed from the numbers the user enters.
- No FAQ, troubleshooting matrix, or "related tools" section — the reference site has these, Aura's version doesn't. Keep the page lean, matching the terse style of `/about` and `/privacy`.
- No dosing/medical advice of any kind — the tool computes concentration math from user-supplied numbers only. It never suggests what dose is appropriate, safe, or effective.
- No commission/price data anywhere on the page (standing site-wide rule).
- Not touching `ProductCard.tsx` or `data/products.ts`.

## Route & navigation

- New route: `apps/shop/src/app/calculator/page.tsx` → `/calculator`.
- Added to `Navbar.tsx` as a fourth link (Products, Blog, **Calculator**, About) — primary-tool status, not buried.
- Added to `sitemap.ts`: `priority: 0.7`, `changeFrequency: "monthly"` (between `/blog` and `/about` in the existing priority ordering).
- Added to `Footer.tsx`'s "Index" or "Company" column is not required (the Navbar link covers discovery); no footer change unless the user asks for one during implementation review.

## Visual design

Pharmacopoeia paper theme (`--paper #EDE9E0`, `--paper-deep #E2DCCC`, `--ink #1C1A15`, `--ink-soft #4A4438`, `--specimen #A32B1F`, `--line #C9C2AE`), Georgia/Newsreader serif — same theme every other production page (`/products`, `/blog`, `/about`) already uses. Page follows the standard static-page pattern: eyebrow ("Tools") + `h1` ("Reconstitution Calculator") + one-paragraph lede, `max-w` container consistent with `/products`.

**Layout — single bordered card, two-column split** (validated in the visual-companion mockup, "Option A"):

- Left column: the four inputs, in order — Vial Strength, Bacteriostatic Water, Target Dose (all dropdown-with-custom, see below), then Syringe Size (radio group, stacked vertically — a horizontal row was tried first and overflowed the narrow column, see CSS note below).
- Right column, separated by a vertical rule: the Result block — big serif-italic headline number, a one-line label under it, the syringe gauge, then a two-item stat row (Concentration, Doses / Vial).
- Below the card: the Research Use Only + calculator-math disclaimer (see Disclaimers), then a light CTA linking to `/products`.

**CSS grid pitfall to carry into implementation:** the two-column card is `display:grid; grid-template-columns:1fr 1fr`. Grid items default to `min-width:auto`, which lets wide content (the syringe-size radio row) force its track wider than its `1fr` share and overflow the card's edge. Fix: `min-width:0` on both direct grid children. This was the literal bug hit and fixed during mockup review — implement it correctly the first time rather than rediscovering it.

## Inputs

All three numeric inputs use the same pattern: a `<select>` with common preset values plus a trailing **"Custom…"** option; choosing Custom reveals an inline number input (underlined in `--specimen` to mark it as active/custom) that participates in the same calculation.

| Field | Preset options | Unit |
|---|---|---|
| Vial Strength | 5, 10, 15, 20, 40 mg | mg |
| Bacteriostatic Water | 1, 2, 3, 5 ml | ml |
| Target Dose | 0.5, 1, 2, 4, 8, 12 mg | mg |

Syringe Size is a **radio group**, not a dropdown (it's a fixed physical choice, not a continuous value): **30 units (0.3ml)**, **50 units (0.5ml)**, **100 units (1.0ml)**, defaulting to 50u. All three syringe sizes share the same graduation: **100 units = 1ml** (standard U-100 insulin-syringe scale) — the barrel is physically shorter on the 30u/50u syringes, but a "unit" is the same 0.01ml on all three.

## Calculation

```
concentration      = vialMg / waterMl                    // mg/ml
doseVolumeMl        = doseMg / concentration               // ml
units               = doseVolumeMl * 100                   // 1ml = 100 units, all syringe sizes
dosesPerVial        = vialMg / doseMg
```

**Multi-injection split** (this was the last piece of functional feedback during review — the tool must handle a dose that doesn't fit in one draw, not just warn and stop):

```
injections          = units > syringeMaxUnits ? ceil(units / syringeMaxUnits) : 1
unitsPerInjection    = units / injections                  // even split, not "fill + remainder"
```

Even division across `injections` shots (e.g. a 96-unit total dose on a 50-unit syringe becomes **2 × 48 units**, not one 50-unit draw plus a 46-unit remainder). This keeps every actual draw at the same, predictable size.

**Invalid/incomplete state:** if any field is empty or a custom value is non-numeric or ≤ 0, the result block shows em-dashes (`—`) and the label reads "Fill in every field to calculate" — never `NaN`, `Infinity`, or a silently-wrong number. `waterMl = 0` (division by zero) is treated the same as missing/invalid.

## Result display

- **Single-injection case:** big number reads `"{units} units"` (rounded to 1 decimal), label reads `"Draw to this mark on a {syringeMax}-unit ({ml}ml) syringe"`.
- **Multi-injection case:** big number reads `"{injections} × {unitsPerInjection} units"`, label reads `"as {injections} separate injections on a {syringeMax}-unit ({ml}ml) syringe"`, and an additional explanatory line appears below the gauge: `"Total dose is {units} units — more than a {syringeMax}-unit syringe holds in one draw. Split into {injections} injections of {unitsPerInjection} units each (drawn separately, same concentration)."`
- **Syringe gauge:** a horizontal bar (track in `--paper-deep`, fill in `--specimen` at reduced opacity) plus a round marker ("needle") positioned at the fill percentage, with tick labels at 0 / half / max of the syringe's own scale (0/15/30, 0/25/50, or 0/50/100 depending on which syringe is selected). The gauge always reflects **one injection's worth** — in the split case, that's `unitsPerInjection`, not the raw total, since that's what's actually visible on the syringe barrel at draw time.
- **Stat row:** Concentration (`X.XX mg/ml`) and Doses / Vial (`vialMg / doseMg`, floored to 1 decimal).

## Disclaimers

Both, stacked (per review decision):

1. The exact "Research Use Only" wording already used in the `.p-callout` box on `/products/[slug]`: *"This compound is intended for laboratory and research purposes only. It is not approved for human consumption and is not intended to diagnose, treat, cure, or prevent any disease. Always consult a qualified healthcare professional."*
2. A calculator-specific line beneath it: *"This tool performs concentration math only — it is not medical advice and does not verify safe or effective dosing. Always verify calculations independently and consult a qualified professional."*

## Monetization

Light CTA only, reusing the existing `EngineCTAInline`-style pattern already used on blog posts — a single bordered/tinted block near the bottom of the page linking to `/products` ("Browse research compounds →"). No per-field or per-result affiliate links, no vendor mentions inside the calculator itself.

## Component structure

- `apps/shop/src/app/calculator/page.tsx` — static shell (metadata, eyebrow/h1/lede, disclaimers, CTA), server component, same shape as `/about/page.tsx`.
- `apps/shop/src/components/ReconstitutionCalculator.tsx` — the interactive card itself, `"use client"`, owns all input/result state (React `useState`, no external form library needed — four fields). Follows the existing pattern of keeping interactivity in a dedicated client component (`BiosignatureSphere.tsx`) while the page shell stays a server component.
- New CSS additions to `globals.css`, scoped under `.pharmacopoeia` like everything else in the theme (`.p-calc-*` class names), covering the split-card grid (with the `min-width:0` fix), the custom-value reveal, the radio group, and the gauge — no new design tokens needed, reuses `--paper`/`--ink`/`--specimen`/`--line`.

## Testing

- `apps/shop` already uses Vitest with a top-level `tests/` directory mirroring `src/` (see `tests/data/vendor-profiles.test.ts`, `tests/app/sitemap.test.ts`). Add `tests/lib/reconstitution.test.ts` against a pure calculation function extracted out of the component (e.g. `apps/shop/src/lib/reconstitution.ts`) so it's testable without rendering. Cases to cover explicitly: normal single-injection math, exact-fit (units === syringeMax, no split), one-injection-over (rounds up to 2 injections), large multi-split (4+ injections), and every "empty/invalid field or waterMl = 0" combination returning the invalid state rather than `NaN`/`Infinity`.
- Manual verification in-browser (per this repo's `/verify` convention) covering: preset-only entry, custom-value entry on all three fields, all three syringe sizes, and the split-injection path — this was already smoke-tested interactively during the design review's live-math mockup, so the implementation should reproduce those same numbers exactly.
