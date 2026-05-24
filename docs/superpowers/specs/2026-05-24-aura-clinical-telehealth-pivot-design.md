# Aura Protocols — Engine + Telehealth Pivot Design

**Date:** 2026-05-24 (revised same day to fold in Phase 2 biometric engine)
**Author:** Kearney Adams Jr. (with Claude Opus 4.7)
**Status:** Draft for review (v2)
**Horizon:** 2026-11-24 (6 months)

---

## 1. Executive Summary

Aura Protocols is currently a pre-revenue peptide affiliate site at `shop.auraprotocols.com`, monetizing through 10–15% vendor commissions. The current model cannot plausibly reach the founder's aspirational 7-figure revenue target on a 6-month horizon: the addressable market for "research peptide" affiliate sales is too small, vendors are under active regulatory contraction (Peptide Sciences shut down, Amino Asylum raided, Swiss Chems under FDA warning), and 12% commissions cap the upside.

This spec restructures Aura Protocols into a **three-layer business**:

1. **The Engine** (`auraprotocols.com`, the in-construction Phase 2 site) — a free Peptide Protocol Engine that syncs Whoop / Oura / Apple Health / CGM via the Terra API aggregator, analyzes biometrics, and returns personalized peptide + lifestyle protocols. This is the moat: nobody in the peptide space has biometric-driven personalization at scale.
2. **Editorial** (`shop.auraprotocols.com`) — the existing affiliate site. Becomes the SEO/education entry point and the research-grade revenue path.
3. **Aura Clinical** (sister brand, name TBD) — vertical telehealth selling prescribed compounded peptides via a white-label US-licensed MD network + compounding pharmacy. The high-margin revenue layer.

The Engine ships first (Months 1–2) because it's pure software, doesn't need partner contracts or HIPAA gating, and converts the existing audience into qualified, biometric-validated leads. Aura Clinical launches Month 3 against a pre-warmed funnel.

**Realistic 6-month outcome under $5K bootstrap + full-time solo execution:** $300K–$1M ARR run-rate by month 6. Top-decile execution (engine drives strong organic + retention) $1–3M ARR. Not the literal $10M target, but 10–30× the affiliate ceiling, with a defensible product moat (biometric data lock-in) that no pure-telehealth competitor has.

**This is a true cold-start.** No existing audience, no social followers, no email list, no paying customers, and a coming-soon homepage that has not yet earned indexed organic traffic. The plan treats distribution as a first-class problem (see §12) equal in weight to product, and builds a continuous-discovery practice (see §11) to surface gaps and opportunities weekly.

The design has been pre-mortemed; ten high-RPN failure modes plus two Engine-specific risks plus the cold-start risk have been folded into the structure as preventive controls, leading indicators, and kill gates (see §6).

---

## 2. Business Context

### 2.1 Current Assets
- `shop.auraprotocols.com` — Next.js 16 / Tailwind site, dark theme, design system, 6 products, 3 vendor comparisons, 6 blog posts, GSC verified, sitemap submitted. **Current state is a coming-soon stub for live visitors; no meaningful indexed organic traffic yet.**
- `auraprotocols.com` — in construction; Phase 2 destination for the biometric engine.
- SEO targeting: BPC-157, TB-500, CJC-1295/Ipamorelin, semaglutide research peptide, vendor-vs-vendor comparison pages.
- Vendor relationships in progress: Core Peptides (12%), Limitless Life Nootropics (15%), Swiss Chems (10%), Behemoth Labz (pending).
- **Audience: zero.** No email list, no social followers (X, IG, YouTube, TikTok, Reddit), no paying customers, no waitlist. Every distribution channel must be built from net-zero. This is treated as a first-class constraint, not a footnote (see §12).
- **Aura Protocols LLC already formed (LegalZoom).** Covers the Engine + Editorial layers. The Clinical layer still requires its own separate LLC per the blast-radius control in §3.1 / pre-mortem #14.
- Founder: non-technical, full-time, Claude Code as primary build tool, fast decision-maker, SEO-literate.

### 2.2 Constraints
- **Capital:** <$5K over 6 months — covers both the Engine build and the Clinical launch.
- **Time:** Full-time solo.
- **No team:** All execution through founder + Claude Code + paid contractors on narrow tasks only.

### 2.3 Why Affiliate Cannot Hit the Goal
- 10–15% commission × ~$100–200 avg order = $15–30 per sale.
- Reaching even $500K/year requires ~28,000 sales — at the upper end of total English-language "research peptide" search-driven sales volume.
- Regulatory floor dropping faster than the audience is growing.

