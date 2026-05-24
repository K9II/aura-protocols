# Engine MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Engine MVP at `auraprotocols.com` — a free Peptide Protocol Engine that connects wearables via Terra API, stores fitness data in Supabase, calls Claude for personalized protocol recommendations, and routes prescribe-grade demand to Aura Clinical. Ship by end of Month 1 with ≥50 connected wearables per spec §5.2 Track B and §8.1.

**Architecture:** A **new** Next.js 16 project at the top-level path `engine/` (sibling to the existing `shop.auraprotocols.com` repo root), with its own `package.json`, `.git`, and Vercel project. Runs in Node runtime (NOT static export — OAuth callbacks, Terra webhooks, and server-side Claude API calls require Route Handlers). Same Tailwind v4 design tokens as `shop.auraprotocols.com` so brand stays consistent. Supabase handles auth (email magic link) + Postgres + RLS. Terra API is the single wearable aggregator. Anthropic SDK with prompt caching does personalization on top of a deterministic safety-rule engine. Three protocol templates v0 (Recovery, GH, Sleep/Stress). Manual CSV/JSON upload as the §6 E-1 fallback for users without supported wearables. Disclaimer + "Get this prescribed" CTA appear on every recommendation surface (§4.1, §6 E-2). Thumbs-up/down + free-text feedback widget on every recommendation (§11.3).

**Tech Stack:** Next.js 16 App Router (Node runtime), React 19, Tailwind v4, TypeScript 5, Vitest + @testing-library/react, Supabase JS client + Supabase Auth helpers, Terra API (HTTP via fetch — no SDK at MVP scope), Anthropic SDK with prompt caching, Zod for input/output schema validation.

**Out of scope for this plan (handled by other plans in the four-plan split):**
- Editorial site at `shop.auraprotocols.com` — `shop-rebuild` plan.
- Aura Clinical brand, MD network, pharmacy, EHR — `clinical-backend` plan.
- Paid Engine tier ($9–19/mo) — explicitly deferred to Month 4–5 per spec §4.1.
- Ad creative + ad spend — `distribution-program` plan.

---

## Pre-Plan Setup: Read This First

**Next.js 16 caveat (CRITICAL):** Per the repo `AGENTS.md`, Next.js 16 has breaking changes vs prior major versions — APIs, conventions, and file structure may differ from training data. Before any task that touches an unfamiliar Next.js API (Route Handlers, `runtime` exports, metadata, generateStaticParams, dynamic params, cookies/headers in server components, middleware), open `engine/node_modules/next/dist/docs/` or use the docs MCP — do not write from memory. Pay particular attention to:
- Route Handlers may have changed signatures or new constraints around `runtime`.
- Cookies/headers API for server-side Supabase session reading.
- Dynamic route param handling (sync vs async params).

**Server runtime requirement (NOT static export):** Unlike the shop site, this Engine project must run on a Node server because of:
- Supabase auth callback handling.
- Terra widget OAuth callback + Terra webhook receiver.
- Server-side Anthropic SDK calls (the API key must never reach the browser).
- Per-request RLS-scoped Supabase queries.

Set `output: "standalone"` (or omit `output` entirely) in `next.config.ts`. Do NOT set `output: "export"`.

**Brand constants (do not paraphrase, copy exactly):**
- `BASE_URL = "https://auraprotocols.com"` — this project's canonical origin.
- `SHOP_URL = "https://shop.auraprotocols.com"` — the Editorial sibling site.
- `CLINICAL_URL = "https://auraclinical.com"` — placeholder until clinical-backend plan locks the final domain. Stored once in constants, swapped in one place.
- `DISCLAIMER = "Educational only. Not medical advice. The Engine produces protocol suggestions; medical judgment requires a licensed clinician."` — appears on every recommendation surface (§4.1, §6 E-2).
- `PRESCRIBE_CTA_COPY = "Get this prescribed at Aura Clinical →"` — appears on every recommendation surface (§4.1).

**Privacy framing (must be enforced in copy + schema):** The Engine handles **fitness data, not protected health information.** Onboarding copy, privacy page, and database column naming all use the term *biometrics* / *fitness data*. Never *medical*, *clinical*, *patient*, *diagnosis*, or *PHI* on the Engine surface. The "Get this prescribed" CTA hands the user off to the Clinical brand at the point medical judgment begins — see spec §4.1 and risk E-2.

**Safety floor (deterministic rules, never LLM-only):**
- The recommendation engine is rules + LLM hybrid. **Rules enforce contraindications and dose ceilings; LLM personalizes within the safe envelope.** No protocol output may bypass the rule layer.
- The rule layer is plain TypeScript with full unit-test coverage. The LLM layer is mocked in tests.

**Cost guardrails:**
- Anthropic budget ~$50/mo (spec §7.1) — every system prompt is **prompt-cached** via `cache_control` ephemeral breakpoints.
- Terra API dev tier free Months 1–2; production tier (~$99/mo) starts Month 3 (§7.1). The code does not differentiate — same endpoints, just billed tier.

---

## File Structure (locked before tasks)

**Created (new project at `engine/`):**
- `engine/package.json`
- `engine/tsconfig.json`
- `engine/next.config.ts`
- `engine/postcss.config.mjs`
- `engine/.env.local.example`
- `engine/.gitignore`
- `engine/AGENTS.md` — copy of root `AGENTS.md`
- `engine/CLAUDE.md` — engine-specific design notes
- `engine/vitest.config.ts`
- `engine/tests/setup.ts`
- `engine/src/app/layout.tsx`
- `engine/src/app/globals.css`
- `engine/src/app/page.tsx` — landing page
- `engine/src/app/connect/page.tsx` — wearable connect flow
- `engine/src/app/upload/page.tsx` — manual CSV/JSON upload fallback
- `engine/src/app/recommendation/page.tsx` — protocol output surface
- `engine/src/app/auth/callback/route.ts` — Supabase auth callback handler
- `engine/src/app/api/terra/connect/route.ts` — generate Terra widget session URL
- `engine/src/app/api/terra/callback/route.ts` — Terra OAuth callback handler
- `engine/src/app/api/terra/webhook/route.ts` — Terra webhook ingester
- `engine/src/app/api/upload/route.ts` — manual upload ingester
- `engine/src/app/api/recommend/route.ts` — protocol recommendation generator
- `engine/src/app/api/feedback/route.ts` — thumbs-up/down + free-text feedback
- `engine/src/app/sitemap.ts`
- `engine/src/app/robots.ts`
- `engine/src/components/Disclaimer.tsx`
- `engine/src/components/PrescribeCTA.tsx`
- `engine/src/components/FeedbackWidget.tsx`
- `engine/src/components/ConnectButton.tsx`
- `engine/src/components/ManualUploadForm.tsx`
- `engine/src/components/RecommendationCard.tsx`
- `engine/src/lib/constants.ts`
- `engine/src/lib/cn.ts`
- `engine/src/lib/supabase/server.ts`
- `engine/src/lib/supabase/client.ts`
- `engine/src/lib/supabase/admin.ts` — service-role client (server-only)
- `engine/src/lib/terra/client.ts`
- `engine/src/lib/terra/normalize.ts`
- `engine/src/lib/terra/schema.ts`
- `engine/src/lib/recommend/rules.ts`
- `engine/src/lib/recommend/templates.ts`
- `engine/src/lib/recommend/llm.ts`
- `engine/src/lib/recommend/schema.ts`
- `engine/src/lib/recommend/index.ts`
- `engine/supabase/migrations/0001_init.sql`
- `engine/supabase/migrations/0002_rls.sql`
- `engine/tests/lib/recommend/rules.test.ts`
- `engine/tests/lib/recommend/llm.test.ts`
- `engine/tests/lib/recommend/index.test.ts`
- `engine/tests/lib/terra/normalize.test.ts`
- `engine/tests/components/Disclaimer.test.tsx`
- `engine/tests/components/PrescribeCTA.test.tsx`
- `engine/tests/components/FeedbackWidget.test.tsx`
- `engine/tests/components/RecommendationCard.test.tsx`
- `engine/tests/components/ManualUploadForm.test.tsx`
- `engine/tests/api/upload.test.ts`
- `engine/tests/api/recommend.test.ts`
- `engine/tests/api/feedback.test.ts`
- `engine/tests/app/sitemap.test.ts`

**Modified:** None — this is a greenfield repo.

**Deleted:** None.

---

## Task 1: Scaffold the engine repo

**Files:**
- Create: `engine/package.json`, `engine/tsconfig.json`, `engine/next.config.ts`, `engine/postcss.config.mjs`, `engine/.gitignore`, `engine/AGENTS.md`, `engine/CLAUDE.md`

- [ ] **Step 1.1:** Confirm parent directory exists.

```bash
ls C:/Users/kadam/k9_AI_Projects/aura-protocols
```
Expected: existing shop repo contents listed, no `engine/` dir yet.

- [ ] **Step 1.2:** Create the engine directory and initialize the Next.js 16 project non-interactively. Run from inside the new directory.

```bash
mkdir -p C:/Users/kadam/k9_AI_Projects/aura-protocols/engine
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine
npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*" --no-eslint --use-npm
```

Expected: Next.js 16 scaffold completes inside `engine/`. If `create-next-app` prompts about overwriting an empty directory, accept.

- [ ] **Step 1.3:** Verify Next.js major version is 16.x.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && node -p "require('./package.json').dependencies.next"
```
Expected: a string starting with `^16.` or `16.`. If 15 or earlier, abort and re-run `create-next-app@latest` after upgrading `npx`.

- [ ] **Step 1.4:** Open `engine/next.config.ts` and confirm it does NOT set `output: "export"`. The Engine must run server-side.

If a scaffold ships with `output` set, remove that line. Final minimum config:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
```

- [ ] **Step 1.5:** Initialize a separate git repo in `engine/` so the Engine ships independently of the shop repo.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && git init && git add -A && git commit -m "chore: scaffold Next.js 16 engine project"
```

- [ ] **Step 1.6:** Copy `AGENTS.md` from the root project into `engine/AGENTS.md` so any future agent runs in this subdir get the Next.js 16 warning.

`engine/AGENTS.md`:
```md
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
```

- [ ] **Step 1.7:** Create `engine/CLAUDE.md` with engine-specific design notes (mirrors the root CLAUDE.md style; shorter scope).

```md
# Aura Protocols Engine — Project Context

## What This Is
The Engine MVP at `auraprotocols.com`. Free Peptide Protocol Engine. Connects wearables via Terra API → personalized protocol via Claude (rules + LLM hybrid) → routes prescribe-grade demand to Aura Clinical.

## Stack
- Next.js 16 App Router, Node runtime (NOT static export)
- Tailwind v4
- TypeScript 5
- Supabase (auth + Postgres + RLS)
- Terra API (HTTP via fetch)
- Anthropic SDK with prompt caching

## Privacy Framing
- Biometric data is framed as **fitness data, not PHI**.
- Never use the words "medical", "clinical", "patient", "diagnosis", "PHI" on the Engine surface.
- Every recommendation surface mounts `<Disclaimer />` and `<PrescribeCTA />`.

## Safety Floor
- Recommendations are rules + LLM hybrid. Rules enforce contraindications and dose ceilings. LLM personalizes within the safe envelope. No protocol output may bypass the rule layer.

## Brand Constants
See `src/lib/constants.ts`. Never paraphrase the disclaimer or the prescribe CTA copy.
```

- [ ] **Step 1.8:** Commit.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && git add AGENTS.md CLAUDE.md && git commit -m "docs: add agent + claude project notes"
```

---

## Task 2: Vitest + RTL harness

**Files:**
- Create: `engine/vitest.config.ts`, `engine/tests/setup.ts`
- Modify: `engine/package.json`

- [ ] **Step 2.1:** Install dev deps.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && npm i -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom @types/node
```
Expected: lockfile updated. Peer warnings about React 19 are acceptable (RTL ≥ v16 supports React 19).

- [ ] **Step 2.2:** Create `engine/vitest.config.ts`.

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

- [ ] **Step 2.3:** Create `engine/tests/setup.ts`.

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 2.4:** Add test scripts to `engine/package.json`. Merge into the existing `scripts` block; do not delete `dev`/`build`/`start`/`lint`.

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 2.5:** Smoke-check. Create `engine/tests/_smoke.test.ts`:

```ts
import { describe, it, expect } from "vitest";
describe("smoke", () => it("works", () => expect(1 + 1).toBe(2)));
```

Run:
```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && npm test
```
Expected: 1 passing test. Delete `tests/_smoke.test.ts`.

- [ ] **Step 2.6:** Commit.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && git add vitest.config.ts tests/setup.ts package.json package-lock.json && git commit -m "chore: add vitest + RTL test harness"
```

---

## Task 3: Shared constants

**Files:**
- Create: `engine/src/lib/constants.ts`
- Create: `engine/src/lib/cn.ts`

