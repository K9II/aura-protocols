# Modality Telehealth Surface — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a new standalone Next.js app, `apps/modality`, that serves the Modality telehealth front door for `modalityhealth.com` — the approved "Two Doors" landing (browse-first, wearable optional) with the live biosignature sphere and a formulary index driven by the live LegUpRx catalog, capturing a first-party opt-in before handing off via a `/go` redirect that carries `partner_id` + `sub` attribution.

**Architecture:** New pnpm workspace app mirroring `apps/shop`'s Next 16 config. The telehealth plumbing (`lib/telehealth/*`, the `/go` redirect route, the opt-in API) is **copied and re-homed** into `apps/modality` — the user explicitly chose isolation over a shared package, and `apps/shop/telehealth` is left untouched. Because the whole site is telehealth, routes drop the `/telehealth` prefix: the funnel is `/`, the redirect is `/go/[category]/[id]`, the opt-in is `/api/optin`. UI is ported verbatim from the approved mockup at `docs/superpowers/mockups/2026-08-10-modality-telehealth-approved.html` (Direction D layout + Direction E bordeaux-on-bone palette, browse-first).

**Tech Stack:** Next.js 16.2.3 (App Router, Node runtime), React 19, Tailwind CSS v4, TypeScript 5, `@supabase/supabase-js`, `zod`, Vitest. Canvas 2D for the sphere (no new deps).

---

## ⚠️ Before you write any code

1. **Read the Next 16 docs first** (repo rule in `AGENTS.md`): this is NOT the Next.js in your training data. Before touching app-router files, read the relevant guides in `apps/modality/node_modules/next/dist/docs/` (or `apps/shop/node_modules/...` until modality installs) — routing, `route.ts` handlers, `next/font`, metadata. Heed deprecation notices.
2. **The mockup is the source of truth for UI.** Per the standing match-mockup rule, port markup/CSS directly from `docs/superpowers/mockups/2026-08-10-modality-telehealth-approved.html`. Do not freestyle layout.
3. **Privacy floor:** Modality is a referral partner, NOT a medical provider. No medical/PHI language, no health data captured on our side. Every funnel surface carries the partner disclaimer (see Task 8).

## File Structure

```
apps/modality/
  package.json                     # @aura/modality — mirror shop deps
  next.config.ts                   # minimal (no affiliate redirects)
  tsconfig.json                    # copy shop
  postcss.config.mjs               # copy shop (tailwind v4)
  eslint.config.mjs                # copy shop
  vitest.config.ts                 # copy shop
  .env.example                     # documents required env
  src/
    app/
      layout.tsx                   # Modality metadata + fonts + globals
      globals.css                  # Direction E design tokens + utilities
      page.tsx                     # THE funnel: Two Doors + formulary index (server)
      StartVisit.tsx               # "use client" — opt-in modal → /go (ported)
      Doors.tsx                    # "use client" — the two-door hero controls (optional personalize)
      go/[category]/[id]/route.ts  # 302 redirect + sub attribution (re-homed)
      api/optin/route.ts           # first-party opt-in upsert (re-homed)
      disclosures/page.tsx         # full telehealth disclosures (ported from shop)
    components/
      BiosignatureSphere.tsx       # copied from apps/shop, recolored bordeaux
    lib/telehealth/
      config.ts  types.ts  catalog.ts  redirect.ts  channels.ts  supabase.ts   # copied verbatim
  tests/
    lib/telehealth/
      catalog.test.ts  redirect.test.ts  channels.test.ts  config.test.ts       # copied verbatim
```

**Deferred (not in this plan):** the inbound `/api/webhook` (attribution events) and `memberApi`/`dashboard` — Phase 2, blocked on the live LegUpRx account. Note left in `.env.example`.

---

### Task 0: Scaffold `apps/modality` from the shop's config

