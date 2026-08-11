# @aura/modality

Standalone telehealth front door for **modalityhealth.com** — the Modality brand's
stage-1 hand-off surface. Introduces the brand, captures a first-party opt-in, and
hands visitors off to our licensed partner (Leg Up Recovery) for the medical intake.
No health data (PHI) is collected on this surface.

Kept separate from `@aura/shop` so the telehealth business can spin out cleanly.

## Run

```bash
pnpm --filter @aura/modality dev      # http://localhost:3000
pnpm --filter @aura/modality build
pnpm --filter @aura/modality test
```

## Routes

- `/` — the funnel: hero, two doors (browse-first; wearable optional), live
  **Protocols** index (one lane per catalog category), biosignature sphere.
- `/go/[category]/[id]` — 302 hand-off to the partner's hosted intake, appending
  `partner_id` and the `sub` attribution code. Destination host is allow-listed.
- `/api/optin` — best-effort first-party opt-in upsert to the telehealth Supabase.
- `/disclosures` — telehealth compliance disclosures.

## Design source of truth

UI is ported from the approved mockup:
`docs/superpowers/mockups/2026-08-10-modality-telehealth-approved.html`
(Two Doors layout, bordeaux-on-bone palette, Newsreader serif). Match it — don't
freestyle. Implementation plan: `docs/superpowers/plans/2026-08-10-modality-telehealth-surface.md`.

## Notes / gates

- **Stand-in partner (`RFMLPVN1`):** a shared **demo** account. Its hosted intake
  renders as **"Serenity Spa"** with demo pricing — expected, not a bug. Our own
  `TELEHEALTH_PARTNER_ID` flips both the intake branding (to Modality) and the
  prices (to our margin) with no code change.
- **Pricing:** the page displays the catalog's `fromPrice`. LegUpRx sets a floor;
  our margin (the recurring reseller spread) is configured in the partner account,
  not charged by this page. Real retail lands once the live token is issued.
- **Wearable connect / "matches your signal" flags** are Phase 2 — gated behind
  `SIGNAL_CONNECTED` in `page.tsx`.
- **Launch gates (all block go-live, not the build):** USPTO Class 44 name
  clearance · a designed + trademarked Modality emblem · the live LegUpRx token.

## Env

See `.env.example`. Uses the telehealth Supabase project (separate from shop/engine).
