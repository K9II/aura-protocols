# Aura Protocols — Readiness Audit + Weekly KPIs

> Live tactical state. Read alongside `/ROADMAP.md`. Update every Monday + whenever a key/vendor/checkpoint changes.

**Last audited:** 2026-05-30
**Current Month per ROADMAP:** Month 0 (validation sprint, ends ~2026-06-21)

---

## Env vars

### `apps/shop` — static export, no secrets required
None.

### `apps/engine/.env.local` ↔ Vercel `aura-engine` (production)

| Key | Local | Vercel prod | Notes |
|-----|-------|-------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | ✅ | Project `skphqhsuqafbjdlwngjl` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | ✅ | — |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | ✅ (sensitive) | — |
| `ANTHROPIC_API_KEY` | ✅ | ✅ (sensitive) | $5 credit |
| `NEXT_PUBLIC_BASE_URL` | ✅ (localhost) | ✅ (prod URL) | — |
| `TERRA_DEV_ID` | ❌ BLANK | ❌ MISSING | **Blocks 1.G2.** Terra Quick Start = $399/mo, no free tier (confirmed 2026-05-30). Awaiting startup-credit reply before subscribing. |
| `TERRA_API_KEY` | ❌ BLANK | ❌ MISSING | Same |
| `TERRA_SIGNING_SECRET` | ❌ BLANK | ❌ MISSING | Same |

---

## URL health (last checked 2026-05-30)

| URL | Status | Notes |
|-----|--------|-------|
| `https://shop.auraprotocols.com/` | 200 | Editorial live; no marketing traffic yet |
| `https://auraprotocols.com/` | 200 | **Coming Soon stub, `noindex` — BLOCKS vendor approvals (1.E1)** |
| `https://auraprotocols.com/connect` | 200 | Was 500 before env push 2026-05-30 |
| `https://auraprotocols.com/upload` | 307 | Auth redirect — expected |
| `https://auraclinical.com/` | n/a | Not yet provisioned (Month 1) |

---

## External dependencies

| Who | What | Sent | Expected | If they say no |
|-----|------|------|----------|----------------|
| Ashley King (Limitless) | Coupon code unlock | 2026-05-30 | ~2026-06-01 (Mon) | Ship Limitless CTAs without coupon |
| Terra sales | Startup credit / extended trial — outreach draft at `docs/outreach/2026-05-30-terra-sales-startup-credit.md` | DRAFT (send today) | ~2026-06-03 to 2026-06-06 | Direct Whoop/Oura/Apple SDKs (free), OR defer Engine wearable connect to Month 2 |
| Ignite Peptides | Affiliate approval + commission rate | pending | pending | Limitless + Swiss Chems cover catalog |
| Core Peptides | Affiliate approval | pending | pending | Same |
| Behemoth Labz | Affiliate approval | 2026-05-25 | pending | Same |
| Apollo Peptide Sciences | Catalog verification | self-serve | self-serve | Skip Apollo wiring |
| Attorney (intake doc) | Formulary realism + state selection | pending | pending | Conservative formulary; FL default |
| Founder (Kearney) | Runway statement in writing (Q8) | NOT DONE | NOW | Do not start Month 0 paid spend |

---

## Vendor status (commercial)

| Vendor | Approved | Wired | Coupon | Cookie window | Notes |
|--------|----------|-------|--------|---------------|-------|
| Limitless Life Nootropics | ✅ | ✅ BPC/TB-500/CJC-Ipa | ⏳ waiting | 180 days | `affid=10866` |
| Swiss Chems | ✅ | ✅ PT-141/Tesa/AOD/Epitalon | n/a | TBD | `ref/6782/` |
| GLP-1 Research Lab | ✅ | ✅ semaglutide | n/a | 90 days | `aff=84` |
| Apollo Peptide Sciences | ✅ | ❌ not wired | n/a | 30 days | Catalog unverified |
| Ignite Peptides | ⏳ pending | ❌ | n/a | TBD | Priority #1 |
| Core Peptides | ⏳ pending | ❌ | n/a | TBD | Backup |
| Behemoth Labz | ⏳ pending | ❌ | n/a | TBD | Tier pricing |

---

