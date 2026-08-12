# Engine Wearable-First Build-Out Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the Aura Protocol Engine to "100% built, waiting only on the live Terra token" — a wearable-first funnel whose entire pipeline (connect → biometric rollups → trends → tensions → LLM protocol → dashboard regeneration) can be built and exercised end-to-end against synthetic fixtures, with only the live auth-widget handshake gated on the Terra credential.

**Architecture:** Terra offers no free sandbox, so we build our own. A single fixture generator produces realistic multi-day `BiometricSnapshot[]` scenarios; a dev-only, env-gated seed route writes those into Supabase (`wearable_connections` + `biometric_snapshots`) so the real funnel and `recommend()` pipeline run unchanged without Terra. The same fixtures back the trend/tension unit tests. The live Terra connect/callback/webhook code already exists and is hardened + fixture-tested here; only its live verification waits for the token.

**Tech Stack:** Next.js 16 (App Router, Node runtime), TypeScript 5, Supabase (Postgres + auth + RLS), Anthropic SDK (mocked in tests), Vitest, Tailwind v4. Design tokens per `apps/engine/CLAUDE.md` (dark; cyan/violet/rose/emerald).

**Branch:** `feat/engine-wearable-first` (off `main`; engine deploys from `main`).

**Reference:** `apps/engine/ALGORITHM.md` is the source-of-truth spec for templates (§2), safety floor (§3), tensions (§4), LLM contract (§5), routing (§6), output shape (§7), and the manual-vs-Terra capability split (§8).

---

## Data Model (confirmed from code)

- **`biometric_snapshots`** — one row per user per day. ~40 snake_case columns (`user_id, source, captured_at, metric_date, recovery_score, hrv_ms, resting_hr_bpm, sleep_hours, deep_sleep_hours, rem_sleep_hours, steps, active_calories, glucose_avg_mgdl, glucose_variability, sleep_hrv_rmssd_ms, sleep_efficiency_pct, sleep_latency_min, awake_hours, respiration_bpm, spo2_pct, skin_temp_delta_c, strain, stress_avg, workout_count, weight_kg, bodyfat_pct, menstrual_phase, cycle_day, lh_miu_ml, fsh_miu_ml, e3g_ng_ml, pdg_ug_ml, calories_kcal, protein_g, carbs_g, fat_g, raw`).
- **`wearable_connections`** — `user_id, provider, terra_user_id`.
- **`profiles`** — `id, age, biological_sex, weight_kg, activity_level, primary_goal, current_medications, using_peptides, peptides_detail, interested_in_rx, budget_tier, onboarding_complete, glp1_status, glp1_stopped_month, menopause_status`.
- **`protocol_recommendations`** — `user_id, template, rules_summary, llm_summary, output, tensions`.

**Domain type** `BiometricSnapshot` (camelCase) is defined in `src/lib/terra/schema.ts`. The pipeline entry is `recommend(series: BiometricSnapshot[], profile): { rules, trends, tensions, output }` in `src/lib/recommend/index.ts`, driven by `POST /api/recommend` (reads last 14 snapshots + profile).

---

## File Structure

**Create:**
- `src/lib/fixtures/scenarios.ts` — synthetic scenario generator (`BiometricSnapshot[]`), shared by the dev seed route AND the trend/tension tests.
- `src/lib/terra/snapshot-row.ts` — `biometricSnapshotToRow(userId, snap)` mapping camelCase → snake_case DB row (DRY: extracted from the upload route, reused by upload + seed).
- `src/app/api/dev/seed/route.ts` — dev-only, env-gated seeder (connection + 14 snapshots for a scenario).
- `tests/lib/fixtures/scenarios.test.ts`, `tests/lib/terra/snapshot-row.test.ts`, `tests/api/dev-seed.test.ts`.

