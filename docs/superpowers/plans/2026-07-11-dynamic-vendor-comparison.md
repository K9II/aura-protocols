# Dynamic Vendor Comparison Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a shopper on a product page pick 2+ vendors and see a no-price/no-commission comparison table, and generate real comparison pages for all 20 vendor pairs that don't already have hand-written content.

**Architecture:** A new `vendorProfiles.ts` data file holds one reusable profile per vendor (7 total). A new `lib/vendorPairs.ts` computes every vendor pair that shares a product, minus the one pair already covered by the hand-written `comparisons.ts` entry. The existing `compare/[slug]/page.tsx` route is extended to serve both the curated page (unchanged) and newly generated pair pages (via a new `GeneratedComparisonView` component). The product page's vendor list becomes a client component (`VendorCompareList`) so it can hold checkbox state and render an inline compare table.

**Tech Stack:** Next.js 16 App Router (apps/shop), TypeScript, Vitest + Testing Library (existing test setup), Tailwind CSS v4.

**Spec:** `docs/superpowers/specs/2026-07-11-dynamic-vendor-comparison-design.md`

---

## Reference data used by this plan

Full vendor list (from `products.ts`): Apollo Peptide Sciences, Behemoth Labz, GLP-1 Research Lab, Ignite Peptides, Limitless Life Nootropics, Main Peptides, Swiss Chems.

`vendorId()` map already in `lib/affiliate.ts`: `limitless`, `swiss-chems`, `apollo`, `glp1-lab`, `ignite`, `main-peptides`, `behemoth`.

The only curated comparison today is `limitless-life-nootropics-vs-swiss-chems` in `data/comparisons.ts` — this plan must not modify that file or that route's existing rendering.

---

### Task 1: Vendor profile data file

**Files:**
- Create: `apps/shop/src/data/vendorProfiles.ts`
- Test: `apps/shop/tests/data/vendor-profiles.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/shop/tests/data/vendor-profiles.test.ts
import { describe, it, expect } from "vitest";
import { products } from "@/data/products";
import { vendorProfiles } from "@/data/vendorProfiles";

describe("vendor profiles data contract", () => {
  it("has exactly one profile per vendor referenced in products.ts", () => {
    const productVendors = new Set(products.flatMap((p) => p.vendors.map((v) => v.vendor)));
    const profileVendors = new Set(vendorProfiles.map((v) => v.vendor));
    expect(profileVendors).toEqual(productVendors);
  });

  it("has no duplicate vendor entries", () => {
    const names = vendorProfiles.map((v) => v.vendor);
    expect(new Set(names).size).toBe(names.length);
  });

  it("scores are all in the 1-5 range", () => {
    for (const v of vendorProfiles) {
      for (const score of Object.values(v.scores)) {
        expect(score).toBeGreaterThanOrEqual(1);
        expect(score).toBeLessThanOrEqual(5);
      }
    }
  });

  it("does not mention price or commission anywhere in summary, pros, or cons", () => {
    const bannedPattern = /\$|commission|per order|per sale/i;
    for (const v of vendorProfiles) {
      expect(v.summary).not.toMatch(bannedPattern);
      for (const p of [...v.pros, ...v.cons]) {
        expect(p).not.toMatch(bannedPattern);
      }
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/shop && npx vitest run tests/data/vendor-profiles.test.ts`
Expected: FAIL — `Cannot find module '@/data/vendorProfiles'`

- [ ] **Step 3: Write the data file**