## Clinical readiness (Month 1 prep)

| Item | Status | Recommended (ROADMAP §10) |
|------|--------|---------------------------|
| LLC formation | ❌ Not formed | After Month 0 validation passes |
| Domain | ❌ Not chosen | `auraclinical.com` (Q2) |
| State of practice | ❌ Not chosen | Florida (Q3, attorney confirms) |
| MD network | ❌ Not chosen | MDIntegrations (Q5) |
| Pharmacy primary | ❌ Not chosen | Empower (Q4) |
| Pharmacy secondary (Month 3 rule) | ❌ Not chosen | Strive |
| HIPAA EHR | ❌ Not set up | Included with MDIntegrations |
| Payment processor | ❌ Not set up | Authorize.net or Easy Pay Direct (NOT Stripe) |
| Formulary attorney sign-off | ❌ Pending | Attorney intake doc filed |
| Pricing | ❌ Placeholders | After pharmacy partner pricing known |

---

## Validation tests (Month 0)

| Test page | Built | Paid live | Spend used | Result | Threshold |
|-----------|-------|-----------|------------|--------|-----------|
| `/validate/deposit-gh` | ✅ | ❌ | $0 / $20 (Google) | — | ≥5 deposits / ≥500 visits |
| `/validate/deposit-recovery` | ✅ | ❌ | $0 / $20 (Google) | — | Same |
| `/validate/positioning-v1` | ✅ | ❌ | $0 / ~$27 (Meta) | — | ≥3% capture (best variant) |
| `/validate/positioning-v2` | ✅ | ❌ | $0 / ~$27 (Meta) | — | Same |
| `/validate/positioning-v3` | ✅ | ❌ | $0 / ~$27 (Meta) | — | Same |
| `/validate/wearable` | ✅ | ❌ | $0 / $80 (Reddit) | — | ≥15% Engine CTA CTR |

**Month 0 spend:** $0 of $200 allocated.

---

## Weekly KPI snapshot (update every Monday)

### Editorial — week of 2026-05-30
| Metric | This week | Last week | Δ |
|--------|-----------|-----------|---|
| Organic sessions | — | — | — |
| Top organic query (position) | — | — | — |
| Vendor outbound clicks/session | — | — | — |
| Email signups | — | — | — |
| Playbook sales | 0 | 0 | — |

### Engine — week of 2026-05-30
| Metric | This week | Last week | Δ |
|--------|-----------|-----------|---|
| New wearable connections | 0 | 0 | — |
| Recommendations served | 0 | 0 | — |
| Recommend → PrescribeCTA CTR | — | — | — |
| 7-day retention | — | — | — |

### Clinical — week of 2026-05-30 (starts Month 2)
Not yet active.

---

## Cash dashboard

| Metric | Value | Target |
|--------|-------|--------|
| Founder runway (in writing) | NOT YET WRITTEN | ≥6 mo. or bridge plan |
| Cumulative spend to date | ~$5 (Anthropic credit) | Track |
| Cumulative revenue to date | $0 | Track |
| Month 0 ad budget used | $0 / $200 | $200 by end of Month 0 |
| Net position | ~−$5 | per §4 of ROADMAP |

---

## Open work that doesn't fit a phase

- `packages/ui` workspace declared but empty — decide if it becomes real or gets removed
- Supabase migrations: ✅ committed at `apps/engine/supabase/migrations/` (3 files); CLI wired via `config.toml` (2026-05-30); **drift-check vs. dashboard pending DB password** — runbook in `apps/engine/supabase/README.md`
- `docs/` PDFs (Playbook, Cheat Sheet, Operating Agreement, EIN letter) uncommitted — decide commit vs. private storage

---

## How to refresh this file

Each Monday (15 min):

1. `grep -E "^[A-Z_]+=$" apps/engine/.env.local` — find blank keys
2. `cd apps/engine && vercel env ls production` — find missing prod keys
3. `curl -sS -o /dev/null -w "%{http_code}\n" <url>` on each §URL row
4. Check email → update External Dependencies dates
5. Pull ad platform numbers → update Validation tests + Cash dashboard
6. Pull Plausible/Vercel analytics → update Weekly KPI snapshot
7. Update timestamp at top
