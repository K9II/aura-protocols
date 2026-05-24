# Shop Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert `shop.auraprotocols.com` from its current state into the Editorial layer of the three-layer architecture: a production-grade SEO/education funnel that routes traffic to the Engine (`auraprotocols.com`) and Aura Clinical, plus seven thin validation pages used by the Month 0 paid micro-tests.

**Architecture:** Stays Next.js 16 (App Router, static export) + Tailwind v4. Adds (a) reusable Engine CTA components in three placement variants, (b) an Email Capture component wrapping a hosted Beehiiv form, (c) seven validation pages under `/validate/*` carrying `robots: noindex,nofollow`, (d) a `/playbook` page wrapping a Gumroad-hosted $97 product. The homepage is rebuilt around the three-layer value prop. Existing `Navbar`, `Footer`, `ProductCard`, and the three `data/*.ts` files are left structurally intact; affiliate `rel` attributes are audited and normalized.

**Tech Stack:** Next.js 16, React 19, Tailwind v4, TypeScript 5, Vitest + @testing-library/react (added in Task 1), Beehiiv hosted form embed (no SDK), Gumroad hosted product link (no SDK), Stripe Payment Links (no SDK — founder creates in dashboard, page just `<Link href>`s).

**Out of scope for this plan (handled by other plans in the four-plan split):**
- Engine MVP at `auraprotocols.com` (separate `engine-mvp` plan).
- Aura Clinical landing pages — these live on the Clinical brand's separate infra, not this repo (`clinical-backend` plan).
- Ad creative, ad spend, content posting cadence (`distribution-program` plan).

---

## Pre-Plan Setup: Read This First

**Next.js 16 caveat:** Per `AGENTS.md`, Next.js 16 has breaking changes vs prior major versions. Before any task that calls a Next.js API you're not 100% sure about (metadata, generateStaticParams, dynamic routes, image, font, sitemap), open `node_modules/next/dist/docs/` or run the docs MCP — do not write from memory.

**Static export:** This site is statically exported. **No API routes, no server actions, no middleware-at-runtime.** All forms post to third-party endpoints (Beehiiv, Gumroad, Stripe Payment Links).

**Brand constants (do not paraphrase, copy exactly):**
- `ENGINE_URL = "https://auraprotocols.com"` — the Phase 2 Engine site (separate from this one).
- `AFFILIATE_REL = "noopener noreferrer sponsored"` — every outbound affiliate link.
- Primary CTA copy: *"Get a personalized version of this protocol — connect your wearable at auraprotocols.com →"*
- Lead magnet name: *"The Peptide Protocol Cheat Sheet"* (PDF — Kearney supplies file).

**Validation page legal framing:** Every `/validate/*` page must contain a single, plain-text framing line: *"This is a research preview. Aura Clinical is not yet accepting patients."* — keeps Month 0 deposits collected against an explicit waitlist promise, not a present-day sale. Required to keep payment processor + FTC posture clean.

**Files you must not modify without explicit instruction (per CLAUDE.md):**
- `src/components/ProductCard.tsx`
- `src/components/Navbar.tsx`
- `src/data/products.ts`, `src/data/posts.ts`, `src/data/comparisons.ts` — except where this plan calls out specific edits.

---

## File Structure (locked before tasks)

**Created:**
- `src/lib/constants.ts` — `ENGINE_URL`, `AFFILIATE_REL`, `LEAD_MAGNET`, `PLAYBOOK_PRICE_USD`, processor URLs.
- `src/lib/cn.ts` — `cn()` className join helper (only if not already present).
- `src/components/EngineCTABanner.tsx` — sticky top banner.
- `src/components/EngineCTAInline.tsx` — mid-post block.
- `src/components/EngineCTACard.tsx` — end-of-post card.
- `src/components/EmailCapture.tsx` — Beehiiv-embed wrapper with fallback.
- `src/components/ValuePropTriad.tsx` — homepage three-layer block.
- `src/components/TrustBlock.tsx` — homepage trust signals (methodology stats).
- `src/app/playbook/page.tsx` — $97 Playbook landing page.
- `src/app/validate/layout.tsx` — shared layout enforcing `noindex,nofollow` for the validation namespace.
- `src/app/validate/deposit-recovery/page.tsx`
- `src/app/validate/deposit-gh/page.tsx`
- `src/app/validate/positioning-v1/page.tsx`
- `src/app/validate/positioning-v2/page.tsx`
- `src/app/validate/positioning-v3/page.tsx`
- `src/app/validate/wearable/page.tsx`
- `vitest.config.ts`
- `tests/setup.ts`
- `tests/components/EngineCTABanner.test.tsx`
- `tests/components/EmailCapture.test.tsx`
- `tests/data/affiliate-rel.test.ts`
- `tests/app/sitemap.test.ts`

**Modified:**
- `src/app/page.tsx` — homepage rebuilt around three-layer value prop.
- `src/app/layout.tsx` — mount sticky EngineCTABanner globally; no metadata changes.
- `src/app/blog/[slug]/page.tsx` — inject `EngineCTAInline` mid-post and `EngineCTACard` after content.
- `src/app/compare/[slug]/page.tsx` — inject `EngineCTACard` after content.
- `src/app/products/[slug]/page.tsx` — dual-CTA (affiliate + Engine).
- `src/app/sitemap.ts` — add `/playbook`; exclude `/validate/*`.
- `src/data/posts.ts` — expand top-3 posts to ≥2,500 words with new internal links.
- `package.json` — add Vitest + RTL devDependencies + test scripts.

**Deleted:**
- `src/app/_page.tsx.bak` — leftover from prior coming-soon swap.

---

## Task 1: Test framework setup

