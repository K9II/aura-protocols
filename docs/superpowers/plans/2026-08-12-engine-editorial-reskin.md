# Engine Editorial Re-Skin Plan

> **For agentic workers:** a visual re-skin (CSS/token/class port), not a TDD feature build. Verification is visual (before/after screenshots) plus the existing test suite staying green. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Replace the engine's generic dark cyan/violet/rose/emerald theme with the editorial **paper/ink/bordeaux + Newsreader** design system already shipped on Modality and the shop's Pharmacopoeia — so all three Aura properties read as one brand.

**Approach:** Port existing, approved tokens (no new design language). Anchor on **Modality's** token set (most complete; the engine's biosphere is a sibling of Modality's already-ported one) and align the shop to match over time. Light/paper theme (the engine drops "dark mode only").

**Tech Stack:** Tailwind v4 `@theme` tokens in `globals.css`; `next/font` (Newsreader, Inter, JetBrains Mono); React components.

---

## 1. Token spec (replace the `:root`/`@theme` block in `apps/engine/src/app/globals.css`)

```
--paper:      #ECEDE7   /* app ground (bone) */
--paper-2:    #E3E4DC   /* raised surface / cards */
--paper-3:    #D9DAD0   /* wells / disabled */
--ink:        #211E1B   /* primary text */
--ink-soft:   #615B54   /* secondary text */
--ink-faint:  #8E877D   /* labels / captions */
--line:       rgba(33,30,27,0.16)
--line-soft:  rgba(33,30,27,0.09)
--accent:     #7A2E2E   /* bordeaux — PRIMARY accent */
--accent-ink: #5F2323   /* accent hover/press */
--tint:       rgba(122,46,46,0.07)
/* functional (editorial, not neon) */
--warn:       #9C5B2A   /* tension bands (was rose) — rust */
--ok:         #5C6B3D   /* live / healthy (was emerald) — moss */
/* biosphere feeds (r,g,b strings) */
--bios-accent: 122, 46, 46
--bios-ink:    33, 30, 27
/* type */
--serif: var(--font-newsreader), "Iowan Old Style", Palatino, Georgia, serif;  /* display */
--sans:  var(--font-inter), "Helvetica Neue", Arial, system-ui, sans-serif;      /* body */
--mono:  var(--font-jetbrains), ui-monospace, "SF Mono", Menlo, Consolas, monospace; /* telemetry/labels */
```

## 2. Semantic color mapping (the 4 neon roles → editorial)

| Old role (neon) | New treatment |
|---|---|
| cyan `#00d4ff` — biometric / primary | **bordeaux `--accent`** |
| violet `#8b5cf6` — LLM / adjunct | **no separate hue** — ink-soft text + **serif-italic** for LLM rationale (matches Modality's voice) |
| rose `#fb7185` — tension | **`--warn` rust**; severity via label weight (watch/elevated/high), not brightness |
| emerald `#34d399` — live / ok | **`--ok` moss**; the "live" pulse dot becomes a small bordeaux/moss dot |

## 3. Typography
- Display: **Syne → Newsreader** (serif). Update `layout.tsx` `next/font` (drop Syne, add Newsreader; keep Inter + JetBrains Mono).
- Body: Inter. Telemetry/labels/command-bar: JetBrains Mono (kept — mono-on-paper reads as "instrument," per Modality/shop).

## 4. Motif translation (kill the dark-console vibe)
- **Protocol Terminal / command bar / telemetry**: re-cast as an **editorial "instrument sheet"** on paper — mono column labels + hairline `--line` rules + specimen-style section numbers, like Modality's biosphere caption and the shop's pharmacopoeia rows. No black consoles, no glow.
- **Biosphere** (`src/components/BiosignatureSphere.tsx`): re-skin to bone/bordeaux — port the treatment from `apps/modality/src/components/BiosignatureSphere.tsx` (already bone `--bios-ink`/bordeaux `--bios-accent`).
- Remove all `glow`, neon gradients, `bg-[#04060f]`, `text-cyan/violet/rose/emerald`, `border-white/10` — replace per the token map.

## 5. Docs
- Rewrite the **Design System** section of `apps/engine/CLAUDE.md` (remove "Dark mode only" + the cyan/violet/rose/emerald + Syne mandate; document the editorial tokens above). **Keep the Privacy Rules and Safety Floor sections unchanged.**

## 6. File-by-file conversion (the bulk — mechanical once tokens land)

- [ ] **globals.css** — swap token block + utility classes (`.glass`→paper card, buttons, etc.). Establish canonical utility classes mirroring Modality (`.btn-primary`, `.btn-outline`, `.instrument`, section rules).
- [ ] **layout.tsx** — fonts.
- [ ] **BiosignatureSphere.tsx** — port bone/bordeaux treatment from Modality.
- [ ] **Pages** (`src/app/*`): `page.tsx`, `demo/page.tsx`, `onboarding/{page,IntakeForm}.tsx`, `connect/page.tsx`, `upload/*`, `recommendation/*`, `dashboard/page.tsx` — replace color classes.
- [ ] **Components** (`src/components/**`, ~20 files incl. `dashboard/*`, `RecommendationCard`, `ProtocolSection`, `VendorRail/Card`, `Disclaimer`, `PrescribeCTA`, `FeedbackWidget`, `EngineLogDrawer`, `ClinicalRouter`) — replace color classes; verify contrast on paper (ink on bone passes AA).
- [ ] **Verify:** `npm run test` stays green (no logic touched); `npm run build` clean; capture before/after screenshots of `/demo` (all 4 steps + Protocol Terminal), `/onboarding`, `/connect`, `/`, `/dashboard`.

## 7. Sequencing (relative to the wearable-first build-out)
- **WS1 dev seam** (fixtures/seed/dev-button) and **WS2/WS3** (trends/tension logic) are **theme-agnostic** — proceed regardless.
- **Do this re-skin BEFORE WS4 (dashboard) and WS5 (recommendation UX)** so those surfaces are built once, on the final theme — no rework.
- Effort: **Medium-Large** but mostly mechanical after the token block + 2-3 component patterns are set. The biosphere port + Protocol Terminal re-cast are the only non-trivial pieces.

## Open decisions (confirm before executing)
1. **Red choice:** bordeaux `#7A2E2E` (Modality) vs specimen `#A32B1F` (shop). Recommend **bordeaux** for engine (biosphere already uses it); shop/Modality can converge on one Aura red later.
2. **Functional hues:** OK with the restrained `--warn` rust + `--ok` moss for tension/live, or go pure-monochrome (bordeaux + ink only)?
