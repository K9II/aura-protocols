# Peptide Reconstitution Calculator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `/calculator` on `apps/shop` — a reconstitution/dosing calculator (vial strength + BAC water → concentration; target dose + syringe size → units to draw, splitting into even injections when a dose exceeds one syringe's capacity), matching the design spec at `docs/superpowers/specs/2026-07-28-peptide-calculator-design.md`.

**Architecture:** A pure, fully-tested calculation module (`lib/reconstitution.ts`) is consumed by a `"use client"` presentational component (`ReconstitutionCalculator.tsx`) that owns all form state. A server-component page shell (`calculator/page.tsx`) renders that component plus static content (explainer, sources, FAQ, disclaimers, CTA) reusing existing Pharmacopoeia-theme CSS classes. Navbar and sitemap get one-line additions.

**Tech Stack:** Next.js 16 App Router, React `useState` (no form library), Tailwind CSS v4 (Pharmacopoeia theme in `globals.css`), Vitest + jsdom for the calculation-module tests.

---

## Task 1: Pure calculation module

**Files:**
- Create: `apps/shop/src/lib/reconstitution.ts`
- Test: `apps/shop/tests/lib/reconstitution.test.ts`

This is the only unit-tested piece (per spec's Testing section) — everything else is manually verified in-browser. TDD it properly since it's the one place a silent math bug would actually matter.

- [ ] **Step 1: Write the failing test**

Create `apps/shop/tests/lib/reconstitution.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { calculateReconstitution } from "@/lib/reconstitution";

describe("calculateReconstitution", () => {
  it("computes concentration, units, and doses per vial for a normal single-injection dose", () => {
    const result = calculateReconstitution({ vialMg: 5, waterMl: 2, doseMg: 0.5, syringeMax: 50 });
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.concentration).toBeCloseTo(2.5, 5);
    expect(result.totalUnits).toBeCloseTo(20, 5);
    expect(result.injections).toBe(1);
    expect(result.unitsPerInjection).toBeCloseTo(20, 5);
    expect(result.dosesPerVial).toBeCloseTo(10, 5);
  });

  it("does not split when units land exactly on the syringe's capacity", () => {
    // 5mg / 2ml = 2.5 mg/ml; a 1.25mg dose needs exactly 0.5ml = 50 units.
    const result = calculateReconstitution({ vialMg: 5, waterMl: 2, doseMg: 1.25, syringeMax: 50 });
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.totalUnits).toBeCloseTo(50, 5);
    expect(result.injections).toBe(1);
    expect(result.unitsPerInjection).toBeCloseTo(50, 5);
  });

  it("splits into 2 even injections when a dose needs just over one syringe's capacity", () => {
    // 5mg / 2ml = 2.5 mg/ml; a 2.4mg dose needs 0.96ml = 96 units -> ceil(96/50)=2 -> 48 each.
    const result = calculateReconstitution({ vialMg: 5, waterMl: 2, doseMg: 2.4, syringeMax: 50 });
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.totalUnits).toBeCloseTo(96, 5);
    expect(result.injections).toBe(2);
    expect(result.unitsPerInjection).toBeCloseTo(48, 5);
  });

  it("splits into more injections for a large multi-split dose", () => {
    // 5mg / 2ml = 2.5 mg/ml; a 4.5mg dose needs 1.8ml = 180 units -> ceil(180/50)=4 -> 45 each.
    const result = calculateReconstitution({ vialMg: 5, waterMl: 2, doseMg: 4.5, syringeMax: 50 });
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.totalUnits).toBeCloseTo(180, 5);
    expect(result.injections).toBe(4);
    expect(result.unitsPerInjection).toBeCloseTo(45, 5);
  });

  it("returns invalid when any required field is null", () => {
    expect(calculateReconstitution({ vialMg: null, waterMl: 2, doseMg: 0.5, syringeMax: 50 })).toEqual({ valid: false });
    expect(calculateReconstitution({ vialMg: 5, waterMl: null, doseMg: 0.5, syringeMax: 50 })).toEqual({ valid: false });
    expect(calculateReconstitution({ vialMg: 5, waterMl: 2, doseMg: null, syringeMax: 50 })).toEqual({ valid: false });
  });

  it("returns invalid when waterMl is zero, instead of dividing by zero", () => {
    expect(calculateReconstitution({ vialMg: 5, waterMl: 0, doseMg: 0.5, syringeMax: 50 })).toEqual({ valid: false });
  });

  it("returns invalid for non-finite or non-positive values", () => {
    expect(calculateReconstitution({ vialMg: NaN, waterMl: 2, doseMg: 0.5, syringeMax: 50 })).toEqual({ valid: false });
    expect(calculateReconstitution({ vialMg: -5, waterMl: 2, doseMg: 0.5, syringeMax: 50 })).toEqual({ valid: false });
    expect(calculateReconstitution({ vialMg: 5, waterMl: 2, doseMg: 0, syringeMax: 50 })).toEqual({ valid: false });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run (from `apps/shop`): `npx vitest run tests/lib/reconstitution.test.ts`
Expected: FAIL — `Cannot find module '@/lib/reconstitution'` (the module doesn't exist yet).

- [ ] **Step 3: Write the implementation**

Create `apps/shop/src/lib/reconstitution.ts`:

```ts
export type SyringeSize = 30 | 50 | 100;

export type ReconstitutionInput = {
  vialMg: number | null;
  waterMl: number | null;
  doseMg: number | null;
  syringeMax: SyringeSize;
};

export type ReconstitutionResult =
  | { valid: false }
  | {
      valid: true;
      concentration: number; // mg/ml
      totalUnits: number; // full-dose units before any split
      injections: number; // 1 or more
      unitsPerInjection: number; // what's actually drawn on each injection
      dosesPerVial: number;
    };

// U-100 insulin-syringe scale: 100 units = 1ml, the same on 30u/50u/100u barrels.
const UNITS_PER_ML = 100;

export function calculateReconstitution({
  vialMg,
  waterMl,
  doseMg,
  syringeMax,
}: ReconstitutionInput): ReconstitutionResult {
  const isPositive = (n: number | null): n is number => n !== null && Number.isFinite(n) && n > 0;

  if (!isPositive(vialMg) || !isPositive(waterMl) || !isPositive(doseMg)) {
    return { valid: false };
  }

  const concentration = vialMg / waterMl;
  const doseVolumeMl = doseMg / concentration;
  const totalUnits = doseVolumeMl * UNITS_PER_ML;
  const dosesPerVial = vialMg / doseMg;

  // Even split across the fewest injections that each fit the syringe,
  // rather than filling the syringe and dumping the remainder into an
  // uneven final shot.
  const injections = totalUnits > syringeMax ? Math.ceil(totalUnits / syringeMax) : 1;
  const unitsPerInjection = totalUnits / injections;

  return { valid: true, concentration, totalUnits, injections, unitsPerInjection, dosesPerVial };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/lib/reconstitution.test.ts`
Expected: PASS — 7 tests passed.

- [ ] **Step 5: Commit**

```bash
git add apps/shop/src/lib/reconstitution.ts apps/shop/tests/lib/reconstitution.test.ts
git commit -m "feat(shop): add reconstitution calculation module"
```

---

## Task 2: Interactive calculator component

**Files:**
- Create: `apps/shop/src/components/ReconstitutionCalculator.tsx`
- Modify: `apps/shop/src/app/globals.css` (append)

No automated test for this step (component behavior is covered by manual browser verification in Task 6, per the spec). This task is implementation, not TDD.

- [ ] **Step 1: Add the custom dropdown-arrow CSS**

The three `<select>` elements need `appearance:none` plus a custom caret. The caret is an inline SVG data-URI, which is too fragile to embed directly in a Tailwind arbitrary-value class (nested quotes/spaces), so it gets one small CSS rule instead — everything else on the calculator is plain Tailwind utilities.

Append to the end of `apps/shop/src/app/globals.css` (after the existing `@media (max-width: 640px) { ... }` block, so after line 437):

```css

/* reconstitution calculator — custom dropdown arrow (a data-URI is too
   fragile to express as a Tailwind arbitrary-value class) */
.pharmacopoeia .p-calc-select {
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'><path d='M1 1l5 5 5-5' fill='none' stroke='%234A4438' stroke-width='1.4'/></svg>");
  background-repeat: no-repeat;
  background-position: right 2px center;
  background-size: 11px 7px;
}
```

- [ ] **Step 2: Write the component**

Create `apps/shop/src/components/ReconstitutionCalculator.tsx`:

```tsx
"use client";

import { useState } from "react";
import { calculateReconstitution, type SyringeSize } from "@/lib/reconstitution";

const VIAL_OPTIONS = ["5", "10", "15", "20", "40"];
const WATER_OPTIONS = ["1", "2", "3", "5"];
const DOSE_OPTIONS = ["0.5", "1", "2", "4", "8", "12"];
const SYRINGES: { max: SyringeSize; ml: string }[] = [
  { max: 30, ml: "0.3" },
  { max: 50, ml: "0.5" },
  { max: 100, ml: "1.0" },
];

function resolveField(selectValue: string, customValue: string): number | null {
  const raw = selectValue === "custom" ? customValue : selectValue;
  const n = parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function floor1(n: number): number {
  return Math.floor(n * 10) / 10;
}

type DropdownFieldProps = {
  label: string;
  unit: string;
  options: string[];
  selectValue: string;
  customValue: string;
  onSelectChange: (v: string) => void;
  onCustomChange: (v: string) => void;
};

function DropdownField({
  label,
  unit,
  options,
  selectValue,
  customValue,
  onSelectChange,
  onCustomChange,
}: DropdownFieldProps) {
  return (
    <div className="mb-[18px]">
      <label className="block text-[10.5px] uppercase tracking-[0.08em] text-[color:var(--ink-soft)] mb-1.5">
        {label}
      </label>
      <select
        className="p-calc-select w-full bg-transparent border-0 border-b border-[color:var(--line)] pr-5 pl-0.5 py-2 text-base text-[color:var(--ink)] focus:outline-none focus:border-[color:var(--specimen)]"
        value={selectValue}
        onChange={(e) => onSelectChange(e.target.value)}
      >
        {options.map((v) => (
          <option key={v} value={v}>
            {v} {unit}
          </option>
        ))}
        <option value="custom">Custom…</option>
      </select>
      {selectValue === "custom" && (
        <div className="mt-2 flex items-baseline gap-2">
          <input
            type="number"
            min="0"
            step="any"
            autoFocus
            value={customValue}
            onChange={(e) => onCustomChange(e.target.value)}
            placeholder="0.0"
            className="w-full bg-transparent border-0 border-b border-[color:var(--specimen)] px-0.5 py-2 text-base text-[color:var(--ink)] focus:outline-none"
          />
          <span className="text-xs text-[color:var(--ink-soft)] whitespace-nowrap">{unit}</span>
        </div>
      )}
    </div>
  );
}

export default function ReconstitutionCalculator() {
  const [vialSelect, setVialSelect] = useState("5");
  const [vialCustom, setVialCustom] = useState("");
  const [waterSelect, setWaterSelect] = useState("2");
  const [waterCustom, setWaterCustom] = useState("");
  const [doseSelect, setDoseSelect] = useState("0.5");
  const [doseCustom, setDoseCustom] = useState("");
  const [syringeMax, setSyringeMax] = useState<SyringeSize>(50);

  const vialMg = resolveField(vialSelect, vialCustom);
  const waterMl = resolveField(waterSelect, waterCustom);
  const doseMg = resolveField(doseSelect, doseCustom);
  const result = calculateReconstitution({ vialMg, waterMl, doseMg, syringeMax });
  const syringe = SYRINGES.find((s) => s.max === syringeMax)!;
  const gaugePct = result.valid ? Math.min((result.unitsPerInjection / syringeMax) * 100, 100) : 0;

  return (
    <div className="grid gap-12 border border-[color:var(--line)] p-10 md:grid-cols-2">
      {/* Inputs */}
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--specimen)] mb-5">Inputs</p>

        <DropdownField
          label="Vial Strength"
          unit="mg"
          options={VIAL_OPTIONS}
          selectValue={vialSelect}
          customValue={vialCustom}
          onSelectChange={setVialSelect}
          onCustomChange={setVialCustom}
        />
        <DropdownField
          label="Bacteriostatic Water"
          unit="ml"
          options={WATER_OPTIONS}
          selectValue={waterSelect}
          customValue={waterCustom}
          onSelectChange={setWaterSelect}
          onCustomChange={setWaterCustom}
        />
        <DropdownField
          label="Target Dose"
          unit="mg"
          options={DOSE_OPTIONS}
          selectValue={doseSelect}
          customValue={doseCustom}
          onSelectChange={setDoseSelect}
          onCustomChange={setDoseCustom}
        />

        <div>
          <p className="text-[10.5px] uppercase tracking-[0.08em] text-[color:var(--ink-soft)] mb-2">
            Syringe Size
          </p>
          <div className="flex flex-col gap-2.5">
            {SYRINGES.map((s) => (
              <label
                key={s.max}
                className={`flex items-center gap-2 text-[13px] cursor-pointer ${
                  syringeMax === s.max
                    ? "text-[color:var(--ink)] font-semibold"
                    : "text-[color:var(--ink-soft)]"
                }`}
              >
                <input
                  type="radio"
                  name="syringe-size"
                  checked={syringeMax === s.max}
                  onChange={() => setSyringeMax(s.max)}
                  className="accent-[color:var(--specimen)]"
                />
                {s.max} units · {s.ml} ml
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Result */}
      <div className="min-w-0 border-t border-[color:var(--line)] pt-10 md:border-t-0 md:border-l md:pl-12 md:pt-0">
        <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--specimen)] mb-5">Result</p>

        {result.valid ? (
          <>
            <p className="p-serif-italic text-[44px] leading-none text-[color:var(--ink)]">
              {result.injections > 1
                ? `${result.injections} × ${round1(result.unitsPerInjection)} units`
                : `${round1(result.totalUnits)} units`}
            </p>
            <p className="text-[11px] uppercase tracking-[0.1em] text-[color:var(--ink-soft)] mt-1.5">
              {result.injections > 1
                ? `as ${result.injections} separate injections on a ${syringeMax}-unit (${syringe.ml}ml) syringe`
                : `Draw to this mark on a ${syringeMax}-unit (${syringe.ml}ml) syringe`}
            </p>

            <div className="pt-3.5">
              <div className="relative h-2.5 border border-[color:var(--line)] bg-[color:var(--paper-deep)]">
                <div
                  className="absolute inset-y-0 left-0 bg-[color:var(--specimen)] opacity-45"
                  style={{ width: `${gaugePct}%` }}
                />
                <div
                  className="absolute top-1/2 w-3.5 h-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[color:var(--paper)] bg-[color:var(--specimen)] shadow-[0_0_0_1px_var(--specimen)]"
                  style={{ left: `${gaugePct}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-[9.5px] text-[color:var(--ink-soft)]">
                <span>0</span>
                <span>{syringeMax / 2}</span>
                <span>{syringeMax}</span>
              </div>
            </div>

            {result.injections > 1 && (
              <p className="mt-3 text-xs leading-relaxed text-[color:var(--specimen)]">
                Total dose is {round1(result.totalUnits)} units — more than a {syringeMax}-unit syringe holds in
                one draw. Split into {result.injections} injections of {round1(result.unitsPerInjection)} units
                each (drawn separately, same concentration).
              </p>
            )}

            <div className="mt-6 flex gap-10">
              <div>
                <p className="text-[10.5px] uppercase tracking-[0.1em] text-[color:var(--ink-soft)]">
                  Concentration
                </p>
                <p className="mt-0.5 text-[17px] text-[color:var(--ink)]">
                  {result.concentration.toFixed(2)} mg/ml
                </p>
              </div>
              <div>
                <p className="text-[10.5px] uppercase tracking-[0.1em] text-[color:var(--ink-soft)]">
                  Doses / Vial
                </p>
                <p className="mt-0.5 text-[17px] text-[color:var(--ink)]">{floor1(result.dosesPerVial)}</p>
              </div>
            </div>
          </>
        ) : (
          <>
            <p className="p-serif-italic text-[44px] leading-none text-[color:var(--ink)]">—</p>
            <p className="text-[11px] uppercase tracking-[0.1em] text-[color:var(--ink-soft)] mt-1.5">
              Fill in every field to calculate
            </p>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/shop/src/components/ReconstitutionCalculator.tsx apps/shop/src/app/globals.css
git commit -m "feat(shop): add the interactive reconstitution calculator component"
```

---

## Task 3: Calculator page shell

**Files:**
- Create: `apps/shop/src/app/calculator/page.tsx`

- [ ] **Step 1: Write the page**

Create `apps/shop/src/app/calculator/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import ReconstitutionCalculator from "@/components/ReconstitutionCalculator";

export const metadata: Metadata = {
  title: "Reconstitution Calculator — Aura Protocols",
  description:
    "Work out concentration and exact syringe units from a vial strength, bacteriostatic water volume, and target dose.",
  alternates: { canonical: "/calculator" },
};

const HOW_IT_WORKS = [
  {
    num: "I.",
    title: "Concentration",
    body: "5mg vial ÷ 2ml water = 2.5 mg/ml. Vial strength divided by the water you reconstitute with.",
  },
  {
    num: "II.",
    title: "Units to draw",
    body: "A 0.5mg dose ÷ 2.5 mg/ml = 0.2ml = 20 units, using the 100-units-per-ml scale every U-100 insulin syringe shares — 30-unit, 50-unit, and 100-unit barrels all read the same way, just with a shorter or longer barrel.",
  },
  {
    num: "III.",
    title: "When a dose is too big for one draw",
    body: "If a dose needs more units than your syringe holds, the calculator splits it into equal injections instead of overfilling — the same total dose, drawn in more than one shot.",
  },
];

const FAQ = [
  {
    q: "How do I convert a peptide dose into syringe units?",
    a: "First calculate concentration in mg per mL, then convert that concentration into mg per unit on a U-100 insulin syringe. This calculator performs those steps automatically from vial size, reconstitution volume, and target dose.",
  },
  {
    q: "Does syringe size change the mg-per-unit math?",
    a: "No. U-100 insulin syringes use the same 100-units-per-mL standard across 30-unit, 50-unit, and 100-unit syringe bodies. Syringe size changes visual range and handling comfort, not the underlying per-unit volume.",
  },
  {
    q: "What if my target dose is less than 2 units?",
    a: "Very small doses are harder to measure accurately. The usual fix is to lower concentration by adding more diluent or switch to a syringe that gives better practical readability for the same U-100 standard.",
  },
  {
    q: "Why does concentration matter more than vial size alone?",
    a: "Vial size does not determine dose by itself. The practical dose per unit depends on how much peptide is in the vial and how much liquid was added during reconstitution.",
  },
  {
    q: "Can I use this calculator for tirzepatide, semaglutide, and BPC-157?",
    a: "Yes. The calculator handles the concentration math for any peptide where you know the total vial amount, the reconstitution volume, and the target dose.",
  },
  {
    q: "Is bacteriostatic water different from saline or sterile water?",
    a: "Yes. BAC water includes 0.9% benzyl alcohol as a bacteriostatic preservative, while sterile water has no preservative and saline has sodium chloride instead. Solvent choice changes handling workflow and may change practical stability expectations.",
  },
  {
    q: "Can I rely on the example rows as dosing instructions?",
    a: "No. The example rows are calculation examples only. They show how concentration and syringe math work; they are not medical, prescribing, or protocol instructions.",
  },
  {
    q: "Why does the page emphasize U-100 insulin syringes?",
    a: "Because they are the most common syringe format used for this style of calculation. Their fixed 0.01 mL per unit standard makes conversion logic consistent and easier to explain.",
  },
];

const SOURCES = [
  {
    text: "1. FDA Recognized Consensus Standards — ISO 8537:2016, Sterile single-use syringes for insulin.",
    href: "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfStandards/detail.cfm?standard__identification_no=33873",
    label: "FDA",
  },
  {
    text: "2. DailyMed: Bacteriostatic Water for Injection.",
    href: "https://dailymed.nlm.nih.gov/dailymed/fda/fdaDrugXsl.cfm?setid=87d6e9dc-fe3b-4593-ac9a-d7493d1959c7&type=display",
    label: "DailyMed",
  },
  {
    text: "3. DailyMed: Sterile Water for Injection.",
    href: "https://dailymed.nlm.nih.gov/dailymed/fda/fdaDrugXsl.cfm?setid=88403fcf-a276-42c0-88b6-bd84a720b564&type=display",
    label: "DailyMed",
  },
  {
    text: "4. CDC Injection Safety — Clinical Guidance.",
    href: "https://www.cdc.gov/injection-safety/hcp/clinical-guidance/index.html",
    label: "CDC",
  },
];

export default function CalculatorPage() {
  return (
    <div className="pharmacopoeia">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <p className="text-xs uppercase tracking-widest text-[color:var(--specimen)] font-semibold mb-2">Tools</p>
        <h1 className="p-serif text-4xl mb-4 text-[color:var(--ink)]">Reconstitution Calculator</h1>
        <p className="text-[color:var(--ink-soft)] max-w-xl leading-relaxed mb-12">
          Work out concentration and exact syringe units from a vial strength, bacteriostatic water volume, and
          target dose — the same math researchers use to prepare a working solution.
        </p>

        <ReconstitutionCalculator />

        <h2 className="p-serif text-2xl mt-16 mb-5 text-[color:var(--ink)]">How This Is Calculated</h2>
        <div className="space-y-[30px]">
          {HOW_IT_WORKS.map((step) => (
            <div key={step.num} className="p-roman flex gap-[18px] pl-[18px]">
              <span className="p-serif-italic text-xl text-[color:var(--specimen)] w-8 flex-shrink-0">
                {step.num}
              </span>
              <div>
                <h3 className="text-[15.5px] mb-1 text-[color:var(--ink)]">{step.title}</h3>
                <p className="text-[13.5px] text-[color:var(--ink-soft)] m-0">{step.body}</p>
              </div>
            </div>
          ))}
        </div>

        <h2 className="p-serif text-2xl mt-16 mb-4 text-[color:var(--ink)]">Sources</h2>
        {SOURCES.map((s) => (
          <p key={s.href} className="text-[color:var(--ink-soft)] leading-relaxed my-4">
            {s.text}{" "}
            <a href={s.href} target="_blank" rel="noopener noreferrer" className="p-link">
              {s.label}
            </a>
          </p>
        ))}

        <section className="mt-16">
          <h2 className="p-serif text-2xl mb-5 text-[color:var(--ink)]">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {FAQ.map((item) => (
              <div key={item.q} className="p-card p-5">
                <p className="font-semibold text-[color:var(--ink)] mb-2">{item.q}</p>
                <p className="text-sm text-[color:var(--ink-soft)] leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="p-callout p-5 space-y-3 mt-12">
          <div>
            <p className="text-xs font-semibold text-[color:var(--specimen)] uppercase tracking-widest mb-1">
              Research Use Only
            </p>
            <p className="text-sm text-[color:var(--ink-soft)] leading-relaxed">
              This compound is intended for laboratory and research purposes only. It is not approved for human
              consumption and is not intended to diagnose, treat, cure, or prevent any disease. Always consult a
              qualified healthcare professional.
            </p>
          </div>
          <p className="text-sm text-[color:var(--ink-soft)] leading-relaxed">
            This tool performs concentration math only — it is not medical advice and does not verify safe or
            effective dosing. Always verify calculations independently and consult a qualified professional.
          </p>
        </div>

        <aside className="mt-10 border border-[color:var(--specimen)]/30 bg-[color:var(--specimen)]/5 p-6">
          <h3 className="p-serif text-xl text-[color:var(--ink)]">Looking for COA-verified sources?</h3>
          <p className="mt-2 text-[color:var(--ink-soft)]">
            Every compound in our catalog links to a vetted vendor with batch-specific third-party testing.
          </p>
          <Link
            href="/products"
            className="p-btn-primary mt-4 inline-flex px-6 py-3 text-sm uppercase tracking-[0.06em]"
          >
            Browse research compounds →
          </Link>
        </aside>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/shop/src/app/calculator/page.tsx
git commit -m "feat(shop): add the /calculator page shell"
```

---

## Task 4: Navbar link

**Files:**
- Modify: `apps/shop/src/components/Navbar.tsx:7-11`

- [ ] **Step 1: Add the Calculator link between Blog and About**

In `apps/shop/src/components/Navbar.tsx`, the `links` array currently reads:

```ts
const links = [
  { label: "Products", href: "/products" },
  { label: "Blog", href: "/blog" },
  { label: "About", href: "/about" },
];
```

Change it to:

```ts
const links = [
  { label: "Products", href: "/products" },
  { label: "Blog", href: "/blog" },
  { label: "Calculator", href: "/calculator" },
  { label: "About", href: "/about" },
];
```

This single array drives both the desktop nav and the mobile menu (both map over `links`), so no other change is needed in this file.

- [ ] **Step 2: Commit**

```bash
git add apps/shop/src/components/Navbar.tsx
git commit -m "feat(shop): add Calculator to the main nav"
```

---

## Task 5: Sitemap entry

**Files:**
- Modify: `apps/shop/src/app/sitemap.ts:8-16`
- Modify: `apps/shop/tests/app/sitemap.test.ts`

- [ ] **Step 1: Write the failing test**

In `apps/shop/tests/app/sitemap.test.ts`, add a new `it` block (the file currently has two):

```ts
  it("includes /calculator", () => {
    const urls = sitemap().map((e) => new URL(e.url).pathname);
    expect(urls).toContain("/calculator");
  });
```

Add it inside the existing `describe("sitemap", ...)` block, alongside the `/playbook` test.

- [ ] **Step 2: Run the test to verify it fails**

Run (from `apps/shop`): `npx vitest run tests/app/sitemap.test.ts`
Expected: FAIL — the `/calculator` assertion fails because the route isn't in `staticPages` yet.

- [ ] **Step 3: Add the route to the sitemap**

In `apps/shop/src/app/sitemap.ts`, the `staticPages` array currently reads:

```ts
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE_URL}/products`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE_URL}/blog`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/about`,   lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/playbook`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/privacy`, lastModified: new Date(), changeFrequency: "yearly",  priority: 0.3 },
    { url: `${BASE_URL}/terms`,   lastModified: new Date(), changeFrequency: "yearly",  priority: 0.3 },
  ];
```

Add the calculator entry right after `/blog` (matching the spec's "between `/blog` and `/about` in the existing priority ordering"):

```ts
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE_URL}/products`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE_URL}/blog`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/calculator`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/about`,   lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/playbook`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/privacy`, lastModified: new Date(), changeFrequency: "yearly",  priority: 0.3 },
    { url: `${BASE_URL}/terms`,   lastModified: new Date(), changeFrequency: "yearly",  priority: 0.3 },
  ];
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/app/sitemap.test.ts`
Expected: PASS — 3 tests passed.

- [ ] **Step 5: Commit**

```bash
git add apps/shop/src/app/sitemap.ts apps/shop/tests/app/sitemap.test.ts
git commit -m "feat(shop): add /calculator to the sitemap"
```

---

## Task 6: Full test suite + manual verification in the dev server

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run (from `apps/shop`): `npx vitest run`
Expected: All test files pass, including the two new/modified ones from Tasks 1 and 5.

- [ ] **Step 2: Type-check**

Run (from `apps/shop`): `npx tsc --noEmit -p tsconfig.json`
Expected: No output (clean).

- [ ] **Step 3: Start the dev server**

Run (from `apps/shop`): `npm run dev`
Expected: `Ready in <time>` on `http://localhost:3000`.

- [ ] **Step 4: Manually verify in the browser**

Visit `http://localhost:3000/calculator` and check, per the spec's Testing section:

- Default state (5mg / 2ml / 0.5mg / 50u) shows **20 units**, **2.50 mg/ml**, **10** doses/vial.
- Switching Target Dose to **12mg** (vial/water/syringe left at default 5mg/2ml/50u) shows a split result of **10 × 48 units** — concentration 2.5mg/ml, 12mg dose = 4.8ml = 480 total units, ceil(480/50) = 10 injections, 480/10 = 48 units each — plus the explanatory red text below the gauge stating the 480-unit total and the 10-way split.
- **Custom…** on all three dropdowns reveals a number field and recalculates live.
- All three syringe sizes update the gauge ticks (0/15/30, 0/25/50, 0/50/100) and recompute the split.
- Emptying a custom field shows `—` and "Fill in every field to calculate", not `NaN`/`Infinity`.
- No visual clipping in the two-column card at both desktop and a narrow (mobile) viewport width — this is the grid-blowout class of bug hit during the mockup review, confirm `min-w-0` actually prevented it in the real build.
- Navbar shows **Calculator** between Blog and About, and the link navigates correctly.
- Scroll down and confirm section order: calculator card → How This Is Calculated → Sources (4 working external links) → FAQ (8 items) → disclaimers → "Browse research compounds" CTA linking to `/products`.

- [ ] **Step 5: Fix anything Step 4 surfaces, then re-run Steps 1–2**

If any check fails, fix it in the relevant file from Tasks 1–5, then re-run the full test suite and type-check before continuing.

- [ ] **Step 6: Final commit (only if Step 5 required changes)**

```bash
git add -A
git commit -m "fix(shop): address issues found in calculator manual verification"
```

If Step 4 found no issues, skip this commit — Tasks 1–5 already captured everything.