**Files:**
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`
- Modify: `package.json`

- [ ] **Step 1.1:** Install Vitest + RTL + JSDOM.

```bash
npm i -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
```

Expected: lockfile updated, no peer warnings beyond React 19 (acceptable — RTL supports React 19 from v16+).

- [ ] **Step 1.2:** Create `vitest.config.ts`.

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

- [ ] **Step 1.3:** Create `tests/setup.ts`.

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 1.4:** Add scripts to `package.json`.

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 1.5:** Smoke-check the harness with a temporary test, then delete it.

Create `tests/_smoke.test.ts`:
```ts
import { describe, it, expect } from "vitest";
describe("smoke", () => it("works", () => expect(1 + 1).toBe(2)));
```

Run: `npm test`. Expected: 1 passing test. Delete `tests/_smoke.test.ts`.

- [ ] **Step 1.6:** Commit.

```bash
git add vitest.config.ts tests/setup.ts package.json package-lock.json
git commit -m "chore: add vitest + RTL test harness"
```

---

## Task 2: Shared constants

**Files:**
- Create: `src/lib/constants.ts`

- [ ] **Step 2.1:** Write the file.

```ts
export const ENGINE_URL = "https://auraprotocols.com";
export const AFFILIATE_REL = "noopener noreferrer sponsored";
export const EXTERNAL_REL = "noopener noreferrer";

export const LEAD_MAGNET = {
  title: "The Peptide Protocol Cheat Sheet",
  blurb: "One page. Doses, stacks, timing, COA red flags. Free PDF.",
  beehiivPublicationId: "PLACEHOLDER_PUB_ID",
  beehiivEmbedUrl: "https://embeds.beehiiv.com/PLACEHOLDER_PUB_ID",
};

export const PLAYBOOK = {
  priceUsd: 97,
  gumroadUrl: "https://PLACEHOLDER.gumroad.com/l/peptide-protocol-playbook",
};

export const STRIPE_PAYMENT_LINKS = {
  depositRecovery: "https://buy.stripe.com/PLACEHOLDER_RECOVERY",
  depositGh: "https://buy.stripe.com/PLACEHOLDER_GH",
};

export const ENGINE_CTA_COPY = {
  banner: "Connect your wearable. Get a peptide protocol tuned to your data.",
  bannerAction: "Open the Engine →",
  inlineHeading: "Get a personalized version of this protocol",
  inlineBody: "Connect Whoop, Oura, or Apple Health and the Engine will tune it to your recovery, sleep, and stress data.",
  inlineAction: "Connect a wearable →",
  cardHeading: "Make this protocol yours",
  cardBody: "The Engine reads your biometrics and personalizes dosing, timing, and stacking — free at auraprotocols.com.",
  cardAction: "Try the Engine →",
};
```

> Placeholders are deliberate. Kearney fills `PLACEHOLDER_*` values once Beehiiv, Gumroad, and Stripe accounts are provisioned; nothing else in the codebase references those services.

- [ ] **Step 2.2:** Commit.

```bash
git add src/lib/constants.ts
git commit -m "feat: add shared CTA + processor constants"
```

---

## Task 3: EngineCTABanner (sticky top)

**Files:**
- Create: `src/components/EngineCTABanner.tsx`
- Create: `tests/components/EngineCTABanner.test.tsx`

- [ ] **Step 3.1:** Write the failing test.

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import EngineCTABanner from "@/components/EngineCTABanner";
import { ENGINE_URL } from "@/lib/constants";

describe("EngineCTABanner", () => {
  it("renders a link pointing at the Engine with safe rel + new tab", () => {
    render(<EngineCTABanner />);
    const link = screen.getByRole("link", { name: /open the engine/i });
    expect(link).toHaveAttribute("href", ENGINE_URL);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel")).toMatch(/noopener/);
    expect(link.getAttribute("rel")).toMatch(/noreferrer/);
  });

  it("is dismissable and stays dismissed via localStorage", async () => {
    const { rerender } = render(<EngineCTABanner />);
    screen.getByRole("button", { name: /dismiss/i }).click();
    rerender(<EngineCTABanner />);
    expect(screen.queryByRole("link", { name: /open the engine/i })).toBeNull();
  });
});
```

- [ ] **Step 3.2:** Run, expect failure.

```bash
npm test -- EngineCTABanner
```
Expected: FAIL (`Cannot find module '@/components/EngineCTABanner'`).

- [ ] **Step 3.3:** Implement.

```tsx
"use client";
import { useEffect, useState } from "react";
import { ENGINE_URL, EXTERNAL_REL, ENGINE_CTA_COPY } from "@/lib/constants";

const KEY = "aura.engineBannerDismissed";

export default function EngineCTABanner() {
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined" && window.localStorage.getItem(KEY) === "1") {
      setDismissed(true);
    }
  }, []);
  if (dismissed) return null;
  return (
    <div className="sticky top-0 z-50 w-full bg-gradient-to-r from-cyan-500/20 via-violet-500/20 to-cyan-500/20 backdrop-blur border-b border-white/10">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 text-sm text-white">
        <p className="truncate">
          <span className="font-semibold text-cyan-300">New:</span> {ENGINE_CTA_COPY.banner}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <a
            href={ENGINE_URL}
            target="_blank"
            rel={EXTERNAL_REL}
            className="rounded-md bg-white/10 px-3 py-1 font-medium hover:bg-white/20"
          >
            {ENGINE_CTA_COPY.bannerAction}
          </a>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => {
              window.localStorage.setItem(KEY, "1");
              setDismissed(true);
            }}
            className="rounded-md px-2 py-1 text-white/60 hover:text-white"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3.4:** Run, expect pass.

```bash
npm test -- EngineCTABanner
```
Expected: PASS, 2 tests.

- [ ] **Step 3.5:** Commit.

```bash
git add src/components/EngineCTABanner.tsx tests/components/EngineCTABanner.test.tsx
git commit -m "feat(cta): add dismissable sticky Engine banner"
```

---

## Task 4: EngineCTAInline + EngineCTACard

**Files:**
- Create: `src/components/EngineCTAInline.tsx`
- Create: `src/components/EngineCTACard.tsx`

> No tests for these two — they are pure presentational wrappers around the same `<a>` shape already verified in Task 3. Skipping per YAGNI. If a future bug appears, add a test then.

- [ ] **Step 4.1:** Write `EngineCTAInline.tsx`.

```tsx
import { ENGINE_URL, EXTERNAL_REL, ENGINE_CTA_COPY } from "@/lib/constants";

