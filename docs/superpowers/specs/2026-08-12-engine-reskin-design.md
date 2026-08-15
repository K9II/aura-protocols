# Engine Reskin — Pharmacopoeia (Design Spec)

**Date:** 2026-08-12
**App:** `apps/engine` (auraprotocols.com)
**Goal:** Re-skin every engine surface into the shop's live "Pharmacopoeia" design system (paper / ink / specimen-red) so the engine reads as the same **Aura Protocols** property as `shop.auraprotocols.com`. Fold in the removal of the shelved *Aura Clinical* brand, routing prescribe-grade demand to **Modality** through a single isolated constant.

---

## Decisions (locked)

1. **Target system** — port the shop's `.pharmacopoeia` tokens/primitives verbatim (source of truth: `apps/shop/src/app/globals.css`). Not the Modality bordeaux variant — the shop's specimen-red.
2. **Brand identity** — engine carries **Aura Protocols** identity, matching the shop: same `AuraMark` lockup + "Aura Protocols" wordmark + nav/footer chrome. Unified Aura brand across shop + engine.
3. **Scope** — all 7 pages (`/`, `/connect`, `/dashboard`, `/demo`, `/onboarding`, `/upload`, `/recommendation`) + shared components, **plus** new engine Navbar/Footer/AuraMark chrome.
4. **Instrument palette** — the dense "protocol terminal" keeps its 5-way semantic differentiation via a **muted instrument palette** (desaturated, paper-readable tints), not neon and not full-monochrome.
5. **Clinical split** — Aura (shop + engine) = research peptides + biometric readings + generated protocols, **no clinician / no Rx**. **Modality** = the clinical/prescribe lane. Engine's prescribe-grade + contraindicated routing hands off to Modality. The dead *Aura Clinical* brand is removed.

---

## 1. Foundation — `apps/engine/src/app/globals.css`

Port the shop's `.pharmacopoeia` token block + primitive classes, **scoped under a root class** so unported pages keep the legacy dark theme during migration (same opt-in pattern the shop uses).

Base tokens (verbatim from shop):

```
--paper: #EDE9E0;  --paper-deep: #E2DCCC;
--ink: #1C1A15;    --ink-soft: #4A4438;
--specimen: #A32B1F;
--line: #C9C2AE;
```

Port these primitive families from the shop: `.p-container`, `.p-serif`, `.p-serif-italic`, `.p-chip`, `.p-btn-primary`, `.p-btn-outline`, `.p-badge` (+`--specimen`), `.p-card`, `.p-callout`, `.p-link`, `.p-cat-label`, nav (`.p-top`, `.p-navlinks`, `.p-nav-cta`), `.p-foot`, section rhythm, load-in / reveal animations, the `.aura-*` wordmark animation block, and the `.p-biosig-*` label styles (reference treatment for the sphere).

Also add the **instrument palette** tokens (see §3) into this scope.

Keep the existing dark-mode `select`/`option` fix but re-point it to paper/ink.

## 2. Fonts — `apps/engine/src/app/layout.tsx`

- **Newsreader** (serif) — all display headers. **Replaces Syne.** (`--font-newsreader` / `--font-serif`)
- **Inter** — body. Unchanged.
- **JetBrains Mono** — **kept**, but scoped to the instrument only (telemetry tables, eyebrows, command bar). Mono is functional for tabular readouts; the Modality sibling kept mono for the same role.
- Add **Space Grotesk** as `--font-display` only if the ported `AuraMark`/wordmark needs it (shop uses it for `.aura-wordmark`). Confirm during build; otherwise Newsreader-italic wordmark like the shop nav.

Body no longer forces the dark background; pages opt into `.pharmacopoeia`.

## 3. The muted instrument palette (core new artifact)