- [ ] **Step 3.1:** Write `engine/src/lib/cn.ts`.

```ts
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
```

- [ ] **Step 3.2:** Write `engine/src/lib/constants.ts`.

```ts
export const BASE_URL = "https://auraprotocols.com";
export const SHOP_URL = "https://shop.auraprotocols.com";
export const CLINICAL_URL = "https://auraclinical.com";
export const EXTERNAL_REL = "noopener noreferrer";

export const DISCLAIMER =
  "Educational only. Not medical advice. The Engine produces protocol suggestions; medical judgment requires a licensed clinician.";

export const PRESCRIBE_CTA_COPY = "Get this prescribed at Aura Clinical →";

export const SUPPORTED_WEARABLES = [
  { id: "WHOOP", label: "Whoop" },
  { id: "OURA", label: "Oura" },
  { id: "APPLE", label: "Apple Health" },
  { id: "GARMIN", label: "Garmin" },
  { id: "FITBIT", label: "Fitbit" },
  { id: "DEXCOM", label: "Dexcom CGM" },
] as const;

export type WearableId = (typeof SUPPORTED_WEARABLES)[number]["id"];

export const PROTOCOL_TEMPLATES = ["RECOVERY", "GH", "SLEEP_STRESS"] as const;
export type ProtocolTemplateId = (typeof PROTOCOL_TEMPLATES)[number];

export const PROTOCOL_LABELS: Record<ProtocolTemplateId, string> = {
  RECOVERY: "Recovery Stack",
  GH: "Growth Hormone Stack",
  SLEEP_STRESS: "Sleep & Stress Stack",
};

export const ANTHROPIC_MODEL = "claude-opus-4-7";
export const ANTHROPIC_MAX_TOKENS = 1500;
```

- [ ] **Step 3.3:** Type-check.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3.4:** Commit.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && git add src/lib/constants.ts src/lib/cn.ts && git commit -m "feat: add shared constants and cn helper"
```

---

## Task 4: Environment variable template

**Files:**
- Create: `engine/.env.local.example`
- Modify: `engine/.gitignore` (ensure `.env.local` is ignored)

- [ ] **Step 4.1:** Write `engine/.env.local.example`.

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://PLACEHOLDER.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=PLACEHOLDER_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=PLACEHOLDER_SERVICE_ROLE_KEY

# Terra API (dev tier in Months 1-2, production tier ~$99/mo from Month 3)
TERRA_DEV_ID=PLACEHOLDER_DEV_ID
TERRA_API_KEY=PLACEHOLDER_API_KEY
TERRA_SIGNING_SECRET=PLACEHOLDER_SIGNING_SECRET

# Anthropic
ANTHROPIC_API_KEY=PLACEHOLDER_ANTHROPIC_KEY

# App
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

- [ ] **Step 4.2:** Confirm `.gitignore` already lists `.env*` (Next.js scaffolds ship with this). If not, append `.env.local`.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && grep -q "^\.env" .gitignore || echo ".env*.local" >> .gitignore
```

- [ ] **Step 4.3:** Commit.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && git add .env.local.example .gitignore && git commit -m "chore: add env template"
```

---

## Task 5: Supabase schema migration

**Files:**
- Create: `engine/supabase/migrations/0001_init.sql`
- Create: `engine/supabase/migrations/0002_rls.sql`

> These SQL files are checked in for reproducibility. Kearney runs them via Supabase dashboard SQL editor or `supabase db push` (operator task). The Engine code reads from the resulting tables.

- [ ] **Step 5.1:** Write `engine/supabase/migrations/0001_init.sql`.

```sql
create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wearable_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('WHOOP','OURA','APPLE','GARMIN','FITBIT','DEXCOM','MANUAL')),
  terra_user_id text,
  connected_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists wearable_connections_user_id_idx on public.wearable_connections(user_id);
create index if not exists wearable_connections_terra_user_id_idx on public.wearable_connections(terra_user_id);

create table if not exists public.biometric_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null,
  captured_at timestamptz not null,
  recovery_score numeric,
  hrv_ms numeric,
  resting_hr_bpm numeric,
  sleep_hours numeric,
  deep_sleep_hours numeric,
  rem_sleep_hours numeric,
  steps integer,
  active_calories numeric,
  glucose_avg_mgdl numeric,
  glucose_variability numeric,
  raw jsonb,
  created_at timestamptz not null default now()
);

create index if not exists biometric_snapshots_user_captured_idx on public.biometric_snapshots(user_id, captured_at desc);

create table if not exists public.protocol_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  template text not null check (template in ('RECOVERY','GH','SLEEP_STRESS')),
  rules_summary jsonb not null,
  llm_summary jsonb not null,
  output jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists protocol_recommendations_user_idx on public.protocol_recommendations(user_id, created_at desc);

create table if not exists public.recommendation_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recommendation_id uuid not null references public.protocol_recommendations(id) on delete cascade,
  thumbs text not null check (thumbs in ('UP','DOWN')),
  free_text text,
  created_at timestamptz not null default now()
);

create index if not exists recommendation_feedback_rec_idx on public.recommendation_feedback(recommendation_id);
```

- [ ] **Step 5.2:** Write `engine/supabase/migrations/0002_rls.sql`. Every table is RLS-locked to the row's `user_id`. The service-role key (used only on the server, never shipped to the browser) bypasses RLS for webhook ingestion.

```sql
alter table public.profiles enable row level security;
alter table public.wearable_connections enable row level security;
alter table public.biometric_snapshots enable row level security;
alter table public.protocol_recommendations enable row level security;
alter table public.recommendation_feedback enable row level security;

create policy "profiles self read" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles self upsert" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles self update" on public.profiles
  for update using (auth.uid() = id);

create policy "wearable_connections self read" on public.wearable_connections
  for select using (auth.uid() = user_id);
create policy "wearable_connections self insert" on public.wearable_connections
  for insert with check (auth.uid() = user_id);
create policy "wearable_connections self update" on public.wearable_connections
  for update using (auth.uid() = user_id);

create policy "biometric_snapshots self read" on public.biometric_snapshots
  for select using (auth.uid() = user_id);
create policy "biometric_snapshots self insert" on public.biometric_snapshots
  for insert with check (auth.uid() = user_id);

create policy "protocol_recommendations self read" on public.protocol_recommendations
  for select using (auth.uid() = user_id);
create policy "protocol_recommendations self insert" on public.protocol_recommendations
  for insert with check (auth.uid() = user_id);

create policy "recommendation_feedback self read" on public.recommendation_feedback
  for select using (auth.uid() = user_id);
create policy "recommendation_feedback self insert" on public.recommendation_feedback
  for insert with check (auth.uid() = user_id);
```

- [ ] **Step 5.3:** Operator note. Add a short README at `engine/supabase/README.md` so future agents know these files are not auto-applied.

```md
# Supabase migrations

Run via Supabase dashboard SQL editor (paste each file in order) or `supabase db push` once the Supabase CLI is wired.

Apply order:
1. `0001_init.sql`
2. `0002_rls.sql`

After applying, set the env vars listed in `.env.local.example` from the Supabase project Settings → API page.
```

- [ ] **Step 5.4:** Commit.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && git add supabase/ && git commit -m "feat(db): add Supabase schema + RLS migrations"
```

---

## Task 6: Supabase clients (server, browser, admin)

**Files:**
- Create: `engine/src/lib/supabase/server.ts`, `engine/src/lib/supabase/client.ts`, `engine/src/lib/supabase/admin.ts`

- [ ] **Step 6.1:** Install Supabase deps.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && npm i @supabase/supabase-js @supabase/ssr
```
Expected: deps added.

- [ ] **Step 6.2:** Write `engine/src/lib/supabase/client.ts` — browser client for Client Components.

```ts
"use client";
import { createBrowserClient } from "@supabase/ssr";

export function getSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

- [ ] **Step 6.3:** Write `engine/src/lib/supabase/server.ts` — server client for Server Components and Route Handlers. Uses Next.js 16 cookies API. **Before writing, check `engine/node_modules/next/dist/docs/`** to confirm the cookies API signature in this Next.js version.

```ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function getSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(toSet) {
          try {
            for (const { name, value, options } of toSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Route Handlers permit cookie mutation; Server Components do not — swallow in that case.
          }
        },
      },
    },
  );
}
```

- [ ] **Step 6.4:** Write `engine/src/lib/supabase/admin.ts` — service-role client. Must never be imported from a Client Component.

```ts
import "server-only";
import { createClient } from "@supabase/supabase-js";

export function getSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
```

- [ ] **Step 6.5:** Install `server-only`.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && npm i server-only
```

- [ ] **Step 6.6:** Type-check.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 6.7:** Commit.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && git add src/lib/supabase package.json package-lock.json && git commit -m "feat(auth): add Supabase server/browser/admin clients"
```

---

## Task 7: Supabase auth callback handler

**Files:**
- Create: `engine/src/app/auth/callback/route.ts`

- [ ] **Step 7.1:** Write the callback. Magic link / email OTP → `?code=...` lands here → `exchangeCodeForSession` sets the auth cookie → redirect to `/connect`.

```ts
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/connect";

  if (code) {
    const supabase = await getSupabaseServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
```

- [ ] **Step 7.2:** Commit.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && git add src/app/auth/callback/route.ts && git commit -m "feat(auth): add Supabase magic-link callback handler"
```

---

## Task 8: Disclaimer component (required on every recommendation surface)

**Files:**
- Create: `engine/src/components/Disclaimer.tsx`
- Create: `engine/tests/components/Disclaimer.test.tsx`

- [ ] **Step 8.1:** Failing test.

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Disclaimer from "@/components/Disclaimer";
import { DISCLAIMER } from "@/lib/constants";

describe("Disclaimer", () => {
  it("renders the exact disclaimer string from constants", () => {
    render(<Disclaimer />);
    expect(screen.getByText(DISCLAIMER)).toBeInTheDocument();
  });

  it("uses an aside role so screen readers can skip it", () => {
    render(<Disclaimer />);
    expect(screen.getByRole("note")).toBeInTheDocument();
  });
});
```

- [ ] **Step 8.2:** Run, expect failure.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && npm test -- Disclaimer
```
Expected: FAIL (`Cannot find module '@/components/Disclaimer'`).

- [ ] **Step 8.3:** Implement.

```tsx
import { DISCLAIMER } from "@/lib/constants";

export default function Disclaimer() {
  return (
    <aside
      role="note"
      className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-100"
    >
      {DISCLAIMER}
    </aside>
  );
}
```

- [ ] **Step 8.4:** Run, expect pass.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && npm test -- Disclaimer
```
Expected: PASS, 2 tests.

- [ ] **Step 8.5:** Commit.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && git add src/components/Disclaimer.tsx tests/components/Disclaimer.test.tsx && git commit -m "feat(safety): add disclaimer component"
```

---

## Task 9: PrescribeCTA component (required on every recommendation surface)

**Files:**
- Create: `engine/src/components/PrescribeCTA.tsx`
- Create: `engine/tests/components/PrescribeCTA.test.tsx`

- [ ] **Step 9.1:** Failing test.

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import PrescribeCTA from "@/components/PrescribeCTA";
import { CLINICAL_URL, PRESCRIBE_CTA_COPY } from "@/lib/constants";

describe("PrescribeCTA", () => {
  it("renders a link to the Clinical brand with safe rel and new tab", () => {
    render(<PrescribeCTA template="RECOVERY" />);
    const link = screen.getByRole("link", { name: PRESCRIBE_CTA_COPY });
    expect(link.getAttribute("href")).toContain(CLINICAL_URL);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel")).toMatch(/noopener/);
    expect(link.getAttribute("rel")).toMatch(/noreferrer/);
  });

  it("passes the template as a tracking param", () => {
    render(<PrescribeCTA template="GH" />);
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toMatch(/[?&]template=GH/);
  });
});
```

- [ ] **Step 9.2:** Run, expect failure.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && npm test -- PrescribeCTA
```
Expected: FAIL.

- [ ] **Step 9.3:** Implement.

```tsx
import { CLINICAL_URL, EXTERNAL_REL, PRESCRIBE_CTA_COPY } from "@/lib/constants";
import type { ProtocolTemplateId } from "@/lib/constants";

export default function PrescribeCTA({ template }: { template: ProtocolTemplateId }) {
  const href = `${CLINICAL_URL}/?source=engine&template=${encodeURIComponent(template)}`;
  return (
    <a
      href={href}
      target="_blank"
      rel={EXTERNAL_REL}
      className="inline-flex items-center justify-center rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-900 hover:bg-cyan-300"
    >
      {PRESCRIBE_CTA_COPY}
    </a>
  );
}
```

- [ ] **Step 9.4:** Run, expect pass.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && npm test -- PrescribeCTA
```
Expected: PASS, 2 tests.