export default function EngineCTAInline() {
  return (
    <aside className="my-10 rounded-xl border border-cyan-400/30 bg-cyan-400/5 p-6">
      <h3 className="font-display text-xl font-bold text-white">
        {ENGINE_CTA_COPY.inlineHeading}
      </h3>
      <p className="mt-2 text-slate-300">{ENGINE_CTA_COPY.inlineBody}</p>
      <a
        href={ENGINE_URL}
        target="_blank"
        rel={EXTERNAL_REL}
        className="btn-primary mt-4 inline-flex"
      >
        {ENGINE_CTA_COPY.inlineAction}
      </a>
    </aside>
  );
}
```

- [ ] **Step 4.2:** Write `EngineCTACard.tsx`.

```tsx
import { ENGINE_URL, EXTERNAL_REL, ENGINE_CTA_COPY } from "@/lib/constants";

export default function EngineCTACard() {
  return (
    <section className="mt-16 rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-500/10 to-violet-500/10 p-8">
      <h2 className="font-display text-2xl font-bold text-white">
        {ENGINE_CTA_COPY.cardHeading}
      </h2>
      <p className="mt-3 max-w-2xl text-slate-300">{ENGINE_CTA_COPY.cardBody}</p>
      <a
        href={ENGINE_URL}
        target="_blank"
        rel={EXTERNAL_REL}
        className="btn-primary mt-5 inline-flex"
      >
        {ENGINE_CTA_COPY.cardAction}
      </a>
    </section>
  );
}
```

- [ ] **Step 4.3:** Verify build does not break.

```bash
npx tsc --noEmit
```
Expected: no type errors.

- [ ] **Step 4.4:** Commit.

```bash
git add src/components/EngineCTAInline.tsx src/components/EngineCTACard.tsx
git commit -m "feat(cta): add inline + end-of-content Engine CTA blocks"
```

---

## Task 5: EmailCapture component (Beehiiv embed)

**Files:**
- Create: `src/components/EmailCapture.tsx`
- Create: `tests/components/EmailCapture.test.tsx`

- [ ] **Step 5.1:** Failing test.

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import EmailCapture from "@/components/EmailCapture";
import { LEAD_MAGNET } from "@/lib/constants";

describe("EmailCapture", () => {
  it("renders the lead magnet title and a Beehiiv iframe pointing at the configured embed URL", () => {
    render(<EmailCapture />);
    expect(screen.getByText(LEAD_MAGNET.title)).toBeInTheDocument();
    const iframe = screen.getByTitle(/email signup/i) as HTMLIFrameElement;
    expect(iframe.src).toContain(LEAD_MAGNET.beehiivEmbedUrl);
  });
});
```

- [ ] **Step 5.2:** Run, expect failure.

```bash
npm test -- EmailCapture
```
Expected: FAIL.

- [ ] **Step 5.3:** Implement.

```tsx
import { LEAD_MAGNET } from "@/lib/constants";

export default function EmailCapture() {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#0d1117] p-8">
      <h3 className="font-display text-2xl font-bold text-white">{LEAD_MAGNET.title}</h3>
      <p className="mt-2 text-slate-300">{LEAD_MAGNET.blurb}</p>
      <iframe
        title="Email signup"
        src={LEAD_MAGNET.beehiivEmbedUrl}
        className="mt-4 h-[200px] w-full rounded-lg border-0 bg-transparent"
        loading="lazy"
      />
    </section>
  );
}
```

- [ ] **Step 5.4:** Run, expect pass.

```bash
npm test -- EmailCapture
```
Expected: PASS.

- [ ] **Step 5.5:** Commit.

```bash
git add src/components/EmailCapture.tsx tests/components/EmailCapture.test.tsx
git commit -m "feat(email): add Beehiiv-backed email capture"
```

---

## Task 6: Validation layout (shared noindex wrapper)

**Files:**
- Create: `src/app/validate/layout.tsx`

- [ ] **Step 6.1:** Write the layout. Every child route in `/validate/*` inherits `noindex,nofollow` and a top disclaimer.

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function ValidateLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#04060f]">
      <div className="border-b border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-center text-xs text-yellow-200">
        Research preview — Aura Clinical is not yet accepting patients.
      </div>
      {children}
    </div>
  );
}
```

- [ ] **Step 6.2:** Commit.

```bash
git add src/app/validate/layout.tsx
git commit -m "feat(validate): add noindex layout for Month 0 test pages"
```

---

## Task 7: Deposit validation pages (Test 1 — Recovery + GH)

**Files:**
- Create: `src/app/validate/deposit-recovery/page.tsx`
- Create: `src/app/validate/deposit-gh/page.tsx`

> Both pages collect a $50 refundable deposit via a Stripe Payment Link. No form in this codebase — clicking the CTA hands the user to Stripe-hosted checkout. Conversion analytics happen in Stripe + the ad platform's pixel.

- [ ] **Step 7.1:** Write `deposit-recovery/page.tsx`.

```tsx
import Link from "next/link";
import { STRIPE_PAYMENT_LINKS, EXTERNAL_REL } from "@/lib/constants";

export default function DepositRecoveryPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-widest text-emerald-300">
        Recovery Stack — Waitlist Deposit
      </p>
      <h1 className="font-display mt-3 text-4xl font-bold text-white">
        Reserve your first month: compounded BPC-157 + TB-500, prescribed by a US doctor.
      </h1>
      <p className="mt-4 text-lg text-slate-300">
        $50 refundable deposit. Holds your slot when Aura Clinical opens enrollment. If we
        cannot serve your state, we refund automatically.
      </p>
      <ul className="mt-6 space-y-2 text-slate-300">
        <li>• Compounded by a US-licensed 503A pharmacy.</li>
        <li>• Prescribed by a US-licensed MD after a 10-minute async intake.</li>
        <li>• Shipped monthly. Cancel anytime.</li>
      </ul>
      <Link
        href={STRIPE_PAYMENT_LINKS.depositRecovery}
        target="_blank"
        rel={EXTERNAL_REL}
        className="btn-primary mt-8 inline-flex"
      >
        Reserve with $50 deposit →
      </Link>
      <p className="mt-6 text-xs text-slate-500">
        This is a research preview. No prescription is issued at deposit time. Deposits are
        held by Stripe and refunded in full if Aura Clinical cannot serve your state at launch.
      </p>
    </main>
  );
}
```

- [ ] **Step 7.2:** Write `deposit-gh/page.tsx` with the same shape, GH copy, and `STRIPE_PAYMENT_LINKS.depositGh`.

```tsx
import Link from "next/link";
import { STRIPE_PAYMENT_LINKS, EXTERNAL_REL } from "@/lib/constants";