```ts
// apps/shop/src/data/vendorProfiles.ts
export type VendorProfile = {
  vendor: string; // must exactly match ProductVendor.vendor strings used in products.ts
  summary: string;
  pros: string[];
  cons: string[];
  scores: {
    catalogBreadth: number; // 1-5
    shippingSpeed: number; // 1-5, provisional 3 unless independently confirmed
    coaPractices: number; // 1-5
  };
};

export const vendorProfiles: VendorProfile[] = [
  {
    vendor: "Limitless Life Nootropics",
    summary:
      "Limitless Life Nootropics (Limitless Biotech) has carved out a strong niche in growth hormone secretagogues and performance peptide stacks. Their pre-blended CJC-1295/Ipamorelin combinations and USA manufacturing make them a top choice for GH-focused research programs.",
    pros: [
      "Best-in-class GH secretagogue stacks (CJC-1295/Ipamorelin blends)",
      "USA-manufactured, same-day domestic shipping",
      "Pre-blended stacks simplify research protocols",
      "99% purity standard with batch COAs",
    ],
    cons: [
      "Narrower catalog vs broader-catalog vendors on this site",
      "Less established for non-GH peptides",
    ],
    scores: { catalogBreadth: 4, shippingSpeed: 5, coaPractices: 4 },
  },
  {
    vendor: "Swiss Chems",
    summary:
      "Swiss Chems operates one of the broader catalogs in the research chemical market — covering peptides, SARMs, oral peptides, and ancillary compounds. Their international shipping network gives them a strong position outside the US domestic market.",
    pros: [
      "Broadest catalog including SARMs and ancillaries",
      "Strong international shipping network",
      "Good option for PT-141 and niche compounds",
    ],
    cons: [
      "Longer US domestic shipping times than domestic-only vendors",
      "COA detail can vary by compound",
    ],
    scores: { catalogBreadth: 5, shippingSpeed: 3, coaPractices: 4 },
  },
  {
    vendor: "Apollo Peptide Sciences",
    summary:
      "Apollo Peptide Sciences runs a broad catalog spanning GLP-1 compounds (semaglutide, tirzepatide, retatrutide) alongside standard recovery and longevity peptides, tracked through a Refersion affiliate program.",
    pros: [
      "Carries tirzepatide and retatrutide variants alongside semaglutide — broader GLP-1 lineup than most vendors on this site",
      "Also stocks longevity-focused compounds (Epithalon, NAD+, FOXO4-DRI) not every vendor carries",
    ],
    cons: [
      "Does not carry PT-141, Tesamorelin, AOD-9604, Sermorelin, or MOTS-c",
      "Shipping speed not independently confirmed — rated provisionally at average",
    ],
    scores: { catalogBreadth: 4, shippingSpeed: 3, coaPractices: 4 },
  },
  {
    vendor: "Behemoth Labz",
    summary:
      "Behemoth Labz carries one of the broadest catalogs on the site (112+ products) with a confirmed customer discount code and verified click tracking.",
    pros: [
      "Largest confirmed catalog among approved vendors — carries SS-31, AOD-9604, Epithalon, and IGF-1 LR3 that several other vendors don't stock",
      "Confirmed working discount code and verified affiliate click tracking",
    ],
    cons: [
      "Does not carry GHK-Cu, NAD+, or the CJC-1295/Ipamorelin blend",
      "Shipping speed not independently confirmed — rated provisionally at average",
    ],
    scores: { catalogBreadth: 5, shippingSpeed: 3, coaPractices: 4 },
  },
  {
    vendor: "GLP-1 Research Lab",
    summary:
      "GLP-1 Research Lab's catalog extends well beyond GLP-1s into wellness and recovery peptides, covering many of the same core compounds carried elsewhere on this site.",
    pros: [
      "Broad catalog spanning GLP-1s, wellness peptides (PT-141, NAD+, MOTS-c, GHK-Cu, Tesamorelin), and recovery compounds (TB-500, Ipamorelin, IGF-1 LR3)",
      "Carries the Cagrilintide and Cagri-Sema blend, not available at most other vendors on this site",
    ],
    cons: [
      "Does not carry BPC-157, CJC-1295/Ipamorelin, or AOD-9604",
      "Shipping speed not independently confirmed — rated provisionally at average",
    ],
    scores: { catalogBreadth: 4, shippingSpeed: 3, coaPractices: 4 },
  },
  {
    vendor: "Ignite Peptides",
    summary:
      "Ignite Peptides carries the broadest catalog of any approved vendor (30+ compounds) with confirmed live affiliate tracking and a Minnesota-based, US-domestic operation.",
    pros: [
      "Broadest confirmed catalog among approved vendors — 30+ compounds including several pre-blended stacks",
      "US-domestic operation with confirmed live deep-link tracking",
    ],
    cons: [
      "Does not carry AOD-9604, Epithalon, or IGF-1 LR3",
      "Shipping speed not independently confirmed — rated provisionally at average",
    ],
    scores: { catalogBreadth: 5, shippingSpeed: 3, coaPractices: 4 },
  },
  {
    vendor: "Main Peptides",
    summary:
      "Main Peptides is a smaller-catalog vendor added primarily for SS-31, with a confirmed working affiliate link and third-party purity testing on file.",
    pros: [
      "Confirmed working affiliate link and deep-link format",
      "Carries SS-31 with third-party purity testing documented",
    ],
    cons: [
      "Catalog breadth beyond the compounds already listed on this site is not fully documented yet — treat this profile as provisional pending a full catalog review",
      "Shipping speed not independently confirmed — rated provisionally at average",
    ],
    scores: { catalogBreadth: 3, shippingSpeed: 3, coaPractices: 4 },
  },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/shop && npx vitest run tests/data/vendor-profiles.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/shop/src/data/vendorProfiles.ts apps/shop/tests/data/vendor-profiles.test.ts
git commit -m "feat(shop): add vendor profile data for comparison feature"
```