- [ ] **Step 9.5:** Commit.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && git add src/components/PrescribeCTA.tsx tests/components/PrescribeCTA.test.tsx && git commit -m "feat(safety): add Aura Clinical prescribe CTA"
```

---

## Task 10: Terra schema + normalizer

**Files:**
- Create: `engine/src/lib/terra/schema.ts`, `engine/src/lib/terra/normalize.ts`
- Create: `engine/tests/lib/terra/normalize.test.ts`

> Terra returns vendor-shaped payloads. We collapse them into a single `BiometricSnapshot` shape that matches the `biometric_snapshots` table. The same shape is produced by manual upload, so downstream code only sees one schema.

- [ ] **Step 10.1:** Install Zod.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && npm i zod
```

- [ ] **Step 10.2:** Write `engine/src/lib/terra/schema.ts`.

```ts
import { z } from "zod";

export const BiometricSnapshotSchema = z.object({
  source: z.string(),
  capturedAt: z.string(),
  recoveryScore: z.number().min(0).max(100).nullable().optional(),
  hrvMs: z.number().min(0).nullable().optional(),
  restingHrBpm: z.number().min(20).max(200).nullable().optional(),
  sleepHours: z.number().min(0).max(24).nullable().optional(),
  deepSleepHours: z.number().min(0).max(24).nullable().optional(),
  remSleepHours: z.number().min(0).max(24).nullable().optional(),
  steps: z.number().int().min(0).nullable().optional(),
  activeCalories: z.number().min(0).nullable().optional(),
  glucoseAvgMgdl: z.number().min(20).max(600).nullable().optional(),
  glucoseVariability: z.number().min(0).nullable().optional(),
  raw: z.unknown().optional(),
});

export type BiometricSnapshot = z.infer<typeof BiometricSnapshotSchema>;

export const TerraWebhookPayloadSchema = z.object({
  type: z.string(),
  user: z.object({
    user_id: z.string(),
    provider: z.string().optional(),
  }),
  data: z.array(z.unknown()).optional(),
});

export type TerraWebhookPayload = z.infer<typeof TerraWebhookPayloadSchema>;
```

- [ ] **Step 10.3:** Failing test for the normalizer.

```ts
import { describe, it, expect } from "vitest";
import { normalizeTerraDaily } from "@/lib/terra/normalize";

describe("normalizeTerraDaily", () => {
  it("maps a Whoop daily payload to BiometricSnapshot", () => {
    const out = normalizeTerraDaily({
      provider: "WHOOP",
      metadata: { end_time: "2026-05-23T07:00:00Z" },
      scores: { recovery: 72 },
      heart_rate_data: {
        summary: { resting_hr_bpm: 54, avg_hrv_rmssd: 65 },
      },
      sleep_durations_data: {
        asleep: { duration_asleep_state_seconds: 27000 },
        sleep_stages: {
          deep_sleep_state_seconds: 4500,
          rem_sleep_state_seconds: 6000,
        },
      },
    });
    expect(out.source).toBe("WHOOP");
    expect(out.capturedAt).toBe("2026-05-23T07:00:00Z");
    expect(out.recoveryScore).toBe(72);
    expect(out.hrvMs).toBe(65);
    expect(out.restingHrBpm).toBe(54);
    expect(out.sleepHours).toBeCloseTo(7.5, 1);
    expect(out.deepSleepHours).toBeCloseTo(1.25, 2);
    expect(out.remSleepHours).toBeCloseTo(1.67, 2);
  });

  it("returns nulls for missing fields rather than throwing", () => {
    const out = normalizeTerraDaily({ provider: "OURA", metadata: { end_time: "2026-05-23T07:00:00Z" } });
    expect(out.source).toBe("OURA");
    expect(out.recoveryScore).toBeNull();
    expect(out.hrvMs).toBeNull();
  });
});
```

- [ ] **Step 10.4:** Run, expect failure.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && npm test -- normalize
```
Expected: FAIL.

- [ ] **Step 10.5:** Implement `engine/src/lib/terra/normalize.ts`.

```ts
import type { BiometricSnapshot } from "@/lib/terra/schema";

type Raw = Record<string, any>;

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function secondsToHours(seconds: unknown): number | null {
  const n = num(seconds);
  return n === null ? null : Math.round((n / 3600) * 100) / 100;
}

export function normalizeTerraDaily(raw: Raw): BiometricSnapshot {
  const provider = (raw.provider ?? raw.user?.provider ?? "UNKNOWN").toString().toUpperCase();
  const capturedAt =
    raw.metadata?.end_time ??
    raw.metadata?.start_time ??
    raw.timestamp ??
    new Date().toISOString();

  return {
    source: provider,
    capturedAt,
    recoveryScore: num(raw.scores?.recovery ?? raw.recovery_score),
    hrvMs: num(raw.heart_rate_data?.summary?.avg_hrv_rmssd ?? raw.hrv_ms),
    restingHrBpm: num(raw.heart_rate_data?.summary?.resting_hr_bpm ?? raw.resting_hr_bpm),
    sleepHours: secondsToHours(raw.sleep_durations_data?.asleep?.duration_asleep_state_seconds),
    deepSleepHours: secondsToHours(raw.sleep_durations_data?.sleep_stages?.deep_sleep_state_seconds),
    remSleepHours: secondsToHours(raw.sleep_durations_data?.sleep_stages?.rem_sleep_state_seconds),
    steps: num(raw.distance_data?.steps) as number | null,
    activeCalories: num(raw.active_durations_data?.activity_seconds),
    glucoseAvgMgdl: num(raw.glucose_data?.day_avg_blood_glucose_mg_per_dL),
    glucoseVariability: num(raw.glucose_data?.glucose_variability),
    raw,
  };
}
```

- [ ] **Step 10.6:** Run, expect pass.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && npm test -- normalize
```
Expected: PASS, 2 tests.

- [ ] **Step 10.7:** Commit.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && git add src/lib/terra tests/lib/terra package.json package-lock.json && git commit -m "feat(terra): add biometric schema + Terra daily normalizer"
```

---

## Task 11: Terra client (widget session + webhook signature verify)

**Files:**
- Create: `engine/src/lib/terra/client.ts`

- [ ] **Step 11.1:** Write the client. Two responsibilities: (a) generate a Terra widget session URL for the connect flow, (b) verify HMAC signatures on inbound webhooks.

```ts
import "server-only";
import crypto from "node:crypto";

const TERRA_BASE = "https://api.tryterra.co/v2";