export default function DepositGhPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-widest text-violet-300">
        GH Stack — Waitlist Deposit
      </p>
      <h1 className="font-display mt-3 text-4xl font-bold text-white">
        Reserve your first month: compounded CJC-1295 + Ipamorelin, prescribed by a US doctor.
      </h1>
      <p className="mt-4 text-lg text-slate-300">
        $50 refundable deposit. Holds your slot when Aura Clinical opens enrollment. If we
        cannot serve your state, we refund automatically.
      </p>
      <ul className="mt-6 space-y-2 text-slate-300">
        <li>• Compounded by a US-licensed 503A pharmacy.</li>
        <li>• Prescribed by a US-licensed MD after a 10-minute async intake.</li>
        <li>• Shipped monthly. Cancel anytime.</li>
      </ul>
      <Link
        href={STRIPE_PAYMENT_LINKS.depositGh}
        target="_blank"
        rel={EXTERNAL_REL}
        className="btn-primary mt-8 inline-flex"
      >
        Reserve with $50 deposit →
      </Link>
      <p className="mt-6 text-xs text-slate-500">
        This is a research preview. No prescription is issued at deposit time. Deposits are
        held by Stripe and refunded in full if Aura Clinical cannot serve your state at launch.
      </p>
    </main>
  );
}
```

- [ ] **Step 7.3:** Manual check both routes render.

```bash
npm run dev
```
Visit `http://localhost:3000/validate/deposit-recovery` and `/validate/deposit-gh`. Verify (a) yellow disclaimer banner shows, (b) hero copy renders, (c) clicking the CTA opens `buy.stripe.com/PLACEHOLDER_*` in a new tab, (d) View Source shows `<meta name="robots" content="noindex,nofollow,nocache"/>`.

- [ ] **Step 7.4:** Commit.

```bash
git add src/app/validate/deposit-recovery src/app/validate/deposit-gh
git commit -m "feat(validate): add Recovery + GH deposit pages (Month 0 Test 1)"
```

---

## Task 8: Positioning validation pages (Test 2 — V1/V2/V3)

**Files:**
- Create: `src/app/validate/positioning-v1/page.tsx`
- Create: `src/app/validate/positioning-v2/page.tsx`
- Create: `src/app/validate/positioning-v3/page.tsx`

Each page is structurally identical and embeds `EmailCapture`. The variable is the H1 only.

- [ ] **Step 8.1:** Write `positioning-v1/page.tsx`.

```tsx
import EmailCapture from "@/components/EmailCapture";

export default function PositioningV1Page() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-display text-4xl font-bold text-white md:text-5xl">
        The clinical-grade alternative to research peptides.
      </h1>
      <p className="mt-4 text-lg text-slate-300">
        Same compounds. Prescribed by US-licensed doctors. Shipped from licensed compounding
        pharmacies. No more vial-with-bacteriostatic-water grey-zone.
      </p>
      <div className="mt-10">
        <EmailCapture />
      </div>
    </main>
  );
}
```

- [ ] **Step 8.2:** Write `positioning-v2/page.tsx`.

```tsx
import EmailCapture from "@/components/EmailCapture";

export default function PositioningV2Page() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-display text-4xl font-bold text-white md:text-5xl">
        Prescribed peptide protocols from US doctors.
      </h1>
      <p className="mt-4 text-lg text-slate-300">
        Skip the vendor research. Get a personalized peptide protocol prescribed by a
        US-licensed MD and shipped monthly from a compounding pharmacy.
      </p>
      <div className="mt-10">
        <EmailCapture />
      </div>
    </main>
  );
}
```

- [ ] **Step 8.3:** Write `positioning-v3/page.tsx`.

```tsx
import EmailCapture from "@/components/EmailCapture";

export default function PositioningV3Page() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-display text-4xl font-bold text-white md:text-5xl">
        The legal way to run the protocols you've been researching.
      </h1>
      <p className="mt-4 text-lg text-slate-300">
        You've already read the papers. Now get the same compounds prescribed, dosed, and
        shipped — without the COA roulette.
      </p>
      <div className="mt-10">
        <EmailCapture />
      </div>
    </main>
  );
}
```

- [ ] **Step 8.4:** Manual check all three routes render with the embed iframe visible, disclaimer banner present.

- [ ] **Step 8.5:** Commit.

```bash
git add src/app/validate/positioning-v1 src/app/validate/positioning-v2 src/app/validate/positioning-v3
git commit -m "feat(validate): add 3 positioning landing variants (Month 0 Test 2)"
```

---

## Task 9: Engine intent fake-door (Test 3)

**Files:**
- Create: `src/app/validate/wearable/page.tsx`

- [ ] **Step 9.1:** Write the page. CTA links to the Engine domain even though the Engine is not built yet — at this stage that domain serves a waitlist capture (handled by the engine-mvp plan).

```tsx
import Link from "next/link";
import EmailCapture from "@/components/EmailCapture";
import { ENGINE_URL, EXTERNAL_REL } from "@/lib/constants";

const WEARABLES = ["Whoop", "Oura", "Apple Health", "Garmin", "Fitbit", "Dexcom CGM"];

export default function WearablePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-display text-4xl font-bold text-white md:text-5xl">
        Connect your wearable. Get a peptide protocol tuned to your data.
      </h1>
      <p className="mt-4 text-lg text-slate-300">
        Free. We read your recovery, sleep, HRV, and (optionally) glucose, then return a
        personalized peptide + lifestyle protocol. No generic "stack of the week."
      </p>
      <ul className="mt-6 grid grid-cols-2 gap-2 text-slate-300 md:grid-cols-3">
        {WEARABLES.map((w) => (
          <li key={w} className="rounded-md border border-white/10 px-3 py-2 text-center">
            {w}
          </li>
        ))}
      </ul>
      <Link
        href={ENGINE_URL}
        target="_blank"
        rel={EXTERNAL_REL}
        className="btn-primary mt-8 inline-flex"
      >
        Connect a wearable →
      </Link>
      <div className="mt-10">
        <EmailCapture />
      </div>
    </main>
  );
}
```

