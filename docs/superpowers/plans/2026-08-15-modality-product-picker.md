# Modality Product Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a visitor see and pick any purchasable product within a Modality category — not just an implied "representative" — before reaching the email-gate modal and `/go` hand-off.

**Architecture:** A new pure `groupProducts()` splits a category's purchasable products into Compounded/Brand-name groups (or one ungrouped list). `buildLane()` in `page.tsx` calls it server-side and attaches the result to each `Lane`. A new client component `ProductPicker` owns the row's click behavior — expand inline (≤6 products), open a picker modal (>6), or skip straight through (≤1 purchasable product) — and renders the existing `StartVisit` email-gate modal once a specific product is picked. `StartVisit` itself loses its self-managed `open` state so it can be triggered externally with whichever product was actually chosen.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Vitest, pnpm workspace (`apps/modality`).

**Spec:** `docs/superpowers/specs/2026-08-15-modality-product-picker-design.md`

---

### Task 1: `groupProducts()` — compounded vs. brand-name splitting

**Files:**
- Create: `apps/modality/src/lib/telehealth/groups.ts`
- Test: `apps/modality/tests/lib/telehealth/groups.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/modality/tests/lib/telehealth/groups.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { groupProducts } from "@/lib/telehealth/groups";
import type { CatalogProduct } from "@/lib/telehealth/types";

function product(name: string, amount: number | null): CatalogProduct {
  return {
    id: name.toLowerCase().replace(/\s+/g, "-"),
    name,
    imageUrl: "",
    intakeUrl: "https://medical.leguprecovery.com/start-online-visit/x?partner_id=RFMLPVN1",
    availability: "Available Nationwide",
    fromPrice: amount == null ? null : { months: 1, amount },
  };
}

describe("groupProducts", () => {
  it("splits into Compounded and Brand-name groups when a brand-name product is present", () => {
    const products = [
      product("Sublingual Semaglutide", 174),
      product("Ozempic", 1649),
      product("Injectable Lipo-C", 224),
      product("Wegovy", 2599),
    ];
    const groups = groupProducts(products);
    expect(groups).toHaveLength(2);
    expect(groups[0].heading).toBe("Compounded");
    expect(groups[0].products.map((p) => p.name)).toEqual(["Sublingual Semaglutide", "Injectable Lipo-C"]);
    expect(groups[1].heading).toBe("Brand-name");
    expect(groups[1].products.map((p) => p.name)).toEqual(["Ozempic", "Wegovy"]);
  });

  it("returns a single ungrouped list when no brand-name product is present", () => {
    const products = [
      product("Female Estradiol Gel", 249),
      product("Female Estradiol Patch", 224),
      product("Female Estradiol Tablets", 124),
    ];
    const groups = groupProducts(products);
    expect(groups).toHaveLength(1);
    expect(groups[0].heading).toBeNull();
    expect(groups[0].products.map((p) => p.name)).toEqual([
      "Female Estradiol Tablets",
      "Female Estradiol Patch",
      "Female Estradiol Gel",
    ]);
  });

  it("excludes products with no purchasable price", () => {
    const products = [product("Sublingual Semaglutide", 174), product("Discontinued Item", null)];
    const groups = groupProducts(products);
    expect(groups).toHaveLength(1);
    expect(groups[0].products.map((p) => p.name)).toEqual(["Sublingual Semaglutide"]);
  });

  it("sorts each group ascending by price", () => {
    const products = [product("Wegovy", 2599), product("Ozempic", 1649), product("Zepbound", 2299)];
    const groups = groupProducts(products);
    expect(groups[0].products.map((p) => p.name)).toEqual(["Ozempic", "Zepbound", "Wegovy"]);
  });
});
```

- [ ] **Step 2: Run the test suite and confirm it fails**

Run: `cd apps/modality && pnpm test`
Expected: FAIL — `Cannot find module '@/lib/telehealth/groups'` (or similar resolution error), since the file doesn't exist yet.

- [ ] **Step 3: Write the implementation**

Create `apps/modality/src/lib/telehealth/groups.ts`:

```ts
import type { CatalogProduct } from "./types";

// Curated, not derived from the API — LegUpRx's catalog has no brand/generic
// flag. Small, well-known drug classes (GLP-1s, ED meds) mean this list
// changes rarely; revisit when new products are onboarded.
const BRAND_NAMES = new Set([
  "Ozempic", "Wegovy", "Mounjaro", "Zepbound", // GLP-1
  "Cialis", "Viagra", // ED
]);

export type ProductGroup = { heading: string | null; products: CatalogProduct[] };

function byPrice(a: CatalogProduct, b: CatalogProduct): number {
  return (a.fromPrice?.amount ?? 0) - (b.fromPrice?.amount ?? 0);
}

/** Split a category's products into Compounded vs. Brand-name groups, each
 *  sorted cheapest-first. Non-purchasable products (no fromPrice) are
 *  dropped. When no brand-name product is present, returns a single group
 *  with heading:null instead of an empty "Brand-name" group. */
export function groupProducts(products: CatalogProduct[]): ProductGroup[] {
  const purchasable = products.filter((p) => p.fromPrice);
  const brand = purchasable.filter((p) => BRAND_NAMES.has(p.name));
  const compounded = purchasable.filter((p) => !BRAND_NAMES.has(p.name));

  if (compounded.length && brand.length) {
    return [
      { heading: "Compounded", products: [...compounded].sort(byPrice) },
      { heading: "Brand-name", products: [...brand].sort(byPrice) },
    ];
  }
  return [{ heading: null, products: [...purchasable].sort(byPrice) }];
}
```

- [ ] **Step 4: Run the test suite and confirm it passes**

Run: `cd apps/modality && pnpm test`
Expected: PASS — all 4 tests in `groups.test.ts` green.

- [ ] **Step 5: Commit**

```bash
git add apps/modality/src/lib/telehealth/groups.ts apps/modality/tests/lib/telehealth/groups.test.ts
git commit -m "feat(modality): add groupProducts for compounded vs brand-name splitting"
```

---

### Task 2: Picker/expand CSS

**Files:**
- Modify: `apps/modality/src/app/globals.css`

- [ ] **Step 1: Widen the `.irow` grid for a chevron column and hide it on mobile**

In `apps/modality/src/app/globals.css`, find this line (around line 99):

```css
.irow { display: grid; grid-template-columns: 2.4rem 1fr auto auto; gap: 16px; align-items: center; padding: 16px 4px; border-bottom: 1px solid var(--line-soft); text-decoration: none; color: inherit; transition: background .16s; width: 100%; text-align: left; background: none; border-left: 0; border-right: 0; border-top: 0; cursor: pointer; font: inherit; }
```

Replace it with:

```css
.irow { display: grid; grid-template-columns: 2.4rem 1fr auto auto 1.2rem; gap: 16px; align-items: center; padding: 16px 4px; border-bottom: 1px solid var(--line-soft); text-decoration: none; color: inherit; transition: background .16s; width: 100%; text-align: left; background: none; border-left: 0; border-right: 0; border-top: 0; cursor: pointer; font: inherit; }
```

Find the mobile media query a few lines below:

```css
@media (max-width: 560px) {
  .irow { grid-template-columns: 2rem 1fr; }
  .irow .flag, .irow .px { grid-column: 2; text-align: left; }
}
```

Replace it with:

```css
@media (max-width: 560px) {
  .irow { grid-template-columns: 2rem 1fr; }
  .irow .flag, .irow .px { grid-column: 2; text-align: left; }
  .irow .chev { display: none; }
}
```

- [ ] **Step 2: Add the chevron, group, and product-card rules**

At the end of `apps/modality/src/app/globals.css`, immediately before the final `a:focus-visible, button:focus-visible { ... }` rule, insert:

```css
/* ---------- product picker (inline expand / modal) ---------- */
.irow .chev { font-size: 1.1rem; color: var(--ink-faint); transition: transform .18s; }
.irow[aria-expanded="true"] .chev { transform: rotate(90deg); color: var(--accent); }

.expand-panel { padding: 4px 4px 18px 3.4rem; }
.grp { margin: 14px 0 4px; }
.grp:first-child { margin-top: 6px; }
.grp-h { font-family: var(--mono); font-size: 0.6rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-faint); margin: 0 0 8px; }
.pgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px; }
.pcard { border: 1px solid var(--line); border-radius: 8px; padding: 11px 13px; background: #fff; cursor: pointer; text-align: left; width: 100%; font: inherit; color: inherit; transition: border-color .15s, background .15s; }
.pcard:hover { border-color: var(--accent); background: var(--tint); }
.pcard .pn { font-weight: 600; font-size: 0.88rem; margin-bottom: 3px; }
.pcard .pp { font-family: var(--mono); font-variant-numeric: tabular-nums; font-size: 0.76rem; color: var(--accent); }
.pcard .pp small { color: var(--ink-faint); font-family: var(--sans); }

/* wider variant of .m-modal for the product picker (source order makes this win) */
.picker-modal { max-width: 560px; max-height: 70vh; overflow-y: auto; }
```