**Review checkpoint (not blocking the remaining tasks, but blocking go-live):** the profiles for Apollo, Behemoth Labz, GLP-1 Research Lab, Ignite Peptides, and Main Peptides are drafted from `vendor_registry.md` facts only — flag these five to the user for a final read before the generated comparison pages ship, since "shipping speed" is marked provisional for all of them except Limitless and Swiss Chems.

---

### Task 2: Vendor pair computation

**Files:**
- Create: `apps/shop/src/lib/vendorPairs.ts`
- Test: `apps/shop/tests/lib/vendor-pairs.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/shop/tests/lib/vendor-pairs.test.ts
import { describe, it, expect } from "vitest";
import { getVendorPairs } from "@/lib/vendorPairs";

describe("getVendorPairs", () => {
  it("returns 20 pairs (21 possible minus the 1 curated pair)", () => {
    expect(getVendorPairs().length).toBe(20);
  });

  it("excludes the curated Limitless vs Swiss Chems pair", () => {
    const pairs = getVendorPairs();
    const hasCurated = pairs.some(
      (p) =>
        (p.vendorA === "Limitless Life Nootropics" && p.vendorB === "Swiss Chems") ||
        (p.vendorA === "Swiss Chems" && p.vendorB === "Limitless Life Nootropics")
    );
    expect(hasCurated).toBe(false);
  });

  it("every pair has at least one shared product and a unique slug", () => {
    const pairs = getVendorPairs();
    const slugs = new Set<string>();
    for (const p of pairs) {
      expect(p.sharedProducts.length).toBeGreaterThan(0);
      expect(slugs.has(p.slug)).toBe(false);
      slugs.add(p.slug);
    }
  });

  it("slugs use the vendorId scheme in alphabetical id order", () => {
    const pairs = getVendorPairs();
    const apolloBehemoth = pairs.find(
      (p) =>
        (p.vendorA === "Apollo Peptide Sciences" && p.vendorB === "Behemoth Labz") ||
        (p.vendorA === "Behemoth Labz" && p.vendorB === "Apollo Peptide Sciences")
    );
    expect(apolloBehemoth?.slug).toBe("apollo-vs-behemoth");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/shop && npx vitest run tests/lib/vendor-pairs.test.ts`
Expected: FAIL — `Cannot find module '@/lib/vendorPairs'`

- [ ] **Step 3: Write the implementation**