- [ ] **Step 9.2:** Manual check the page renders and the CTA opens `auraprotocols.com` in a new tab.

- [ ] **Step 9.3:** Commit.

```bash
git add src/app/validate/wearable
git commit -m "feat(validate): add Engine wearable fake-door (Month 0 Test 3)"
```

---

## Task 10: Sitemap — add /playbook, exclude /validate

**Files:**
- Modify: `src/app/sitemap.ts`
- Create: `tests/app/sitemap.test.ts`

- [ ] **Step 10.1:** Failing test. (Replace the URL list below if the actual `sitemap.ts` already exposes a helper; otherwise this test imports the route module and inspects its default export.)

```ts
import { describe, it, expect } from "vitest";
import sitemap from "@/app/sitemap";

describe("sitemap", () => {
  it("includes /playbook", () => {
    const urls = sitemap().map((e) => new URL(e.url).pathname);
    expect(urls).toContain("/playbook");
  });

  it("excludes every /validate route", () => {
    const urls = sitemap().map((e) => new URL(e.url).pathname);
    expect(urls.every((p) => !p.startsWith("/validate"))).toBe(true);
  });
});
```

- [ ] **Step 10.2:** Run, expect failure (or pass on the exclude assertion, fail on the include).

```bash
npm test -- sitemap
```

- [ ] **Step 10.3:** Open `src/app/sitemap.ts`. Find the array of `MetadataRoute.Sitemap` entries (the file already defines `BASE_URL`; do not change it). Append a `/playbook` entry next to where `/about`, `/privacy`, etc. live. Do not add `/validate/*` entries. Example diff fragment to add inside the static-routes array:

```ts
{
  url: `${BASE_URL}/playbook`,
  lastModified: new Date(),
  changeFrequency: "monthly",
  priority: 0.8,
},
```

- [ ] **Step 10.4:** Run tests, expect pass.

```bash
npm test -- sitemap
```

- [ ] **Step 10.5:** Commit.

```bash
git add src/app/sitemap.ts tests/app/sitemap.test.ts
git commit -m "feat(sitemap): add /playbook; verify /validate excluded"
```

---

## Task 11: Affiliate rel attribute audit (data + components)

**Files:**
- Create: `tests/data/affiliate-rel.test.ts`
- Modify (if test fails): `src/data/products.ts`, `src/data/comparisons.ts`, anywhere else affiliate links live

> Defensive guard: any `href` pointing at one of the known affiliate vendor domains in `data/*.ts` or rendered in `ProductCard`/comparison pages must serialize with `rel` containing `sponsored`.

- [ ] **Step 11.1:** Failing test — scans the data files for any vendor URL and asserts the surrounding object carries the expected rel.

```ts
import { describe, it, expect } from "vitest";
import { products } from "@/data/products";
import { comparisons } from "@/data/comparisons";

const VENDOR_HOSTS = [
  "corepeptides.com",
  "limitlesslifenootropics.com",
  "swisschems.is",
  "behemothlabz.com",
  "blueskypeptide.com",
];

function isVendorUrl(u: string | undefined) {
  if (!u) return false;
  try { return VENDOR_HOSTS.some((h) => new URL(u).host.endsWith(h)); } catch { return false; }
}

describe("affiliate rel attribute", () => {
  it("every product affiliate URL is flagged in the data layer", () => {
    for (const p of products) {
      if (isVendorUrl(p.buyUrl)) {
        // The component (ProductCard) is responsible for rendering rel; data layer
        // need only mark these as affiliate so the renderer can find them.
        expect(p.affiliate).toBe(true);
      }
    }
  });

  it("comparison objects with vendor URLs are also flagged", () => {
    for (const c of comparisons) {
      for (const v of c.vendors ?? []) {
        if (isVendorUrl(v.url)) expect(v.affiliate).toBe(true);
      }
    }
  });
});
```

- [ ] **Step 11.2:** Run. If it fails because the data files don't carry an `affiliate: true` flag, add it. If it fails because the type doesn't permit the flag, widen the interface in the same file. If the data already carries the flag (or uses a different mechanism), update the test to match the actual contract — **do not modify ProductCard.** Per CLAUDE.md, `ProductCard.tsx` is locked.

- [ ] **Step 11.3:** Grep the codebase for any `<a href="https://"` literal that points at a vendor host and does not include `rel="noopener noreferrer sponsored"`. Add the rel attribute inline.

```bash
# Search command (use Grep tool in agentic context):
# pattern: "https?://(www\.)?(corepeptides|limitlesslifenootropics|swisschems|behemothlabz|blueskypeptide)"
```

For each hit not already inside `ProductCard.tsx` (locked), add `rel="noopener noreferrer sponsored" target="_blank"` if missing.

- [ ] **Step 11.4:** Re-run tests + manual eyeball.

```bash
npm test
```
Expected: all green.

- [ ] **Step 11.5:** Commit.

```bash
git add -A
git commit -m "fix(affiliate): normalize rel=sponsored across affiliate outbound links"
```

---

## Task 12: ValuePropTriad + TrustBlock (homepage building blocks)

**Files:**
- Create: `src/components/ValuePropTriad.tsx`
- Create: `src/components/TrustBlock.tsx`

- [ ] **Step 12.1:** Write `ValuePropTriad.tsx`.

