# Engine Biosignature — Constellation Field (LOCKED v5)

**Status:** Design LOCKED 2026-08-14. **Port to real component = next session.**
**Reference implementation:** `2026-08-14-biosignature-constellation-v5.reference.html` (this folder) — the exact animated prototype to port.
**Live artifact:** https://claude.ai/code/artifact/9e391e62-3abd-4380-824e-30329d403260

## What it is
Replacement for `apps/engine/src/components/BiosignatureSphere.tsx` (currently dials + boot-log). A rotating 3-D Fibonacci **point-cloud sphere** (Pharmacopoeia: paper/ink/specimen) — an evolution of the shop's `BiosignatureSphere`, but richer, with the **prescribed protocol shown inside**.

## Locked behaviour (v5)
- **Cloud:** ~155 ink particles on a Fibonacci sphere, depth-shaded, ~9% specimen "hot" particles, gentle pulse. Auto-rotate + wobble; **drag-to-rotate** (pointer). Reduced-motion → single static frame.
- **8 metric nodes** (HRV, RECOVERY, STRAIN, SLEEP, VO2, GLUCOSE, BODYFAT, SPO2) on the sphere; size scales with normalized value; muted instrument accent per metric.
- **Perimeter readings:** fixed rim labels (name + live value), `z-index:4` — **always on top, never covered.**
- **Tension network:** faint specimen web of all correlation pairs; the active pair gets a bright specimen edge + a traveling pulse dot; its two rim labels highlight specimen. A rotating specimen **scan-sweep** brightens particles it passes.
- **Prescription box (THE key element the user chose):** the active tension's compound (e.g. `T1 · BPC-157 · 250mcg AM/PM`) **glides to dock JUST UNDER the reading it treats** — layered `z-index:2`, **beneath** the readings so it can never cover them. A short dashed tick connects the reading down to its box. Docks under the tension's target metric (RECOVERY / STRAIN / HRV). Box positioned via the reading label's `getBoundingClientRect` (`left`, `bottom + 5px`).
- **Reasoning line (bottom bar):** live sentence — `HRV ▼ 31ms · RECOVERY ▼ 42 → overreaching → T1 BPC-157 · 250mcg` with a severity dot (watch/elevated/high).
- Demo tension → compound map (mirror the real safety-floor rules on port):
  - HRV+RECOVERY → overreaching (high) → **T1 BPC-157**, dock under RECOVERY
  - RECOVERY+STRAIN → training load (elevated) → **T2 TB-500**, dock under STRAIN
  - HRV+STRAIN → strain outpacing HRV (watch) → **T1 BPC-157**, dock under HRV

## History of the fix (why it's this way)
User liked the concept of the compound box moving to its appropriate reading, but v2 had it **covering** the readings. v3 wrongly moved everything below the sphere; v4 wrongly replaced the moving box with a static center core. **v5 restores the moving box but docks it just UNDER the reading, layered beneath — the correct read of "under vs over."**

## Two sub-decisions to confirm on port (default = v5 as-is)
1. **One moving box** (v5, default — livelier) **vs both compounds docked at once** (BPC-157 under Recovery + TB-500 under Strain simultaneously; calmer, whole stack at a glance).
2. **Dock under the tension's primary metric** (v5, default) **vs fixed home** (T1 always under Recovery, T2 always under Strain).

## Port notes
- Wire to the real eight-metric `BiometricSnapshot` / radar model; use actual `output.steps` (T1/T2), `tensions[]`, resonance, dose/titration, and routing.
- Use **Newsreader** for the serif bits (prototype used Georgia fallback), JetBrains Mono for data.
- Keep drag + `prefers-reduced-motion`. Paper-only (single theme) by design.
- Target branch: `feat/engine-reskin` (or a new `feat/engine-biosignature` off it).