```ts
// apps/shop/src/lib/vendorPairs.ts
import { products } from "@/data/products";
import { comparisons } from "@/data/comparisons";
import { vendorId } from "@/lib/affiliate";

export type VendorPair = {
  vendorA: string;
  vendorB: string;
  slug: string;
  sharedProducts: { slug: string; name: string }[];
};

function pairKey(a: string, b: string) {
  return [a, b].sort().join("|");
}

const curatedKeys = new Set(comparisons.map((c) => pairKey(c.vendorA, c.vendorB)));

export function getVendorPairs(): VendorPair[] {
  const vendorNames = [...new Set(products.flatMap((p) => p.vendors.map((v) => v.vendor)))];
  const pairs: VendorPair[] = [];

  for (let i = 0; i < vendorNames.length; i++) {
    for (let j = i + 1; j < vendorNames.length; j++) {
      const [nameA, nameB] = [vendorNames[i], vendorNames[j]].sort((x, y) =>
        vendorId(x).localeCompare(vendorId(y))
      );

      if (curatedKeys.has(pairKey(nameA, nameB))) continue;

      const sharedProducts = products
        .filter((p) => {
          const names = new Set(p.vendors.map((v) => v.vendor));
          return names.has(nameA) && names.has(nameB);
        })
        .map((p) => ({ slug: p.slug, name: p.name }));

      if (sharedProducts.length === 0) continue;

      pairs.push({
        vendorA: nameA,
        vendorB: nameB,
        slug: `${vendorId(nameA)}-vs-${vendorId(nameB)}`,
        sharedProducts,
      });
    }
  }

  return pairs;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/shop && npx vitest run tests/lib/vendor-pairs.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/shop/src/lib/vendorPairs.ts apps/shop/tests/lib/vendor-pairs.test.ts
git commit -m "feat(shop): compute vendor pairs eligible for generated comparison pages"
```

---

### Task 3: Generated comparison page component

**Files:**
- Create: `apps/shop/src/components/GeneratedComparisonView.tsx`

- [ ] **Step 1: Write the component**