**Modify:**
- `src/app/api/upload/route.ts` — use the extracted `biometricSnapshotToRow`.
- `src/app/onboarding/IntakeForm.tsx` — add an env-gated "🧪 Simulate wearable (dev)" affordance in the Step-1 gate.
- `src/lib/recommend/trends.ts`, `tension.ts` — WS2/WS3 build-out (later tasks).
- `src/app/dashboard/page.tsx` + `src/components/dashboard/*` — WS4/WS5.
- `src/lib/recommend/vendor-router.ts` — WS6.

---

## WS1 — Commit the rework, then build the dev seam

### Task 1: Commit the in-flight wearable-first rework

**Files:** the transplanted 334-line rework (7 engine files) + `apps/engine/ALGORITHM.md`, already applied to this worktree.

- [ ] **Step 1: Confirm the diff is exactly the rework**

Run: `git status --porcelain -- apps/engine`
Expected: 7 ` M` engine files + `?? apps/engine/ALGORITHM.md`.

- [ ] **Step 2: Green-check before committing**

Run: `cd apps/engine && npm run test && npm run build`
Expected: tests pass, build succeeds. (The rework is UI/prompt-only; no test contracts change.)

- [ ] **Step 3: Commit**

```bash
git add apps/engine
git commit -m "feat(engine): wearable-first onboarding funnel + enriched LLM signals + ALGORITHM.md"
```

### Task 2: Extract the snapshot→row mapper (DRY for upload + seed)

**Files:**
- Create: `src/lib/terra/snapshot-row.ts`
- Modify: `src/app/api/upload/route.ts`
- Test: `tests/lib/terra/snapshot-row.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { biometricSnapshotToRow } from "@/lib/terra/snapshot-row";

describe("biometricSnapshotToRow", () => {
  it("maps camelCase snapshot fields to snake_case db columns", () => {
    const row = biometricSnapshotToRow("u1", {
      source: "DEV_SIM", capturedAt: "2026-08-01T00:00:00Z", metricDate: "2026-08-01",
      hrvMs: 42, recoveryScore: 55, glucoseAvgMgdl: 96, weightKg: 80,
    });
    expect(row.user_id).toBe("u1");
    expect(row.hrv_ms).toBe(42);
    expect(row.recovery_score).toBe(55);
    expect(row.glucose_avg_mgdl).toBe(96);
    expect(row.metric_date).toBe("2026-08-01");
    expect(row.weight_kg).toBe(80);
  });
  it("defaults metric_date from capturedAt and nulls missing metrics", () => {
    const row = biometricSnapshotToRow("u1", { source: "MANUAL", capturedAt: "2026-08-02T12:00:00Z" });
    expect(row.metric_date).toBe("2026-08-02");
    expect(row.hrv_ms).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — Run: `npm run test -- snapshot-row` → FAIL (module not found).

- [ ] **Step 3: Implement `snapshot-row.ts`** — move the exact column mapping currently inlined in `src/app/api/upload/route.ts` (the `.insert({...})` object) into a pure function `biometricSnapshotToRow(userId: string, snap: BiometricSnapshot): Record<string, unknown>` returning `{ user_id: userId, ...all snake_case columns with ?? null }`. Import `BiometricSnapshot` from `@/lib/terra/schema`.

- [ ] **Step 4: Refactor `upload/route.ts`** to `supabase.from("biometric_snapshots").insert(biometricSnapshotToRow(user.id, snap))`.

- [ ] **Step 5: Run tests** — Run: `npm run test -- snapshot-row` and `npm run test -- upload` → PASS.

- [ ] **Step 6: Commit** — `git commit -am "refactor(engine): extract biometricSnapshotToRow, reuse in upload route"`

### Task 3: Fixture generator — synthetic scenarios

**Files:**
- Create: `src/lib/fixtures/scenarios.ts`
- Test: `tests/lib/fixtures/scenarios.test.ts`

Scenarios must each deterministically trip a specific template (ALGORITHM §2) / tension (§4):

| Scenario id | Intended result |
|---|---|
| `metabolic` | METABOLIC (glucose avg >100 / variability >36%) |
| `recovery-deficit` | RECOVERY (14d recovery <50%) |
| `sleep-stress` | SLEEP_STRESS (14d sleep <6h) |
| `gh-baseline` | GH (no threshold met) |
| `overreaching` | GH/RECOVERY + Overreaching tension (high strain + recovery <45 + HRV downtrend + rising RHR) |

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { buildScenarioSeries, SCENARIOS } from "@/lib/fixtures/scenarios";
import { pickTemplate } from "@/lib/recommend/rules";

describe("scenario fixtures", () => {
  it("produces a 14-day descending-date series", () => {
    const s = buildScenarioSeries("gh-baseline");
    expect(s).toHaveLength(14);
    expect(new Date(s[0].capturedAt).getTime()).toBeGreaterThan(new Date(s[13].capturedAt).getTime());
  });
  it.each([
    ["metabolic", "METABOLIC"],
    ["recovery-deficit", "RECOVERY"],
    ["sleep-stress", "SLEEP_STRESS"],
    ["gh-baseline", "GH"],
  ] as const)("%s trips the %s template", (id, template) => {
    expect(pickTemplate(buildScenarioSeries(id), null)).toBe(template);
  });
  it("exposes every scenario id in SCENARIOS", () => {
    expect(SCENARIOS.map((s) => s.id)).toEqual(
      expect.arrayContaining(["metabolic", "recovery-deficit", "sleep-stress", "gh-baseline", "overreaching"]),
    );
  });
});
```