### 2.4 Why Telehealth Can
- $250–500/mo subscription × 60–80% margin × 70%+ M2 retention = $1,500–$5,000 LTV per patient.
- Comparable cold-start trajectories: Mochi Health $0 → $1M ARR in 4 months; Eden, Henry Meds, Sequence, Strut all $10M+ ARR in 12 months.

### 2.5 Why the Engine Multiplies Both
- Biometric data creates **switching cost** — once a user connects Whoop/Oura, they don't easily move to a competitor.
- **Personalization differentiation** — Hims/Ro/Mochi compete on price and convenience; the Engine competes on "we know your data." No incumbent has shipped this in the peptide space.
- **Cheaper validation** than fake-door tests — every wearable connection is a high-intent qualified lead.
- **Three monetization paths from one funnel** — affiliate (research), Playbook (info product), Clinical (Rx subscription).

---

## 3. Strategy

### 3.1 The Three-Layer Architecture

| Layer | Surface | Role | Monetization |
|---|---|---|---|
| **Engine** | `auraprotocols.com` | Free Peptide Protocol Engine. Connect wearable (Terra API) → biometric analysis → personalized protocol → route to commerce. Lead-gen + retention moat. | Indirect: routes to all three revenue paths below. |
| **Editorial** | `shop.auraprotocols.com` | SEO/education entry point. Reviews, comparisons, dosing guides. Funnels search traffic into the Engine and into commerce. | Affiliate commissions on research-grade vendor links. |
| **Clinical** | Aura Clinical (sister brand, TBD domain) | Vertical telehealth. Prescribed compounded peptides via licensed MDs + compounding pharmacy. Subscription. | $250–500/mo recurring per patient. |