- [ ] **Step 3: Verify the build still compiles**

Run: `cd apps/modality && pnpm build`
Expected: build succeeds (this is a pure CSS addition — no component references these classes yet, so nothing else can break).

- [ ] **Step 4: Commit**

```bash
git add apps/modality/src/app/globals.css
git commit -m "style(modality): add product-picker CSS (chevron, groups, cards, picker modal)"
```

---

### Task 3: `StartVisit` externally-controlled + `ProductPicker` + wire `page.tsx`

These three files are interdependent (StartVisit's new prop contract is only used correctly once ProductPicker and page.tsx both change), so they're one task with one build/lint checkpoint at the end rather than three separately-verified ones.

**Files:**
- Modify: `apps/modality/src/app/StartVisit.tsx`
- Create: `apps/modality/src/app/ProductPicker.tsx`
- Modify: `apps/modality/src/app/page.tsx`

- [ ] **Step 1: Replace `StartVisit.tsx` — drop internal `open` state and the trigger button, accept `open`/`onClose`**

Replace the full contents of `apps/modality/src/app/StartVisit.tsx` with:

```tsx
"use client";

import { useState, type FormEvent } from "react";

type Props = {
  category: string;
  productId: string;
  /** The specific chosen product's name — drives the modal heading. */
  label: string;
  /** Channel sub-account id (from utm_source) carried into the hand-off for attribution. */
  sub?: number;
  open: boolean;
  onClose: () => void;
  /** Injectable for tests; defaults to a full-page navigation so the browser
   *  follows the /go route's 302 out to the hosted intake. */
  navigate?: (url: string) => void;
};

export default function StartVisit({ category, productId, label, sub, open, onClose, navigate }: Props) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const goUrl = `/go/${category}/${productId}${sub ? `?sub=${sub}` : ""}`;
  const go = navigate ?? ((url: string) => { window.location.href = url; });

  async function handleContinue(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    // Best-effort capture — a save failure must never block the visit.
    try {
      await fetch("/api/optin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, category }),
      });
    } catch {
      // swallow — proceed to the hand-off regardless
    }
    go(goUrl);
  }

  if (!open) return null;

  return (
    <div className="m-scrim" role="presentation" onClick={onClose}>
      <div
        className="m-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Save your ${label} match`}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="mtag">Before your visit</p>
        <h2>Save your {label} match</h2>
        <p>We&apos;ll keep your protocol and check in on your progress — then connect you with a licensed clinician.</p>

        <form onSubmit={handleContinue}>
          <input
            type="email"
            required
            aria-label="Email address"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit" className="primary" disabled={submitting}>
            {submitting ? "One moment…" : "Continue to my visit →"}
          </button>
        </form>

        <button type="button" className="skip" onClick={() => go(goUrl)}>
          Skip and continue
        </button>

        <p className="fine">
          By continuing you agree to receive protocol updates from Modality. Modality is a referral
          partner, not a medical provider — a licensed clinician reviews every request. See our{" "}
          <a href="/disclosures">telehealth disclosures</a>. Unsubscribe anytime.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `ProductPicker.tsx`**