- [ ] **Step 2: Run to verify fail** — `npm run test -- scenarios` → FAIL.

- [ ] **Step 3: Implement `scenarios.ts`** — export `SCENARIOS: {id, label, description}[]` and `buildScenarioSeries(id, days=14): BiometricSnapshot[]`. Generate `days` rows dated today back to today-13 (index 0 = most recent, matching `/api/recommend` DESC order). Per-scenario metric bands (verify exact thresholds against `pickTemplate` in `rules.ts` before finalizing values):
  - `metabolic`: glucoseAvgMgdl ~108–120, glucoseVariability ~38–44, recovery ~60, sleep ~7.
  - `recovery-deficit`: recoveryScore ~38–48, hrv ~30, sleep ~6.5, glucose ~90.
  - `sleep-stress`: sleepHours ~4.8–5.6, recovery ~55, glucose ~90.
  - `gh-baseline`: recovery ~65, sleep ~7.5, glucose ~90 (nothing tripped).
  - `overreaching`: strain rising ~14–18, recoveryScore ~40 declining, hrvMs declining 55→30 across the window, restingHrBpm rising 52→62. Include realistic secondary fields (deep/rem sleep, respiration) so LLM rationale has material.

- [ ] **Step 4: Run tests** — `npm run test -- scenarios` → PASS. Adjust bands until template assertions hold.

- [ ] **Step 5: Commit** — `git commit -am "feat(engine): synthetic biometric scenario fixtures for dev seed + tests"`

### Task 4: Dev-only seed route

**Files:**
- Create: `src/app/api/dev/seed/route.ts`
- Test: `tests/api/dev-seed.test.ts`

Guard: only runs when `process.env.ENGINE_DEV_TOOLS === "1"` AND `process.env.NODE_ENV !== "production"`; otherwise 404. Requires an authed user. Seeds a `wearable_connections` row (`provider: "DEV_SIM"`, `terra_user_id: "dev-<userid>"`) then inserts 14 `biometric_snapshots` via `biometricSnapshotToRow`.

- [ ] **Step 1: Write the failing test** (mock supabase server client + env):

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const insert = vi.fn().mockResolvedValue({ error: null });
const from = vi.fn(() => ({ insert }));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) },
    from,
  }),
}));

async function call(scenario = "metabolic") {
  const { POST } = await import("@/app/api/dev/seed/route");
  return POST(new Request(`http://localhost/api/dev/seed?scenario=${scenario}`, { method: "POST" }));
}