export async function createTerraWidgetSession(params: {
  referenceId: string;
  providers: string[];
  successUrl: string;
  failureUrl: string;
}): Promise<{ url: string }> {
  const res = await fetch(`${TERRA_BASE}/auth/generateWidgetSession`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "dev-id": process.env.TERRA_DEV_ID!,
      "x-api-key": process.env.TERRA_API_KEY!,
    },
    body: JSON.stringify({
      reference_id: params.referenceId,
      providers: params.providers.join(","),
      auth_success_redirect_url: params.successUrl,
      auth_failure_redirect_url: params.failureUrl,
      language: "en",
    }),
  });
  if (!res.ok) {
    throw new Error(`Terra widget session failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { url: string };
  return { url: json.url };
}

export function verifyTerraSignature(rawBody: string, header: string | null): boolean {
  if (!header) return false;
  const secret = process.env.TERRA_SIGNING_SECRET;
  if (!secret) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
  const t = parts["t"];
  const v1 = parts["v1"];
  if (!t || !v1) return false;
  const signed = `${t}.${rawBody}`;
  const expected = crypto.createHmac("sha256", secret).update(signed).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(v1, "hex"));
  } catch {
    return false;
  }
}
```

- [ ] **Step 11.2:** Type-check.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 11.3:** Commit.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && git add src/lib/terra/client.ts && git commit -m "feat(terra): add widget session creator + HMAC verifier"
```

---

## Task 12: Terra connect Route Handler

**Files:**
- Create: `engine/src/app/api/terra/connect/route.ts`

- [ ] **Step 12.1:** Write the handler. Authenticated POST → creates a Terra widget session keyed to the user's Supabase id → returns the redirect URL.

```ts
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createTerraWidgetSession } from "@/lib/terra/client";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { providers?: string[] };
  const providers = body.providers && body.providers.length > 0
    ? body.providers
    : ["WHOOP", "OURA", "APPLE", "GARMIN", "FITBIT", "DEXCOM"];

  const origin = new URL(request.url).origin;
  try {
    const session = await createTerraWidgetSession({
      referenceId: user.id,
      providers,
      successUrl: `${origin}/api/terra/callback?status=success`,
      failureUrl: `${origin}/api/terra/callback?status=failure`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
```

- [ ] **Step 12.2:** Commit.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && git add src/app/api/terra/connect/route.ts && git commit -m "feat(terra): add widget-session connect route"
```

---

## Task 13: Terra callback Route Handler

**Files:**
- Create: `engine/src/app/api/terra/callback/route.ts`

- [ ] **Step 13.1:** Write the handler. Terra redirects back with `user_id`, `reference_id`, and `resource` (provider) query params on success. We persist the connection row and bounce the user to `/recommendation`.

```ts
import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const PROVIDERS = new Set(["WHOOP","OURA","APPLE","GARMIN","FITBIT","DEXCOM"]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const userId = url.searchParams.get("reference_id");
  const terraUserId = url.searchParams.get("user_id");
  const providerRaw = (url.searchParams.get("resource") ?? "").toUpperCase();
  const provider = PROVIDERS.has(providerRaw) ? providerRaw : null;

  if (status === "success" && userId && terraUserId && provider) {
    const admin = getSupabaseAdminClient();
    await admin.from("wearable_connections").insert({
      user_id: userId,
      provider,
      terra_user_id: terraUserId,
    });
    return NextResponse.redirect(new URL("/recommendation", url.origin));
  }

  return NextResponse.redirect(new URL("/connect?error=1", url.origin));
}
```

- [ ] **Step 13.2:** Commit.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && git add src/app/api/terra/callback/route.ts && git commit -m "feat(terra): persist wearable connection on Terra callback"
```

---

## Task 14: Terra webhook Route Handler

**Files:**
- Create: `engine/src/app/api/terra/webhook/route.ts`

- [ ] **Step 14.1:** Write the handler. Verify HMAC signature, look up the Supabase user via `terra_user_id`, normalize each payload, insert biometric snapshots.

```ts
import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { verifyTerraSignature } from "@/lib/terra/client";
import { normalizeTerraDaily } from "@/lib/terra/normalize";
import { TerraWebhookPayloadSchema } from "@/lib/terra/schema";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const raw = await request.text();
  const sigHeader = request.headers.get("terra-signature");
  if (!verifyTerraSignature(raw, sigHeader)) {
    return NextResponse.json({ error: "bad_signature" }, { status: 401 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const result = TerraWebhookPayloadSchema.safeParse(parsed);
  if (!result.success) {
    return NextResponse.json({ error: "schema_mismatch" }, { status: 400 });
  }

  const payload = result.data;
  const admin = getSupabaseAdminClient();

  const { data: conn } = await admin
    .from("wearable_connections")
    .select("user_id, provider")
    .eq("terra_user_id", payload.user.user_id)
    .is("revoked_at", null)
    .single();

  if (!conn) {
    return NextResponse.json({ error: "no_connection" }, { status: 404 });
  }

  const rows = (payload.data ?? []).map((d) => {
    const snap = normalizeTerraDaily({ ...(d as object), provider: conn.provider });
    return {
      user_id: conn.user_id,
      source: snap.source,
      captured_at: snap.capturedAt,
      recovery_score: snap.recoveryScore,
      hrv_ms: snap.hrvMs,
      resting_hr_bpm: snap.restingHrBpm,
      sleep_hours: snap.sleepHours,
      deep_sleep_hours: snap.deepSleepHours,
      rem_sleep_hours: snap.remSleepHours,
      steps: snap.steps,
      active_calories: snap.activeCalories,
      glucose_avg_mgdl: snap.glucoseAvgMgdl,
      glucose_variability: snap.glucoseVariability,
      raw: snap.raw,
    };
  });

  if (rows.length > 0) {
    await admin.from("biometric_snapshots").insert(rows);
  }

  return NextResponse.json({ ok: true, inserted: rows.length });
}
```

- [ ] **Step 14.2:** Commit.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && git add src/app/api/terra/webhook/route.ts && git commit -m "feat(terra): add signature-verified webhook ingester"
```

---

## Task 15: Manual upload form component

**Files:**
- Create: `engine/src/components/ManualUploadForm.tsx`
- Create: `engine/tests/components/ManualUploadForm.test.tsx`

- [ ] **Step 15.1:** Failing test. The component is a Client Component that renders a textarea + parse-on-submit. We test it without firing the network — the submit handler is passed as a prop.

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ManualUploadForm from "@/components/ManualUploadForm";

describe("ManualUploadForm", () => {
  it("accepts pasted JSON and calls onSubmit with the parsed payload", () => {
    const onSubmit = vi.fn();
    render(<ManualUploadForm onSubmit={onSubmit} />);
    const textarea = screen.getByLabelText(/paste/i) as HTMLTextAreaElement;
    fireEvent.change(textarea, {
      target: {
        value: JSON.stringify({
          capturedAt: "2026-05-23T07:00:00Z",
          recoveryScore: 60,
          hrvMs: 50,
          sleepHours: 7,
        }),
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ recoveryScore: 60 });
  });

  it("shows a validation error on malformed JSON", () => {
    const onSubmit = vi.fn();
    render(<ManualUploadForm onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText(/paste/i), { target: { value: "not json" } });
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));
    expect(screen.getByText(/could not parse/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 15.2:** Run, expect failure.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && npm test -- ManualUploadForm
```
Expected: FAIL.

- [ ] **Step 15.3:** Implement.

```tsx
"use client";
import { useState } from "react";
import { BiometricSnapshotSchema } from "@/lib/terra/schema";
import type { BiometricSnapshot } from "@/lib/terra/schema";

export default function ManualUploadForm({
  onSubmit,
}: {
  onSubmit: (snapshot: BiometricSnapshot) => void;
}) {
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    setError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      setError("Could not parse. Paste a JSON object with fields like recoveryScore, hrvMs, sleepHours.");
      return;
    }
    const result = BiometricSnapshotSchema.safeParse({
      source: "MANUAL",
      ...(parsed as object),
    });
    if (!result.success) {
      setError("Could not parse. Some fields are out of range. See the example above.");
      return;
    }
    onSubmit(result.data);
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-slate-200" htmlFor="manual-paste">
        Paste your last 7 days of biometrics as JSON
      </label>
      <textarea
        id="manual-paste"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        className="h-48 w-full rounded-lg border border-white/10 bg-slate-900/60 p-3 font-mono text-sm text-slate-100"
        placeholder='{"capturedAt":"2026-05-23T07:00:00Z","recoveryScore":60,"hrvMs":50,"sleepHours":7}'
      />
      {error && <p className="text-sm text-red-300">{error}</p>}
      <button
        type="button"
        onClick={handleSubmit}
        className="inline-flex items-center justify-center rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-900 hover:bg-cyan-300"
      >
        Submit
      </button>
    </div>
  );
}
```

- [ ] **Step 15.4:** Run, expect pass.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && npm test -- ManualUploadForm
```
Expected: PASS, 2 tests.

- [ ] **Step 15.5:** Commit.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && git add src/components/ManualUploadForm.tsx tests/components/ManualUploadForm.test.tsx && git commit -m "feat(upload): add manual JSON upload form"
```

---

## Task 16: Manual upload Route Handler

**Files:**
- Create: `engine/src/app/api/upload/route.ts`
- Create: `engine/tests/api/upload.test.ts`

- [ ] **Step 16.1:** Failing test. We test the handler as a function — mock Supabase, exercise the auth and schema branches.

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const insertMock = vi.fn().mockResolvedValue({ error: null });
const fromMock = vi.fn(() => ({ insert: insertMock }));
const getUserMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: async () => ({
    auth: { getUser: getUserMock },
    from: fromMock,
  }),
}));

import { POST } from "@/app/api/upload/route";

function request(body: unknown) {
  return new Request("http://localhost/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/upload", () => {
  beforeEach(() => {
    insertMock.mockClear();
    fromMock.mockClear();
    getUserMock.mockReset();
  });

  it("rejects unauthenticated requests", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const res = await POST(request({ capturedAt: "2026-05-23T07:00:00Z", recoveryScore: 60 }));
    expect(res.status).toBe(401);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("rejects malformed payloads", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u-1" } } });
    const res = await POST(request({ recoveryScore: 9999 }));
    expect(res.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("inserts a snapshot for valid auth + valid payload", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u-1" } } });
    const res = await POST(request({
      capturedAt: "2026-05-23T07:00:00Z",
      recoveryScore: 60,
      hrvMs: 50,
      sleepHours: 7,
    }));
    expect(res.status).toBe(200);
    expect(fromMock).toHaveBeenCalledWith("biometric_snapshots");
    expect(insertMock).toHaveBeenCalledOnce();
    const row = insertMock.mock.calls[0][0];
    expect(row.user_id).toBe("u-1");
    expect(row.recovery_score).toBe(60);
  });
});
```

- [ ] **Step 16.2:** Run, expect failure.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && npm test -- upload
```
Expected: FAIL (route file does not exist).

- [ ] **Step 16.3:** Implement `engine/src/app/api/upload/route.ts`.

```ts
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { BiometricSnapshotSchema } from "@/lib/terra/schema";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = BiometricSnapshotSchema.safeParse({ source: "MANUAL", ...(body as object) });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload", issues: parsed.error.issues }, { status: 400 });
  }
  const snap = parsed.data;

  const { error } = await supabase.from("biometric_snapshots").insert({
    user_id: user.id,
    source: snap.source,
    captured_at: snap.capturedAt,
    recovery_score: snap.recoveryScore ?? null,
    hrv_ms: snap.hrvMs ?? null,
    resting_hr_bpm: snap.restingHrBpm ?? null,
    sleep_hours: snap.sleepHours ?? null,
    deep_sleep_hours: snap.deepSleepHours ?? null,
    rem_sleep_hours: snap.remSleepHours ?? null,
    steps: snap.steps ?? null,
    active_calories: snap.activeCalories ?? null,
    glucose_avg_mgdl: snap.glucoseAvgMgdl ?? null,
    glucose_variability: snap.glucoseVariability ?? null,
    raw: snap.raw ?? null,
  });

  if (error) {
    return NextResponse.json({ error: "db_insert_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 16.4:** Run, expect pass.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && npm test -- upload
```
Expected: PASS, 3 tests.

- [ ] **Step 16.5:** Commit.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && git add src/app/api/upload/route.ts tests/api/upload.test.ts && git commit -m "feat(upload): add authed manual upload route"
```

---

## Task 17: Recommendation rules engine (safety floor)

**Files:**
- Create: `engine/src/lib/recommend/rules.ts`, `engine/src/lib/recommend/schema.ts`
- Create: `engine/tests/lib/recommend/rules.test.ts`

> The rule layer is the safety floor. It (a) picks a template based on biometric signals, (b) enforces contraindications and dose ceilings before the LLM is called. The LLM cannot remove or relax a rule — it can only narrate inside the envelope. See spec §6 E-2.

- [ ] **Step 17.1:** Write `engine/src/lib/recommend/schema.ts`.

```ts
import { z } from "zod";
import { PROTOCOL_TEMPLATES } from "@/lib/constants";

export const RulesSummarySchema = z.object({
  template: z.enum(PROTOCOL_TEMPLATES),
  triggers: z.array(z.string()),
  contraindications: z.array(z.string()),
  doseCeilings: z.record(z.string(), z.number()),
});

export type RulesSummary = z.infer<typeof RulesSummarySchema>;

export const ProtocolStepSchema = z.object({
  compound: z.string(),
  dose: z.string(),
  timing: z.string(),
  rationale: z.string(),
});

export const ProtocolOutputSchema = z.object({
  template: z.enum(PROTOCOL_TEMPLATES),
  headline: z.string(),
  steps: z.array(ProtocolStepSchema).min(1).max(6),
  lifestyle: z.array(z.string()).max(6),
  cycle: z.string(),
  caveats: z.array(z.string()).min(1),
});

export type ProtocolOutput = z.infer<typeof ProtocolOutputSchema>;
```

- [ ] **Step 17.2:** Failing test.

```ts
import { describe, it, expect } from "vitest";
import { pickTemplate, applySafetyFloor } from "@/lib/recommend/rules";
import type { BiometricSnapshot } from "@/lib/terra/schema";

function snap(overrides: Partial<BiometricSnapshot> = {}): BiometricSnapshot {
  return {
    source: "WHOOP",
    capturedAt: "2026-05-23T07:00:00Z",
    recoveryScore: 70,
    hrvMs: 60,
    restingHrBpm: 55,
    sleepHours: 7.5,
    ...overrides,
  };
}

describe("pickTemplate", () => {
  it("picks RECOVERY when recovery score is chronically low", () => {
    const series = Array.from({ length: 7 }, () => snap({ recoveryScore: 35 }));
    expect(pickTemplate(series)).toBe("RECOVERY");
  });

  it("picks SLEEP_STRESS when sleep is chronically short", () => {
    const series = Array.from({ length: 7 }, () => snap({ recoveryScore: 70, sleepHours: 5 }));
    expect(pickTemplate(series)).toBe("SLEEP_STRESS");
  });

  it("defaults to GH when nothing is alarming", () => {
    const series = Array.from({ length: 7 }, () => snap());
    expect(pickTemplate(series)).toBe("GH");
  });
});

describe("applySafetyFloor", () => {
  it("flags an HRV contraindication when resting HR is dangerously low", () => {
    const series = [snap({ restingHrBpm: 30 })];
    const out = applySafetyFloor("GH", series);
    expect(out.contraindications).toContain("bradycardia_resting_hr_below_40");
  });

  it("enforces BPC-157 dose ceiling for Recovery template", () => {
    const series = [snap()];
    const out = applySafetyFloor("RECOVERY", series);
    expect(out.doseCeilings["BPC-157_mcg_per_day"]).toBeLessThanOrEqual(500);
  });

  it("enforces CJC/Ipa dose ceiling for GH template", () => {
    const series = [snap()];
    const out = applySafetyFloor("GH", series);
    expect(out.doseCeilings["CJC-1295_mcg_per_dose"]).toBeLessThanOrEqual(100);
    expect(out.doseCeilings["IPAMORELIN_mcg_per_dose"]).toBeLessThanOrEqual(300);
  });
});
```

- [ ] **Step 17.3:** Run, expect failure.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && npm test -- rules
```
Expected: FAIL.

- [ ] **Step 17.4:** Implement `engine/src/lib/recommend/rules.ts`.

```ts
import type { BiometricSnapshot } from "@/lib/terra/schema";
import type { ProtocolTemplateId } from "@/lib/constants";
import type { RulesSummary } from "@/lib/recommend/schema";

function avg(values: Array<number | null | undefined>): number | null {
  const real = values.filter((v): v is number => typeof v === "number");
  if (real.length === 0) return null;
  return real.reduce((a, b) => a + b, 0) / real.length;
}

export function pickTemplate(series: BiometricSnapshot[]): ProtocolTemplateId {
  const recovery = avg(series.map((s) => s.recoveryScore));
  const sleep = avg(series.map((s) => s.sleepHours));

  if (recovery !== null && recovery < 50) return "RECOVERY";
  if (sleep !== null && sleep < 6) return "SLEEP_STRESS";
  return "GH";
}

const DOSE_CEILINGS_BY_TEMPLATE: Record<ProtocolTemplateId, Record<string, number>> = {
  RECOVERY: {
    "BPC-157_mcg_per_day": 500,
    "TB-500_mg_per_week": 5,
  },
  GH: {
    "CJC-1295_mcg_per_dose": 100,
    "IPAMORELIN_mcg_per_dose": 300,
  },
  SLEEP_STRESS: {
    "DSIP_mg_per_day": 0.3,
    "SELANK_mg_per_day": 1.5,
  },
};

export function applySafetyFloor(
  template: ProtocolTemplateId,
  series: BiometricSnapshot[],
): RulesSummary {
  const triggers: string[] = [];
  const contraindications: string[] = [];

  const recovery = avg(series.map((s) => s.recoveryScore));
  const hrv = avg(series.map((s) => s.hrvMs));
  const rhr = avg(series.map((s) => s.restingHrBpm));
  const sleep = avg(series.map((s) => s.sleepHours));

  if (recovery !== null && recovery < 50) triggers.push("recovery_chronically_low");
  if (hrv !== null && hrv < 30) triggers.push("hrv_chronically_low");
  if (sleep !== null && sleep < 6) triggers.push("sleep_chronically_short");

  if (rhr !== null && rhr < 40) contraindications.push("bradycardia_resting_hr_below_40");
  if (rhr !== null && rhr > 100) contraindications.push("tachycardia_resting_hr_above_100");

  return {
    template,
    triggers,
    contraindications,
    doseCeilings: DOSE_CEILINGS_BY_TEMPLATE[template],
  };
}
```

- [ ] **Step 17.5:** Run, expect pass.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && npm test -- rules
```
Expected: PASS, 6 tests.

- [ ] **Step 17.6:** Commit.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && git add src/lib/recommend/rules.ts src/lib/recommend/schema.ts tests/lib/recommend/rules.test.ts && git commit -m "feat(recommend): add deterministic safety-floor rules engine"
```

---

## Task 18: Protocol templates

**Files:**
- Create: `engine/src/lib/recommend/templates.ts`

- [ ] **Step 18.1:** Write the three v0 templates per spec §5.2 Track B. These are the deterministic skeletons the LLM personalizes around.

```ts
import type { ProtocolTemplateId } from "@/lib/constants";

export interface TemplateSkeleton {
  headline: string;
  steps: Array<{ compound: string; dose: string; timing: string; rationale: string }>;
  lifestyle: string[];
  cycle: string;
  caveats: string[];
}

export const TEMPLATE_SKELETONS: Record<ProtocolTemplateId, TemplateSkeleton> = {
  RECOVERY: {
    headline: "Recovery Stack — BPC-157 ± TB-500 with sleep + load management",
    steps: [
      {
        compound: "BPC-157",
        dose: "250–500 mcg/day subcutaneous (split AM/PM)",
        timing: "30 min pre-workout or post-soft-tissue insult",
        rationale: "Supports gut + soft tissue repair signaling",
      },
      {
        compound: "TB-500 (optional, weeks 1–4)",
        dose: "2.5–5 mg/week subcutaneous, split into 2 doses",
        timing: "Loading phase only; taper at week 5",
        rationale: "Adds systemic recovery support for acute injuries",
      },
    ],
    lifestyle: [
      "Sleep target: 8h+ for 14 nights",
      "Cap zone-5 work at 2 sessions/week during the cycle",
      "Protein floor: 1.6 g/kg bodyweight/day",
    ],
    cycle: "4 weeks on, 2 weeks off, re-assess on biometrics",
    caveats: [
      "Stop and consult a clinician if any GI bleeding, new chest pain, or unusual swelling appears.",
      "Do not combine with anticoagulants without clinician supervision.",
    ],
  },
  GH: {
    headline: "GH Stack — CJC-1295 (no-DAC) + Ipamorelin for sleep-phase GH pulse",
    steps: [
      {
        compound: "CJC-1295 (no-DAC)",
        dose: "100 mcg subcutaneous",
        timing: "Bedtime, on empty stomach",
        rationale: "Aligns GHRH pulse with natural slow-wave sleep window",
      },
      {
        compound: "Ipamorelin",
        dose: "200–300 mcg subcutaneous",
        timing: "Bedtime, paired with CJC dose",
        rationale: "Selective GHRP that does not raise cortisol or prolactin",
      },
    ],
    lifestyle: [
      "Last meal ≥ 2 hours before injection",
      "Keep alcohol < 2 drinks/week during the cycle",
      "Track AM fasted glucose weekly",
    ],
    cycle: "5 days on, 2 days off, 8–12 weeks then re-assess",
    caveats: [
      "Watch for fasting glucose drift > 10 mg/dL above baseline.",
      "Pause and consult a clinician if persistent edema, joint pain, or numbness appears.",
    ],
  },
  SLEEP_STRESS: {
    headline: "Sleep & Stress — DSIP + Selank stacked with circadian fixes",
    steps: [
      {
        compound: "DSIP",
        dose: "100–300 mcg subcutaneous",
        timing: "30 min before bed, 3–4 nights/week",
        rationale: "Supports slow-wave sleep entry on high-stress days",
      },
      {
        compound: "Selank",
        dose: "250–500 mcg intranasal, 1–2x/day",
        timing: "Morning + early afternoon, not within 6 h of bed",
        rationale: "Anxiolytic without sedation; supports daytime composure",
      },
    ],
    lifestyle: [
      "Fixed wake time, 7 days/week",
      "10 minutes of outdoor light within 30 min of waking",
      "No caffeine after 12:00",
    ],
    cycle: "4 weeks on, 2 weeks off",
    caveats: [
      "Do not combine with prescription sedatives without clinician supervision.",
      "If sleep latency does not improve in 14 days, reassess inputs before extending the cycle.",
    ],
  },
};
```

- [ ] **Step 18.2:** Commit.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && git add src/lib/recommend/templates.ts && git commit -m "feat(recommend): add 3 v0 protocol templates"
```

---

## Task 19: LLM personalization (Anthropic SDK with prompt caching)

**Files:**
- Create: `engine/src/lib/recommend/llm.ts`
- Create: `engine/tests/lib/recommend/llm.test.ts`

> The system prompt is large and stable across calls — it is the safety contract + JSON output schema. We mark it with `cache_control: ephemeral` so Anthropic caches it across requests and the per-call cost drops by ~10x after the first call. See spec §7.1 ($50/mo budget). The user message is the small per-call payload (biometrics + rules summary).

- [ ] **Step 19.1:** Install Anthropic SDK.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && npm i @anthropic-ai/sdk
```

- [ ] **Step 19.2:** Failing test. We mock the SDK and assert (a) `cache_control` is set on the system prompt block, (b) the returned JSON is validated against `ProtocolOutputSchema`.

```ts
import { describe, it, expect, vi } from "vitest";

const createMock = vi.fn();

vi.mock("@anthropic-ai/sdk", () => ({
  default: class FakeAnthropic {
    messages = { create: createMock };
  },
}));

import { personalizeProtocol } from "@/lib/recommend/llm";

describe("personalizeProtocol", () => {
  it("calls Anthropic with prompt-cached system block and returns validated output", async () => {
    createMock.mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            template: "RECOVERY",
            headline: "Personalized recovery stack",
            steps: [
              { compound: "BPC-157", dose: "250 mcg/day", timing: "AM", rationale: "soft tissue" },
            ],
            lifestyle: ["Sleep 8h"],
            cycle: "4 on / 2 off",
            caveats: ["Stop on adverse signal"],
          }),
        },
      ],
    });

    const out = await personalizeProtocol({
      template: "RECOVERY",
      rules: {
        template: "RECOVERY",
        triggers: ["recovery_chronically_low"],
        contraindications: [],
        doseCeilings: { "BPC-157_mcg_per_day": 500 },
      },
      series: [
        { source: "WHOOP", capturedAt: "2026-05-23T07:00:00Z", recoveryScore: 40, hrvMs: 35, sleepHours: 6 },
      ],
    });

    expect(createMock).toHaveBeenCalledOnce();
    const args = createMock.mock.calls[0][0];
    expect(Array.isArray(args.system)).toBe(true);
    expect(args.system[0].cache_control).toEqual({ type: "ephemeral" });
    expect(out.template).toBe("RECOVERY");
    expect(out.headline).toMatch(/recovery/i);
  });

  it("throws when the LLM returns malformed JSON", async () => {
    createMock.mockResolvedValue({ content: [{ type: "text", text: "not json" }] });
    await expect(
      personalizeProtocol({
        template: "GH",
        rules: { template: "GH", triggers: [], contraindications: [], doseCeilings: {} },
        series: [],
      }),
    ).rejects.toThrow(/parse|schema/i);
  });
});
```

- [ ] **Step 19.3:** Run, expect failure.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && npm test -- recommend/llm
```
Expected: FAIL.

- [ ] **Step 19.4:** Implement `engine/src/lib/recommend/llm.ts`.

```ts
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { ANTHROPIC_MAX_TOKENS, ANTHROPIC_MODEL } from "@/lib/constants";
import type { ProtocolTemplateId } from "@/lib/constants";
import { ProtocolOutputSchema } from "@/lib/recommend/schema";
import type { ProtocolOutput, RulesSummary } from "@/lib/recommend/schema";
import { TEMPLATE_SKELETONS } from "@/lib/recommend/templates";
import type { BiometricSnapshot } from "@/lib/terra/schema";

const SYSTEM_PROMPT = `You are the Aura Protocols Engine personalization layer.

You are given a deterministic safety summary (rules) and 1-14 days of biometric snapshots. You write a personalized educational protocol within the safe envelope.

CONTRACT:
- Output ONLY a JSON object. No prose, no markdown, no commentary.
- Never propose any compound, dose, or stack outside the supplied template skeleton.
- Never exceed a doseCeiling key from the rules summary.
- Never propose any protocol if the rules summary lists a contraindication; instead, set headline to a refusal explanation and leave steps as an empty-equivalent (single placeholder step explaining the contraindication) and caveats explaining why.
- Output frames suggestions as educational, never as medical advice.

OUTPUT SCHEMA (must match exactly):
{
  "template": "RECOVERY" | "GH" | "SLEEP_STRESS",
  "headline": string,
  "steps": [{ "compound": string, "dose": string, "timing": string, "rationale": string }],
  "lifestyle": string[],
  "cycle": string,
  "caveats": string[]
}

Personalize tone and rationale to the biometric signals supplied. Do not invent biometric values that were not supplied.`;

export interface PersonalizeInput {
  template: ProtocolTemplateId;
  rules: RulesSummary;
  series: BiometricSnapshot[];
}

export async function personalizeProtocol(input: PersonalizeInput): Promise<ProtocolOutput> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const skeleton = TEMPLATE_SKELETONS[input.template];

  const userPayload = {
    template: input.template,
    rules: input.rules,
    skeleton,
    series: input.series,
  };

  const response = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: ANTHROPIC_MAX_TOKENS,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: JSON.stringify(userPayload) }],
  });

  const text = response.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("llm_parse_error: response was not valid JSON");
  }

  const result = ProtocolOutputSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`llm_schema_error: ${result.error.message}`);
  }
  return result.data;
}
```

- [ ] **Step 19.5:** Run, expect pass.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && npm test -- recommend/llm
```
Expected: PASS, 2 tests.

- [ ] **Step 19.6:** Commit.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && git add src/lib/recommend/llm.ts tests/lib/recommend/llm.test.ts package.json package-lock.json && git commit -m "feat(recommend): add prompt-cached Anthropic personalization"
```

---

## Task 20: Recommendation orchestrator (rules + LLM hybrid entrypoint)

**Files:**
- Create: `engine/src/lib/recommend/index.ts`
- Create: `engine/tests/lib/recommend/index.test.ts`

- [ ] **Step 20.1:** Failing test.

```ts
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/recommend/llm", () => ({
  personalizeProtocol: vi.fn(async (input) => ({
    template: input.template,
    headline: "stub",
    steps: [{ compound: "X", dose: "y", timing: "z", rationale: "r" }],
    lifestyle: [],
    cycle: "c",
    caveats: ["c1"],
  })),
}));

import { recommend } from "@/lib/recommend";

describe("recommend", () => {
  it("returns rules summary + LLM output for a healthy series", async () => {
    const out = await recommend([
      { source: "WHOOP", capturedAt: "2026-05-23T07:00:00Z", recoveryScore: 70, hrvMs: 60, sleepHours: 7.5 },
    ]);
    expect(out.rules.template).toBe("GH");
    expect(out.output.template).toBe("GH");
  });

  it("forces RECOVERY when recovery score is chronically low", async () => {
    const series = Array.from({ length: 7 }, () => ({
      source: "WHOOP" as const,
      capturedAt: "2026-05-23T07:00:00Z",
      recoveryScore: 35,
      hrvMs: 28,
      sleepHours: 6,
    }));
    const out = await recommend(series);
    expect(out.rules.template).toBe("RECOVERY");
    expect(out.rules.triggers).toContain("recovery_chronically_low");
  });
});
```

- [ ] **Step 20.2:** Run, expect failure.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && npm test -- recommend/index
```
Expected: FAIL.

- [ ] **Step 20.3:** Implement `engine/src/lib/recommend/index.ts`.

```ts
import "server-only";
import { applySafetyFloor, pickTemplate } from "@/lib/recommend/rules";
import { personalizeProtocol } from "@/lib/recommend/llm";
import type { BiometricSnapshot } from "@/lib/terra/schema";
import type { ProtocolOutput, RulesSummary } from "@/lib/recommend/schema";

export interface RecommendResult {
  rules: RulesSummary;
  output: ProtocolOutput;
}

export async function recommend(series: BiometricSnapshot[]): Promise<RecommendResult> {
  const template = pickTemplate(series);
  const rules = applySafetyFloor(template, series);
  const output = await personalizeProtocol({ template, rules, series });
  return { rules, output };
}
```

- [ ] **Step 20.4:** Run, expect pass.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && npm test -- recommend/index
```
Expected: PASS, 2 tests.

- [ ] **Step 20.5:** Commit.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && git add src/lib/recommend/index.ts tests/lib/recommend/index.test.ts && git commit -m "feat(recommend): orchestrate rules + LLM hybrid"
```

---

## Task 21: Recommendation Route Handler

**Files:**
- Create: `engine/src/app/api/recommend/route.ts`
- Create: `engine/tests/api/recommend.test.ts`

- [ ] **Step 21.1:** Failing test. Mock the orchestrator + Supabase; exercise auth and success paths.

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const recommendMock = vi.fn();
const getUserMock = vi.fn();
const insertMock = vi.fn().mockResolvedValue({
  data: [{ id: "rec-1" }],
  error: null,
});
const selectMock = vi.fn().mockReturnValue({
  data: [
    { source: "WHOOP", captured_at: "2026-05-23T07:00:00Z", recovery_score: 40, hrv_ms: 30, resting_hr_bpm: 55, sleep_hours: 6 },
  ],
});
const orderMock = vi.fn().mockReturnValue({ limit: () => selectMock });
const eqMock = vi.fn().mockReturnValue({ order: orderMock });
const fromMock = vi.fn(() => ({
  select: () => ({ eq: eqMock }),
  insert: () => ({ select: () => ({ single: insertMock }) }),
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: async () => ({
    auth: { getUser: getUserMock },
    from: fromMock,
  }),
}));

vi.mock("@/lib/recommend", () => ({
  recommend: recommendMock,
}));

import { POST } from "@/app/api/recommend/route";

describe("POST /api/recommend", () => {
  beforeEach(() => {
    recommendMock.mockReset();
    getUserMock.mockReset();
  });

  it("rejects unauthenticated requests", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const res = await POST(new Request("http://localhost/api/recommend", { method: "POST" }));
    expect(res.status).toBe(401);
  });

  it("returns the orchestrator output for authenticated users", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u-1" } } });
    recommendMock.mockResolvedValue({
      rules: { template: "RECOVERY", triggers: [], contraindications: [], doseCeilings: {} },
      output: { template: "RECOVERY", headline: "h", steps: [{ compound: "c", dose: "d", timing: "t", rationale: "r" }], lifestyle: [], cycle: "c", caveats: ["x"] },
    });
    const res = await POST(new Request("http://localhost/api/recommend", { method: "POST" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.output.template).toBe("RECOVERY");
    expect(recommendMock).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 21.2:** Run, expect failure.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && npm test -- api/recommend
```
Expected: FAIL.

- [ ] **Step 21.3:** Implement `engine/src/app/api/recommend/route.ts`.

```ts
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { recommend } from "@/lib/recommend";
import type { BiometricSnapshot } from "@/lib/terra/schema";

export const runtime = "nodejs";

export async function POST(_request: Request) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: rows } = await supabase
    .from("biometric_snapshots")
    .select("source, captured_at, recovery_score, hrv_ms, resting_hr_bpm, sleep_hours, deep_sleep_hours, rem_sleep_hours, steps, active_calories, glucose_avg_mgdl, glucose_variability")
    .eq("user_id", user.id)
    .order("captured_at", { ascending: false })
    .limit(14);

  const series: BiometricSnapshot[] = (rows ?? []).map((r) => ({
    source: r.source,
    capturedAt: r.captured_at,
    recoveryScore: r.recovery_score,
    hrvMs: r.hrv_ms,
    restingHrBpm: r.resting_hr_bpm,
    sleepHours: r.sleep_hours,
    deepSleepHours: r.deep_sleep_hours,
    remSleepHours: r.rem_sleep_hours,
    steps: r.steps,
    activeCalories: r.active_calories,
    glucoseAvgMgdl: r.glucose_avg_mgdl,
    glucoseVariability: r.glucose_variability,
  }));

  if (series.length === 0) {
    return NextResponse.json({ error: "no_data", message: "Connect a wearable or upload manual data first." }, { status: 400 });
  }

  const { rules, output } = await recommend(series);

  const { data: saved } = await supabase
    .from("protocol_recommendations")
    .insert({
      user_id: user.id,
      template: rules.template,
      rules_summary: rules,
      llm_summary: { model: "claude-opus-4-7" },
      output,
    })
    .select()
    .single();

  return NextResponse.json({ id: saved?.id, rules, output });
}
```

- [ ] **Step 21.4:** Run, expect pass.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && npm test -- api/recommend
```
Expected: PASS, 2 tests.

- [ ] **Step 21.5:** Commit.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && git add src/app/api/recommend/route.ts tests/api/recommend.test.ts && git commit -m "feat(recommend): add authed recommendation route"
```

---

## Task 22: Feedback widget + Route Handler

**Files:**
- Create: `engine/src/components/FeedbackWidget.tsx`
- Create: `engine/src/app/api/feedback/route.ts`
- Create: `engine/tests/components/FeedbackWidget.test.tsx`
- Create: `engine/tests/api/feedback.test.ts`

> Spec §11.3 Customer Signal Loop: thumbs-up/down + free-text feedback on every recommendation.

- [ ] **Step 22.1:** Failing test for the widget.

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import FeedbackWidget from "@/components/FeedbackWidget";

describe("FeedbackWidget", () => {
  it("posts thumbs-up with optional free text", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    render(<FeedbackWidget recommendationId="rec-1" />);
    fireEvent.click(screen.getByRole("button", { name: /thumbs up/i }));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/feedback",
      expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body).toMatchObject({ recommendationId: "rec-1", thumbs: "UP" });
  });

  it("sends the free-text payload when present", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    render(<FeedbackWidget recommendationId="rec-2" />);
    fireEvent.change(screen.getByLabelText(/comments/i), { target: { value: "hrv felt off" } });
    fireEvent.click(screen.getByRole("button", { name: /thumbs down/i }));
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body).toMatchObject({ thumbs: "DOWN", freeText: "hrv felt off" });
  });
});
```

- [ ] **Step 22.2:** Run, expect failure.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && npm test -- FeedbackWidget
```
Expected: FAIL.

- [ ] **Step 22.3:** Implement `engine/src/components/FeedbackWidget.tsx`.

```tsx
"use client";
import { useState } from "react";

export default function FeedbackWidget({ recommendationId }: { recommendationId: string }) {
  const [freeText, setFreeText] = useState("");
  const [sent, setSent] = useState<null | "UP" | "DOWN">(null);

  async function send(thumbs: "UP" | "DOWN") {
    setSent(thumbs);
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recommendationId, thumbs, freeText: freeText || undefined }),
    });
  }

  return (
    <div className="rounded-lg border border-white/10 bg-slate-900/40 p-4">
      <p className="text-sm font-medium text-slate-200">Was this useful?</p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          aria-label="Thumbs up"
          onClick={() => send("UP")}
          className="rounded-md border border-white/10 px-3 py-1 text-slate-100 hover:bg-white/10"
          disabled={sent !== null}
        >
          Thumbs up
        </button>
        <button
          type="button"
          aria-label="Thumbs down"
          onClick={() => send("DOWN")}
          className="rounded-md border border-white/10 px-3 py-1 text-slate-100 hover:bg-white/10"
          disabled={sent !== null}
        >
          Thumbs down
        </button>
      </div>
      <label className="mt-3 block text-xs text-slate-400" htmlFor="feedback-comments">
        Comments (optional)
      </label>
      <textarea
        id="feedback-comments"
        value={freeText}
        onChange={(e) => setFreeText(e.target.value)}
        className="mt-1 h-20 w-full rounded-md border border-white/10 bg-slate-900/60 p-2 text-sm text-slate-100"
        placeholder="Anything we got wrong?"
        disabled={sent !== null}
      />
      {sent && <p className="mt-2 text-xs text-slate-400">Thanks — recorded.</p>}
    </div>
  );
}
```

- [ ] **Step 22.4:** Run, expect pass.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && npm test -- FeedbackWidget
```
Expected: PASS, 2 tests.

- [ ] **Step 22.5:** Failing test for the route.

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const insertMock = vi.fn().mockResolvedValue({ error: null });
const fromMock = vi.fn(() => ({ insert: insertMock }));
const getUserMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: async () => ({
    auth: { getUser: getUserMock },
    from: fromMock,
  }),
}));

import { POST } from "@/app/api/feedback/route";

function req(body: unknown) {
  return new Request("http://localhost/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/feedback", () => {
  beforeEach(() => {
    insertMock.mockClear();
    fromMock.mockClear();
    getUserMock.mockReset();
  });

  it("rejects unauthenticated requests", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const res = await POST(req({ recommendationId: "rec-1", thumbs: "UP" }));
    expect(res.status).toBe(401);
  });

  it("rejects invalid thumbs values", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u-1" } } });
    const res = await POST(req({ recommendationId: "rec-1", thumbs: "MEH" }));
    expect(res.status).toBe(400);
  });

  it("inserts a feedback row", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u-1" } } });
    const res = await POST(req({ recommendationId: "rec-1", thumbs: "UP", freeText: "ok" }));
    expect(res.status).toBe(200);
    expect(fromMock).toHaveBeenCalledWith("recommendation_feedback");
    expect(insertMock).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 22.6:** Run, expect failure.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && npm test -- api/feedback
```
Expected: FAIL.

- [ ] **Step 22.7:** Implement `engine/src/app/api/feedback/route.ts`.

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const Body = z.object({
  recommendationId: z.string().uuid().or(z.string().min(1)),
  thumbs: z.enum(["UP", "DOWN"]),
  freeText: z.string().max(2000).optional(),
});

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const { error } = await supabase.from("recommendation_feedback").insert({
    user_id: user.id,
    recommendation_id: parsed.data.recommendationId,
    thumbs: parsed.data.thumbs,
    free_text: parsed.data.freeText ?? null,
  });

  if (error) {
    return NextResponse.json({ error: "db_insert_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 22.8:** Run, expect pass.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && npm test -- api/feedback
```
Expected: PASS, 3 tests.

- [ ] **Step 22.9:** Commit.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && git add src/components/FeedbackWidget.tsx src/app/api/feedback tests/components/FeedbackWidget.test.tsx tests/api/feedback.test.ts && git commit -m "feat(feedback): add thumbs + free-text widget and route"
```

---

## Task 23: RecommendationCard composite component

**Files:**
- Create: `engine/src/components/RecommendationCard.tsx`
- Create: `engine/tests/components/RecommendationCard.test.tsx`

> The card composes `Disclaimer`, `PrescribeCTA`, and `FeedbackWidget` so that every consumer surface gets all three by default.

- [ ] **Step 23.1:** Failing test.

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import RecommendationCard from "@/components/RecommendationCard";
import { DISCLAIMER, PRESCRIBE_CTA_COPY } from "@/lib/constants";

const sample = {
  id: "rec-1",
  output: {
    template: "RECOVERY" as const,
    headline: "Personalized recovery stack",
    steps: [
      { compound: "BPC-157", dose: "250 mcg/day", timing: "AM", rationale: "soft tissue support" },
    ],
    lifestyle: ["Sleep 8h"],
    cycle: "4 on / 2 off",
    caveats: ["Stop on adverse signal"],
  },
};

describe("RecommendationCard", () => {
  it("renders headline, every step, lifestyle, cycle, caveats", () => {
    render(<RecommendationCard {...sample} />);
    expect(screen.getByRole("heading", { name: /personalized recovery stack/i })).toBeInTheDocument();
    expect(screen.getByText(/BPC-157/)).toBeInTheDocument();
    expect(screen.getByText(/Sleep 8h/)).toBeInTheDocument();
    expect(screen.getByText(/4 on \/ 2 off/)).toBeInTheDocument();
    expect(screen.getByText(/Stop on adverse signal/)).toBeInTheDocument();
  });

  it("always mounts the disclaimer, prescribe CTA, and feedback widget", () => {
    render(<RecommendationCard {...sample} />);
    expect(screen.getByText(DISCLAIMER)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: PRESCRIBE_CTA_COPY })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /thumbs up/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 23.2:** Run, expect failure.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && npm test -- RecommendationCard
```
Expected: FAIL.

- [ ] **Step 23.3:** Implement.

```tsx
import Disclaimer from "@/components/Disclaimer";
import PrescribeCTA from "@/components/PrescribeCTA";
import FeedbackWidget from "@/components/FeedbackWidget";
import type { ProtocolOutput } from "@/lib/recommend/schema";

export default function RecommendationCard({
  id,
  output,
}: {
  id: string;
  output: ProtocolOutput;
}) {
  return (
    <article className="space-y-6 rounded-2xl border border-white/10 bg-slate-900/40 p-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-white">{output.headline}</h2>
        <p className="text-sm uppercase tracking-wider text-cyan-300">{output.template}</p>
      </header>

      <Disclaimer />

      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Protocol</h3>
        <ul className="mt-2 space-y-3">
          {output.steps.map((s, i) => (
            <li key={i} className="rounded-lg border border-white/10 p-3">
              <p className="font-medium text-white">{s.compound}</p>
              <p className="text-sm text-slate-300">{s.dose}</p>
              <p className="text-sm text-slate-400">Timing: {s.timing}</p>
              <p className="mt-1 text-sm text-slate-400">{s.rationale}</p>
            </li>
          ))}
        </ul>
      </section>

      {output.lifestyle.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Lifestyle</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-300">
            {output.lifestyle.map((l, i) => <li key={i}>{l}</li>)}
          </ul>
        </section>
      )}

      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Cycle</h3>
        <p className="mt-2 text-slate-300">{output.cycle}</p>
      </section>

      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Caveats</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-300">
          {output.caveats.map((c, i) => <li key={i}>{c}</li>)}
        </ul>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PrescribeCTA template={output.template} />
        <FeedbackWidget recommendationId={id} />
      </div>
    </article>
  );
}
```

- [ ] **Step 23.4:** Run, expect pass.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && npm test -- RecommendationCard
```
Expected: PASS, 2 tests.

- [ ] **Step 23.5:** Commit.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && git add src/components/RecommendationCard.tsx tests/components/RecommendationCard.test.tsx && git commit -m "feat(ui): add RecommendationCard composing safety + feedback surfaces"
```

---

## Task 24: ConnectButton component

**Files:**
- Create: `engine/src/components/ConnectButton.tsx`

- [ ] **Step 24.1:** Write the Client Component. Calls `/api/terra/connect`, then redirects to the returned widget URL.

```tsx
"use client";
import { useState } from "react";

export default function ConnectButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/terra/connect", { method: "POST" });
    setLoading(false);
    if (!res.ok) {
      setError("Could not start the connect flow. Make sure you're signed in.");
      return;
    }
    const { url } = (await res.json()) as { url: string };
    window.location.href = url;
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center justify-center rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-900 hover:bg-cyan-300 disabled:opacity-50"
      >
        {loading ? "Opening…" : "Connect a wearable"}
      </button>
      {error && <p className="text-sm text-red-300">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 24.2:** Type-check.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 24.3:** Commit.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && git add src/components/ConnectButton.tsx && git commit -m "feat(ui): add Terra connect button"
```

---

## Task 25: Global layout, design tokens, metadata

**Files:**
- Modify: `engine/src/app/layout.tsx`, `engine/src/app/globals.css`

- [ ] **Step 25.1:** Replace `engine/src/app/globals.css` with the design tokens that mirror the shop site's dark theme (cyan + violet on `#04060f`).

```css
@import "tailwindcss";

@theme {
  --color-bg: #04060f;
  --color-surface: #0d1117;
  --color-surface-2: #161b22;
  --font-sans: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
  --font-display: var(--font-syne), var(--font-inter), ui-sans-serif, system-ui;
}

html, body {
  background: var(--color-bg);
  color: #e2e8f0;
  font-family: var(--font-sans);
}
```

- [ ] **Step 25.2:** Replace `engine/src/app/layout.tsx`. Fonts via `next/font/google` (Syne + Inter, matching the shop).

```tsx
import type { Metadata } from "next";
import { Inter, Syne } from "next/font/google";
import "./globals.css";
import { BASE_URL } from "@/lib/constants";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const syne = Syne({ subsets: ["latin"], variable: "--font-syne" });

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Aura Protocols — Peptide Protocols Tuned to Your Biometrics",
    template: "%s — Aura Protocols",
  },
  description:
    "Connect your wearable. The Engine reads your recovery, sleep, and stress and returns a peptide protocol tuned to your data. Free. Educational only.",
  openGraph: {
    type: "website",
    url: BASE_URL,
    siteName: "Aura Protocols",
  },
  twitter: {
    card: "summary_large_image",
    site: "@aura_protocols",
  },
  alternates: { canonical: "/" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${syne.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 25.3:** Verify the build does not break.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 25.4:** Commit.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && git add src/app/layout.tsx src/app/globals.css && git commit -m "feat(brand): apply dark theme + Syne/Inter fonts + base metadata"
```

---

## Task 26: Landing page

**Files:**
- Modify: `engine/src/app/page.tsx`

- [ ] **Step 26.1:** Replace the scaffold landing page with the Engine pitch.

```tsx
import Link from "next/link";
import { SUPPORTED_WEARABLES } from "@/lib/constants";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <p className="text-sm font-semibold uppercase tracking-widest text-cyan-300">
        Free Peptide Protocol Engine
      </p>
      <h1 className="font-display mt-3 text-4xl font-bold text-white md:text-5xl">
        Connect your wearable. Get a peptide protocol tuned to your data.
      </h1>
      <p className="mt-4 text-lg text-slate-300">
        We read your recovery, sleep, HRV, and (optionally) glucose, then return a personalized peptide + lifestyle protocol. Educational only.
      </p>

      <ul className="mt-8 grid grid-cols-2 gap-2 text-slate-300 md:grid-cols-3">
        {SUPPORTED_WEARABLES.map((w) => (
          <li key={w.id} className="rounded-md border border-white/10 px-3 py-2 text-center">
            {w.label}
          </li>
        ))}
      </ul>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/connect"
          className="inline-flex items-center justify-center rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-900 hover:bg-cyan-300"
        >
          Connect a wearable
        </Link>
        <Link
          href="/upload"
          className="inline-flex items-center justify-center rounded-lg border border-white/10 px-5 py-3 font-semibold text-slate-100 hover:bg-white/10"
        >
          Don&apos;t have one? Paste manual data
        </Link>
      </div>

      <p className="mt-12 text-xs text-slate-500">
        Aura Protocols produces educational protocol suggestions, not medical advice. The Engine handles biometric fitness data — never PHI. For prescribed peptides, see Aura Clinical.
      </p>
    </main>
  );
}
```

- [ ] **Step 26.2:** Manual check.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && npm run dev
```
Visit `http://localhost:3000/`. Expected: hero copy + wearable grid + two CTAs render.

- [ ] **Step 26.3:** Commit.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && git add src/app/page.tsx && git commit -m "feat(landing): build Engine landing page"
```

---

## Task 27: Connect page

**Files:**
- Create: `engine/src/app/connect/page.tsx`

- [ ] **Step 27.1:** Write the page. Authenticated Server Component → renders email-magic-link form for signed-out users, `ConnectButton` for signed-in users.

```tsx
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import ConnectButton from "@/components/ConnectButton";
import SignInForm from "./SignInForm";

export const runtime = "nodejs";

export default async function ConnectPage() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto max-w-md px-6 py-20">
        <h1 className="font-display text-3xl font-bold text-white">Sign in to continue</h1>
        <p className="mt-3 text-slate-300">
          We email you a one-time link. No password. We store your fitness data, not PHI.
        </p>
        <div className="mt-6">
          <SignInForm />
        </div>
      </main>
    );
  }

  // If they already have biometric data, bounce to /recommendation.
  const { count } = await supabase
    .from("biometric_snapshots")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  if ((count ?? 0) > 0) {
    redirect("/recommendation");
  }

  return (
    <main className="mx-auto max-w-md px-6 py-20">
      <h1 className="font-display text-3xl font-bold text-white">Connect your wearable</h1>
      <p className="mt-3 text-slate-300">
        Whoop, Oura, Apple Health, Garmin, Fitbit, Dexcom CGM. We use Terra to abstract the OAuth flow.
      </p>
      <div className="mt-6">
        <ConnectButton />
      </div>
      <p className="mt-6 text-sm text-slate-400">
        Don&apos;t have a supported wearable? <a href="/upload" className="text-cyan-300 underline">Paste manual data</a>.
      </p>
    </main>
  );
}
```

- [ ] **Step 27.2:** Create the sign-in form as a Client Component.

```tsx
// engine/src/app/connect/SignInForm.tsx
"use client";
import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function SignInForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg(null);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/connect` },
    });
    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
      return;
    }
    setStatus("sent");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-4 py-3 text-slate-100"
      />
      <button
        type="submit"
        disabled={status === "sending"}
        className="inline-flex items-center justify-center rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-900 hover:bg-cyan-300 disabled:opacity-50"
      >
        {status === "sending" ? "Sending…" : "Email me a sign-in link"}
      </button>
      {status === "sent" && <p className="text-sm text-emerald-300">Check your inbox.</p>}
      {status === "error" && <p className="text-sm text-red-300">{errorMsg}</p>}
    </form>
  );
}
```

- [ ] **Step 27.3:** Commit.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && git add src/app/connect && git commit -m "feat(auth): add magic-link sign-in + connect flow"
```

---

## Task 28: Upload page

**Files:**
- Create: `engine/src/app/upload/page.tsx`
- Create: `engine/src/app/upload/UploadClient.tsx`

- [ ] **Step 28.1:** Server-side page checks auth then renders the client form.

```tsx
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import UploadClient from "./UploadClient";

export const runtime = "nodejs";

export default async function UploadPage() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/connect?next=/upload");
  }
  return (
    <main className="mx-auto max-w-2xl px-6 py-20">
      <h1 className="font-display text-3xl font-bold text-white">Manual upload</h1>
      <p className="mt-3 text-slate-300">
        Don&apos;t have a supported wearable? Paste JSON with one day&apos;s biometric numbers.
      </p>
      <div className="mt-8">
        <UploadClient />
      </div>
    </main>
  );
}
```

- [ ] **Step 28.2:** Client wrapper that calls `/api/upload` after the form fires its `onSubmit`.

```tsx
"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import ManualUploadForm from "@/components/ManualUploadForm";
import type { BiometricSnapshot } from "@/lib/terra/schema";

export default function UploadClient() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(snap: BiometricSnapshot) {
    setStatus("sending");
    setErrorMsg(null);
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(snap),
    });
    if (!res.ok) {
      setStatus("error");
      setErrorMsg("Could not save your data. Try again.");
      return;
    }
    router.push("/recommendation");
  }

  return (
    <>
      <ManualUploadForm onSubmit={handleSubmit} />
      {status === "sending" && <p className="mt-3 text-sm text-slate-400">Saving…</p>}
      {status === "error" && errorMsg && <p className="mt-3 text-sm text-red-300">{errorMsg}</p>}
    </>
  );
}
```

- [ ] **Step 28.3:** Commit.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && git add src/app/upload && git commit -m "feat(upload): add manual upload page"
```