Five paper-readable semantic tokens replace the five neon literals. Dark, desaturated marks that read as ink-adjacent on bone — **not glows**. Defined as CSS vars in the `.pharmacopoeia` scope **and** mirrored in a TS module (`apps/engine/src/lib/theme/instrument.ts`) because the terminal uses inline `style={{}}` (can't read CSS classes).

| Token | Meaning (old neon) | Hex | Tint bg |
|---|---|---|---|
| `--sig-bio`   | biometric / primary (cyan `#00d4ff`)      | `#2F6E6B` dusty teal  | `rgba(47,110,107,.09)` |
| `--sig-llm`   | LLM / adjunct / protein (violet `#8b5cf6`)| `#6A4C74` muted plum  | `rgba(106,76,116,.09)` |
| `--sig-alert` | tension / contraindication (rose `#fb7185`)| `#A32B1F` specimen    | `rgba(163,43,31,.08)`  |
| `--sig-ok`    | live / OK (emerald `#34d399`)             | `#5B7A47` sage        | `rgba(91,122,71,.10)`  |
| `--sig-warn`  | warning / vitamins (amber `#fbbf24`)      | `#9C6B24` ochre       | `rgba(156,107,36,.10)` |

Tension **severity** scale (`SEVERITY` map in RecommendationCard): `watch` → `#9C6B24` ochre · `elevated` → `#B4622E` terracotta · `high` → `#A32B1F` specimen.

Neutral/structural remaps used throughout the instrument:
- backgrounds `#04060f` / `#06080f` → `var(--paper)`; `#0d1117` / `#0a0f1a` → `var(--paper-deep)`
- white-alpha borders (`rgba(255,255,255,.06–.1)`) → `var(--line)`
- text `#fff`/`#e2e8f0` → `--ink`; `#cbd5e1`/`#94a3b8` → `--ink`/`--ink-soft`; `#64748b`/`#475569`/`#334155` → `--ink-soft`/`--ink-faint`
- "on-accent" text (was dark `#04060f` on neon buttons) → `var(--paper)` on ink/specimen buttons

The TS module exports named constants (`SIG.bio`, `SIG.bioTint`, …, `SEVERITY_INK`) so the terminal references tokens, not literals. **Reskin once, and any future theme flip is a single-module edit.**

## 4. Instrument surfaces (heavy lift)

### `apps/engine/src/components/RecommendationCard.tsx`
~700 lines of inline hardcoded hex. Every literal → token from §3. Sub-parts:
- **Chrome bar** — dark gradient → paper-deep; `AURA.engine · session …` in ink + `--sig-bio` session id; live dot `--sig-ok`; STALE badge `--sig-warn`.
- **TelemetryPanel** — dashed `--sig-bio` header; `StatRow` up=`--sig-ok`, down=`--sig-alert`, neutral=`--ink`, dim=`--ink-faint`; sparklines HRV=`--sig-alert`, recovery=`--sig-bio`.
- **BiosignaturePanel** (radar/sphere) — radial cyan/violet backdrop → soft specimen/ink wash on `--paper-deep`; grid rings → `--line`; axis spokes → faint `--sig-bio`; **data polygon fill/stroke → specimen** (matches shop sphere); axis-marker dots → the 5 tints; center glow → ink; ResPills recolor to the 5 tints.
- **RightPanel** tabs + `OutCard` variants — peptide-primary=`--sig-bio`, peptide-adj/protein=`--sig-llm`, vitamin=`--sig-warn`, food=`--sig-bio`; card backgrounds → tint bg + `--line`; names in ink.
- **HandoffSection** — see §6 (routing + copy change).
- **TensionsBand** — severity colors from §3 map; driver chips → paper/ink/line + JetBrains Mono.
- **BottomSection** (reasoning log + command bar) — dark gradient → paper-deep; tag styles `rule`=`--sig-ok`, `llm`=`--sig-llm`, `nut`=`--sig-warn`, `out`=`--sig-bio`; command bar `aura ›` prompt in `--sig-bio`, blinking caret specimen; `retune` button ink/specimen.

### `apps/engine/src/components/BiosignatureSphere.tsx` (home hero canvas)
Canvas-drawn dials + boot log. DIALS colors → `--sig-bio` / `--sig-llm` / `--sig-alert`; dial track `rgba(0,0,0,.08)`; needle hub `--ink`; labels `--ink-soft`; boot-log printed lines `--ink-soft`, active line `--sig-bio`, caret specimen; top border → `--line`. (Colors sourced from the §3 TS module.)

## 5. Document surfaces (mechanical recolor)

Each wraps its root in `.pharmacopoeia` and swaps Tailwind dark utilities for primitives:

- **`/` home** (`page.tsx`) — eyebrow → mono specimen; `font-display` h1 → Newsreader; "Under Construction" panel → `.p-callout` with specimen accent; footer disclaimer → `--ink-soft`.
- **`/connect`** + `SignInForm.tsx` — "Coming Soon" panel → `.p-card`; form inputs → paper/ink/line; buttons → `.p-btn-primary`.
- **`/onboarding`** + `IntakeForm.tsx` — eyebrow/heading; the multi-field form → paper inputs, ink labels, `.p-btn-primary`; progress affordances → specimen. (Preserve the uncommitted wearable-first functional changes — reskin rides on top.)
- **`/upload`** + `UploadClient.tsx` — heading + dropzone → dashed `--line` on paper; buttons → primitives.
- **`/dashboard`** + `dashboard/{ConnectionsCard,GoalProfileCard,ProtocolSummaryCard}.tsx` — glass cards → `.p-card`; accents → tints/specimen.
- **`/demo`** (`demo/page.tsx`) — sticky control bar → paper-deep + `--line`; "Demo Mode" eyebrow mono specimen; scenario/routing toggle buttons → ink/specimen active states; `DemoIntakeForm` inputs/buttons like onboarding; `SafetyFloorPanel` (`#0a0f1a` card) → `.p-card` with §3 tints for template/contra/trigger chips and the dose-ceiling table (Δ up=`--sig-ok`, down=`--sig-warn`); `LiveProfileBar` → `--sig-llm`-tinted `.p-callout`.
- Shared: **`Disclaimer.tsx`**, **`PrescribeCTA.tsx`**, **`ClinicalRouter.tsx`**, **`VendorRail.tsx`/`VendorCard.tsx`**, **`EngineLogDrawer.tsx`**, **`FeedbackWidget.tsx`**, **`ProtocolSection.tsx`**, **`ManualUploadForm.tsx`**, **`ConnectButton.tsx`** — recolor to primitives + §3 tokens.

## 6. Clinical → Modality rewire (rides along)

Single source of truth in `apps/engine/src/lib/constants.ts`:

```
export const PRESCRIBE_URL = "https://modalitybio.com";   // isolated — flip here
export const PRESCRIBE_LABEL = "Get this prescribed at Modality →";
```

- Replace all `CLINICAL_URL` usages + hardcoded "Aura Clinical" strings (`RecommendationCard.HandoffSection`, the `affiliate_primary` "Aura Clinical · get it prescribed / launching soon" slot, demo Step-4 blurb, `PrescribeCTA.tsx`, `lib/constants` `PRESCRIBE_CTA_COPY`) with `PRESCRIBE_URL` / `PRESCRIBE_LABEL`.
- **Routing logic unchanged.** `affiliate_primary` still → shop (research-grade); `clinical_primary` / `clinical_only` still exist but now hand off to Modality. Because it's one constant, changing destination/label/path later (e.g. `/telehealth`) is a one-line edit.
- Keep engine privacy language intact (biometrics, never PHI/clinical/patient on the Aura side).

## 7. New chrome — Navbar / Footer / AuraMark

Port from shop, adapted for engine routes:
- **`AuraMark.tsx`** — copy the shop component into engine `src/components/` + its `.aura-*` CSS (already covered by §1 globals port).
- **Engine `Navbar.tsx`** — `.pharmacopoeia` `.p-top`, `AuraMark` + "Aura Protocols" wordmark (`.p-serif-italic`) linking `/`. Links appropriate to the engine: Dashboard, Connect, Demo, + "Shop" (→ `shop.auraprotocols.com`). CTA "Connect" or "Get started".
- **Engine `Footer.tsx`** — shop's `.p-foot` structure, engine-appropriate columns (brand blurb, engine links, company/legal, socials). Reuse shop disclaimer language, adjusted for the engine (biometrics framing).
- Mount both in `layout.tsx` around `{children}` (shop pattern), engine body wrapped so chrome is `.pharmacopoeia`.

---

## Architecture principle

Two things are isolated so the *variable* parts don't leak across the codebase:
1. **Instrument palette** → one TS module + CSS-var block. The 5 semantic meanings live in one place.
2. **Prescribe destination/brand** → one constants pair. The Aura↔Modality boundary is a single edit.

Everything else is a mechanical port of an already-approved, in-production system (the shop's Pharmacopoeia), satisfying the "match the mockup, never freestyle" rule for the bulk of the work. The only genuinely *new* design is the muted instrument palette (§3), which extends — not replaces — the shop's token vocabulary.

## Out of scope

- Domain moves, DNS, SEO, sitemap changes.
- Any Modality-side work (this only points *to* Modality).
- Functional changes to the rules engine, Terra, Supabase, or protocol generation.
- The uncommitted wearable-first functional changes are **preserved**, not reverted — the reskin layers on top.

## Open detail (safe default)

- **Modality path** — defaulting `PRESCRIBE_URL` to bare `https://modalitybio.com`. If a specific route (`/telehealth`) is wanted, it's a one-line change to the isolated constant.
