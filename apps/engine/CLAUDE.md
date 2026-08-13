@AGENTS.md

# Aura Protocols — Engine Project Context

## What This Is
A Next.js 16 Peptide Protocol Engine at `auraprotocols.com`. Connects wearables via Terra API, stores fitness data in Supabase, calls Claude for personalized protocol recommendations, routes prescribe-grade demand to Modality (the clinical lane, `modalitybio.com`).

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
- `DISCLAIMER = "Educational only. Not medical advice. The Engine produces protocol suggestions; medical judgment requires a licensed clinician."`
- `PRESCRIBE_URL = "https://modalitybio.com"` — prescribe-grade + contraindicated demand routes here (isolated in `lib/constants.ts`; flip destination in one place)
- `PRESCRIBE_LABEL = "Get this prescribed at Modality →"`
- Aura (shop + engine) is research + biometrics only. The shelved `CLINICAL_URL` / Aura Clinical brand is gone — do not reintroduce it.

## Privacy Rules (CRITICAL)
- Use *biometrics* / *fitness data* — NEVER *medical*, *clinical*, *patient*, *diagnosis*, *PHI*
- Disclaimer + PrescribeCTA on every recommendation surface

## Design System — "The Pharmacopoeia" (paper/ink/specimen)
- Reskinned to match the shop. Scoped under a `.pharmacopoeia` root; tokens live in `globals.css`.
- Paper `--paper #EDE9E0` / `--paper-deep #E2DCCC`, ink `--ink #1C1A15` / `--ink-soft #4A4438` / `--ink-faint #8E877D`, specimen red `--specimen #A32B1F`, hairline `--line #C9C2AE`.
- The dense protocol terminal keeps 5-way semantic differentiation via a **muted instrument palette** — `src/lib/theme/instrument.ts` (`SIG`) mirrored as `--sig-*` CSS vars. Keep the two in sync. bio `#2F6E6B`, llm `#6A4C74`, alert `#A32B1F`, ok `#5B7A47`, warn `#9C6B24`.
- Fonts: Newsreader (`--font-newsreader`, `.p-serif`) for display, JetBrains Mono (`--font-mono`, terminal/log/command bar), Inter (`--font-inter`, body).
- Primitives: `.p-container`, `.p-serif`, `.p-btn-primary`, `.p-btn-outline`, `.p-card`, `.p-callout`, `.p-link`, `.p-cat-label`. No legacy neon (`#00d4ff`/`#8b5cf6`/`#fb7185`/`#34d399`/`#fbbf24`/`#04060f`) — enforced by `tests/reskin-guard.test.ts`.

## Safety Floor
- Rules layer enforces contraindications + dose ceilings — LLM personalizes within safe envelope
- No protocol may bypass the rule layer
- Rule layer is plain TypeScript with full unit-test coverage; LLM is mocked in tests

## Cost Guardrails
- Every Anthropic system prompt uses `cache_control` ephemeral breakpoints
- Terra API dev tier free months 1–2