---

## Task 29: Recommendation page

**Files:**
- Create: `engine/src/app/recommendation/page.tsx`
- Create: `engine/src/app/recommendation/RecommendationClient.tsx`

- [ ] **Step 29.1:** Server page handles auth and fetches the most recent stored recommendation (or triggers a fresh one via the client).

```tsx
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import RecommendationClient from "./RecommendationClient";
import type { ProtocolOutput } from "@/lib/recommend/schema";

export const runtime = "nodejs";

export default async function RecommendationPage() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/connect?next=/recommendation");
  }

  const { data: latest } = await supabase
    .from("protocol_recommendations")
    .select("id, output")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="font-display text-3xl font-bold text-white">Your protocol</h1>
      <p className="mt-3 text-slate-300">
        Tuned to your last 14 days of biometrics. Re-run anytime.
      </p>
      <div className="mt-8">
        <RecommendationClient
          initial={
            latest
              ? { id: latest.id, output: latest.output as unknown as ProtocolOutput }
              : null
          }
        />
      </div>
    </main>
  );
}
```

- [ ] **Step 29.2:** Client wrapper triggers `/api/recommend` and renders `RecommendationCard`.

```tsx
"use client";
import { useState } from "react";
import RecommendationCard from "@/components/RecommendationCard";
import type { ProtocolOutput } from "@/lib/recommend/schema";

interface RecState {
  id: string;
  output: ProtocolOutput;
}

export default function RecommendationClient({ initial }: { initial: RecState | null }) {
  const [rec, setRec] = useState<RecState | null>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/recommend", { method: "POST" });
    setLoading(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { message?: string };
      setError(j.message ?? "Could not generate. Try again.");
      return;
    }
    const j = (await res.json()) as { id: string; output: ProtocolOutput };
    setRec({ id: j.id, output: j.output });
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={generate}
        disabled={loading}
        className="inline-flex items-center justify-center rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-900 hover:bg-cyan-300 disabled:opacity-50"
      >
        {loading ? "Generating…" : rec ? "Regenerate" : "Generate my protocol"}
      </button>
      {error && <p className="text-sm text-red-300">{error}</p>}
      {rec && <RecommendationCard id={rec.id} output={rec.output} />}
    </div>
  );
}
```