describe("POST /api/dev/seed", () => {
  beforeEach(() => { insert.mockClear(); from.mockClear(); vi.resetModules(); });
  it("404s when dev tools are off", async () => {
    vi.stubEnv("ENGINE_DEV_TOOLS", "0");
    const res = await call();
    expect(res.status).toBe(404);
  });
  it("seeds a connection + 14 snapshots when enabled", async () => {
    vi.stubEnv("ENGINE_DEV_TOOLS", "1");
    vi.stubEnv("NODE_ENV", "test");
    const res = await call("metabolic");
    expect(res.status).toBe(200);
    expect(from).toHaveBeenCalledWith("wearable_connections");
    expect(from).toHaveBeenCalledWith("biometric_snapshots");
  });
});
```

- [ ] **Step 2: Run to verify fail** — `npm run test -- dev-seed` → FAIL.

- [ ] **Step 3: Implement the route** — read `scenario` from the URL (default `metabolic`; 400 on unknown id), gate on env, require user, insert connection, then `insert(series.map((s) => biometricSnapshotToRow(user.id, s)))`. Return `{ ok: true, scenario, days: series.length }`.

- [ ] **Step 4: Run tests** — `npm run test -- dev-seed` → PASS.

- [ ] **Step 5: Commit** — `git commit -am "feat(engine): dev-only seed route for synthetic wearable data (env-gated)"`

### Task 5: Dev affordance in the Step-1 gate

**Files:** Modify `src/app/onboarding/IntakeForm.tsx`.

- [ ] **Step 1:** In the Step-1 gate block, when `process.env.NEXT_PUBLIC_ENGINE_DEV_TOOLS === "1"`, render a secondary button below "Connect Wearable": `🧪 Simulate wearable (dev)` that `await fetch("/api/dev/seed?scenario=recovery-deficit", { method: "POST" })` then `router.push("/onboarding")` (reload → `hasData` true → gate auto-skips to Step 2). Reuse existing error handling.

- [ ] **Step 2: Manual verify (dev seam works end-to-end)** — with `ENGINE_DEV_TOOLS=1 NEXT_PUBLIC_ENGINE_DEV_TOOLS=1`, run the app, sign in, hit `/onboarding`, click Simulate → complete Steps 2–4 → confirm `/api/recommend` returns a real protocol from seeded data. Screenshot.

- [ ] **Step 3: Commit** — `git commit -am "feat(engine): dev simulate-wearable button gated behind NEXT_PUBLIC_ENGINE_DEV_TOOLS"`

**WS1 exit criteria:** a developer with no Terra token can click through the real wearable-first funnel via the simulate button and generate a protocol from synthetic data; fixtures are reusable by WS2/WS3; production is unaffected (dev routes/buttons 404/hidden without the env flags).

---

## WS2 — Trend engine (the Terra unlock)

**Files:** Modify `src/lib/recommend/trends.ts`; Test `tests/lib/recommend/trends.test.ts` (extend).

Build true multi-day trends per ALGORITHM §8, consuming the WS1 fixtures. Compute over the up-to-14-day series: `hrv7dAvg, hrv14dAvg, hrvTrendMsPerDay` (linear slope), `restingHrTrendBpmPerDay`, `sleep7dAvg`, `deepSleepPct`, `remSleepPct`, `recovery7dAvg`, `strain7dAvg`, `glucoseAvg`, `glucoseVariabilityAvg`, plus `dayCount` and a `confidence: "snapshot" | "partial" | "full"` label (1 day = snapshot, 2–6 = partial, 7+ = full). Types live in `src/lib/recommend/schema.ts` (`BiometricTrends`) — extend it. TDD: assert `buildScenarioSeries("overreaching")` yields a negative `hrvTrendMsPerDay` and a positive `restingHrTrendBpmPerDay`; single-snapshot series yields `confidence: "snapshot"` and null trend slopes.

---

## WS3 — Multi-day tension detection

**Files:** Modify `src/lib/recommend/tension.ts`; Test `tests/lib/recommend/tension.test.ts` (extend).

Wire the three tensions (ALGORITHM §4) to the WS2 trends + profile: **Overreaching** (strain7dAvg high + recovery <45 + `hrvTrendMsPerDay < 0` + `restingHrTrendBpmPerDay > 0`); **Metabolic Rebound** (`profile.glp1_status === "recently_stopped"` + rising weight + protein below threshold); **Hormonal Shift** (`menopause_status` peri/post + declining sleep efficiency + suppressed HRV + skin-temp variability where present). Each returns `{ type, severity: "high"|"elevated"|"watch", drivers }`. TDD: `overreaching` fixture → Overreaching tension present; `gh-baseline` → none.

---

## WS4 — Protocol freshness / regeneration loop

**Files:** Modify `src/app/dashboard/page.tsx`, `src/components/dashboard/ProtocolSummaryCard.tsx`; add a `POST /api/recommend` re-trigger action.

Compare latest `biometric_snapshots.captured_at` vs latest `protocol_recommendations.created_at`; when newer data exists, show a "New data available — regenerate protocol" prompt that re-POSTs `/api/recommend`. Exercise via WS1 seed (re-seed → newer data → prompt appears). TDD the pure "is-stale" comparator in `src/lib/recommend/dashboard-route.ts` (extend its test).

---

## WS5 — Dashboard + recommendation UX wiring

**Files:** `src/components/dashboard/{ConnectionsCard,GoalProfileCard,ProtocolSummaryCard}.tsx`, `src/app/recommendation/*`.

Wire cards to real profile/protocol/connection state (`wearable_connections` shows "DEV_SIM" in dev, real providers later). Ensure `Disclaimer` + `PrescribeCTA` render on every recommendation surface (privacy rule, `apps/engine/CLAUDE.md`). Component tests via existing patterns in `tests/components/`.

---

## WS6 — Vendor-router resilience

**Files:** Modify `src/lib/recommend/vendor-router.ts`; Test `tests/lib/recommend/vendor-router.test.ts` (extend).

Make routing tolerant of vendor slug changes / missing SKUs (directly de-risks the Ignite recode / Lilly-RETA volatility). When a compound has no matching in-stock vendor entry, the rail must degrade gracefully (skip the compound's vendor row, never render a broken link) rather than throw. TDD: a compound absent from `products.ts` yields an empty-but-valid vendor result, not an exception.

---

## WS7 — Terra last-mile scaffolding (token-gated)

**Files:** `src/app/api/terra/webhook/route.ts`, `src/lib/terra/client.ts`; Test `tests/lib/terra/*` (extend).

The connect/callback/webhook code exists. Add fixture-based tests: craft a Terra webhook payload + valid `terra-signature` HMAC (using a test secret), assert `verifyTerraSignature` passes and `normalizeTerraPayload` produces expected snapshot columns; assert a bad signature is rejected. This proves the ingest path end-to-end offline. Only the live handshake against `api.tryterra.co` waits for the token — document the go-live checklist (set `TERRA_DEV_ID`, `TERRA_API_KEY`, `TERRA_SIGNING_SECRET`; unset `ENGINE_DEV_TOOLS`).

---

## Self-Review Notes

- **Spec coverage:** WS1–WS7 map to ALGORITHM §§1–8 (WS1 data-in seam, WS2 §8 trends, WS3 §4, WS4 §7 loop, WS5 §6/§7 surfaces, WS6 §6 routing, WS7 §1 ingest). The manual-entry path is intentionally deprioritized (product decision: wearable-first), but `/api/upload` remains functional and is reused by the seam.
- **Type consistency:** `BiometricSnapshot` (camelCase, `schema.ts`) throughout the domain; `biometricSnapshotToRow` is the single camel→snake boundary, used by both upload and seed. `buildScenarioSeries`/`SCENARIOS` names are stable across WS1/WS2/WS3.
- **Production safety:** all dev tooling gated behind `ENGINE_DEV_TOOLS` (server) + `NEXT_PUBLIC_ENGINE_DEV_TOOLS` (client); routes 404 and buttons hide without them.