The Clinical brand is a **fully separate LLC, domain, email, payment processor, and analytics stack** from Engine + Editorial. This is non-negotiable — a category-level adverse event (pre-mortem #14) must not be able to take down all three layers simultaneously.

The Engine and Editorial brands can share infrastructure (same LLC, same Stripe, shared analytics) since they're both founder-positioned editorial/recommendation products, not regulated commerce.

### 3.2 The Positioning Wedge

Most telehealth competitors fight over **GLP-1**. Aura's existing SEO assets uniquely position it for two **near-uncontested** wedges:

1. **Recovery stack** — compounded BPC-157 ± TB-500
2. **GH stack** — compounded CJC-1295 + Ipamorelin

The site already ranks for these terms, and **almost no telehealth brand sells them at scale.** Recovery and GH are the acquisition products. GLP-1 is added as a Month-4 cross-sell — *not* the launch SKU — to avoid the Hims/Ro/Zepbound commoditization race.

The Engine layer compounds the wedge: when a user's Oura recovery score drops or HRV trends down for 7 days, the Engine surfaces a Recovery Stack recommendation. Personalized triggers convert at multiples of generic landing pages.

### 3.3 Pitch

- **Engine pitch:** *"Connect your wearable. Get a peptide protocol tuned to your actual recovery, sleep, and stress data — not a generic stack."*
- **Clinical pitch:** *"The clinical-grade alternative to research peptides — same compounds, prescribed by US-licensed doctors, shipped from licensed compounding pharmacies."*

Both pitches are **pre-launch validated** (see §5.1) before any pharmacy or MD contract is signed.

---

## 4. Product

### 4.1 The Engine (Months 1–2, ships first)

**Free tier** — Connect wearable via Terra API → educational protocol recommendation → routes to affiliate vendors (research-grade) or Playbook ($97) or Aura Clinical (Rx). Free is the acquisition layer.

**Paid tier (deferred to Month 4–5, only if Engine has retained >500 connected users):** $9–19/mo for advanced biometric tracking, protocol journaling, and weekly Claude-powered protocol adjustments. Optional add-on, not required for the spec to hit its targets.

**Tech architecture (MVP):**
- Next.js on `auraprotocols.com`
- Terra API for wearable aggregation (Whoop, Oura, Apple Health, Garmin, Fitbit, Polar, Dexcom CGM — Terra abstracts 100+ devices)
- Supabase free tier for auth + user data (no PHI; biometric data is fitness data, not protected health information, when handled outside a healthcare context)
- Claude API for protocol recommendation (rules + LLM hybrid, not pure LLM — prompt-cached for cost)
- Manual data upload path as fallback if user doesn't have a supported wearable
- Disclaimer + "get prescribed via Aura Clinical" CTA on every recommendation

**Critical framing rule:** the Engine produces **"educational protocol suggestions,"** not medical advice. Disclaimer on every recommendation. The "get this prescribed" CTA routes to Aura Clinical where a licensed MD reviews — that's where medical judgment happens.

### 4.2 Editorial (Rebuild + Cross-Links)

`shop.auraprotocols.com` is **a rebuild, not a refresh.** The site is currently a coming-soon stub; turning it into a credible SEO funnel requires the homepage, navigation, content pages, and conversion surfaces to ship as production-ready in Month 1. The website scope and ship order are defined in §12.2. Once live, every blog post and comparison page carries a top-of-page CTA → *"Get a personalized version of this protocol — connect your wearable at auraprotocols.com →"*. The editorial brand becomes the SEO funnel into the Engine.

### 4.3 Clinical — Launch SKUs (Month 3+)
- **Recovery Stack:** Compounded BPC-157 (5mg) ± TB-500 (5mg). Monthly subscription, ~$249/mo.
- **GH Stack:** Compounded CJC-1295 (no-DAC) + Ipamorelin. Monthly subscription, ~$299/mo.

### 4.4 Clinical — Cross-Sell SKU (Month 4+, gated by §6 kill gate)
- **GLP-1 Stack:** Compounded semaglutide or tirzepatide. Pricing TBD based on pharmacy partner cost and competitor floor at month 3. Positioned as add-on, not standalone acquisition.

### 4.5 Bridge Product (Month 1, ships before Engine V2 and before Clinical)
- **Peptide Protocol Playbook** — $97 one-time digital product. Detailed dosing, stacking, cycling, COA-reading guide for the research-peptide audience already on `shop.auraprotocols.com`.
- Purpose: monetize existing organic traffic immediately, fund operations during the Engine + Clinical ramp, produce a live demand signal, seed the Engine's first users.

### 4.6 Fallback SKU (held in reserve, triggered by §6 regulatory contingency)
- **Legal supplement stack** — NAD+, glycine, creatine, collagen peptides — Shopify + 3PL fulfillment.
- Not built unless §6 regulatory trigger fires. Architecture decision documented now to shorten reaction time.

---

## 5. Plan by Phase

### 5.1 Month 0 — Validation Sprint (before any partner contract or Engine build)

**Duration:** 14 days from spec approval.
**Cost:** ~$200 paid micro-tests (Reddit Ads + X promoted posts to drive validation traffic — there is no organic audience to test against).

**Reality framing:** This is a net-zero cold-start. The existing site cannot supply test traffic. Month 0 buys synthetic traffic across 2–3 channels and routes it to four standalone validation pages built on `shop.auraprotocols.com`. Every test is structured so that *no signal* is also a valid (and very cheap) answer.

**Test 1 — Wedge demand (paid micro-test → deposit page):**
- Spend $80 across Reddit (r/Peptides, r/PeptideSciences) + targeted X promoted posts driving traffic to a deposit page: "Get this prescribed — $50 refundable deposit to reserve your first month" (Recovery and GH stacks separately).
- Run 10–14 days.
- **Kill gate:** ≥5 paid deposits = wedge has signal, proceed. <5 paid deposits with ≥500 page visits = wedge is fake; redesign before any further investment.

**Test 2 — Positioning (paid micro-test → 3-variant email capture):**
- Same $80 paid spend split across 3 variants driving cold traffic to landing pages:
  - V1: "Clinical-grade alternative to research peptides"
  - V2: "Prescribed peptide protocols from US doctors"
  - V3: "The legal way to run the protocols you've been researching"
- Conversion = email capture (no transaction).
- **Kill gate:** best variant <3% email conversion against ≥300 visits per variant = positioning needs redesign before launch.

**Test 3 — Engine intent (wearable CTA fake-door):**
- $40 paid spend driving cold traffic to: "Connect your Whoop / Oura / Apple Health → get your peptide protocol."
- Capture: click-through rate from ad to CTA, then "yes I have one of these" follow-throughs.
- **Kill gate:** <15% CTA click-through rate from landing-page visits = engine framing is wrong, redesign before building.

**Test 4 — Founder organic signal (no spend):**
- 14 days of founder posting daily across 2 chosen owned channels (default: Reddit + X; see §12.1 for selection logic). Topic mix: protocol education, behind-the-scenes of building the Engine, vendor reviews.
- Measured outputs: inbound DMs, profile follows, comment-thread engagement on r/Peptides.
- **Kill gate:** <3 inbound DMs or <50 follower-equivalents across both channels in 14 days = the founder-organic distribution thesis is weaker than expected; rebalance §12 channel weights toward paid + content + SEO before Month 1.

**Outputs of Month 0:**
- Go/no-go on the full plan (any *two* of the four kill gates failing triggers a redesign before Month 1; any *one* failing triggers a documented adjustment and proceed).
- Validated positioning copy for both the Engine and Clinical.
- Cold-start seed: paid deposits + email captures + wearable-interest list + earliest follower-equivalents on the chosen owned channels.

### 5.2 Month 1 — Bridge + Engine Build + Clinical Setup (parallel tracks)

**Track A — Bridge revenue (week 1):**
- Ship the $97 Peptide Protocol Playbook on Stripe Checkout via Gumroad or simple page on `shop.auraprotocols.com`.

**Track B — Engine MVP (weeks 1–4):**
- Provision `auraprotocols.com` Next.js project.
- Integrate Terra API (Whoop, Oura, Apple Health, Fitbit, Garmin, Dexcom). Free dev tier.
- Supabase auth + user profile schema.
- Claude API protocol-recommendation service (deterministic rules engine + LLM augmentation, prompt-cached for cost).
- 3 protocol templates v0: Recovery, GH, Sleep/Stress.
- Manual data upload fallback.
- Disclaimer + "get prescribed via Aura Clinical" CTA on every recommendation.
- Launch Engine free tier at end of Month 1.

**Track C — Clinical backend (weeks 1–4):**
- Form **Aura Clinical LLC** (separate entity from Engine + Editorial; Aura Protocols LLC already exists via LegalZoom and covers Engine + Editorial only).
- Sign compounding pharmacy partner (Empower / Strive / Olympia / Belmar / Hallandale; per-script pricing, no monthly minimums).
- Sign MD network (Wheel / MDIntegrations / Photon; pay-per-consult, $30–60).
- Stand up HIPAA-compliant intake/EHR (MDIntegrations turnkey OR SimplePractice). **No Typeform → MD email v0.** Non-negotiable.
- Open healthcare-friendly payment processor account (Authorize.net + Easy Pay Direct, or Square Healthcare). **Not Stripe** for the Clinical brand.
- Targeted legal review ($1K cap) — intake form + adverse-event SOP + Engine "educational, not medical advice" framing.
- Brand assets — Aura Clinical landing pages reusing the existing Tailwind design system.

### 5.3 Month 2 — Engine Growth + Clinical Soft-Launch Prep

- **Engine:** SEO + YouTube content driving wearable connections. Target 500+ connected users by end of Month 2.
- **Engine:** Refine recommendation quality based on user feedback. Add 2–3 more protocol templates.
- **Editorial:** Begin SEO content engine — 3 long-form posts/week on buying-intent keywords. Every post links to the Engine.
- **YouTube:** 2 protocol videos/week. AI avatar acceptable for V0; goal is volume + topical authority.
- **Newsletter:** Weekly send to combined Engine + Editorial + Playbook list.
- **Clinical:** Finish backend; begin internal testing with founder + 5 friendly users.

### 5.4 Month 3 — Clinical Launch + Hard Kill Gate

- **Clinical:** Soft-launch to Engine waitlist + Month 0 deposit-holders + most active Engine users (those with 30+ days of data and 3+ protocol views).
- **Engine:** Add "Recommended: prescribed version available at Aura Clinical" inline on relevant protocols.
- **HARD KILL GATE (end of Month 3):** ≥$10K Clinical MRR. Below threshold = shut down Clinical, double down on Engine + Editorial + Playbook + supplement fallback.
- If above threshold:
  - Sign second pharmacy partner (diversification per pre-mortem #13/#15).
  - Plan GLP-1 cross-sell SKU for Month 4.

### 5.5 Months 4–6 — Scale

- **Clinical:** Add GLP-1 SKU as cross-sell to existing patients. Retention engineering: dunning, win-back, dosage check-ins via EHR.
- **Engine:** Ship paid tier ($9–19/mo) gated on having retained >500 active connections.
- **Engine:** Biometric-triggered upsell logic — *"your recovery score has dropped for 7 days; consider adding the Recovery Stack."*
- **Stack upsells:** recovery + GH for existing Clinical patients; recovery for GLP-1 patients.
- **Founder authority play** on X / longevity Twitter — sparingly linked.
- **Content velocity** maintained across Editorial blog + YouTube.
- **CS:** fractional VA ($400/mo) once active Clinical subscriber count crosses 50.

---

## 6. Risk Controls (from Pre-Mortem, extended for Engine)

The ten highest-RPN failure modes from the original pre-mortem, plus two Engine-specific risks, are folded in as structural controls:

| Pre-Mortem # | Failure Mode | Control | Where Folded In |
|---|---|---|---|
| 6 | Wedge had no demand at clinical-grade price | 14-day fake-door deposit test before any partner contract | §5.1 Test 1, kill gate |
| 17 | Founder can't audit AI-generated billing code | Use Stripe Billing (Editorial+Playbook) and healthcare processor's native subscription (Clinical) — never custom billing. Weekly Stripe report; chargeback >0.5%, refund >3%, or failed-retry >10% triggers paid contractor code review ($500 retainer) | §5.2 Track C; ongoing |
| 4 | "Clinical-grade" pitch doesn't convert research audience | 3-variant positioning fake-door test on 1,000 visitors before launch | §5.1 Test 2, kill gate |
| 12 | Traffic-curve vs revenue-curve timeline mismatch | $97 Playbook bridge ships Month 1 + Engine ships Month 1 (faster than Clinical) | §4.5, §5.2 |
| 14 | Category-wide adverse event blast radius | Fully separate LLC, domain, email, payment processor, analytics for Clinical brand. Engine + Editorial survive independently; pre-written 30-day Clinical shutdown SOP | §3.1, §5.2 |
| 19 | HIPAA violation via v0 Typeform→email intake | HIPAA-compliant EHR (MDIntegrations or SimplePractice) from day 1, no v0 manual handoff. Engine deliberately excludes PHI scope (educational framing). | §5.2 Track C |
| 3 | Stripe shut down Rx brand for "high-risk healthcare" | Healthcare-friendly processor from day 1 for Clinical. Stripe used only for Editorial + Engine + Playbook (non-Rx). | §5.2 Track C |
| 11 | Personal runway not budgeted | Founder names runway number in writing before Month 0; Plan B is hour-capped bridge consulting that doesn't displace core work | §7.2 |
| 13 | FDA 503A compounding tightening kills SKU lineup | Weekly tracking of FDA 503A guidance + state pharmacy boards; two-pharmacy partner rule by Month 3; supplement fallback SKU architected; Engine + Editorial keep running regardless | §4.6, §5.4 |
| 16 | Founder pivots to next shiny thing | Public 6-month no-pivot pact; hard kill gate at Month 3 with MRR criteria | §5.4 kill gate |
| **NEW E-1** | **Wearable API approvals stall Engine launch** (Whoop/Oura business-tier access can take 4–6 weeks) | Ship via Terra API (which abstracts the partnerships) + manual upload fallback; do not block launch on direct OAuth approvals | §4.1, §5.2 Track B |
| **NEW E-2** | **Engine recommendation causes a user harm event** (bad protocol → adverse outcome → lawsuit) | Disclaimer on every recommendation; "educational, not medical advice" framing; rules + LLM hybrid (no pure LLM creativity); legal review of disclaimer in §5.2 Track C scope; high-risk protocols always require "get prescribed" CTA, never DIY guidance | §4.1, §5.2 Track C |
| **NEW C-1** | **Cold-start audience: distribution thesis fails** (no organic traction, paid CAC > LTV, founder cannot build audience) | Distribution treated as a first-class problem with 6 parallel channels (§12.1), each with leading indicators; weekly discovery practice (§11) re-weights channels monthly; paid micro-tests in Month 0 and 1 validate before scaling spend; if best-channel CAC > 50% of M2 LTV by end of Month 3, reduce paid scale and shift to content + partnerships | §11, §12.1, §5.1 Test 4 |

The remaining lower-RPN scenarios (founder burnout, MD network deprioritization, CS load, Google update, legal cost overrun, GLP-1 commoditization, editorial-brand contamination) are addressed structurally — GLP-1 reordering, the bridge product, brand separation, the explicit VA hire trigger, and the Engine's independent revenue paths.

---

## 7. Budget and Runway

### 7.1 Capital Budget (≤$5,000)
| Item | Cost | Timing |
|---|---|---|
| Month 0 paid micro-tests (Reddit + X) | $200 | Month 0 |
| LLC formation (Aura Clinical only — Aura Protocols LLC already exists) | $300 | Month 1 |
| Targeted legal review (intake + adverse-event SOP + Engine framing) | $1,000 | Month 1 |
| HIPAA-compliant EHR setup | $500 setup, ~$200/mo from Month 2 | Month 1 |
| Healthcare-friendly payment processor setup | $0–$200 | Month 1 |
| Pharmacy + MD partner onboarding fees | $500–$1,000 | Month 1 |
| Brand assets (Engine + Clinical) | $400 | Month 1 |
| Domain + email infra (separate for Clinical) | $100 | Month 1 |
| Terra API dev tier | $0 | Months 1–2 |
| Terra API production tier (~$99/mo) | $99/mo × 4 = $396 | Month 3+ (funded by revenue) |
| Claude API for Engine recommendations (prompt-cached) | ~$50/mo × 6 = $300 | Months 1–6 |
| Supabase / Clerk free tiers | $0 | Months 1–6 |
| Contingency / contractor retainer (billing review trigger) | $500 | Held for Month 4+ |
| **Upfront total (Month 1)** | **~$3,600** | |
| **Recurring (Months 2–6, funded by revenue)** | **~$700–900/mo** | |

### 7.2 Personal Runway (Required Before Launch)
- Founder explicitly names the personal runway number (months of zero-Aura-income covered) in writing before Month 0 begins.
- If personal runway < 6 months, the Plan-B trigger is: bridge consulting at a defined hour cap (e.g., 15 hrs/week max) that does **not** displace core Engine + Clinical execution.

---

## 8. KPIs and Success Criteria

### 8.1 Month-by-Month
| Month | Primary KPI | Threshold |
|---|---|---|
| 0 | Wedge deposits (paid micro-test) | ≥5 paid deposits against ≥500 visits (else kill or redesign wedge) |
| 0 | Positioning email capture (best variant) | ≥3% best variant against ≥300 visits/variant (else redesign positioning) |
| 0 | Engine intent CTA click-through | ≥15% CTA CTR (else redesign Engine framing) |
| 0 | Founder organic signal (Reddit + X) | ≥3 inbound DMs + ≥50 follower-equivalents (else rebalance §12 channel weights) |
| 1 | Playbook revenue | ≥$2,000 |
| 1 | Engine V1 shipped + ≥50 wearable connections | Yes/No |
| 2 | Engine connected users | ≥500 |
| 2 | Engine → Editorial → affiliate click-through | ≥5% of Engine users |
| 3 | Clinical MRR | **≥$10,000 (HARD KILL GATE)** |
| 4 | Clinical MRR | ≥$25,000 |
| 5 | Clinical MRR | ≥$45,000 |
| 6 | Clinical MRR | ≥$60,000 ($720K ARR run-rate) |
| 6 | Engine connected users | ≥2,500 |

### 8.2 Health Metrics (Ongoing, Monthly Review)
**Engine:**
- Wearable connection completion rate: target ≥40% of starters
- Recommendation → commerce click-through: target ≥10%
- Engine → Clinical conversion: target ≥3% of connected users

**Clinical:**
- Visitor → intake conversion: target 1.5–3% (with Engine routing, expect higher)
- Intake → paying customer: target 60–75%
- Month-2 retention: target ≥70%
- Avg revenue per patient: target $300–400/mo
- Chargeback rate: <0.5% (else trigger code review)
- Refund rate: <3% (else trigger code review)
- Avg intake-to-Rx time: <72h (else escalate MD partner)

### 8.3 Definition of "Success" at Horizon (2026-11-24)
- $60K+ MRR ($720K+ ARR run-rate) from Clinical.
- 2,500+ wearable-connected users on the Engine.
- Stretch: $80K+ MRR + 5,000+ Engine users.
- No payment-processor or regulatory shutdowns.
- Editorial + Engine still independently operational regardless of Clinical's status.

---

## 9. Open Questions

These remain unresolved and should be answered during Month 0:

1. **Aura Clinical final name and domain.** Candidates: auraclinical.com, aurarx.com, auraprescribed.com. Domain availability + brand fit + trademark check.
2. **Pharmacy partner pick.** Empower vs Strive vs Olympia vs Belmar vs Hallandale — driven by per-script pricing on BPC-157 + CJC/Ipa specifically (not just GLP-1).
3. **MD network pick.** Wheel vs MDIntegrations vs Photon — driven by per-consult cost + EHR integration + state coverage.
4. **EHR pick.** MDIntegrations vs SimplePractice — driven by total cost-of-ownership at 100-subscriber scale.
5. **Final pricing.** $249 / $299 are placeholders; locked after pharmacy partner cost known.
6. **State coverage at launch.** Likely 30–40 states where compounded peptide telehealth is uncontroversial; final list driven by MD network coverage.
7. **Engine v0 recommendation engine design.** Rules-only, LLM-only, or hybrid? Recommended hybrid (rules for safety floor + LLM for personalization). Final architecture decided week 1 of Month 1.
8. **Terra API alternatives.** If Terra pricing is wrong at scale, alternatives include Vital, Rook, or direct OAuth to each provider. Decided by end of Month 1.

These are not blockers to approving this spec. They are blockers to executing Month 1.

---

## 10. What This Spec Is NOT

- This is not a plan to hit a literal $10M revenue target in 6 months from a $5K bootstrap. That target is not achievable in this market with these constraints; the spec acknowledges this explicitly. The spec optimizes for the **largest plausible 6-month outcome from the actual starting position**, which is $300K–$1M ARR run-rate plus a defensible Engine moat.
- This is not a code-only project. The dominant work is partner negotiation, content, brand, and ops. Claude Code's contribution is the Engine MVP, the landing pages, the funnel instrumentation, and the SEO content engine — important but not the bottleneck.
- This is not a permanent three-layer structure. At maturity, Engine + Editorial may merge under one brand; Clinical stays separate for regulatory reasons. For the 6-month horizon, the three-layer architecture is a structural control, not a long-term position.
- The Engine is **not** a medical device or medical advice product. It produces educational protocol suggestions and routes to the Clinical layer (where licensed MDs make medical judgments) when prescribed-grade is wanted.

---

## 11. Continuous Discovery (Plan-Updating Practice)

The 6-month plan is not static. The peptide regulatory landscape, telehealth competitors, wearable APIs, and AI tooling are all moving faster than a single up-front spec can anticipate. To prevent the plan from going stale, the founder runs a continuous discovery practice as a recurring operational layer.

### 11.1 Weekly Scan (≤60 minutes, every Friday)
- **Regulatory:** FDA 503A guidance updates, state pharmacy board actions, GLP-1 / compounded peptide adverse-event reports, DEA scheduling changes.
- **Competitor:** Hims, Ro, Mochi, Eden, Henry Meds, Sequence, Strut, Aging Plus, plus 2–3 indie peptide brands (rotating). Track pricing changes, new SKUs, new claims, paid-ad creative.
- **Vendor:** Affiliate vendor health (uptime, COA cadence, new SKUs, shutdowns). Reuses the existing `vendor_registry.md` memory.
- **Wearable / AI:** Terra API changelog, new Whoop/Oura/Apple Health features, Claude API capabilities, new LLM peptide-research tools.
- **Search trends:** New buying-intent queries surfacing in Google Search Console + Reddit / X conversations.

### 11.2 Monthly Synthesis (≤2 hours, first business day of each month)
- Compare current month's reality vs the spec.
- Identify any KPI threshold misses from §8 and the underlying cause.
- Flag any newly emerged opportunity that wasn't in the spec.
- Decide: continue as written, adjust a tactic, or trigger a written spec amendment.
- Output: a 1-page monthly delta committed to `docs/superpowers/specs/`.

### 11.3 Customer Signal Loop (continuous)
- Every Clinical intake form includes 2 open-ended fields: *"What else have you tried?"* and *"What outcome are you actually trying to hit?"*
- Every Engine recommendation surface includes a thumbs-up/down + free-text feedback.
- Founder reviews all free-text weekly during the §11.1 scan.
- A theme emerging from 3+ independent customers is treated as a discovery signal worth a Monthly Synthesis line item.

### 11.4 Opportunity Surfacing
- The Continuous Discovery practice is explicitly chartered to find **plan deviations that increase upside**, not just risk. New SKUs, new wedges, new channels, new partnerships, new content angles, new product-line extensions (e.g., longevity bloodwork, men's health, women's hormone health) are all in scope for surfacing.
- Surfacing ≠ executing. Anything proposed gets evaluated against: does it fit the three-layer architecture, does it require new partner contracts, does it expand or contaminate the brand, and does it pass a 10-minute pre-mortem? Only then does it become a candidate spec amendment.

---

## 12. Cold-Start Distribution and Website Scope

Distribution is treated with the same structural weight as product. From zero followers and zero indexed content, every customer must come from a channel that doesn't yet exist for Aura. This section defines the channel mix and the website surfaces required to support it.

### 12.1 The Six-Channel Mix (parallel, not sequential)

The plan runs six channels in parallel from Month 0 with deliberately small spend per channel until leading indicators clarify which two or three deserve scaled investment.

| # | Channel | Month 0–1 motion | Leading indicator | Scaling trigger |
|---|---|---|---|---|
| 1 | **SEO (Editorial blog)** | 3 long-form, buying-intent posts/week from Month 1. Each post links to the Engine and (where applicable) Clinical. | Indexed pages, impressions in GSC, top-20 ranking keywords | ≥20 ranking keywords by end of Month 2 → maintain cadence |
| 2 | **Reddit (organic + light paid)** | Founder participates daily in r/Peptides, r/PeptideSciences, r/Nootropics, r/Biohackers. $80 promoted-post micro-test in Month 0. | Inbound DMs, post engagement, profile follows | ≥5 inbound DMs/week by end of Month 1 → continue; if <2/week, deprioritize |
| 3 | **X / longevity Twitter** | Founder builds in public: protocol breakdowns, Engine teasers, vendor reviews. $80 promoted-post micro-test in Month 0. | Profile follows, link click-through, replies from accounts >1K followers | ≥250 followers + 1 quote-post from a >10K account by end of Month 2 |
| 4 | **YouTube (faceless / AI avatar V0)** | 2 protocol-explainer videos/week starting Month 1. Each video links to Engine. | Watch time, subscriber growth, click-through to Engine | ≥500 subs + ≥1,000 watch hours by end of Month 3 |
| 5 | **Paid micro-tests (Reddit Ads + X)** | $200 in Month 0 (validation); $300/mo from Month 1 (creative testing) | CTR, cost per email, cost per deposit | Best-creative cost per email < $4 → scale to $1K/mo by Month 3 |
| 6 | **Partnerships / PR (cold outreach)** | Founder sends 5 cold pitches/week from Month 1: peptide-adjacent newsletters, longevity podcasts, biohacker creators with 5K–50K followers. | Reply rate, booked mentions, podcast guest slots | ≥1 booked mention or guest slot by end of Month 2 |

**Channel re-weighting cadence:** Monthly Synthesis (§11.2) explicitly re-weights spend and effort across the six channels. The default rule: any channel with two consecutive months of missed leading indicators drops to maintenance effort (≤2 hrs/week) and its budget reallocates to the strongest performing channel.

### 12.2 Website Scope (`shop.auraprotocols.com` rebuild)

The site is currently a coming-soon stub. To support Month 0 validation tests and Month 1 launch, the following must ship as production-ready by end of Week 1 of Month 1 (Month 0 uses thin standalone validation pages built on the existing repo).

**Ship in Week 1 of Month 1:**
- **Homepage** — clear positioning hero, three-layer value prop (Engine teaser → Editorial library → Clinical CTA), trust block.
- **Blog index + at least 6 SEO-optimized long-form posts** — existing posts cleaned up, top 3 expanded to ≥2,500 words with new internal links, JSON-LD applied.
- **Vendor comparison pages** — kept and refreshed; affiliate links include `rel="noopener noreferrer sponsored"`.
- **Product detail pages** — kept for the research-grade affiliate path; CTAs include both the affiliate link and the Engine CTA.
- **Engine CTA component** — sticky top-of-page banner + inline mid-post block + post-end card, all driving to `auraprotocols.com`.
- **Email capture** — single high-quality lead magnet (e.g., "The Peptide Protocol Cheat Sheet" PDF) gated behind email; Sender / Beehiiv / ConvertKit free tier.
- **Playbook checkout** — Gumroad-embedded or direct Stripe Checkout for the $97 Peptide Protocol Playbook.

**Ship in Week 3–4 of Month 1:**
- **Aura Clinical landing pages** — hosted on the Clinical domain (separate from Editorial per §3.1), reusing the Tailwind design system tokens but on different infrastructure and analytics.
- **Engine landing page V1** at `auraprotocols.com` — wearable connect button, value prop, demo recommendation, waitlist capture if Engine isn't fully connected yet.

**Ongoing through Months 2–6:**
- 3 long-form Editorial posts/week.
- 1 vendor comparison refresh/month.
- A/B testing on Engine CTA placement and copy.
- Quarterly UX review against the design system tokens defined in `CLAUDE.md` and `globals.css`.

### 12.3 What the Website Is NOT Doing in Month 0–1
- No Engine inside `shop.auraprotocols.com`. The Engine lives at `auraprotocols.com`.
- No commerce on `shop.auraprotocols.com` beyond the Playbook + affiliate links. Clinical commerce lives on the separate Clinical brand.
- No login, user accounts, or PHI handling on `shop.auraprotocols.com` — these are scoped to the Engine and Clinical brands respectively.

---

## 13. Next Step

Per the brainstorming workflow, the next step after this spec is approved is to invoke the writing-plans skill to convert this design into a sequenced, week-by-week implementation plan with concrete deliverables and check-in cadence — including parallel tracks for the Engine build, the Clinical backend setup, the `shop.auraprotocols.com` rebuild, and the six-channel cold-start distribution program in Month 1.