- [ ] **Step 29.3:** Commit.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && git add src/app/recommendation && git commit -m "feat(recommend): add recommendation page + client wrapper"
```

---

## Task 30: Sitemap + robots

**Files:**
- Create: `engine/src/app/sitemap.ts`, `engine/src/app/robots.ts`
- Create: `engine/tests/app/sitemap.test.ts`

> Unlike `shop.auraprotocols.com`'s validation pages, the Engine launches indexed. The public surfaces (`/`, `/connect`, `/upload`) all go in the sitemap. Authenticated surfaces (`/recommendation`) are not indexed because Google can't sign in anyway, but we still expose them in the sitemap with low priority; the `noindex` is added on the page metadata.

- [ ] **Step 30.1:** Failing test for sitemap.

```ts
import { describe, it, expect } from "vitest";
import sitemap from "@/app/sitemap";

describe("sitemap", () => {
  it("includes the public Engine pages", () => {
    const urls = sitemap().map((e) => new URL(e.url).pathname);
    expect(urls).toContain("/");
    expect(urls).toContain("/connect");
    expect(urls).toContain("/upload");
  });

  it("excludes API + auth callback routes", () => {
    const urls = sitemap().map((e) => new URL(e.url).pathname);
    expect(urls.every((p) => !p.startsWith("/api"))).toBe(true);
    expect(urls.every((p) => !p.startsWith("/auth"))).toBe(true);
  });
});
```

- [ ] **Step 30.2:** Run, expect failure.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && npm test -- sitemap
```
Expected: FAIL (module not found).