Create `apps/modality/src/app/ProductPicker.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { CatalogProduct } from "@/lib/telehealth/types";
import type { ProductGroup } from "@/lib/telehealth/groups";
import StartVisit from "./StartVisit";

const PICKER_THRESHOLD = 6;

export type Lane = {
  category: string;
  code: string;
  label: string;
  fromAmount: number | null;
  productId: string;
  groups: ProductGroup[];
};

type Props = {
  lane: Lane;
  sub?: number;
  signalMatch: boolean;
};

type Picked = { productId: string; label: string };

function totalCount(groups: ProductGroup[]): number {
  return groups.reduce((n, g) => n + g.products.length, 0);
}

export default function ProductPicker({ lane, sub, signalMatch }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [chosen, setChosen] = useState<Picked | null>(null);

  const count = totalCount(lane.groups);
  const mode: "shortcut" | "inline" | "modal" =
    count <= 1 ? "shortcut" : count <= PICKER_THRESHOLD ? "inline" : "modal";
  const isOpen = expanded || pickerOpen;
  const hasBrandGroup = lane.groups.length === 2;
  const caption = count <= 1 ? null : hasBrandGroup ? `${count} products, incl. brand-name` : `${count} products`;

  function pick(picked: Picked) {
    setExpanded(false);
    setPickerOpen(false);
    setChosen(picked);
  }

  function onRowClick() {
    if (mode === "shortcut") {
      const only = lane.groups[0]?.products[0];
      pick(only ? { productId: only.id, label: only.name } : { productId: lane.productId, label: lane.label });
      return;
    }
    if (mode === "inline") setExpanded((v) => !v);
    else setPickerOpen((v) => !v);
  }

  return (
    <>
      <button type="button" className="irow" aria-expanded={isOpen} onClick={onRowClick}>
        <span className="code">{lane.code}</span>
        <span className="nm">
          {lane.label}
          {caption && <small>{caption}</small>}
        </span>
        {signalMatch ? <span className="flag">★ Matches your signal</span> : <span aria-hidden="true" />}
        <span className="px">
          {lane.fromAmount != null ? (
            <>
              <small>from</small> ${lane.fromAmount}
              <small>/mo</small>
            </>
          ) : (
            <small>See options</small>
          )}
        </span>
        {mode !== "shortcut" && (
          <span className="chev" aria-hidden="true">
            ›
          </span>
        )}
      </button>

      {mode === "inline" && expanded && (
        <div className="expand-panel">
          <ProductGroups groups={lane.groups} onPick={pick} />
        </div>
      )}

      {mode === "modal" && pickerOpen && (
        <div className="m-scrim" role="presentation" onClick={() => setPickerOpen(false)}>
          <div
            className="m-modal picker-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`Choose your ${lane.label} protocol`}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mtag">Before your visit</p>
            <h2>Choose your {lane.label} protocol</h2>
            <ProductGroups groups={lane.groups} onPick={pick} />
          </div>
        </div>
      )}

      {chosen && (
        <StartVisit
          open
          onClose={() => setChosen(null)}
          category={lane.category}
          productId={chosen.productId}
          label={chosen.label}
          sub={sub}
        />
      )}
    </>
  );
}

function ProductGroups({ groups, onPick }: { groups: ProductGroup[]; onPick: (p: Picked) => void }) {
  return (
    <>
      {groups.map((g) => (
        <div className="grp" key={g.heading ?? "all"}>
          {g.heading && <p className="grp-h">{g.heading}</p>}
          <div className="pgrid">
            {g.products.map((p: CatalogProduct) => (
              <button
                type="button"
                key={p.id}
                className="pcard"
                onClick={() => onPick({ productId: p.id, label: p.name })}
              >
                <div className="pn">{p.name}</div>
                <div className="pp">
                  from ${p.fromPrice?.amount}
                  <small>/mo</small>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
```

- [ ] **Step 3: Wire `page.tsx` — update `Lane`, `buildLane()`, imports, and the protocols-index render block**

In `apps/modality/src/app/page.tsx`, replace the import block at the top of the file:

```tsx
import { Fragment } from "react";
import { getPartnerId, TELEHEALTH_CATEGORIES, categoryLabel } from "@/lib/telehealth/config";
import { fetchCatalog } from "@/lib/telehealth/catalog";
import { subForUtm } from "@/lib/telehealth/channels";
import type { CatalogProduct } from "@/lib/telehealth/types";
import { RATING, PROOF_STATS, TESTIMONIALS, RIBBON_CLAIMS } from "@/lib/telehealth/trust";
import BiosignatureSphere from "@/components/BiosignatureSphere";
import StartVisit from "./StartVisit";
import LeadCapture from "./LeadCapture";
```

with:

```tsx
import { Fragment } from "react";
import { getPartnerId, TELEHEALTH_CATEGORIES, categoryLabel } from "@/lib/telehealth/config";
import { fetchCatalog } from "@/lib/telehealth/catalog";
import { subForUtm } from "@/lib/telehealth/channels";
import type { CatalogProduct } from "@/lib/telehealth/types";
import { groupProducts } from "@/lib/telehealth/groups";
import { RATING, PROOF_STATS, TESTIMONIALS, RIBBON_CLAIMS } from "@/lib/telehealth/trust";
import BiosignatureSphere from "@/components/BiosignatureSphere";
import ProductPicker, { type Lane } from "./ProductPicker";
import LeadCapture from "./LeadCapture";
```