```tsx
import Link from "next/link";
import { ENGINE_URL, EXTERNAL_REL } from "@/lib/constants";

const pillars = [
  {
    eyebrow: "Personalize",
    title: "The Engine",
    body: "Connect Whoop, Oura, Apple Health. The Engine reads your biometrics and returns a peptide + lifestyle protocol tuned to you.",
    href: ENGINE_URL,
    external: true,
    cta: "Open the Engine →",
    accent: "from-cyan-500/20 to-cyan-500/0 border-cyan-400/30",
  },
  {
    eyebrow: "Educate",
    title: "Editorial",
    body: "Vendor reviews, dosing guides, compound deep-dives. Independent. Affiliate-disclosed. No pay-to-play.",
    href: "/blog",
    external: false,
    cta: "Read the library →",
    accent: "from-violet-500/20 to-violet-500/0 border-violet-400/30",
  },
  {
    eyebrow: "Prescribe",
    title: "Aura Clinical",
    body: "Recovery and GH stacks, compounded by a US 503A pharmacy and prescribed by a US-licensed MD. Coming soon.",
    href: "/validate/deposit-recovery",
    external: false,
    cta: "Join the waitlist →",
    accent: "from-emerald-500/20 to-emerald-500/0 border-emerald-400/30",
  },
];

export default function ValuePropTriad() {
  return (
    <section className="mx-auto grid max-w-6xl gap-6 px-6 py-16 md:grid-cols-3">
      {pillars.map((p) => (
        <div
          key={p.title}
          className={`rounded-2xl border bg-gradient-to-br ${p.accent} p-6`}
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-300">
            {p.eyebrow}
          </p>
          <h3 className="font-display mt-2 text-2xl font-bold text-white">{p.title}</h3>
          <p className="mt-3 text-slate-300">{p.body}</p>
          {p.external ? (
            <a
              href={p.href}
              target="_blank"
              rel={EXTERNAL_REL}
              className="mt-5 inline-flex font-medium text-cyan-300 hover:text-cyan-200"
            >
              {p.cta}
            </a>
          ) : (
            <Link
              href={p.href}
              className="mt-5 inline-flex font-medium text-cyan-300 hover:text-cyan-200"
            >
              {p.cta}
            </Link>
          )}
        </div>
      ))}
    </section>
  );
}
```

- [ ] **Step 12.2:** Write `TrustBlock.tsx`.

```tsx
const stats = [
  { value: "100%", label: "Third-party COA required" },
  { value: "0", label: "Pay-to-play vendor placements" },
  { value: "100%", label: "Affiliate relationships disclosed" },
  { value: "Manual", label: "Every vendor reviewed by a human" },
];

export default function TrustBlock() {
  return (
    <section className="border-y border-white/10 bg-[#0d1117]">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-6 py-10 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <p className="font-display text-3xl font-bold text-cyan-300">{s.value}</p>
            <p className="mt-1 text-sm text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 12.3:** `npx tsc --noEmit` — expect no errors.

- [ ] **Step 12.4:** Commit.

```bash
git add src/components/ValuePropTriad.tsx src/components/TrustBlock.tsx
git commit -m "feat(home): add three-layer value prop triad + trust stats block"
```

---

## Task 13: Rebuild homepage around three-layer value prop

**Files:**
- Modify: `src/app/page.tsx`

> The current homepage is a single-vendor-focused affiliate page (preserved as `_page.tsx.bak`). Rewrite the structural sections; keep existing `<ProductCard>` usage and the featured-posts list — those are working surfaces.

- [ ] **Step 13.1:** Replace the file with the new structure. Sections, top to bottom: Hero → TrustBlock → ValuePropTriad → Featured Products (existing pattern) → Latest Posts (existing pattern) → EmailCapture → Engine CTA Card.

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import ValuePropTriad from "@/components/ValuePropTriad";
import TrustBlock from "@/components/TrustBlock";
import EmailCapture from "@/components/EmailCapture";
import EngineCTACard from "@/components/EngineCTACard";
import { products } from "@/data/products";
import { posts } from "@/data/posts";
import { ENGINE_URL, EXTERNAL_REL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Aura Protocols — Personalized Peptide Protocols, Backed by Your Data",
  description:
    "Connect your wearable, get a peptide protocol tuned to your recovery, sleep, and stress. Plus independent vendor reviews and a clinical-grade prescribed option.",
  alternates: { canonical: "/" },
};

const featuredProducts = products.filter((p) => p.featured);
const latestPosts = posts.slice(0, 3);

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-12 md:pt-24">
        <p className="text-sm font-semibold uppercase tracking-widest text-cyan-300">
          Personalized peptide protocols
        </p>
        <h1 className="font-display mt-3 text-4xl font-bold text-white md:text-6xl">
          Stop guessing your stack.<br />Tune it to your biometrics.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-slate-300">
          Aura reads your wearable data and returns a peptide protocol tuned to your actual
          recovery, sleep, and stress — not a generic forum stack. Free. Independent.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href={ENGINE_URL}
            target="_blank"
            rel={EXTERNAL_REL}
            className="btn-primary"
          >
            Connect a wearable →
          </a>
          <Link href="/blog" className="btn-outline">
            Read the research
          </Link>
        </div>
      </section>

      <TrustBlock />
      <ValuePropTriad />

      {/* Featured products */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="font-display text-4xl font-bold text-white">Featured compounds</h2>
        <p className="mt-2 text-slate-400">
          Independently reviewed. Affiliate-disclosed. Buy direct from the vendor.
        </p>
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {featuredProducts.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      </section>

      {/* Latest posts */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="font-display text-4xl font-bold text-white">Latest from the library</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {latestPosts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="block rounded-xl border border-white/10 bg-[#0d1117] p-6 transition hover:border-cyan-400/40"
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300">
                {post.category}
              </p>
              <h3 className="font-display mt-2 text-xl font-bold text-white">{post.title}</h3>
              <p className="mt-3 line-clamp-3 text-slate-400">{post.excerpt}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Email + Engine */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <EmailCapture />
        <EngineCTACard />
      </section>
    </>
  );
}
```

> If `ProductCard`'s prop name is not `product`, do not change `ProductCard`; instead match its existing API exactly when wiring it here. Inspect `src/components/ProductCard.tsx` before pasting.

- [ ] **Step 13.2:** `npm run build` — expect successful static export.

```bash
npm run build
```
Expected: build completes; no errors; warnings acceptable.

- [ ] **Step 13.3:** Manual browser check.

```bash
npm run dev
```
Visit `http://localhost:3000/`. Verify: hero, trust stats, three pillars, featured products, latest posts, email capture iframe, Engine card.

- [ ] **Step 13.4:** Commit.

```bash
git add src/app/page.tsx
git commit -m "feat(home): rebuild homepage around three-layer value prop"
```