- [ ] **Step 30.3:** Implement `engine/src/app/sitemap.ts`.

```ts
import type { MetadataRoute } from "next";
import { BASE_URL } from "@/lib/constants";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes = [
    { path: "/", priority: 1.0 },
    { path: "/connect", priority: 0.8 },
    { path: "/upload", priority: 0.6 },
  ];
  return routes.map((r) => ({
    url: `${BASE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: r.priority,
  }));
}
```

- [ ] **Step 30.4:** Implement `engine/src/app/robots.ts`.

```ts
import type { MetadataRoute } from "next";
import { BASE_URL } from "@/lib/constants";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/api/", "/auth/", "/recommendation"] },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
```

- [ ] **Step 30.5:** Run, expect pass.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && npm test -- sitemap
```
Expected: PASS, 2 tests.

- [ ] **Step 30.6:** Commit.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && git add src/app/sitemap.ts src/app/robots.ts tests/app/sitemap.test.ts && git commit -m "feat(seo): add sitemap + robots"
```

---

## Task 31: Domain + Vercel deploy notes

**Files:**
- Create: `engine/DEPLOY.md`

> Operator task — Kearney runs these in the Vercel + Cloudflare + Supabase + Anthropic + Terra dashboards. The file is checked in so the steps are reproducible and so future agents reading this repo know what is expected to exist externally.

- [ ] **Step 31.1:** Write `engine/DEPLOY.md`.

```md
# Engine Deploy Notes