Delete the local `Lane` type entirely — it now comes from `ProductPicker.tsx` (imported above), so `page.tsx` and `ProductPicker.tsx` can never drift apart on this shape:

```tsx
type Lane = {
  category: string;
  code: string;
  label: string;
  desc: string;
  fromAmount: number | null;
  productId: string;
};
```

Delete this block. Nothing replaces it in `page.tsx` — the type now lives solely in `ProductPicker.tsx` (see Step 2).

Replace the `buildLane` function:

```tsx
function buildLane(category: string, products: CatalogProduct[]): Lane | null {
  if (products.length === 0) return null;
  const priceOf = (p: CatalogProduct) => p.fromPrice?.amount ?? Infinity;
  const purchasable = products.filter((p) => p.fromPrice);
  const pool = purchasable.length ? purchasable : products;

  const prefRe = PREFER[category];
  const preferred = prefRe ? pool.filter((p) => prefRe.test(p.name)) : [];
  const candidates = preferred.length ? preferred : pool;
  const rep = candidates.reduce((lo, p) => (priceOf(p) < priceOf(lo) ? p : lo));

  const desc = [rep.name, ...products.filter((p) => p.id !== rep.id).map((p) => p.name)]
    .slice(0, 3)
    .join(" · ");

  return {
    category,
    code: CODE[category] ?? category.slice(0, 2).toUpperCase(),
    label: categoryLabel(category),
    desc,
    fromAmount: rep.fromPrice?.amount ?? null,
    productId: rep.id,
  };
}
```

with:

```tsx
function buildLane(category: string, products: CatalogProduct[]): Lane | null {
  if (products.length === 0) return null;
  const priceOf = (p: CatalogProduct) => p.fromPrice?.amount ?? Infinity;
  const purchasable = products.filter((p) => p.fromPrice);
  const pool = purchasable.length ? purchasable : products;

  const prefRe = PREFER[category];
  const preferred = prefRe ? pool.filter((p) => prefRe.test(p.name)) : [];
  const candidates = preferred.length ? preferred : pool;
  const rep = candidates.reduce((lo, p) => (priceOf(p) < priceOf(lo) ? p : lo));

  return {
    category,
    code: CODE[category] ?? category.slice(0, 2).toUpperCase(),
    label: categoryLabel(category),
    fromAmount: rep.fromPrice?.amount ?? null,
    productId: rep.id,
    groups: groupProducts(products),
  };
}
```

Replace the protocols-index render block:

```tsx
          {lanes.length === 0 ? (
            <p className="hero-sub" style={{ marginTop: 16 }}>
              Protocols are momentarily unavailable — please check back shortly.
            </p>
          ) : (
            <div className="idx" style={{ marginTop: 14 }}>
              {lanes.map((l) => (
                <StartVisit key={l.category} category={l.category} productId={l.productId} label={l.label} sub={sub} className="irow">
                  <span className="code">{l.code}</span>
                  <span className="nm">{l.label}{l.desc && <small>{l.desc}</small>}</span>
                  {SIGNAL_CONNECTED && SIGNAL_LANES.has(l.category)
                    ? <span className="flag">★ Matches your signal</span>
                    : <span aria-hidden="true" />}
                  <span className="px">
                    {l.fromAmount != null
                      ? <><small>from</small> ${l.fromAmount}<small>/mo</small></>
                      : <small>See options</small>}
                  </span>
                </StartVisit>
              ))}
            </div>
          )}
```

with:

```tsx
          {lanes.length === 0 ? (
            <p className="hero-sub" style={{ marginTop: 16 }}>
              Protocols are momentarily unavailable — please check back shortly.
            </p>
          ) : (
            <div className="idx" style={{ marginTop: 14 }}>
              {lanes.map((l) => (
                <ProductPicker
                  key={l.category}
                  lane={l}
                  sub={sub}
                  signalMatch={SIGNAL_CONNECTED && SIGNAL_LANES.has(l.category)}
                />
              ))}
            </div>
          )}
```

- [ ] **Step 4: Run lint, tests, and build**