```tsx
// apps/shop/src/components/GeneratedComparisonView.tsx
import Link from "next/link";
import { vendorProfiles } from "@/data/vendorProfiles";
import { goUrl } from "@/lib/affiliate";
import type { VendorPair } from "@/lib/vendorPairs";
import EngineCTACard from "@/components/EngineCTACard";

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={`w-5 h-2 rounded-sm ${i <= score ? "bg-cyan-400" : "bg-white/10"}`} />
        ))}
      </div>
      <span className="text-xs text-slate-400">{score}/5</span>
    </div>
  );
}

export default function GeneratedComparisonView({ pair }: { pair: VendorPair }) {
  const profileA = vendorProfiles.find((v) => v.vendor === pair.vendorA);
  const profileB = vendorProfiles.find((v) => v.vendor === pair.vendorB);
  if (!profileA || !profileB) return null;

  const rows: [string, "catalogBreadth" | "shippingSpeed" | "coaPractices"][] = [
    ["Catalog Breadth", "catalogBreadth"],
    ["Shipping Speed", "shippingSpeed"],
    ["COA Practices", "coaPractices"],
  ];

  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-10">
        <Link href="/" className="hover:text-white transition-colors">Home</Link>
        <span>/</span>
        <Link href="/compare" className="hover:text-white transition-colors">Compare</Link>
        <span>/</span>
        <span className="text-slate-300">{pair.vendorA} vs {pair.vendorB}</span>
      </nav>

      <div className="mb-10">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-violet-400 bg-violet-400/10 border border-violet-400/20 rounded-full px-4 py-1.5 mb-4">
          Vendor Comparison
        </div>
        <h1 className="text-4xl font-extrabold text-white leading-tight mb-4">
          {pair.vendorA} vs {pair.vendorB}
        </h1>
        <p className="text-slate-400 leading-relaxed text-lg">
          Both vendors are independently vetted and carry{" "}
          {pair.sharedProducts.length === 1
            ? "one shared compound"
            : `${pair.sharedProducts.length} shared compounds`}{" "}
          on Aura Protocols: {pair.sharedProducts.map((p) => p.name).join(", ")}.
        </p>
      </div>

      <section className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-6">Category Breakdown</h2>
        <div className="glass overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[400px]">
              <div className="grid grid-cols-4 gap-4 px-6 py-3 border-b border-white/5 text-xs uppercase tracking-widest text-slate-500 font-semibold">
                <div className="col-span-2">Category</div>
                <div>{pair.vendorA}</div>
                <div>{pair.vendorB}</div>
              </div>
              {rows.map(([label, key]) => (
                <div key={key} className="grid grid-cols-4 gap-4 px-6 py-4 border-b border-white/5 last:border-0 items-center">
                  <div className="col-span-2">
                    <p className="text-sm font-semibold text-white">{label}</p>
                  </div>
                  <ScoreBar score={profileA.scores[key]} />
                  <ScoreBar score={profileB.scores[key]} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {[profileA, profileB].map((v) => (
          <div key={v.vendor} className="glass p-6 flex flex-col gap-4">
            <h3 className="text-xl font-bold text-white">{v.vendor}</h3>
            <p className="text-sm text-slate-400 leading-relaxed">{v.summary}</p>
            <div>
              <p className="text-xs uppercase tracking-widest text-emerald-400 font-semibold mb-2">Pros</p>
              <ul className="space-y-1.5">
                {v.pros.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-sm text-slate-300">
                    <span className="text-emerald-400 mt-0.5 flex-shrink-0">+</span> {p}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-rose-400 font-semibold mb-2">Cons</p>
              <ul className="space-y-1.5">
                {v.cons.map((c) => (
                  <li key={c} className="flex items-start gap-2 text-sm text-slate-300">
                    <span className="text-rose-400 mt-0.5 flex-shrink-0">−</span> {c}
                  </li>
                ))}
              </ul>
            </div>
            <a
              href={goUrl(v.vendor)}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="mt-auto btn-outline text-sm py-2.5 text-center"
            >
              Visit {v.vendor} →
            </a>
          </div>
        ))}
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-4">Shared Compounds</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {pair.sharedProducts.map((p) => (
            <Link key={p.slug} href={`/products/${p.slug}`} className="glass product-card p-4 text-sm text-slate-300 hover:text-white">
              {p.name} →
            </Link>
          ))}
        </div>
      </section>

      <EngineCTACard />

      <p className="text-xs text-slate-600 border-t border-white/5 pt-6 mt-12 leading-relaxed">
        Affiliate Disclosure: This page contains affiliate links. Aura Protocols earns a commission when you purchase through these links at no additional cost to you. Vendor comparisons above reflect catalog breadth, shipping, and COA practices only — not price.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/shop/src/components/GeneratedComparisonView.tsx
git commit -m "feat(shop): add generated comparison page component"
```