## Vercel
1. Create a new Vercel project. Import the `engine/` repo (separate from `shop.auraprotocols.com`).
2. Framework preset: Next.js. Build command: default. Output: default.
3. Add env vars from `.env.local.example` in the Vercel project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only)
   - `TERRA_DEV_ID`
   - `TERRA_API_KEY`
   - `TERRA_SIGNING_SECRET`
   - `ANTHROPIC_API_KEY` (server-only)
   - `NEXT_PUBLIC_BASE_URL=https://auraprotocols.com`
4. Add the custom domain `auraprotocols.com` in Vercel → Settings → Domains.
5. In your DNS provider (Cloudflare or registrar), point the apex A/AAAA records at Vercel as instructed.

## Supabase
1. Create a new Supabase project. Free tier.
2. Apply `supabase/migrations/0001_init.sql` then `0002_rls.sql` via the SQL editor.
3. In Authentication → URL Configuration, set:
   - Site URL: `https://auraprotocols.com`
   - Additional redirect URLs: `https://auraprotocols.com/auth/callback`, `http://localhost:3000/auth/callback`
4. In Authentication → Providers, enable Email (magic link is on by default).

## Terra
1. Sign up at tryterra.co. Dev tier is free for Months 1-2 per spec §7.1.
2. Set the webhook URL to `https://auraprotocols.com/api/terra/webhook`.
3. Copy `dev_id`, `x_api_key`, and the signing secret into the Vercel env vars.
4. In the Terra dashboard, enable the providers: WHOOP, OURA, APPLE, GARMIN, FITBIT, DEXCOM.

## Anthropic
1. Create an API key at console.anthropic.com.
2. Set `ANTHROPIC_API_KEY` in Vercel. The prompt-caching system prompt keeps spend under the $50/mo budget per spec §7.1.

## Smoke test after deploy
1. Visit `https://auraprotocols.com/` — landing renders.
2. Visit `/connect` — sign-in form renders.
3. Sign in with magic link to a test inbox.
4. After redirect, click "Connect a wearable" → Terra widget should open.
5. Connect a real wearable (or use Terra's Sandbox provider in dev) → land on `/recommendation`.
6. Click "Generate my protocol" → a card renders with disclaimer, prescribe CTA, feedback widget.
7. Submit a thumbs-up and a thumbs-down with free text → confirm the row appears in Supabase `recommendation_feedback`.
```

- [ ] **Step 31.2:** Commit.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && git add DEPLOY.md && git commit -m "docs: add deploy notes for Vercel/Supabase/Terra/Anthropic"
```

---

## Task 32: Cleanup + final verification

**Files:**
- Verify: build, lint, types, tests, route map

- [ ] **Step 32.1:** Run the full check.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && npm run lint && npx tsc --noEmit && npm test && npm run build
```
Expected:
- lint: clean (or only acceptable Next.js warnings).
- tsc: no errors.
- tests: all green. Expected test count by file:
  - `tests/components/Disclaimer.test.tsx`: 2
  - `tests/components/PrescribeCTA.test.tsx`: 2
  - `tests/components/ManualUploadForm.test.tsx`: 2
  - `tests/components/FeedbackWidget.test.tsx`: 2
  - `tests/components/RecommendationCard.test.tsx`: 2
  - `tests/lib/terra/normalize.test.ts`: 2
  - `tests/lib/recommend/rules.test.ts`: 6
  - `tests/lib/recommend/llm.test.ts`: 2
  - `tests/lib/recommend/index.test.ts`: 2
  - `tests/api/upload.test.ts`: 3
  - `tests/api/recommend.test.ts`: 2
  - `tests/api/feedback.test.ts`: 3
  - `tests/app/sitemap.test.ts`: 2
  Total: 32 tests, 13 files.
- build: succeeds, Next.js prints the route map below.

- [ ] **Step 32.2:** Confirm the printed route map includes all of these and that the API routes are marked dynamic:
  - `/` (static)
  - `/connect` (dynamic — auth)
  - `/upload` (dynamic — auth)
  - `/recommendation` (dynamic — auth)
  - `/sitemap.xml`, `/robots.txt`
  - `/auth/callback` (route handler)
  - `/api/terra/connect`, `/api/terra/callback`, `/api/terra/webhook`
  - `/api/upload`, `/api/recommend`, `/api/feedback`

- [ ] **Step 32.3:** Visual smoke. Start the dev server and hit each public route.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && npm run dev
```
Verify in a browser at `http://localhost:3000`:
- `/` renders the hero + wearable list + two CTAs.
- `/connect` (signed-out) renders the magic-link sign-in form.
- `/upload` (signed-out) redirects to `/connect?next=/upload`.
- `/recommendation` (signed-out) redirects to `/connect?next=/recommendation`.
- `/sitemap.xml` returns the three public URLs and no `/api`, `/auth`, `/recommendation` entries.
- `/robots.txt` disallows `/api/`, `/auth/`, `/recommendation`.

- [ ] **Step 32.4:** Tag the milestone.

```bash
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && git add -A && git diff --cached --quiet || git commit -m "chore: finalize engine MVP"
cd C:/Users/kadam/k9_AI_Projects/aura-protocols/engine && git tag engine-mvp-month1-complete
```

---

## Done — what ships at the end of this plan

After Task 32, the Engine MVP at `auraprotocols.com` is live and ready for Month 1's ≥50 wearable connections target (spec §8.1):

- Greenfield Next.js 16 project deployed on Vercel, separate repo and domain from `shop.auraprotocols.com`.
- Supabase auth (email magic link), Postgres schema for profiles + wearable connections + biometric snapshots + protocol recommendations + feedback, full RLS coverage.
- Terra API end-to-end: widget OAuth connect flow → callback persistence → HMAC-verified webhook ingestion → normalized biometric snapshots.
- Manual CSV/JSON upload fallback, validated against the same `BiometricSnapshot` schema as Terra (spec §6 risk E-1).
- Rules + LLM hybrid recommendation engine. Deterministic safety rules (template selection, contraindications, dose ceilings) gate the Anthropic call. System prompt is prompt-cached for $50/mo budget compliance (spec §7.1).
- Three protocol templates v0: Recovery, GH, Sleep/Stress (spec §5.2 Track B).
- Disclaimer + "Get this prescribed" CTA mounted on every recommendation surface via `RecommendationCard` (spec §4.1, §6 risk E-2).
- Thumbs-up/down + free-text feedback widget on every recommendation (spec §11.3 Customer Signal Loop).
- Public surfaces (landing, connect, upload) indexed via sitemap + robots; authenticated surfaces excluded from indexing.
- Test harness in place: 32 tests across rules, normalization, LLM contract, route auth, components.

## What is NOT done (deferred to other plans or to operator)

- Paid Engine tier ($9–19/mo) — explicitly deferred to Month 4–5 per spec §4.1.
- Aura Clinical brand and Rx flow — `clinical-backend` plan. The Engine's prescribe CTA hands off via URL; the receiving site is built elsewhere.
- Editorial site rebuild — `shop-rebuild` plan.
- Ad creative, content cadence, channel ops — `distribution-program` plan.
- Supabase project provisioning, Terra account provisioning, Anthropic account provisioning, Vercel project provisioning, DNS — operator tasks documented in `engine/DEPLOY.md`.
- Lead-magnet PDF design — not in scope here; the Engine has no email capture beyond Supabase sign-in.
- Paid-tier biometric-triggered upsells (spec §5.5) — Month 4–6 work, not in MVP.

---

## Self-review pass

**Spec coverage:**
- §4.1 Engine tech architecture — covered by Tasks 5–7 (Supabase), 10–14 (Terra), 17–21 (recommend), 22 (feedback).
- §4.1 Critical framing rule (educational, not medical advice) — Tasks 3 (constants), 8 (Disclaimer), 23 (RecommendationCard mounts Disclaimer).
- §4.1 "Get this prescribed" CTA — Tasks 3 (constants), 9 (PrescribeCTA), 23 (RecommendationCard mounts it).
- §4.1 Manual data upload fallback — Tasks 15 (form), 16 (route), 28 (page).
- §5.2 Track B 3 protocol templates v0 — Task 18.
- §6 risk E-1 wearable approval stall — Task 18 (Terra abstraction) + Tasks 15/16/28 (manual fallback).
- §6 risk E-2 user harm — Tasks 8 (Disclaimer), 9 (PrescribeCTA), 17 (deterministic safety floor), 19 (LLM contract enforces rule envelope).
- §7.1 Anthropic budget via prompt caching — Task 19 (`cache_control: ephemeral` on system prompt).
- §7.1 Supabase free tier — Tasks 5–7.
- §8.1 Month 1 ≥50 wearable connections target — entire plan output.
- §11.3 Customer Signal Loop (thumbs + free text) — Task 22.
- AGENTS.md Next.js 16 warning — Pre-Plan Setup + Task 1.7 (copy AGENTS.md into engine repo).

**Placeholder scan:**
- `PLACEHOLDER_*` strings in `.env.local.example` (Task 4) — intentional, operator-filled.
- `https://auraclinical.com` (Task 3) — flagged as placeholder until `clinical-backend` plan locks the final domain. Stored once in `constants.ts`; one-line swap when finalized.
- No `TODO`, `TBD`, or "similar to Task N" references remain.

**Type consistency:**
- `BiometricSnapshot` is the single normalized shape across Terra (Task 10), manual upload (Tasks 15, 16), recommendation orchestrator (Task 20), and recommendation route (Task 21).
- `ProtocolOutput` is the single LLM-output shape used by `personalizeProtocol` (Task 19), the orchestrator (Task 20), the recommendation route (Task 21), and `RecommendationCard` (Task 23).
- `ProtocolTemplateId` and `WearableId` are exported once from `constants.ts` and imported everywhere.
- All Route Handlers declare `export const runtime = "nodejs"` (no Edge runtime), matching the server-runtime requirement in Pre-Plan Setup.

**Gaps surfaced (none blocking):**
- Spec §11.4 opportunity surfacing is a founder operating practice, not a code surface — appropriately deferred to the `distribution-program` plan and the founder's Weekly Scan ritual.
- Spec §11.1 Weekly Scan items (regulatory, competitor, vendor, wearable/AI, search trends) are operator concerns. The Engine emits the data the founder needs (feedback rows, recommendation rows, biometric rows) — surfacing this in a dashboard is out of scope here and worth a follow-up sprint after MVP launch.
- Spec §4.1 paid tier is explicitly Month 4–5 and excluded by the brief.

---

## Open questions surfaced during plan-writing

1. **Final Clinical domain.** `CLINICAL_URL` defaults to `https://auraclinical.com`; the `clinical-backend` plan will lock the real value. Single constant edit when finalized.
2. **Anthropic model id.** `ANTHROPIC_MODEL = "claude-opus-4-7"` matches the current model. If the project later standardizes on Sonnet for cost, swap the constant.
3. **Terra provider list.** Six providers shipped in `SUPPORTED_WEARABLES`. If Terra dashboard gating delays Dexcom or Garmin, drop them from the constant without code changes elsewhere.
4. **Glucose data privacy.** Dexcom CGM data could be argued to sit closer to PHI than other biometrics. The current framing treats it as fitness data per spec §4.1. If legal review (Track C of spec §5.2) flags this, gate `DEXCOM` behind a future feature flag — no schema change needed.
