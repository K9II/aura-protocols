@AGENTS.md

# Aura Protocols — Engine Project Context

## What This Is
A Next.js 16 Peptide Protocol Engine at `auraprotocols.com`. Connects wearables via Terra API, stores fitness data in Supabase, calls Claude for personalized protocol recommendations, routes prescribe-grade demand to Aura Clinical.

**NOT a static export** — runs Node server for Supabase auth callbacks, Terra webhooks, and server-side Anthropic calls.

## Stack
- Next.js 16 (App Router, Node runtime — `output: "standalone"` or omitted)
- Tailwind CSS v4
- TypeScript 5
- Supabase (auth + Postgres + RLS)
- Terra API (wearable aggregator)
- Anthropic SDK with prompt caching

## Brand Constants (copy exactly)
- `BASE_URL = "https://auraprotocols.com"`
- `SHOP_URL = "https://shop.auraprotocols.com"`
- `CLINICAL_URL = "https://auraclinical.com"`
- `DISCLAIMER = "Educational only. Not medical advice. The Engine produces protocol suggestions; medical judgment requires a licensed clinician."`
- `PRESCRIBE_CTA_COPY = "Get this prescribed at Aura Clinical →"`

## Privacy Rules (CRITICAL)
- Use *biometrics* / *fitness data* — NEVER *medical*, *clinical*, *patient*, *diagnosis*, *PHI*
- Disclaimer + PrescribeCTA on every recommendation surface

## Design System
- Dark mode only. Background `#04060f`, panels `#0a0f1a` / `#0d1117`
- Cyan `#00d4ff` (primary biometric), Violet `#8b5cf6` (LLM/adjunct), Rose `#fb7185` (tension), Emerald `#34d399` (live/ok)
- Fonts: Syne (display), JetBrains Mono (telemetry/log/command bar), Inter (body)

## Safety Floor
- Rules layer enforces contraindications + dose ceilings — LLM personalizes within safe envelope
- No protocol may bypass the rule layer
- Rule layer is plain TypeScript with full unit-test coverage; LLM is mocked in tests

## Cost Guardrails
- Every Anthropic system prompt uses `cache_control` ephemeral breakpoints
- Terra API dev tier free months 1–2