(No standalone test here — this component is exercised end-to-end by Task 4's route test and the full build in Task 6.)

---

### Task 4: Wire generated pairs into the `/compare/[slug]` route

**Files:**
- Modify: `apps/shop/src/app/compare/[slug]/page.tsx`
- Test: `apps/shop/tests/app/compare-slug.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/shop/tests/app/compare-slug.test.ts
import { describe, it, expect } from "vitest";
import { generateStaticParams } from "@/app/compare/[slug]/page";
import { comparisons } from "@/data/comparisons";
import { getVendorPairs } from "@/lib/vendorPairs";

describe("compare/[slug] generateStaticParams", () => {
  it("includes both curated and generated pair slugs", async () => {
    const params = await generateStaticParams();
    const slugs = params.map((p: { slug: string }) => p.slug);

    for (const c of comparisons) {
      expect(slugs).toContain(c.slug);
    }
    for (const pair of getVendorPairs()) {
      expect(slugs).toContain(pair.slug);
    }
    expect(slugs.length).toBe(comparisons.length + getVendorPairs().length);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/shop && npx vitest run tests/app/compare-slug.test.ts`
Expected: FAIL — `generateStaticParams` only returns curated slugs, count mismatch

- [ ] **Step 3: Modify the route**

Modify `apps/shop/src/app/compare/[slug]/page.tsx`:

Replace the imports at the top:
```ts
import { notFound } from "next/navigation";
import Link from "next/link";
import { comparisons } from "@/data/comparisons";
import { goUrl } from "@/lib/affiliate";
import EngineCTACard from "@/components/EngineCTACard";
```
with:
```ts
import { notFound } from "next/navigation";
import Link from "next/link";
import { comparisons } from "@/data/comparisons";
import { getVendorPairs } from "@/lib/vendorPairs";
import { goUrl } from "@/lib/affiliate";
import EngineCTACard from "@/components/EngineCTACard";
import GeneratedComparisonView from "@/components/GeneratedComparisonView";
```

Replace:
```ts
export function generateStaticParams() {
  return comparisons.map((c) => ({ slug: c.slug }));
}
```
with:
```ts
export function generateStaticParams() {
  return [
    ...comparisons.map((c) => ({ slug: c.slug })),
    ...getVendorPairs().map((p) => ({ slug: p.slug })),
  ];
}
```

Replace the `generateMetadata` function's early-return guard:
```ts
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const comp = comparisons.find((c) => c.slug === slug);
  if (!comp) return {};
  const title = `${comp.vendorA} vs ${comp.vendorB} — Aura Protocols`;
```
with:
```ts
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const comp = comparisons.find((c) => c.slug === slug);
  if (!comp) {
    const pair = getVendorPairs().find((p) => p.slug === slug);
    if (!pair) return {};
    const pairTitle = `${pair.vendorA} vs ${pair.vendorB} — Aura Protocols`;
    return {
      title: pairTitle,
      description: `Compare ${pair.vendorA} and ${pair.vendorB} across catalog breadth, shipping, and COA practices for ${pair.sharedProducts.map((p) => p.name).join(", ")}.`,
      openGraph: {
        title: pairTitle,
        url: `https://shop.auraprotocols.com/compare/${pair.slug}`,
      },
    };
  }
  const title = `${comp.vendorA} vs ${comp.vendorB} — Aura Protocols`;
```

Replace the page component's not-found guard:
```ts
export default async function ComparisonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const comp = comparisons.find((c) => c.slug === slug);
  if (!comp) notFound();
```
with:
```ts
export default async function ComparisonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const comp = comparisons.find((c) => c.slug === slug);
  if (!comp) {
    const pair = getVendorPairs().find((p) => p.slug === slug);
    if (!pair) notFound();
    return <GeneratedComparisonView pair={pair} />;
  }
```

Everything below that line (the existing curated-page JSX) stays exactly as-is — it only runs once `comp` is confirmed non-null.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/shop && npx vitest run tests/app/compare-slug.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/shop/src/app/compare/[slug]/page.tsx apps/shop/tests/app/compare-slug.test.ts
git commit -m "feat(shop): generate comparison pages for all uncurated vendor pairs"
```

---

### Task 5: Vendor checkbox picker on the product page