---

## Task 14: Mount sticky EngineCTABanner globally

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 14.1:** Open `src/app/layout.tsx`. Locate the `<body>` content. Insert `<EngineCTABanner />` immediately inside `<body>`, **above** `<Navbar />` so the banner sits at the very top and pushes Navbar down. Add the import.

Diff sketch:
```tsx
import EngineCTABanner from "@/components/EngineCTABanner";
// ...
<body className={`${syne.variable} ${inter.variable} ...`}>
  <EngineCTABanner />
  <Navbar />
  {children}
  <Footer />
</body>
```

> The banner is `position: sticky; top: 0`, so it does not displace layout, but mounting it before Navbar means it appears above Navbar when both are at the top of the viewport. If Navbar is also sticky and overlaps, set Navbar's `top` to `--banner-height` via inline CSS variable. Simpler: leave both sticky; banner is dismissable so the overlap is short-lived.

- [ ] **Step 14.2:** Visual check at `npm run dev` — banner visible at top of every route, dismissable, dismissal persists across reloads (localStorage).

- [ ] **Step 14.3:** Commit.

```bash
git add src/app/layout.tsx
git commit -m "feat(cta): mount Engine banner globally"
```

---

## Task 15: Wire EngineCTAInline into blog post template

**Files:**
- Modify: `src/app/blog/[slug]/page.tsx`

- [ ] **Step 15.1:** Open the blog post page. Find where the post body is rendered (likely a `prose` div or a markdown render). Choose an injection point roughly 40–60% through the article. Two options:
  - If the post content is plain markdown rendered as one block, inject `<EngineCTAInline />` AFTER the rendered content's wrapping div but BEFORE the end-of-post card section. Simpler and avoids splitting markdown.
  - If the post content is broken into sections (e.g., array of blocks), inject between blocks at index `Math.floor(length / 2)`.

For the simpler path (recommended for V1), insert at the end of the article body and add `<EngineCTACard />` after that. Visual order: article body → EngineCTAInline → EngineCTACard.

Sketch:
```tsx
import EngineCTAInline from "@/components/EngineCTAInline";
import EngineCTACard from "@/components/EngineCTACard";
// ...
return (
  <article className="...">
    {/* existing post header */}
    {/* existing post body */}
    <EngineCTAInline />
    {/* existing footer/share/etc. */}
    <EngineCTACard />
  </article>
);
```

- [ ] **Step 15.2:** `npm run dev`. Open any blog post (e.g., `/blog/best-peptides-for-weight-loss`). Verify both CTAs render, both link to `auraprotocols.com`, both open in a new tab.

- [ ] **Step 15.3:** Commit.

```bash
git add src/app/blog/[slug]/page.tsx
git commit -m "feat(blog): inject inline + end-of-post Engine CTAs"
```

---

## Task 16: Wire EngineCTACard into compare and product pages

**Files:**
- Modify: `src/app/compare/[slug]/page.tsx`
- Modify: `src/app/products/[slug]/page.tsx`

- [ ] **Step 16.1:** Compare page: add `import EngineCTACard from "@/components/EngineCTACard";` and render `<EngineCTACard />` after the FAQ/last content section, before the closing tag.

- [ ] **Step 16.2:** Product page: same — add `<EngineCTACard />` near the bottom. Verify the existing affiliate "Buy" CTA still renders prominently and carries `rel="noopener noreferrer sponsored"` (this should already be the case from Task 11; if not, fix here).

- [ ] **Step 16.3:** Manual check both routes at `npm run dev`.

- [ ] **Step 16.4:** Commit.

```bash
git add src/app/compare/[slug]/page.tsx src/app/products/[slug]/page.tsx
git commit -m "feat(cta): add Engine card to compare and product pages"
```

---

## Task 17: Playbook landing page

**Files:**
- Create: `src/app/playbook/page.tsx`

> Gumroad-hosted product. Page is a static sales page with a single Gumroad-embed-or-link CTA. No checkout code in this repo.

- [ ] **Step 17.1:** Write the page.

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import EmailCapture from "@/components/EmailCapture";
import { PLAYBOOK, EXTERNAL_REL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "The Peptide Protocol Playbook — Aura Protocols",
  description: `$${PLAYBOOK.priceUsd} digital guide: dosing, stacking, cycling, COA-reading. Written by the team behind Aura Protocols.`,
  alternates: { canonical: "/playbook" },
};