Run: `cd apps/modality && pnpm lint`
Expected: no errors (no unused imports — `StartVisit` is no longer imported by `page.tsx`, `CatalogProduct` is still used by `buildLane`'s signature).

Run: `cd apps/modality && pnpm test`
Expected: PASS — existing lib tests plus `groups.test.ts` all green (no component tests exist for `StartVisit`/`ProductPicker` — see spec's Testing section).

Run: `cd apps/modality && pnpm build`
Expected: production build succeeds (this also runs the TypeScript compiler — confirms `StartVisit`'s new prop contract, `ProductPicker`'s types, and `page.tsx`'s usage all line up).

- [ ] **Step 5: Commit**

```bash
git add apps/modality/src/app/StartVisit.tsx apps/modality/src/app/ProductPicker.tsx apps/modality/src/app/page.tsx
git commit -m "feat(modality): make every category product selectable before hand-off

Replaces the single-representative-product row with ProductPicker,
which expands inline for <=6 products, opens a picker modal for >6
(Weight Loss today), or skips straight through for a 1-product
category — same as before. StartVisit now takes open/onClose instead
of owning its own trigger, so it can be launched with whichever
product was actually picked."
```

---

### Task 4: Manual verification against the running app

No code changes expected in this task unless verification surfaces a bug — if it does, fix it and add a commit before finishing.

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

Run: `cd apps/modality && pnpm dev -- -p 3400`
Expected: server starts, `http://localhost:3400/` returns 200.

- [ ] **Step 2: Verify Weight Loss opens the picker modal with both groups**

In a browser (or via Playwright as used for the earlier click-through demo), go to `http://localhost:3400/`, scroll to the protocols index, click the "Weight Loss" row.

Expected: a modal opens titled "Choose your Weight Loss protocol", showing a "Compounded" group (7 products: Sublingual Semaglutide, Microdose Semaglutide + B12, Microdose Tirzepatide + B12, Injectable Semaglutide with additives, Injectable Tirzepatide with additives, Injectable Lipo-C, Injectable Lipo-B) and a "Brand-name" group (4 products: Ozempic, Mounjaro, Zepbound, Wegovy, in ascending price order). The row itself is NOT a modal trigger for the email capture — clicking it only opens this picker.

- [ ] **Step 3: Verify picking a product opens the email modal scoped to that exact product**

Click "Wegovy" inside the picker.

Expected: the picker closes and the email modal opens with heading "Save your Wegovy match" (not "Save your Weight Loss match"). Fill in an email and click "Continue to my visit →" (or "Skip and continue").

Expected: browser navigates to `/go/weight-loss/{Wegovy's id}`, which 302s to Wegovy's real `intakeUrl` — confirm via the Network tab or final `page.url()` that the destination corresponds to Wegovy, not the default cheapest product (Sublingual Semaglutide).

- [ ] **Step 4: Verify Women's Health expands inline**

Reload the homepage, click the "Women's Health" row.

Expected: no modal — the row expands in place directly beneath it, showing a single ungrouped list (no "Compounded"/"Brand-name" headings, since none of its 3 products match `BRAND_NAMES`) with Female Estradiol Tablets ($124), Patch ($224), Gel ($249) in that order. Clicking a card opens the email modal scoped to that product, same as Step 3.

- [ ] **Step 5: Stop the dev server**

Run: `Ctrl+C` in the terminal running `pnpm dev`, or kill the process by PID if backgrounded.

---

## Self-Review Notes

- **Spec coverage:** threshold rule (Task 3, `PICKER_THRESHOLD = 6`) ✓; brand/compounded grouping (Task 1) ✓; ≤1-product shortcut (Task 3, `mode === "shortcut"`) ✓; row caption change (Task 3, `ProductPicker`'s `caption` computation) ✓; `StartVisit` externally controlled (Task 3, Step 1) ✓; CSS ported from mockup (Task 2) ✓; no backend changes (confirmed — `/go` route untouched) ✓; testing plan — unit tests (Task 1) + manual verification (Task 4) ✓.
- **No placeholders:** every step has complete, runnable code or an exact command with expected output.
- **Type consistency:** `Picked = { productId: string; label: string }` used identically in `ProductPicker.tsx`'s `pick()`, `onRowClick()`, and `ProductGroups`' `onPick` callback. `ProductGroup` is defined once in `groups.ts`, imported by `ProductPicker.tsx` only. `Lane` is defined once, in `ProductPicker.tsx` (`export type Lane`), and `page.tsx` imports it from there instead of keeping its own copy — caught during self-review that the first draft duplicated this type in both files, which would have let them silently drift; fixed by making `page.tsx`'s local `Lane` type import, not redeclare.