**Files:**
- Create: `apps/modality/package.json`
- Create: `apps/modality/next.config.ts`
- Create: `apps/modality/tsconfig.json` (copy of `apps/shop/tsconfig.json`)
- Create: `apps/modality/postcss.config.mjs` (copy of shop's)
- Create: `apps/modality/eslint.config.mjs` (copy of shop's)
- Create: `apps/modality/vitest.config.ts` (copy of shop's)
- Create: `apps/modality/.gitignore` (copy of shop's)

- [ ] **Step 1: Copy the shop's non-source config files verbatim**

Copy each of these from `apps/shop/` to `apps/modality/`, unchanged: `tsconfig.json`, `postcss.config.mjs`, `eslint.config.mjs`, `vitest.config.ts`, `.gitignore`. (Read each shop file first to confirm exact contents; they are Next-16/Tailwind-v4 correct already.)

- [ ] **Step 2: Write `apps/modality/package.json`**

Mirror `apps/shop/package.json` but rename and drop deps the funnel doesn't need (`@aws-sdk/client-sesv2`, `@vercel/analytics` optional — keep analytics if desired):

```json
{
  "name": "@aura/modality",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.106.2",
    "next": "16.2.3",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "zod": "^4.4.3"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/react": "^16.3.2",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@vitejs/plugin-react": "^6.0.2",
    "eslint": "^9",
    "eslint-config-next": "16.2.3",
    "jsdom": "^29.1.1",
    "tailwindcss": "^4",
    "typescript": "^5",
    "vitest": "^4.1.7"
  }
}
```

- [ ] **Step 3: Write `apps/modality/next.config.ts` (minimal — no affiliate redirects)**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;
```

- [ ] **Step 4: Install and verify the workspace picks up the new app**

Run: `pnpm install` (from repo root)
Expected: installs `@aura/modality`; no errors. `pnpm --filter @aura/modality exec next --version` prints `16.2.3`.

- [ ] **Step 5: Commit**

```bash
git add apps/modality
git commit -m "chore(modality): scaffold standalone telehealth app"
```

---

### Task 1: Re-home the telehealth lib (copy verbatim, with tests)

**Files:**
- Create: `apps/modality/src/lib/telehealth/config.ts`
- Create: `apps/modality/src/lib/telehealth/types.ts`
- Create: `apps/modality/src/lib/telehealth/catalog.ts`
- Create: `apps/modality/src/lib/telehealth/redirect.ts`
- Create: `apps/modality/src/lib/telehealth/channels.ts`
- Create: `apps/modality/src/lib/telehealth/supabase.ts`
- Create (tests): `apps/modality/tests/lib/telehealth/{catalog,redirect,channels,config}.test.ts`

- [ ] **Step 1: Copy the six lib files verbatim** from `apps/shop/src/lib/telehealth/` to `apps/modality/src/lib/telehealth/`. They import each other with relative paths (`./config`, `./types`) and `supabase.ts` uses the `@/` alias — the copied `tsconfig.json` already maps `@/*` → `src/*`, so no changes needed. Do NOT copy `memberApi.ts`, `dashboard.ts`, `signature.ts` (Phase 2).

- [ ] **Step 2: Copy the four test files verbatim** from `apps/shop/tests/lib/telehealth/` to `apps/modality/tests/lib/telehealth/`.

- [ ] **Step 3: Run the copied tests**

Run: `pnpm --filter @aura/modality test`
Expected: PASS — catalog/redirect/channels/config suites green (same as shop).

- [ ] **Step 4: Commit**

```bash
git add apps/modality/src/lib apps/modality/tests
git commit -m "feat(modality): re-home telehealth catalog/redirect/attribution lib"
```

---

### Task 2: Re-home the `/go` redirect and `/api/optin` (drop the `/telehealth` prefix)

**Files:**
- Create: `apps/modality/src/app/go/[category]/[id]/route.ts`
- Create: `apps/modality/src/app/api/optin/route.ts`

- [ ] **Step 1: Write `go/[category]/[id]/route.ts`** — identical logic to `apps/shop/src/app/telehealth/go/[category]/[id]/route.ts`, just re-homed (imports resolve via `@/lib/telehealth/*`):

```ts
import { getPartnerId } from "@/lib/telehealth/config";
import { fetchCatalog } from "@/lib/telehealth/catalog";
import { isAllowedIntakeHost, appendSub } from "@/lib/telehealth/redirect";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ category: string; id: string }> },
): Promise<Response> {
  const { category, id } = await params;
  const res = await fetchCatalog(category, getPartnerId());
  if (!res.ok) return new Response("Catalog unavailable", { status: 502 });
  const product = res.products.find((p) => p.id === id);
  if (!product) return new Response("Not found", { status: 404 });
  if (!isAllowedIntakeHost(product.intakeUrl)) return new Response("Blocked destination", { status: 502 });

  const subParam = new URL(req.url).searchParams.get("sub");
  const sub = subParam ? Number(subParam) : null;
  return Response.redirect(appendSub(product.intakeUrl, sub), 302);
}
```

- [ ] **Step 2: Write `api/optin/route.ts`** — same as shop's `api/telehealth/optin/route.ts`:

```ts
import { z } from "zod";
import { getTelehealthSupabaseClient } from "@/lib/telehealth/supabase";

const optinSchema = z.object({
  email: z.string().email(),
  category: z.string().min(1),
});

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON body" }, { status: 400 }); }

  const parsed = optinSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  const { email, category } = parsed.data;

  const supabase = getTelehealthSupabaseClient();
  const { error } = await supabase
    .from("telehealth_optins")
    .upsert({ email, category, created_at: new Date().toISOString() }, { onConflict: "email" })
    .select()
    .single();

  if (error) return Response.json({ error: "Could not save opt-in" }, { status: 500 });
  return Response.json({ ok: true }, { status: 200 });
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/modality/src/app/go apps/modality/src/app/api
git commit -m "feat(modality): re-home /go redirect + /api/optin"
```

---

### Task 3: Modality design tokens + fonts (`globals.css`, `layout.tsx`)

**Files:**
- Create: `apps/modality/src/app/globals.css`
- Create: `apps/modality/src/app/layout.tsx`

**Font decision (confirm with Kearney; swappable):** display serif = **Newsreader**, body = **Inter**, mono/labels = **JetBrains Mono**, all via `next/font/google`. These reproduce the approved mockup's editorial-serif + neutral-sans + mono pairing with licensed webfonts.

- [ ] **Step 1: Write `globals.css`** — Tailwind v4 import + the Direction E palette as tokens (values taken from the approved mockup):

```css
@import "tailwindcss";

:root {
  --paper: #ECEDE7;
  --paper-2: #E3E4DC;
  --paper-3: #D9DAD0;
  --ink: #211E1B;
  --ink-soft: #615B54;
  --ink-faint: #8E877D;
  --line: rgba(33, 30, 27, 0.16);
  --line-soft: rgba(33, 30, 27, 0.09);
  --accent: #7A2E2E;         /* bordeaux */
  --accent-ink: #5F2323;
  --tint: rgba(122, 46, 46, 0.07);
  /* biosphere feeds these as "r,g,b" strings */
  --bios-accent: 122, 46, 46;
  --bios-ink: 33, 30, 27;
}

html, body { background: var(--paper); color: var(--ink); }
body { font-family: var(--font-sans), system-ui, sans-serif; line-height: 1.55; -webkit-font-smoothing: antialiased; }

/* utility classes ported from the mockup (m- prefix to avoid clashes) */
.m-serif { font-family: var(--font-serif), Georgia, serif; }
.m-mono  { font-family: var(--font-mono), ui-monospace, monospace; }

@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
```

(Port the remaining component classes — `.door`, `.irow`, `.bios-label`, etc. — from the mockup `<style>` block into this file, renaming the mockup's `.dir-d ...` scoping to plain classes. Keep every rule; only drop the `.dir-d` prefix and the study-wrapper chrome.)

- [ ] **Step 2: Write `layout.tsx`** with fonts + Modality metadata:

```tsx
import type { Metadata } from "next";
import { Newsreader, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const serif = Newsreader({ subsets: ["latin"], variable: "--font-serif", display: "swap" });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://modalityhealth.com"),
  title: "Modality — Prescription care, matched to you",
  description: "Browse a clinician-led formulary and start a telehealth visit. Connect a wearable to personalize your match — optional, never required.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Verify dev server boots and the palette renders**

Run: `pnpm --filter @aura/modality dev`, open `http://localhost:3000`.
Expected: bone-colored background, fonts load (no FOUT to system default lingering). (Page is still empty/default — that's Task 5.)

- [ ] **Step 4: Commit**

```bash
git add apps/modality/src/app/globals.css apps/modality/src/app/layout.tsx
git commit -m "feat(modality): Direction E design tokens + fonts"
```

---

### Task 4: BiosignatureSphere, recolored bordeaux

**Files:**
- Create: `apps/modality/src/components/BiosignatureSphere.tsx` (from `apps/shop/src/components/BiosignatureSphere.tsx`)

- [ ] **Step 1: Copy the shop component verbatim**, then apply exactly these recolor edits (the shop version is already the light point-cloud sphere; only the accent constants change to bordeaux):

- Change `const SPECIMEN = "163, 43, 31";` → `const SPECIMEN = "122, 46, 46";`
- Change `const SPECIMEN_DARK = "104, 25, 18";` → `const SPECIMEN_DARK = "95, 35, 35";`
- Leave `const INK = "28, 24, 19";` (or set to `"33, 30, 27"` to match the mockup ink exactly — either reads correctly on bone).
- The component references CSS vars `--specimen`, `--ink-soft` for its HTML labels/live-dot; confirm those exist in `globals.css` (add `--specimen: var(--accent);` alias and a `.p-live-dot` rule ported from shop `globals.css` if the component depends on them).

- [ ] **Step 2: Verify it renders and animates** by temporarily importing it into `page.tsx` (or a scratch route). Drag to rotate works; correlation connector pulses bordeaux; respects reduced-motion.

- [ ] **Step 3: Commit**

```bash
git add apps/modality/src/components/BiosignatureSphere.tsx
git commit -m "feat(modality): biosignature sphere, recolored bordeaux"
```

---

### Task 5: The funnel page — Two Doors + formulary index (browse-first)

**Files:**
- Create: `apps/modality/src/app/page.tsx` (server component)
- Create: `apps/modality/src/app/StartVisit.tsx` (`"use client"`, ported from shop `TelehealthStartVisit.tsx`)

- [ ] **Step 1: Write `StartVisit.tsx`** — port `apps/shop/src/app/telehealth/TelehealthStartVisit.tsx`, changing the go URL to the un-prefixed route and the opt-in endpoint:
  - `const goUrl = \`/go/${category}/${productId}${sub ? \`?sub=${sub}\` : ""}\`;`
  - fetch `"/api/optin"` (was `/api/telehealth/optin`)
  - Restyle the modal with Modality classes from the mockup (bordeaux primary button, bone modal). Keep the best-effort save (a save failure must NOT block the hand-off) and the "Skip and continue" affordance.

- [ ] **Step 2: Write `page.tsx`** — server component that fetches the live catalog for all `TELEHEALTH_CATEGORIES` and renders the approved layout:
  - Reuse the shop pattern: `const partnerId = getPartnerId(); const sections = await Promise.all(TELEHEALTH_CATEGORIES.map(...fetchCatalog...));` with `export const dynamic = "force-dynamic";`.
  - Structure per the mockup: Modality wordmark → hero (`kicker`, serif headline with bordeaux `<em>signal</em>`, sub) → the two doors (primary **"Browse the formulary · No device needed"** first, secondary **"Personalize with my data · Optional"** second) → the instrument card wrapping `<BiosignatureSphere />` with the "Your biosignature · live" cap and the correlation readout → the formulary index built from the fetched catalog (one row per product: code, serif name + `availability` sub, `from $X/mo`, linking each row to the `StartVisit` control) → the partner disclaimer (Task 8).
  - "Browse the formulary" anchors to `#formulary`; "Personalize" anchors to the instrument / opens the connect path (for now a link to `#formulary` with the optional framing — real wearable connect is Phase 2).
  - The "★ Matches your signal" flag is presentational only; render it behind a `false` flag constant (`SIGNAL_CONNECTED = false`) so it's hidden until wearable connect exists. Wire the constant, not hard-coded rows.

- [ ] **Step 3: Verify end-to-end in dev** — `pnpm --filter @aura/modality dev`:
  - Formulary lists live products; "from $X/mo" matches catalog.
  - Clicking a row → opt-in modal → submit → network POST to `/api/optin` → browser navigates to `/go/<cat>/<id>` → 302 to an allow-listed intake host with `?sub=` when a `utm_source` is present.
  - "Skip and continue" bypasses the email and still hands off.

- [ ] **Step 4: Commit**

```bash
git add apps/modality/src/app/page.tsx apps/modality/src/app/StartVisit.tsx
git commit -m "feat(modality): Two Doors funnel + formulary index (browse-first)"
```

---

### Task 6: Channel attribution from `utm_source`

**Files:**
- Modify: `apps/modality/src/app/page.tsx`

- [ ] **Step 1: Wire `subForUtm`** exactly as shop does — read `searchParams.utm_source`, compute `const sub = subForUtm(utm_source);`, and pass `sub` into every `StartVisit` control so it rides the `/go` link. (Signature: `page.tsx` takes `{ searchParams: Promise<{ utm_source?: string }> }` and `await`s it.)

- [ ] **Step 2: Verify** visiting `/?utm_source=instagram` results in `/go/...?sub=4` (Instagram) after hand-off; no utm → `sub=2` (Direct).

- [ ] **Step 3: Commit**

```bash
git add apps/modality/src/app/page.tsx
git commit -m "feat(modality): subId channel attribution from utm_source"
```

---

### Task 7: Disclosures page + on-page disclaimer

**Files:**
- Create: `apps/modality/src/app/disclosures/page.tsx` (port from `apps/shop/src/app/telehealth/disclosures/page.tsx`, restyled to Modality tokens, brand "Modality" not "Aura Telehealth")
- Modify: `apps/modality/src/app/page.tsx` (footer disclaimer block linking to `/disclosures`)

- [ ] **Step 1: Port the disclosures page**, replacing Aura branding with Modality and keeping the substance: Modality is not a medical provider; care is delivered by the licensed partner (Leg Up Recovery) and its affiliated medical group; independent clinicians make all decisions; programs/pricing/availability vary by state; not a substitute for professional care; emergencies call 911; Modality may receive compensation.

- [ ] **Step 2: Add the on-page disclaimer** to `page.tsx` (port the shop's `/telehealth` footer disclaimer block, rebranded), linking to `/disclosures`.

- [ ] **Step 3: Verify** both the on-page disclaimer and `/disclosures` render and the link works.

- [ ] **Step 4: Commit**

```bash
git add apps/modality/src/app/disclosures apps/modality/src/app/page.tsx
git commit -m "feat(modality): compliance disclosures + on-page disclaimer"
```

---

### Task 8: Env, docs, and quality gate

**Files:**
- Create: `apps/modality/.env.example`
- Modify: `apps/modality/README.md` (create)

- [ ] **Step 1: Write `.env.example`**

```bash
# LegUpRx partner code (falls back to documented example RFMLPVN1 in dev)
TELEHEALTH_PARTNER_ID=
# Telehealth Supabase project (SEPARATE from shop/engine) — service role bypasses RLS, server-only
TELEHEALTH_SUPABASE_URL=
TELEHEALTH_SUPABASE_SERVICE_ROLE_KEY=
# Phase 2 (deferred): inbound webhook HMAC secret, member API — not used by the stage-1 funnel
# TELEHEALTH_WEBHOOK_SECRET=
```

- [ ] **Step 2: Write a short `README.md`** noting: this is the Modality standalone surface for modalityhealth.com; uses the telehealth Supabase project; `pnpm --filter @aura/modality dev`; the funnel is `/`; hand-off is `/go/[category]/[id]`; UI source of truth is `docs/superpowers/mockups/2026-08-10-modality-telehealth-approved.html`.

- [ ] **Step 3: Full quality gate**

Run: `pnpm --filter @aura/modality lint && pnpm --filter @aura/modality typecheck && pnpm --filter @aura/modality test && pnpm --filter @aura/modality build`
Expected: all green; production build succeeds.

- [ ] **Step 4: Commit**

```bash
git add apps/modality/.env.example apps/modality/README.md
git commit -m "docs(modality): env example + README"
```

---

### Task 9: Deployment (Vercel project + domain) — documented, executed with Kearney

**Files:** none (ops)

- [ ] **Step 1: Create a new Vercel project** pointing at this repo, **Root Directory = `apps/modality`**, framework Next.js. (Separate project from the shop.)
- [ ] **Step 2: Set env vars** in the Vercel project: `TELEHEALTH_PARTNER_ID`, `TELEHEALTH_SUPABASE_URL`, `TELEHEALTH_SUPABASE_SERVICE_ROLE_KEY` (reuse the existing telehealth Supabase project). Deploy is HELD on the real `TELEHEALTH_PARTNER_ID` per the standing token gate — dev uses `RFMLPVN1`.
- [ ] **Step 3: Attach the domain** `modalityhealth.com` (pending USPTO Class 44 clearance gate — confirm with Kearney before pointing DNS).
- [ ] **Step 4:** Confirm `turbo run build`/`dev` include the new app automatically (workspace glob `apps/*` already covers it).

---

## Self-Review

**Spec coverage:** Two Doors layout ✓ (T5), E palette ✓ (T3), browse-first primary ✓ (T5), biosphere ported+recolored ✓ (T4), formulary from live catalog ✓ (T5), opt-in→/go with attribution ✓ (T2/T5/T6), wearable optional / signal-not-gate ✓ (T5, `SIGNAL_CONNECTED` flag + secondary door), standalone app for modalityhealth.com ✓ (T0/T9), compliance ✓ (T7). Deferred webhook/memberApi explicitly scoped out.

**Type consistency:** `CatalogProduct` fields (`id/name/availability/fromPrice/intakeUrl`) used in T5 match `types.ts` (T1). `getPartnerId`, `fetchCatalog`, `subForUtm`, `appendSub`, `isAllowedIntakeHost` used exactly as defined in the copied lib. Route param signature `{ params: Promise<{...}> }` matches Next 16 (verified against shop).

**Open decisions flagged for Kearney:** (a) font choices (Newsreader/Inter/JetBrains Mono); (b) DNS cutover gated on trademark clearance; (c) whether to also expose the funnel at a `/telehealth` alias for parity — currently root-only.