export default function PlaybookPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-widest text-cyan-300">
        Digital guide — ${PLAYBOOK.priceUsd}
      </p>
      <h1 className="font-display mt-3 text-4xl font-bold text-white md:text-5xl">
        The Peptide Protocol Playbook
      </h1>
      <p className="mt-4 text-lg text-slate-300">
        Everything we wish someone had written when we started: dosing math for BPC-157, TB-500,
        CJC-1295/Ipamorelin and semaglutide; how to stack and cycle without burning receptors;
        and how to read a COA so you know what you're actually injecting.
      </p>
      <ul className="mt-6 space-y-2 text-slate-300">
        <li>• 40+ page PDF, plain-language, citation-backed.</li>
        <li>• Dosing calculators for the 6 most-used research peptides.</li>
        <li>• A 5-minute COA inspection checklist.</li>
        <li>• Lifetime updates as the regulatory landscape changes.</li>
      </ul>
      <Link
        href={PLAYBOOK.gumroadUrl}
        target="_blank"
        rel={EXTERNAL_REL}
        className="btn-primary mt-8 inline-flex"
      >
        Buy the Playbook — ${PLAYBOOK.priceUsd} →
      </Link>
      <p className="mt-4 text-xs text-slate-500">
        Educational content. Not medical advice. Aura Protocols is an affiliate publisher.
      </p>
      <div className="mt-12">
        <EmailCapture />
      </div>
    </main>
  );
}
```

- [ ] **Step 17.2:** Add a link to the Playbook in the homepage hero or one of the existing nav surfaces (Footer is the safest — Navbar is locked per CLAUDE.md).

Open `src/components/Footer.tsx`. Add a new link entry in the existing "Library" or "Resources" column: `<Link href="/playbook">Playbook</Link>`. Do not restructure the Footer beyond this addition.

- [ ] **Step 17.3:** `npm run dev` + `npm run build`. Verify `/playbook` renders and the build picks it up in the static export output.

- [ ] **Step 17.4:** Commit.

```bash
git add src/app/playbook src/components/Footer.tsx
git commit -m "feat(playbook): add $97 Playbook landing page"
```

---

## Task 18: Expand top-3 blog posts to ≥2,500 words

**Files:**
- Modify: `src/data/posts.ts`

> Content work, not code work. The expansion criteria below are firm; the wording is the writer's. Set aside a focused content block (~3 hours per post). Internal links are non-negotiable — they are the SEO mechanism this whole rebuild rests on.

- [ ] **Step 18.1:** Open `src/data/posts.ts` and identify the top 3 posts by intended search volume / commercial intent. Default selection (override if a different post has better data):
  1. `best-peptides-for-weight-loss`
  2. `semaglutide-vs-tirzepatide`
  3. `bpc-157-tb-500-stack` (or the closest existing slug to BPC-157 / recovery)

- [ ] **Step 18.2:** For each of the 3 posts, expand the body to ≥2,500 words. Each expanded post MUST include:
  - An updated `excerpt` (≤180 chars) ending on a benefit, not a feature.
  - At least **3 internal links** to other on-site pages: minimum 1 product page, 1 comparison page, and 1 other blog post.
  - At least **1 link to the Engine** (`auraprotocols.com`) inside the article body (in addition to the auto-injected CTAs from Task 15).
  - At least **1 affiliate vendor link** with `rel="noopener noreferrer sponsored"` to a relevant product.
  - A standalone *"FAQ"* section with 4–6 questions, marked up as JSON-LD if the blog template emits structured data. If the template does not yet emit FAQ JSON-LD, **do not** add the schema in this task — leave it to a future SEO sprint.
  - Updated `wordCount` field on the post object (add the field to the type if it doesn't exist; this is a permitted edit to `posts.ts` per this plan).
  - Updated `lastUpdated` timestamp to today's date.

- [ ] **Step 18.3:** Verify with a quick word count check. Open the file and run a one-off node count or paste each `body` into any word-count tool. Targeting ≥2,500 words per post.

- [ ] **Step 18.4:** `npm run dev` — visit each of the three posts and visually verify (a) headings render, (b) internal links work and don't 404, (c) affiliate link opens in new tab with `rel="sponsored"` (DevTools → inspect anchor).

- [ ] **Step 18.5:** Commit (one commit per post is fine, or one bundled commit — choose based on review preference).

```bash
git add src/data/posts.ts
git commit -m "content(blog): expand top-3 posts to 2,500+ words with internal links"
```

---

## Task 19: Cleanup + final verification

**Files:**
- Delete: `src/app/_page.tsx.bak`
- Verify: all routes build, all tests pass, lint clean

- [ ] **Step 19.1:** Delete the leftover backup.

```bash
rm src/app/_page.tsx.bak
```

- [ ] **Step 19.2:** Run the full check.

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
```
Expected: lint clean, types clean, all tests green, static export builds.

- [ ] **Step 19.3:** Inspect the built `out/` (or `.next/server/app/`) directory. Verify these routes appear as static HTML:
  - `/`, `/about`, `/playbook`, `/privacy`, `/terms`
  - `/blog`, `/blog/[every-post-slug]`
  - `/compare`, `/compare/[every-comparison-slug]`
  - `/products`, `/products/[every-product-slug]`
  - `/validate/deposit-recovery`, `/validate/deposit-gh`
  - `/validate/positioning-v1`, `/validate/positioning-v2`, `/validate/positioning-v3`
  - `/validate/wearable`

Verify `/validate/*` HTML files contain `<meta name="robots" content="noindex,nofollow,nocache">`.

- [ ] **Step 19.4:** Sitemap inspection — `curl http://localhost:3000/sitemap.xml` (after `npm run start`) and confirm `/validate/*` is NOT listed; `/playbook` IS listed.

- [ ] **Step 19.5:** Commit cleanup + tag the rebuild milestone.

```bash
git add -A
git commit -m "chore: remove _page.tsx.bak; finalize shop-rebuild"
git tag shop-rebuild-week1-complete
```

---

## Done — what ships at the end of this plan

After Task 19, `shop.auraprotocols.com` is the production Editorial layer the spec describes:
- Homepage built around the three-layer value prop with trust stats.
- Engine CTA in three placements (sticky banner, inline mid-post, end-of-post card) wired across all content surfaces.
- Email capture surfaced on homepage, every Playbook page, and every validation page.
- Playbook landing page live for the $97 bridge product.
- Seven validation pages live under `/validate/*` carrying `noindex,nofollow`, ready for the Month 0 paid micro-tests.
- Sitemap surfaces `/playbook`, excludes `/validate/*`.
- All affiliate outbound links carry `rel="noopener noreferrer sponsored"`.
- Top-3 blog posts at ≥2,500 words each with internal-link mesh.
- Test harness in place for future regressions.

## What is NOT done (deferred to other plans)
- `auraprotocols.com` Engine itself — `engine-mvp` plan.
- Aura Clinical landing pages — `clinical-backend` plan (different repo/domain).
- Beehiiv publication setup, Gumroad product upload, Stripe Payment Links creation — these are operator tasks for Kearney; the codebase reads the resulting URLs from `src/lib/constants.ts`.
- Ad creative + ad spend execution — `distribution-program` plan.
- Lead-magnet PDF design + hosting — operator task; once hosted, drop the URL into the Beehiiv welcome email, no code change here.

---

## Open questions surfaced during plan-writing

1. **Beehiiv vs Sender vs ConvertKit.** The spec §12.2 lists all three as candidates. The code references `LEAD_MAGNET.beehiivEmbedUrl` — if Kearney picks Sender or ConvertKit instead, rename the constant and swap the iframe `src`. No structural change.
2. **Footer link surfaces.** The plan adds a single Playbook link to the Footer. If the Footer columns are tight, decide which column it lives in during Task 17.2.
3. **Top-3 blog post selection.** Defaults listed in Task 18.1; override if Search Console data points elsewhere.