**Files:**
- Create: `apps/shop/src/components/VendorCompareList.tsx`
- Test: `apps/shop/tests/components/VendorCompareList.test.tsx`
- Modify: `apps/shop/src/app/products/[slug]/page.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// apps/shop/tests/components/VendorCompareList.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import VendorCompareList from "@/components/VendorCompareList";

const twoVendors = [
  { vendor: "Limitless Life Nootropics", url: "https://limitlesslifenootropics.com/x", commission: "15%" },
  { vendor: "Swiss Chems", url: "https://swisschems.is/x", commission: "20%" },
];

const fiveVendors = [
  ...twoVendors,
  { vendor: "Apollo Peptide Sciences", url: "https://apollopeptidesciences.com/x", commission: "20%" },
  { vendor: "Ignite Peptides", url: "https://ignitepeptides.com/x", commission: "15%" },
  { vendor: "Main Peptides", url: "https://mainpeptides.com/x", commission: "10%" },
];

describe("VendorCompareList", () => {
  it("renders no checkboxes when fewer than 3 vendors", () => {
    render(<VendorCompareList vendors={twoVendors} productSlug="bpc-157" />);
    expect(screen.queryAllByRole("checkbox").length).toBe(0);
  });

  it("renders one checkbox per vendor when 3 or more vendors", () => {
    render(<VendorCompareList vendors={fiveVendors} productSlug="bpc-157" />);
    expect(screen.getAllByRole("checkbox").length).toBe(5);
  });

  it("shows a comparison table only after 2+ vendors are checked", () => {
    render(<VendorCompareList vendors={fiveVendors} productSlug="bpc-157" />);
    expect(screen.queryByText(/Comparing \d Vendors/)).toBeNull();

    const boxes = screen.getAllByRole("checkbox");
    fireEvent.click(boxes[0]);
    expect(screen.queryByText(/Comparing \d Vendors/)).toBeNull();

    fireEvent.click(boxes[1]);
    expect(screen.getByText("Comparing 2 Vendors")).toBeInTheDocument();
  });

  it("comparison table never renders a dollar sign or the word commission", () => {
    const { container } = render(<VendorCompareList vendors={fiveVendors} productSlug="bpc-157" />);
    const boxes = screen.getAllByRole("checkbox");
    fireEvent.click(boxes[0]);
    fireEvent.click(boxes[1]);
    fireEvent.click(boxes[2]);
    expect(screen.getByText("Comparing 3 Vendors")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/\$|commission/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/shop && npx vitest run tests/components/VendorCompareList.test.tsx`
Expected: FAIL — `Cannot find module '@/components/VendorCompareList'`

- [ ] **Step 3: Write the component**

```tsx
// apps/shop/src/components/VendorCompareList.tsx
"use client";

import { useState } from "react";
import { goUrl } from "@/lib/affiliate";
import { vendorProfiles } from "@/data/vendorProfiles";
import type { ProductVendor } from "@/data/products";

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className={`w-3 h-1.5 rounded-sm ${i <= score ? "bg-cyan-400" : "bg-white/10"}`} />
      ))}
    </div>
  );
}

const SCORE_ROWS: [string, "catalogBreadth" | "shippingSpeed" | "coaPractices"][] = [
  ["Catalog Breadth", "catalogBreadth"],
  ["Shipping Speed", "shippingSpeed"],
  ["COA Practices", "coaPractices"],
];

export default function VendorCompareList({
  vendors,
  productSlug,
}: {
  vendors: ProductVendor[];
  productSlug: string;
}) {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const toggle = (vendorName: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(vendorName)) next.delete(vendorName);
      else next.add(vendorName);
      return next;
    });
  };

  const showPicker = vendors.length >= 3;
  const selectedProfiles = vendorProfiles.filter((v) => checked.has(v.vendor));

  return (
    <div className="space-y-3">
      {vendors.map((v, i) => (
        <div key={v.vendor} className={i > 0 ? "pt-3 border-t border-white/5" : ""}>
          <div className="flex items-start gap-2 mb-1">
            {showPicker && (
              <input
                type="checkbox"
                checked={checked.has(v.vendor)}
                onChange={() => toggle(v.vendor)}
                className="mt-1 accent-cyan-400"
                aria-label={`Compare ${v.vendor}`}
              />
            )}
            <p className="text-sm font-semibold text-white">{v.vendor}</p>
          </div>
          {v.note && <p className="text-xs text-slate-500 mb-2">{v.note}</p>}
          <a
            href={goUrl(v.vendor, productSlug)}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className={`w-full text-center text-xs py-2 block ${i === 0 ? "btn-primary" : "btn-outline"}`}
          >
            Buy Direct from {v.vendor} →
          </a>
        </div>
      ))}

      {showPicker && selectedProfiles.length >= 2 && (
        <div className="pt-4 border-t border-white/5">
          <p className="text-xs uppercase tracking-widest text-cyan-400 font-semibold mb-3">
            Comparing {selectedProfiles.length} Vendors
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="text-left text-slate-500 font-semibold pb-2 pr-3">Category</th>
                  {selectedProfiles.map((p) => (
                    <th key={p.vendor} className="text-left text-slate-300 font-semibold pb-2 pr-3">
                      {p.vendor}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SCORE_ROWS.map(([label, key]) => (
                  <tr key={key} className="border-t border-white/5">
                    <td className="text-slate-500 py-2 pr-3">{label}</td>
                    {selectedProfiles.map((p) => (
                      <td key={p.vendor} className="py-2 pr-3">
                        <ScoreBar score={p.scores[key]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showPicker && checked.size === 1 && (
        <p className="text-xs text-slate-500 pt-2">Select one more vendor to compare.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/shop && npx vitest run tests/components/VendorCompareList.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Wire it into the product page**

Modify `apps/shop/src/app/products/[slug]/page.tsx`:

Replace this import block:
```ts
import { products } from "@/data/products";
import { comparisons } from "@/data/comparisons";
import { goUrl } from "@/lib/affiliate";
import EngineCTACard from "@/components/EngineCTACard";
```
with:
```ts
import { products } from "@/data/products";
import { comparisons } from "@/data/comparisons";
import EngineCTACard from "@/components/EngineCTACard";
import VendorCompareList from "@/components/VendorCompareList";
```
(`goUrl` moves entirely into `VendorCompareList`; the page component no longer calls it directly.)

Replace the vendor list block:
```tsx
            <div className="space-y-3">
              {sortedVendors.map((v, i) => (
                <div key={v.vendor} className={i > 0 ? "pt-3 border-t border-white/5" : ""}>
                  <p className="text-sm font-semibold text-white mb-1">{v.vendor}</p>
                  {v.note && (
                    <p className="text-xs text-slate-500 mb-2">{v.note}</p>
                  )}
                  <a
                    href={goUrl(v.vendor, product.slug)}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                    className={`w-full text-center text-xs py-2 block ${i === 0 ? "btn-primary" : "btn-outline"}`}
                  >
                    Buy Direct from {v.vendor} →
                  </a>
                </div>
              ))}
            </div>
