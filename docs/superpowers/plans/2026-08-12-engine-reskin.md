# Engine Reskin (Pharmacopoeia) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin every `apps/engine` surface into the shop's live "Pharmacopoeia" design system (paper/ink/specimen-red), unify it under the Aura Protocols brand chrome, and rewire the shelved *Aura Clinical* handoff to Modality via a single isolated constant.

**Architecture:** Port the shop's proven `.pharmacopoeia` CSS tokens + primitives into the engine, scoped under a root class (opt-in, non-breaking). The dense "protocol terminal" keeps its 5-way semantic differentiation through a new **muted instrument palette** isolated in one TS module (because that component uses inline `style={{}}`, not CSS classes). The prescribe destination lives in one constants pair so the Aura↔Modality boundary is a single edit. Everything else is a mechanical recolor of an already-approved in-production system.

**Tech Stack:** Next.js 16 (App Router), Tailwind CSS v4, TypeScript, Vitest, `next/font/google` (Newsreader, Inter, JetBrains Mono).

**Spec:** `docs/superpowers/specs/2026-08-12-engine-reskin-design.md`

---

## Shared reference — color substitution dictionary

Several tasks recolor components that use hardcoded hex in inline `style={{}}`. Apply this dictionary consistently. **Structural** colors map to base tokens; **semantic** colors map to the instrument palette from Task 3 (import `SIG` / `SEVERITY_INK` from `@/lib/theme/instrument`; in CSS use the `--sig-*` vars).

Structural (dark → paper):
| Old literal | New |
|---|---|
| `#04060f`, `#06080f` | `var(--paper)` / `SIG.paper` |
| `#0d1117`, `#0a0f1a` | `var(--paper-deep)` / `SIG.paperDeep` |
| `rgba(255,255,255,.04–.10)` borders | `var(--line)` / `SIG.line` |
| `#fff`, `#e2e8f0` text | `--ink` / `SIG.ink` |
| `#cbd5e1`, `#94a3b8` | `--ink-soft` / `SIG.inkSoft` |
| `#64748b`, `#475569`, `#334155` | `--ink-faint` / `SIG.inkFaint` |
| dark text on neon buttons (`#04060f`/`#000`) | `SIG.paper` (paper text on ink/specimen) |

Semantic (neon → muted tint):
| Old neon | Meaning | New token |
|---|---|---|
| `#00d4ff` cyan | biometric / primary | `SIG.bio` `#2F6E6B` (tint `SIG.bioTint`) |
| `#8b5cf6` / `#c084fc` violet | LLM / adjunct / protein | `SIG.llm` `#6A4C74` (tint `SIG.llmTint`) |
| `#fb7185` / `#fda4af` rose | tension / contraindication | `SIG.alert` `#A32B1F` (tint `SIG.alertTint`) |
| `#34d399` / `#6ee7b7` emerald | live / OK | `SIG.ok` `#5B7A47` (tint `SIG.okTint`) |
| `#fbbf24` / `#fde68a` amber | warning / vitamins | `SIG.warn` `#9C6B24` (tint `SIG.warnTint`) |
| `#fb923c` orange | severity: elevated | `SEVERITY_INK.elevated` `#B4622E` |

Commands (run from `apps/engine/`):
- Typecheck: `npx tsc --noEmit`
- Unit tests: `npm test`
- Build: `npm run build`
- Visual: `npm run dev` then open the route noted in the task.

---

## Task 1: Foundation — port Pharmacopoeia CSS into engine globals

**Files:**
- Modify: `apps/engine/src/app/globals.css`
- Reference (source of truth, do not edit): `apps/shop/src/app/globals.css`

- [ ] **Step 1: Append the shop's brand-animation + Pharmacopoeia blocks**

Copy **verbatim** from `apps/shop/src/app/globals.css` into the end of `apps/engine/src/app/globals.css`:
- The `.aura-wordmark` + `@keyframes auraDraw/auraDrawOnce/auraRun/auraRunOnce/auraFlash` + `.aura-svg` / `.aura-loop` / `.aura-once` / reduced-motion block (shop lines ~239–294).
- The entire `/* THE PHARMACOPOEIA */` block (shop lines ~296–449): `.pharmacopoeia` tokens + all `.p-*` primitives, nav, section rhythm, load-in/reveal, biosig labels, calc select.

Do **not** remove the engine's existing `@theme`/`select` rules yet — Task 2 handles the body background.

- [ ] **Step 2: Add the instrument-palette CSS vars inside `.pharmacopoeia`**

Add to the `.pharmacopoeia { … }` token list (so instrument styles that use CSS vars resolve):

```css
  /* muted instrument palette — see src/lib/theme/instrument.ts (keep in sync) */
  --sig-bio: #2F6E6B;   --sig-bio-tint: rgba(47,110,107,.09);
  --sig-llm: #6A4C74;   --sig-llm-tint: rgba(106,76,116,.09);
  --sig-alert: #A32B1F; --sig-alert-tint: rgba(163,43,31,.08);
  --sig-ok: #5B7A47;    --sig-ok-tint: rgba(91,122,71,.10);
  --sig-warn: #9C6B24;  --sig-warn-tint: rgba(156,107,36,.10);
```

- [ ] **Step 3: Re-point the dark `select` fix to paper**

Replace the existing `select option { background-color: var(--color-surface); color: #e2e8f0; }` rule so open option lists read on bone:

```css
.pharmacopoeia select { color-scheme: light; }
.pharmacopoeia select option { background-color: var(--paper); color: var(--ink); }
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: PASS (CSS compiles; no pages consume `.pharmacopoeia` yet, so visuals unchanged).

- [ ] **Step 5: Commit**

```bash
git add apps/engine/src/app/globals.css
git commit -m "feat(engine): port Pharmacopoeia tokens + primitives (scoped, non-breaking)"
```

---

## Task 2: Fonts — Newsreader/Inter/JetBrains Mono in layout

**Files:**
- Modify: `apps/engine/src/app/layout.tsx`

- [ ] **Step 1: Swap the font imports**

Read the current `layout.tsx`. Replace the Syne/JetBrains/Inter font setup with:

```tsx
import { Newsreader, Inter, JetBrains_Mono } from "next/font/google";

const serif = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600"],
  variable: "--font-newsreader",
  display: "swap",
});
const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });
```

Update the `<html>` className to `` `${serif.variable} ${inter.variable} ${mono.variable}` `` and keep `--font-newsreader` available for `.p-serif`. Remove the `--font-syne`/`--font-display` wiring and any Syne import.

- [ ] **Step 2: Ensure body is not forced dark**

The `.pharmacopoeia` root supplies bg/color per page. Confirm `<body>` has no hardcoded dark background class that would fight the paper pages (leave `min-h-screen`/flex utilities if present; drop any `bg-[#04060f]`).

- [ ] **Step 3: Verify typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/engine/src/app/layout.tsx
git commit -m "feat(engine): switch display font to Newsreader; keep Inter + JetBrains Mono"
```

---

## Task 3: Instrument palette module (isolated tokens + test)

**Files:**
- Create: `apps/engine/src/lib/theme/instrument.ts`
- Test: `apps/engine/tests/lib/theme/instrument.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/engine/tests/lib/theme/instrument.test.ts
import { describe, it, expect } from "vitest";
import { SIG, SEVERITY_INK } from "@/lib/theme/instrument";

describe("instrument palette", () => {
  it("maps the five semantic meanings to muted paper-readable hex", () => {
    expect(SIG.bio).toBe("#2F6E6B");
    expect(SIG.llm).toBe("#6A4C74");
    expect(SIG.alert).toBe("#A32B1F");
    expect(SIG.ok).toBe("#5B7A47");
    expect(SIG.warn).toBe("#9C6B24");
  });
  it("exposes paper base + line tokens", () => {
    expect(SIG.paper).toBe("#EDE9E0");
    expect(SIG.paperDeep).toBe("#E2DCCC");
    expect(SIG.ink).toBe("#1C1A15");
    expect(SIG.line).toBe("#C9C2AE");
  });
  it("has no neon literals left in the palette values", () => {
    const banned = ["#00d4ff", "#8b5cf6", "#fb7185", "#34d399", "#fbbf24", "#04060f"];
    const all = JSON.stringify({ SIG, SEVERITY_INK }).toLowerCase();
    for (const b of banned) expect(all).not.toContain(b);
  });
  it("maps tension severity to ochre/terracotta/specimen", () => {
    expect(SEVERITY_INK.watch).toBe("#9C6B24");
    expect(SEVERITY_INK.elevated).toBe("#B4622E");
    expect(SEVERITY_INK.high).toBe("#A32B1F");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- instrument`
Expected: FAIL ("Cannot find module '@/lib/theme/instrument'").

- [ ] **Step 3: Write the module**

```ts
// apps/engine/src/lib/theme/instrument.ts
// Muted instrument palette — the 5 semantic meanings the protocol terminal
// encodes in color, remapped to paper-readable tints for the Pharmacopoeia.
// Mirrored as CSS vars in globals.css (.pharmacopoeia --sig-*). Keep in sync.
// The terminal uses inline style={{}}, so it consumes these TS constants.
export const SIG = {
  // base (from Pharmacopoeia tokens)
  paper: "#EDE9E0",
  paperDeep: "#E2DCCC",
  ink: "#1C1A15",
  inkSoft: "#4A4438",
  inkFaint: "#8E877D",
  line: "#C9C2AE",
  // semantic
  bio: "#2F6E6B", bioTint: "rgba(47,110,107,.09)",
  llm: "#6A4C74", llmTint: "rgba(106,76,116,.09)",
  alert: "#A32B1F", alertTint: "rgba(163,43,31,.08)",
  ok: "#5B7A47", okTint: "rgba(91,122,71,.10)",
  warn: "#9C6B24", warnTint: "rgba(156,107,36,.10)",
} as const;

export const SEVERITY_INK = {
  watch: "#9C6B24",
  elevated: "#B4622E",
  high: "#A32B1F",
} as const;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- instrument`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/engine/src/lib/theme/instrument.ts apps/engine/tests/lib/theme/instrument.test.ts
git commit -m "feat(engine): add muted instrument palette module + tests"
```

---

## Task 4: Prescribe constants — Modality via isolated pair (+ test)

**Files:**
- Modify: `apps/engine/src/lib/constants.ts`
- Test: `apps/engine/tests/lib/constants.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/engine/tests/lib/constants.test.ts
import { describe, it, expect } from "vitest";
import { PRESCRIBE_URL, PRESCRIBE_LABEL, SHOP_URL } from "@/lib/constants";

describe("prescribe routing constants", () => {
  it("routes prescribe-grade demand to Modality", () => {
    expect(PRESCRIBE_URL).toBe("https://modalitybio.com");
    expect(PRESCRIBE_LABEL).toMatch(/Modality/);
  });
  it("keeps the shop as the research/affiliate lane", () => {
    expect(SHOP_URL).toBe("https://shop.auraprotocols.com");
  });
  it("no longer exports the shelved Aura Clinical url", async () => {
    const mod = await import("@/lib/constants");
    expect("CLINICAL_URL" in mod).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- constants`
Expected: FAIL (`PRESCRIBE_URL` undefined; `CLINICAL_URL` still present).

- [ ] **Step 3: Edit constants**

In `apps/engine/src/lib/constants.ts`:
- Remove `export const CLINICAL_URL = "https://auraclinical.com";`
- Replace `export const PRESCRIBE_CTA_COPY = "Get this prescribed at Aura Clinical →";` with:

```ts
// Prescribe-grade + contraindicated demand routes to Modality (the clinical lane).
// Aura (shop + engine) is research + biometrics only — no clinician, no Rx.
// Isolated here: flip destination/label/path in one place.
export const PRESCRIBE_URL = "https://modalitybio.com";
export const PRESCRIBE_LABEL = "Get this prescribed at Modality →";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- constants`
Expected: PASS. (Consumers still referencing `CLINICAL_URL`/`PRESCRIBE_CTA_COPY` now fail typecheck — fixed in Tasks 5 & 12. That's expected mid-migration; do not `tsc` the whole app until those land.)

- [ ] **Step 5: Commit**

```bash
git add apps/engine/src/lib/constants.ts apps/engine/tests/lib/constants.test.ts
git commit -m "feat(engine): route prescribe handoff to Modality via isolated constant"
```

---

## Task 5: PrescribeCTA + ClinicalRouter → Modality + Pharmacopoeia

**Files:**
- Modify: `apps/engine/src/components/PrescribeCTA.tsx`
- Modify: `apps/engine/src/components/ClinicalRouter.tsx`

- [ ] **Step 1: Rewrite PrescribeCTA**

Replace the whole file with:

```tsx
import { PRESCRIBE_URL, PRESCRIBE_LABEL, EXTERNAL_REL } from "@/lib/constants";
import type { ProtocolTemplateId } from "@/lib/constants";

export default function PrescribeCTA({ template }: { template: ProtocolTemplateId }) {
  const href = `${PRESCRIBE_URL}/?source=engine&template=${encodeURIComponent(template)}`;
  return (
    <a href={href} target="_blank" rel={EXTERNAL_REL} className="p-btn-primary inline-flex items-center justify-center px-5 py-3 text-sm font-semibold">
      {PRESCRIBE_LABEL}
    </a>
  );
}
```

- [ ] **Step 2: Update ClinicalRouter**

Open `apps/engine/src/components/ClinicalRouter.tsx`. Replace any `CLINICAL_URL` import/usage with `PRESCRIBE_URL`, any hardcoded "Aura Clinical" / prescribe copy with `PRESCRIBE_LABEL`, and recolor per the substitution dictionary (neon/dark utilities → Pharmacopoeia primitives / `--sig-*`). Preserve the `RoutingDecision` type export and all routing logic.

- [ ] **Step 3: Verify typecheck (these two files) + build**

Run: `npx tsc --noEmit`
Expected: remaining errors only in `RecommendationCard.tsx` / demo (Task 12/14). PrescribeCTA + ClinicalRouter clean.

- [ ] **Step 4: Commit**

```bash
git add apps/engine/src/components/PrescribeCTA.tsx apps/engine/src/components/ClinicalRouter.tsx
git commit -m "feat(engine): PrescribeCTA + ClinicalRouter → Modality, Pharmacopoeia styling"
```

---

## Task 6: Brand chrome — AuraMark + Navbar + Footer, mounted in layout

**Files:**
- Create: `apps/engine/src/components/AuraMark.tsx`
- Create: `apps/engine/src/components/Navbar.tsx`
- Create: `apps/engine/src/components/Footer.tsx`
- Modify: `apps/engine/src/app/layout.tsx`

- [ ] **Step 1: Port AuraMark verbatim**

Copy `apps/shop/src/components/AuraMark.tsx` into `apps/engine/src/components/AuraMark.tsx` unchanged (its colors are already Pharmacopoeia; the `.aura-*` CSS arrived in Task 1).

- [ ] **Step 2: Create the engine Navbar**

```tsx
// apps/engine/src/components/Navbar.tsx
"use client";
import Link from "next/link";
import { useState } from "react";
import AuraMark from "@/components/AuraMark";
import { SHOP_URL } from "@/lib/constants";

const links = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Connect", href: "/connect" },
  { label: "Demo", href: "/demo" },
  { label: "Shop", href: SHOP_URL },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="pharmacopoeia sticky top-0 z-50">
      <nav className="p-top">
        <div className="p-container flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Aura Protocols home">
            <AuraMark size={36} mode="once" />
            <span className="p-serif-italic text-[21px] tracking-tight">Aura Protocols</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <div className="p-navlinks flex gap-[30px] text-[12.5px] tracking-[0.08em] uppercase text-[color:var(--ink-soft)]">
              {links.map((l) => (
                <Link key={l.href} href={l.href}>{l.label}</Link>
              ))}
            </div>
            <Link href="/connect" className="p-nav-cta text-xs tracking-[0.06em] uppercase bg-[color:var(--ink)] text-[color:var(--paper)] px-4 py-2.5">
              Connect
            </Link>
          </div>
          <button className="md:hidden text-[color:var(--ink-soft)] hover:text-[color:var(--ink)]" onClick={() => setOpen(!open)} aria-label="Toggle menu">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {open
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
      </nav>
      {open && (
        <div className="md:hidden border-t border-[color:var(--line)] bg-[color:var(--paper)] px-[28px] py-4 flex flex-col gap-4">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm font-medium text-[color:var(--ink-soft)] hover:text-[color:var(--ink)]" onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
```

- [ ] **Step 3: Create the engine Footer**

```tsx
// apps/engine/src/components/Footer.tsx
import Link from "next/link";
import { SHOP_URL } from "@/lib/constants";

export default function Footer() {
  return (
    <footer className="pharmacopoeia p-foot border-t border-[color:var(--line)] pt-16">
      <div className="p-container py-12">
        <div className="grid gap-[30px] mb-10 md:grid-cols-[1.6fr_1fr_1fr]">
          <div>
            <p className="p-serif-italic text-lg mb-3">Aura Protocols</p>
            <p className="text-[13px] text-[color:var(--ink-soft)] max-w-[36ch] mb-5">
              A wearable-personalized protocol engine — biometric readings in, research-grade protocol out. Educational only; not medical advice.
            </p>
          </div>
          <div>
            <h6 className="text-[11px] tracking-[0.1em] uppercase text-[color:var(--ink-soft)] mb-3.5">Engine</h6>
            <ul className="text-[13.5px] space-y-2.5 text-[color:var(--ink-soft)]">
              <li><Link href="/connect" className="hover:text-[color:var(--ink)]">Connect a wearable</Link></li>
              <li><Link href="/dashboard" className="hover:text-[color:var(--ink)]">Dashboard</Link></li>
              <li><Link href="/demo" className="hover:text-[color:var(--ink)]">Demo</Link></li>
              <li><a href={SHOP_URL} className="hover:text-[color:var(--ink)]">Shop</a></li>
            </ul>
          </div>
          <div>
            <h6 className="text-[11px] tracking-[0.1em] uppercase text-[color:var(--ink-soft)] mb-3.5">Company</h6>
            <ul className="text-[13.5px] space-y-2.5 text-[color:var(--ink-soft)]">
              <li><a href="mailto:support@auraprotocols.com" className="hover:text-[color:var(--ink)]">Contact</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-[color:var(--line)] pt-5 text-[11.5px] leading-relaxed text-[color:var(--ink-soft)]">
          The Engine produces educational protocol suggestions from biometric fitness data — never PHI. Not medical advice; medical judgment requires a licensed clinician. &copy; {new Date().getFullYear()} Aura Protocols.
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 4: Mount chrome in layout**

In `apps/engine/src/app/layout.tsx`, import `Navbar` + `Footer` and wrap children (shop pattern):

```tsx
<body className={/* keep existing */}>
  <Navbar />
  <main className="pharmacopoeia">{children}</main>
  <Footer />
</body>
```

Note: wrapping `<main>` in `.pharmacopoeia` gives every page the paper base; individual pages may still add their own `.pharmacopoeia` root without harm.

- [ ] **Step 5: Verify build + visual**

Run: `npm run build`, then `npm run dev` and open `/` — nav + footer render on bone with the AuraMark; wordmark animates once.
Expected: PASS; chrome visible.

- [ ] **Step 6: Commit**

```bash
git add apps/engine/src/components/AuraMark.tsx apps/engine/src/components/Navbar.tsx apps/engine/src/components/Footer.tsx apps/engine/src/app/layout.tsx
git commit -m "feat(engine): Aura Protocols brand chrome (AuraMark + Navbar + Footer)"
```

---

## Task 7: Home page reskin

**Files:**
- Modify: `apps/engine/src/app/page.tsx`

- [ ] **Step 1: Rewrite the homepage on Pharmacopoeia primitives**

```tsx
import BiosignatureSphere from "@/components/BiosignatureSphere";

export default function HomePage() {
  return (
    <main className="pharmacopoeia">
      <div className="p-container py-16 md:py-24 max-w-3xl">
        <p className="p-cat-label mb-3">Free Peptide Protocol Engine</p>
        <h1 className="p-serif text-4xl md:text-5xl leading-[1.1] mb-6">
          Connect your wearable. Get a peptide protocol tuned to <em className="p-serif-italic text-[color:var(--specimen)]">your data.</em>
        </h1>
        <div className="p-callout rounded-none border border-[color:var(--line)] px-6 py-10 text-center">
          <BiosignatureSphere />
          <p className="p-serif text-lg mt-3">Under Construction</p>
          <p className="text-sm text-[color:var(--ink-soft)] mt-2">The Engine is being rebuilt. Check back soon.</p>
        </div>
        <p className="mt-8 text-xs text-[color:var(--ink-faint)] leading-relaxed">
          Aura Protocols produces educational protocol suggestions, not medical advice. The Engine handles biometric fitness data — never PHI. For prescribed peptides, see Modality.
        </p>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verify build + visual**

Run: `npm run build`, then open `/`.
Expected: paper hero, Newsreader h1 with specimen italic, sphere renders (recolored in Task 13).

- [ ] **Step 3: Commit**

```bash
git add apps/engine/src/app/page.tsx
git commit -m "feat(engine): reskin homepage to Pharmacopoeia"
```

---

## Task 8: Connect page + SignInForm reskin

**Files:**
- Modify: `apps/engine/src/app/connect/page.tsx`
- Modify: `apps/engine/src/app/connect/SignInForm.tsx`

- [ ] **Step 1: Reskin connect/page.tsx**

Wrap the root in `.pharmacopoeia` + `.p-container`. Replace: eyebrow → `p-cat-label`; `font-bold text-white` h1 → `p-serif`; the violet "Coming Soon" panel (`rounded-2xl border border-violet-500/30 bg-violet-500/10`) → `.p-callout` with `.p-serif` heading + `--ink-soft` body. Keep the existing server logic (`getSupabaseServerClient`, redirects) untouched.

- [ ] **Step 2: Reskin SignInForm.tsx**

Recolor per the dictionary: inputs → `bg-[color:var(--paper)] border border-[color:var(--line)] text-[color:var(--ink)]`; submit → `p-btn-primary`; links → `p-link`; error text → `text-[color:var(--specimen)]`. No logic changes.

- [ ] **Step 3: Verify build + visual**

Run: `npm run build`, open `/connect`.
Expected: paper page; form legible on bone.

- [ ] **Step 4: Commit**

```bash
git add apps/engine/src/app/connect/
git commit -m "feat(engine): reskin /connect + SignInForm"
```

---

## Task 9: Onboarding + IntakeForm reskin

**Files:**
- Modify: `apps/engine/src/app/onboarding/page.tsx`
- Modify: `apps/engine/src/app/onboarding/IntakeForm.tsx`

**Note:** These files carry uncommitted wearable-first functional changes. **Preserve all logic/state** — recolor only.

- [ ] **Step 1: Reskin onboarding/page.tsx**

Wrap root `.pharmacopoeia` + `.p-container max-w-lg`. Eyebrow (`text-cyan-400`) → `p-cat-label`; `font-display ... text-white` h1 → `p-serif`. Keep the `<IntakeForm .../>` mount and all server data-loading.

- [ ] **Step 2: Reskin IntakeForm.tsx**

Recolor per dictionary across every field/step: labels → `--ink-soft` uppercase; inputs/selects/textarea → paper/ink/line with `focus:border-[color:var(--specimen)]`; primary buttons → `p-btn-primary`; back buttons → `p-btn-outline`; progress bar fill → `bg-[color:var(--specimen)]`, track → `bg-[color:var(--line)]`; checkbox `accent-cyan-500` → `accent-[color:var(--specimen)]`; any goal/selection active state → specimen border + `--sig-alert-tint`. Preserve all `useState`, validation, and submit logic.

- [ ] **Step 3: Verify build + visual**

Run: `npm run build`, open `/onboarding` (may require auth; use `/demo` onboarding wizard as visual proxy if unauthenticated).
Expected: paper form, specimen accents, all steps functional.

- [ ] **Step 4: Commit**

```bash
git add apps/engine/src/app/onboarding/
git commit -m "feat(engine): reskin /onboarding + IntakeForm (logic preserved)"
```

---

## Task 10: Upload + UploadClient + ManualUploadForm reskin

**Files:**
- Modify: `apps/engine/src/app/upload/page.tsx`
- Modify: `apps/engine/src/app/upload/UploadClient.tsx`
- Modify: `apps/engine/src/components/ManualUploadForm.tsx`

- [ ] **Step 1: Reskin the three files**

Root `.pharmacopoeia` + `.p-container`. `text-white` heading → `p-serif`; dropzone/dashed borders → `border border-dashed border-[color:var(--line)]` on `--paper`; buttons → `p-btn-primary` / `p-btn-outline`; helper text → `--ink-soft`; success/error → `--sig-ok` / `--specimen`. Preserve upload logic and Supabase calls.

- [ ] **Step 2: Verify build**

Run: `npm run build`, open `/upload`.
Expected: paper page; dropzone legible.

- [ ] **Step 3: Commit**

```bash
git add apps/engine/src/app/upload/ apps/engine/src/components/ManualUploadForm.tsx
git commit -m "feat(engine): reskin /upload + UploadClient + ManualUploadForm"
```

---

## Task 11: Dashboard + cards reskin

**Files:**
- Modify: `apps/engine/src/app/dashboard/page.tsx`
- Modify: `apps/engine/src/components/dashboard/ConnectionsCard.tsx`
- Modify: `apps/engine/src/components/dashboard/GoalProfileCard.tsx`
- Modify: `apps/engine/src/components/dashboard/ProtocolSummaryCard.tsx`

- [ ] **Step 1: Reskin the dashboard hub + 3 cards**

Root `.pharmacopoeia` + `.p-container`. `.glass`/dark cards → `.p-card border border-[color:var(--line)] p-6`; card titles → `p-serif`; labels → `--ink-soft`; status/connected accents → `--sig-ok`; CTAs → `p-btn-primary`; section eyebrows → `p-cat-label`. Preserve all data props/logic.

- [ ] **Step 2: Verify build**

Run: `npm run build`, open `/dashboard`.
Expected: paper hub; three cards on bone.

- [ ] **Step 3: Commit**

```bash
git add apps/engine/src/app/dashboard/page.tsx apps/engine/src/components/dashboard/
git commit -m "feat(engine): reskin /dashboard + hub cards"
```

---

## Task 12: RecommendationCard — the protocol terminal (heavy)

**Files:**
- Modify: `apps/engine/src/components/RecommendationCard.tsx`

Apply the substitution dictionary across all inline `style={{}}` literals. Import the palette at top: `import { SIG, SEVERITY_INK } from "@/lib/theme/instrument";`. Below are the exact remaps for the non-obvious sub-parts; everything else follows the dictionary.

- [ ] **Step 1: SEVERITY + trend + tag maps**

```ts
const SEVERITY: Record<TensionSeverity, string> = {
  watch: SEVERITY_INK.watch, elevated: SEVERITY_INK.elevated, high: SEVERITY_INK.high,
};
// trendColor: up → SIG.ok, down → SIG.alert, neutral → SIG.ink
// StatRow dim → SIG.inkFaint, neutral → SIG.ink
// Sparkline HRV → SIG.alert, Recovery → SIG.bio
// TAG_STYLES: rule → SIG.ok(+okTint bg), llm → SIG.llm(+llmTint), nut → SIG.warn(+warnTint), out → SIG.bio(+bioTint)
// RightPanel tab colors: peptides → SIG.ok, protein → SIG.llm, vitamins → SIG.warn, foods → SIG.bio
// OutCard variants: peptide-primary → SIG.bio, peptide-adj/protein → SIG.llm, vitamin → SIG.warn, food → SIG.bio
```

- [ ] **Step 2: Container + chrome bar**

Card wrapper: `background: SIG.paper`, `border: 1px solid ${SIG.line}`, `color: SIG.ink`, keep `fontFamily: "'JetBrains Mono',ui-monospace,monospace"`. Chrome bar: `background` dark gradient → `SIG.paperDeep`; `border-bottom` → `SIG.line`; live dot → `SIG.ok` (drop neon `boxShadow` glow, use solid); `AURA.engine` text → `SIG.ink`; session id `#00d4ff` → `SIG.bio`; STALE `#fbbf24` → `SIG.warn`; SOURCE/TEMPLATE labels → `SIG.inkFaint`, values → `SIG.ink`.

- [ ] **Step 3: BiosignaturePanel (radar)**

- Outer wrapper radial `rgba(0,212,255,..)/rgba(139,92,246,..)` → soft `${SIG.alertTint}`→transparent on `SIG.paperDeep`.
- `rc-bg` radialGradient stops → specimen-low-alpha to transparent; `rc-ln` linearGradient → `SIG.alert`→`SIG.ink`.
- Grid rings `rgba(255,255,255,..)` → `SIG.line`; rotating ring → faint `SIG.bio`.
- Axis label text `#475569` → `SIG.inkFaint`.
- Axis spokes `rgba(0,212,255,.3)` → `rgba(47,110,107,.28)` (bio).
- **Data polygon** fill `rgba(0,212,255,.07)` → `SIG.alertTint`, stroke `url(#rc-ln)` (now specimen→ink).
- Outer axis dots `colors` array → `[SIG.bio, SIG.llm, SIG.warn, SIG.llm, SIG.ok, SIG.llm, SIG.bio, SIG.llm]`.
- T1/T2 markers `#fb7185`/`#fda4af` → `SIG.alert`; N1 `#fbbf24` → `SIG.warn`; N2 `#34d399` → `SIG.ok`.
- Center glow `#fff`/`rgba(255,255,255,.2)` → `SIG.ink`/`rgba(28,26,21,.18)`.
- `ResPill` map: cyan→bio, violet→llm, amber→warn, emerald→ok (use `SIG.*` + `*Tint`, drop `boxShadow` glow → solid dot).

- [ ] **Step 4: HandoffSection → Modality**

Import `PRESCRIBE_URL, PRESCRIBE_LABEL` from `@/lib/constants` (remove `CLINICAL_URL`, `DISCLAIMER` stays). In all three routing branches:
- `href={CLINICAL_URL}` → `href={PRESCRIBE_URL}`; button text "Get this prescribed at Aura Clinical →" → `{PRESCRIBE_LABEL}`.
- In `affiliate_primary`, the "Aura Clinical · get it prescribed / launching soon" primary slot → "Modality · get it prescribed / clinical lane" using `SIG.llm` tint; keep "Shop COA-verified vendors →" pointing to shop.
- Recolor branch borders/bg: clinical_only → `SIG.alert`/`alertTint`; clinical_primary → `SIG.llm`/`llmTint`; affiliate_primary → `SIG.bio`/`bioTint`. Button backgrounds: solid `SIG.alert` / `SIG.llm` / `SIG.bio` with `color: SIG.paper`. Disclaimer text → `SIG.inkFaint`.

- [ ] **Step 5: TensionsBand + BottomSection + Feedback wrapper**

- TensionsBand header `#fb7185` → `SIG.alert`; per-tension left-border + dot use `SEVERITY[...]`; title → `SIG.ink`; implication → `SIG.inkSoft`; driver chips → `SIG.paperDeep` bg + `SIG.line` border + `SIG.inkSoft` text (keep mono).
- BottomSection gradient → `SIG.paperDeep`; header `#c084fc` → `SIG.llm`; log cards bg `rgba(255,255,255,.02)` → `SIG.paper` + `SIG.line` border; ts `SIG.inkFaint`; bold `SIG.ink`; command bar bg `#04060f` → `SIG.paper`, `aura ›` → `SIG.bio`, caret block → `SIG.alert`, hint → `SIG.inkFaint`, retune button → `SIG.bioTint` bg + `SIG.bio` text + `SIG.bio` border.
- Feedback wrapper bg `#04060f` → `SIG.paper`, top border → `SIG.line`.
- `<style>` keyframes unchanged (`aura-blink`, `biosig-draw`).

- [ ] **Step 6: Verify typecheck + build + visual**

Run: `npx tsc --noEmit && npm run build`, then open `/demo` → "Protocol Terminal".
Expected: PASS; terminal renders on bone with the 5 muted tints; no neon; Modality handoff copy.

- [ ] **Step 7: Commit**

```bash
git add apps/engine/src/components/RecommendationCard.tsx
git commit -m "feat(engine): reskin protocol terminal to muted instrument palette; Modality handoff"
```

---

## Task 13: BiosignatureSphere (home canvas) reskin

**Files:**
- Modify: `apps/engine/src/components/BiosignatureSphere.tsx`

- [ ] **Step 1: Recolor canvas draw calls**

Import `SIG` from `@/lib/theme/instrument`. Remap:
- `DIALS` colors `#00d4ff`/`#8b5cf6`/`#fb7185` → `SIG.bio`/`SIG.llm`/`SIG.alert`.
- Dial arc track `rgba(255,255,255,0.06)` → `rgba(28,26,21,0.08)`; tick strokes `rgba(255,255,255,0.28)` → `rgba(28,26,21,0.28)`; needle hub `#e6eaf2` → `SIG.ink`; labels `#64748b` → `SIG.inkSoft`.
- Boot-log printed lines `#64748b` → `SIG.inkSoft`; active line + caret `#00d4ff` → `SIG.bio`; top border `rgba(255,255,255,0.08)` → `SIG.line`.

- [ ] **Step 2: Verify build + visual**

Run: `npm run build`, open `/`.
Expected: dials + boot log render in ink/bio/alert on bone.

- [ ] **Step 3: Commit**

```bash
git add apps/engine/src/components/BiosignatureSphere.tsx
git commit -m "feat(engine): reskin BiosignatureSphere canvas to Pharmacopoeia"
```

---

## Task 14: Demo page reskin

**Files:**
- Modify: `apps/engine/src/app/demo/page.tsx`

**Note:** Carries uncommitted functional changes — preserve all scenario/rules/routing logic.

- [ ] **Step 1: Control bar + shell**

Root `bg-[#04060f]` → `.pharmacopoeia` on `--paper`. Sticky control bar: `bg-[#0d1117]/90` → `bg-[color:var(--paper-deep)]/90`, border → `--line`; "▸ Demo Mode" eyebrow → `p-cat-label`; scene/scenario/routing toggle buttons active state `bg-cyan-500/20 text-cyan-300 border-cyan-500/30` → `--sig-alert-tint`/specimen border; source pill `text-emerald-400 bg-emerald-400/10` → `SIG.ok` tokens.

- [ ] **Step 2: DemoIntakeForm + wizard**

Recolor `inputClass`/`labelClass`/`btnBack`/`btnNext` per the dictionary (paper inputs, `p-btn-primary`/`p-btn-outline`, specimen focus, progress fill specimen). Wearable connect rows: keep per-wearable `w.color` swatch but change connected border/bg to `--sig-ok`; "Connect" buttons → specimen tint. Rx-interest active state → specimen border + `--sig-alert-tint`. Step-4 blurb "we'll show you Aura Clinical options" → "we'll show you Modality options".

- [ ] **Step 3: SafetyFloorPanel + LiveProfileBar**

- SafetyFloorPanel `bg-[#0a0f1a] border-white/10` → `.p-card`; "Safety Floor" mono label → `--ink-soft`; template pill `text-cyan-300 bg-cyan-500/10` → `SIG.bio` tokens; profile→template pill violet → `SIG.llm`; contraindication pills `text-rose-*` → `SIG.alert`; "routed to Aura Clinical" → "routed to Modality"; "no contraindications" `text-emerald-*` → `SIG.ok`; dose-ceiling table Δ down `text-amber-400` → `SIG.warn`, up `text-emerald-400` → `SIG.ok`; trigger chips amber → `SIG.warn`.
- LiveProfileBar `border-violet-500/20 bg-violet-500/5` → `--sig-llm-tint` + `--line`; header `text-violet-400` → `SIG.llm`; inputs → paper/ink/line.

- [ ] **Step 4: Verify typecheck + build + visual**

Run: `npx tsc --noEmit && npm run build`, open `/demo` (both "Onboarding Wizard" and "Protocol Terminal", all four scenarios).
Expected: PASS; entire demo on bone; no neon; no "Aura Clinical".

- [ ] **Step 5: Commit**

```bash
git add apps/engine/src/app/demo/page.tsx
git commit -m "feat(engine): reskin /demo (control bar, wizard, safety panel); Modality copy"
```

---

## Task 15: Remaining shared components + recommendation route

**Files:**
- Modify: `apps/engine/src/components/VendorRail.tsx`
- Modify: `apps/engine/src/components/VendorCard.tsx`
- Modify: `apps/engine/src/components/EngineLogDrawer.tsx`
- Modify: `apps/engine/src/components/FeedbackWidget.tsx`
- Modify: `apps/engine/src/components/Disclaimer.tsx`
- Modify: `apps/engine/src/components/ProtocolSection.tsx`
- Modify: `apps/engine/src/components/ConnectButton.tsx`
- Modify: `apps/engine/src/app/recommendation/page.tsx`
- Modify: `apps/engine/src/app/recommendation/RecommendationClient.tsx`

- [ ] **Step 1: Reskin each per the dictionary**

- VendorRail/VendorCard: dark cards → `.p-card` + `--line`; live badge → `SIG.ok`; tbd badge → `SIG.inkFaint`; category labels → `p-cat-label`; buttons → `p-btn-primary`/`p-btn-outline`.
- EngineLogDrawer: tag colors → `SIG.ok/llm/warn/bio`; panel bg → `--paper-deep`.
- FeedbackWidget: buttons/inputs → primitives; accents → specimen.
- Disclaimer: text → `--ink-faint`; keep `DISCLAIMER` constant text.
- ProtocolSection / ConnectButton: headers → `p-serif`; CTAs → `p-btn-primary`; cyan accents → `SIG.bio`.
- recommendation/page.tsx: root `.pharmacopoeia` + `.p-container`; heading `p-serif`; completeness bar fill → specimen, track → `--line`; empty/loading states → `.p-card` + `--ink-soft`; "Generate my protocol" button → `p-btn-primary`.
- RecommendationClient.tsx: recolor the completeness/empty/loading/error blocks (cyan→specimen/bio, dashed borders → `--line`). Preserve all logic.

- [ ] **Step 2: Verify typecheck + build + visual**

Run: `npx tsc --noEmit && npm run build`, open `/recommendation` (auth may redirect to `/connect`; verify via `/demo` terminal which mounts the same VendorRail).
Expected: PASS; all fragments on bone.

- [ ] **Step 3: Commit**

```bash
git add apps/engine/src/components/VendorRail.tsx apps/engine/src/components/VendorCard.tsx apps/engine/src/components/EngineLogDrawer.tsx apps/engine/src/components/FeedbackWidget.tsx apps/engine/src/components/Disclaimer.tsx apps/engine/src/components/ProtocolSection.tsx apps/engine/src/components/ConnectButton.tsx apps/engine/src/app/recommendation/
git commit -m "feat(engine): reskin vendor rail, log drawer, recommendation route + shared bits"
```

---

## Task 16: Cleanup guard — no legacy neon / dead brand; full green

**Files:**
- Test: `apps/engine/tests/reskin-guard.test.ts`

- [ ] **Step 1: Write the guard test**

```ts
// apps/engine/tests/reskin-guard.test.ts
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((e) => {
    const p = join(dir, e);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const SRC = join(process.cwd(), "src");
const norm = (p: string) => p.replace(/\\/g, "/");
const files = walk(SRC).filter((f) => /\.(tsx?|css)$/.test(f));
// The palette module + globals intentionally reference old hex in comments/vars.
const EXEMPT = ["src/lib/theme/instrument.ts", "src/app/globals.css"];
const isExempt = (f: string) => EXEMPT.some((x) => norm(f).endsWith(x));

describe("reskin guard", () => {
  it("no shelved Aura Clinical brand remains in source", () => {
    const hits = files.filter((f) =>
      /aura ?clinical|auraclinical\.com/i.test(readFileSync(f, "utf8")),
    );
    expect(hits).toEqual([]);
  });

  it("no neon literals remain in component/page source", () => {
    const neon = /#00d4ff|#8b5cf6|#fb7185|#34d399|#fbbf24|#04060f/i;
    const hits = files
      .filter((f) => !isExempt(f))
      .filter((f) => neon.test(readFileSync(f, "utf8")));
    expect(hits).toEqual([]);
  });
});
```

- [ ] **Step 2: Run guard + fix stragglers**

Run: `npm test -- reskin-guard`
Expected: PASS. If it lists files, recolor the flagged literals (they were missed in earlier tasks), then re-run.

- [ ] **Step 3: Full green — tests + typecheck + build**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: all PASS.

- [ ] **Step 4: Visual sweep**

`npm run dev`, walk every route: `/`, `/connect`, `/onboarding` (or demo wizard), `/upload`, `/dashboard`, `/demo` (both scenes, 4 personas, 3 routings), `/recommendation`. Confirm: bone backgrounds, Newsreader headers, specimen accents, muted instrument tints, Aura chrome, Modality handoff copy, no neon, no dark bands.

- [ ] **Step 5: Commit**

```bash
git add apps/engine/tests/reskin-guard.test.ts
git commit -m "test(engine): guard against legacy neon + shelved brand; reskin complete"
```

---

## Notes for the executor

- **Preserve uncommitted functional work** in `onboarding/`, `demo/`, `connect/`, `upload/`, `IntakeForm.tsx` — the reskin only recolors; do not revert logic.
- **Do not** run a whole-app `tsc` between Tasks 4 and 5/12 — the constant rename intentionally breaks consumers until they're updated in those tasks.
- The engine is **not** a static export (Node runtime for Supabase/Terra). `npm run build` may need env vars; if it fails on missing env (not on the reskin), fall back to `npx tsc --noEmit` + `npm test` + `npm run dev` visual as the gate for that task.
- Keep `globals.css` `--sig-*` vars and `instrument.ts` `SIG` in sync — they are the same palette in two consumption formats (CSS classes vs inline styles).