```
with:
```tsx
            <VendorCompareList vendors={sortedVendors} productSlug={product.slug} />
```

- [ ] **Step 6: Commit**

```bash
git add apps/shop/src/components/VendorCompareList.tsx apps/shop/tests/components/VendorCompareList.test.tsx apps/shop/src/app/products/[slug]/page.tsx
git commit -m "feat(shop): add vendor checkbox comparison picker to product pages"
```

---

### Task 6: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `cd apps/shop && npx vitest run`
Expected: All tests PASS, including the 4 new test files from Tasks 1, 2, 4, 5 and the pre-existing suite.

- [ ] **Step 2: Run a full production build**

Run: `cd apps/shop && npx next build`
Expected: Build succeeds. `/compare/[slug]` should statically generate 21 routes total (1 curated + 20 generated) — check the build output's route tree for `/compare/[slug]` path count.

- [ ] **Step 3: Spot-check in the dev server**

Run: `cd apps/shop && npx next dev -p 3300`

Manually verify:
- `http://localhost:3300/products/bpc-157` (5 vendors) — checkboxes appear, checking 2+ shows the compare table, no `$` or "commission" text anywhere.
- `http://localhost:3300/products/pt-141` (5 vendors) — same check.
- `http://localhost:3300/products/semaglutide` (4 vendors) — checkboxes appear.
- A product with exactly 2 vendors, if any exist in `products.ts` — confirm no checkboxes render (falls back to the plain list).
- `http://localhost:3300/compare/apollo-vs-behemoth` — generated page renders with profile table, shared-compound list, no price.
- `http://localhost:3300/compare/limitless-life-nootropics-vs-swiss-chems` — unchanged, still the full curated page with FAQ.

- [ ] **Step 4: Final commit if any fixes were needed during spot-check**

```bash
git add -A
git commit -m "fix(shop): address issues found in dynamic comparison spot-check"
```
(Skip this step entirely if no fixes were needed.)
