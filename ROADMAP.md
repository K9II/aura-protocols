# Aura Protocols — Strategic Operating Roadmap

> **READ THIS FIRST EVERY SESSION.**
> Then read `docs/READINESS.md` for the live tactical audit and weekly KPIs.
> Strategic source of truth: `docs/superpowers/specs/2026-05-24-aura-clinical-telehealth-pivot-design.md`.

**Last reviewed:** 2026-05-30
**Owner:** Kearney Adams Jr. (founder, final decision authority)
**Spec date:** 2026-05-24 → **Month 0 ends ~2026-06-21, Month 6 ends ~2026-11-24**
**6-month target:** $60K+ Clinical MRR + 2,500+ Engine users + $5–8K/mo Editorial revenue

---

## 1. The Vision (Three Layers)

Aura is **not** an affiliate site. Affiliate is the funnel. Clinical is the business.

| Layer | Domain | Role | Revenue model | Status |
|-------|--------|------|---------------|--------|
| **Editorial** | `shop.auraprotocols.com` | SEO entry, vendor reviews, dosing guides, $97 Playbook | Affiliate commissions + Playbook | LIVE (pre-marketing) |
| **Engine** | `auraprotocols.com` | Wearable-driven protocol recommender — the moat | Free → optional paid tier Month 2+ | BUILT, needs Terra keys + migrations |
| **Clinical** | `auraclinical.com` (recommend) | Telehealth + 503A compounded Rx via licensed MDs | $250–$499/mo subscription | NOT FORMED (Month 1 target) |

**Why this stack works (and why nothing else can copy it):** Editorial alone has a low ceiling (~$0.07 affiliate revenue per organic visitor). Clinical alone has no moat — any telehealth co. can spin up compounded peptides. Engine alone has no revenue. **Together**, SEO traffic enters Editorial, qualified intent routes to Engine, biometric data creates switching cost, and high-intent users convert to Clinical's recurring revenue. **Once a user connects Whoop/Oura/Apple Health, leaving means rebuilding 3+ months of trended data elsewhere. No pure telehealth competitor has this lock-in.**

**Why Clinical is arms-length (separate LLC):** Prescription/compounded peptides carry adverse-event, FDA, and payment-processor risk that Editorial and Engine do not. A single bad outcome — patient injury, FDA enforcement action, Stripe-style shutdown — must not be able to claw back Editorial affiliate revenue or take down Engine user data. The structural firewall (separate LLC + separate domain + separate payment processor + separate analytics + separate email infrastructure) means Editorial and Engine survive independently regardless of what happens in Clinical. This is the controllable response to failure modes #3, #13, #14, and #19 in the master spec's pre-mortem.

---

## 2. Unit Economics (The Math Behind Each Layer)

> All numbers below are **industry benchmark estimates** from comparable telehealth/affiliate businesses (Hims/Hers public disclosures, Ro press, Levels podcasts, peptide affiliate operator reports). They are not Aura forecasts. Replace with Aura actuals as data comes in.

### Editorial (affiliate commissions + Playbook)

| Metric | Estimate | Source |
|--------|----------|--------|
| Avg AOV at peptide vendors | $130 | Limitless / Swiss Chems public cart sizes |
| Blended commission rate | 18% | Weighted avg across our 4 approved vendors |
| Organic session → product page CTR | 25% | Standard SEO funnel |
| Product page → vendor outbound click | 20% | Industry "intent page" benchmark |
| Vendor outbound → buyer | 4% | Affiliate norm for cold traffic |
| **Revenue per organic session** | **~$0.07** | $130 × 18% × 25% × 20% × 4% |
| Playbook conversion (email sub → buyer) | 6% | $97 product, content-led list |

**Implication:** To clear $5K/mo from Editorial alone we need either ~70K monthly organic sessions OR a mix like 15K sessions ($1K affiliate) + 40 Playbook sales/mo ($3.9K). The Playbook is the high-leverage piece; it monetizes the email list far better than affiliate clicks.

### Engine (free — value is the funnel rate to Clinical)

| Metric | Estimate | Notes |
|--------|----------|-------|
| Cost per Engine user / month | ~$0.50 | Terra ($0 dev tier mo. 1–2), Anthropic ~$0.05/recommendation × est. usage, Supabase free tier |
| Engine user → Clinical consult request | 8–15% | High end of telehealth funnel because user has self-selected by connecting wearable + completing intake |
| Consult request → paid Rx | 35–50% | Hims/Ro compounded-TRT public funnel range |
| **Effective Engine → paid Clinical sub** | **3–7.5%** | 8–15% × 35–50% |

**Implication:** 1,000 Engine users → 30–75 new Clinical subscribers. The Engine is the cheapest customer acquisition channel we'll ever have — once it's getting organic traffic from Editorial, marginal CAC approaches near-zero for the users it converts.

### Clinical (the actual revenue layer)

| Metric | Estimate | Notes |
|--------|----------|-------|
| ARPU (avg revenue per user / month) | $300 | Range $249 Recovery → $499 advanced GH stack |
| Pharmacy COGS | ~$90/mo | Empower compounded peptide cost estimate |
| MD per-consult / month allocation | ~$35/mo | Initial consult amortized + monthly check-in |
| EHR + processor + ops | ~$15/mo | MDIntegrations + Authorize.net |
| **Gross margin per subscriber** | **~$160/mo (53%)** | $300 − $140 fixed costs |
| Retention (avg months) | 8 mo | Estimate based on Hims TRT-style cohorts; we'll measure |
| **LTV (gross margin basis)** | **~$1,280** | $160 × 8 |
| **CAC ceiling at maturity (LTV/3)** | **~$427** | Standard SaaS rule |
| **Early-stage CAC tolerance (LTV/1.5)** | **~$850** | Acceptable during learning phase |
| Payback at $300 CAC | ~1.9 months | Fast — this is the unit-economics win |

**Implication:** $60K MRR Month 6 = **200 active Clinical subscribers**. At 8-month avg retention, sustaining 200 active = ~25 new subs/mo. At Month 6 mature CAC of $300, that's **$7,500/mo Clinical paid acquisition spend** to sustain the run-rate.

---

## 3. Where We Are Right Now

**Today:** 2026-05-30 → **Day 6 of Month 0** (validation sprint, ends ~2026-06-21)

| Layer | Status | Highest-impact next move |
|-------|--------|--------------------------|
| Editorial | Coming-Soon homepage blocks vendor approval + indexing. 11 products, 8 blog posts, 3 comparisons ready behind it. | Decide homepage pattern (recommend qualifier quiz — see §10 Q1) and port approved mockup |
| Engine | `/connect` 200 (was 500). Supabase + Anthropic wired prod. Migrations not committed. Terra keys blank. | Commit migrations → sign up for Terra → push 3 keys → test magic link |
| Clinical | Not formed. Domain not chosen. Pharmacy/MD partners not selected. Attorney intake doc drafted. | **Do not form yet.** Run Month 0 validation tests first per the kill-gate. |

**This session delivered:**
- Engine env vars pushed to Vercel; `/connect` no longer 500
- This ROADMAP + READINESS system created

---

## 4. Cash & Runway Plan (Months 0–6)

> Assumptions: $200 Month 0 paid spend per spec. $3,600 Month 1 Clinical formation (legal, EHR, MD/pharmacy onboarding) per spec. SaaS stack ramps from ~$100/mo Month 0 to ~$1,500/mo Month 6 (Terra production, Anthropic at scale, EHR, processor, monitoring).
>
> **2026-05-30 update — Terra pricing risk:** Confirmed Terra's Quick Start is **$399/mo** with no free dev tier (master spec assumed free months 1–2). Table below shows the *baseline* plan assuming we defer Terra until Playbook revenue starts OR Terra grants startup credit. **If we subscribe Terra immediately**, add ~$399/mo from Month 1 onward → cumulative shifts ~$2K worse by Month 3, ~$3.6K worse by Month 6 (still profitable, but the Month 0–1 burn buffer tightens). Outreach to Terra sales drafted at `docs/outreach/2026-05-30-terra-sales-startup-credit.md`. Fallback if Terra refuses + cash is tight: direct Whoop/Oura/Apple Health APIs (free dev tiers, ~1–2 weeks rewrite).

| Month | Spend | Revenue (target) | Net | Cumulative | Notes |
|-------|-------|------------------|-----|------------|-------|
| 0 | $300 | $0 | −$300 | −$300 | $200 ads + $100 SaaS |
| 1 | $4,400 | $2,000 | −$2,400 | −$2,700 | $3,600 Clinical setup + $500 ads + $300 SaaS; Playbook starts |
| 2 | $1,400 | $5,000 | +$3,600 | +$900 | $700 ads + $700 SaaS; first ~10 Clinical subs + Playbook + affiliate |
| 3 | $2,200 | $14,000 | +$11,800 | +$12,700 | $1,400 ads + $800 SaaS; Clinical ~$10K MRR + ~$4K Editorial. **Checkpoint month.** |
| 4 | $3,800 | $30,000 | +$26,200 | +$38,900 | $2,800 ads + $1,000 SaaS; Clinical ~$25K MRR + $5K Editorial |
| 5 | $5,200 | $51,000 | +$45,800 | +$84,700 | $4,000 ads + $1,200 SaaS; Clinical ~$45K + $6K Editorial |
| 6 | $6,500 | $67,000 | +$60,500 | +$145,200 | $5,000 ads + $1,500 SaaS; Clinical ~$60K + $7K Editorial |

**Pre-Month 0 runway requirement:** ~$8K (covers Month 0 + Month 1 burn before Month 2 breakeven). **If runway < $8K, Plan B is bridge consulting per spec §11.** (Q8 — write down the runway floor in writing this week.)

**Cumulative cash if plan tracks:** +$145K by end of Month 6. **If Clinical fails at Month 3 checkpoint and gets wound down:** cumulative ~$13K from Editorial + Engine alone; lower ceiling but doesn't blow up.

---

## 5. Channel Strategy & CAC Targets

### Month 0 — $200 micro-test allocation

| Channel | Spend | Expected clicks | Goal | Why this channel |
|---------|-------|-----------------|------|------------------|
| Reddit Ads (r/Peptides, r/PEDs, r/Biohackers) | $80 | 100–200 | Validate Engine CTA CTR on `/validate/wearable` | Peptide community is intent-rich and cheap to reach |
| Meta (Lookalike: Hims/Levels/Athletic Greens audiences) | $80 | 40–80 | Validate 3 positioning variants | Broader audience, will tell us if positioning travels outside the peptide-native crowd |
| Google Search (compounded peptides, prescribed bpc-157) | $40 | 13–26 | Validate `/validate/deposit-*` pages with highest-intent traffic | Pure intent — if deposit pages don't convert here, they won't anywhere |

**Decision tree end of Month 0:**
- Winning channel (best CPA on validation goal) gets 70% of Month 1+ paid budget
- Losing channels get re-tested only with explicitly different creative/positioning
- If NO channel hits validation thresholds: don't increase spend — diagnose first (see §8 Ladder A)

### Month 1+ scaling channels (in priority order)

1. **Winning paid channel from Month 0** — 70% of paid budget
2. **SEO content velocity** — 2 posts/week minimum on Editorial; target 12+ new indexed posts by end of Month 3. Compounds; lowest long-run CAC.
3. **Reddit organic** — high-value participation in 3 priority subs. Goal: become known as a credible voice, not run ads.
4. **X/Twitter threads** — 1 thread/week on protocol mechanics + biometric interpretation. Cheap distribution if positioned right.
5. **Email sequences** — Playbook drip (5 emails over 14 days) + Engine onboarding (3 emails). Owned audience — pays for itself across cohorts.
6. **YouTube (Month 3+ only if budget allows)** — long-form protocol explainers. High production cost but durable.
7. **Partnerships (Month 4+)** — outreach to wearable communities (WHOOP groups, Oura subreddit guides), peptide podcasters.

### Clinical CAC targets by Month

| Month | Target Clinical CAC | Why |
|-------|----------------------|-----|
| 1 | $500–$800 | Learning phase; tolerate high CAC to find what works |
| 3 | $300–$500 | Should be approaching maturity; if higher → diagnostic ladder |
| 6 | $200–$300 | LTV/CAC ≥ 4. Sustainable scale. |

### Editorial → Engine → Clinical funnel math (target, Month 6)
- 30K monthly organic sessions on Editorial
- 12% click through to Engine (sticky banner + inline CTAs) = 3,600 Engine landings
- 25% complete onboarding = 900 active Engine users / month
- 6% convert to Clinical sub = 54 new Clinical subs / month organically
- Plus ~25 from paid acquisition
- **Total: ~80 new subs/mo by Month 6** → easily sustains 200-sub run-rate at $300 ARPU

---

## 6. Competitive Landscape & Aura's Wedge

| Competitor | Their model | What they have | What they lack | Why we win against them |
|------------|-------------|----------------|----------------|-------------------------|
| Hims/Hers | Telehealth Rx (TRT, hair, ED, mental health, GLP-1) | Scale, brand, $1B+ ARR, Rx infrastructure | No biometric personalization, no peptide focus | We're peptide-native + biometric-personalized |
| Ro / Mochi | GLP-1 telehealth | Brand, GLP-1-specific scale, ad budgets | Single-SKU dependency, no biometric layer, no peptide breadth | Multi-peptide library + protocol logic + biometric inputs |
| Levels | CGM subscription ($199/mo) | Best-in-class biometric UX, strong brand | No Rx, no protocols, single biometric type | We span multiple wearables + add Rx pathway |
| WHOOP Coach | AI coach in WHOOP app | Native wearable, captive audience | No Rx, no peptides, locked to WHOOP | Multi-wearable + actual Rx layer |
| Research peptide vendors (Pure Sciences, Limitless, Swiss Chems) | "Research only" affiliate catalog | Cheap, broad catalog, legal grey | No personalization, no Rx, legal grey | Legitimate Rx path + personalization + protocols |
| Compounding pharmacy direct (Empower / Strive direct) | Pharmacy-direct cash pay | Lowest-cost option for end user | No clinical layer, no MD network, no protocol design | We bundle the MD + protocol + UX they don't provide |

**Aura's wedge, in one sentence:**
> The only product that ingests your wearable biometrics, generates a peptide protocol from your data, and routes you to a licensed MD for prescribed compounded peptides — under one brand experience.

**The defensible moat is the biometric data layer.** Anyone can spin up a peptide telehealth co. Nobody is also sitting on your trended HRV/sleep/recovery data. Switching costs are real and compound monthly.

---

## 7. The 6-Month Plan (Synthesized + Annotated)

> Full detail: `docs/superpowers/specs/2026-05-24-aura-clinical-telehealth-pivot-design.md` §5. This is the navigation view with paid spend + CAC overlay.

### Month 0 — Validation Sprint (2026-05-24 → ~2026-06-21)

**Goal:** Prove demand at clinical pricing **before** spending Clinical formation $.

| ID | Item | Acceptance | Status |
|----|------|------------|--------|
| 0.A | 6 validation pages live (positioning v1/v2/v3, wearable, deposit-gh, deposit-recovery), `noindex,nofollow` | All 6 routes exist | ✅ BUILT |
| 0.B | $200 paid traffic per §5 allocation | Live in all 3 channels | ❌ TODO |
| 0.C | Wedge deposit test result | ≥5 deposits / ≥500 visits | ❌ PENDING |
| 0.D | Best positioning variant email capture | ≥3% | ❌ PENDING |
| 0.E | Engine CTA CTR on `/validate/wearable` | ≥15% | ❌ PENDING |
| 0.F | Founder runway named in writing (Q8) | Doc exists | ❌ TODO |

### Month 1 — Three Parallel Tracks (~2026-06-22 → ~2026-07-21)

**Track 1 — Editorial Bridge ($97 Playbook is the revenue bridge — target ≥$2K Month 1)**
- 1.E1 Homepage replacement (qualifier quiz, recommended — Q1)
- 1.E2 PT-141 post into `posts.ts` (draft approved)
- 1.E3 Blog → product → comparison cross-links (~12 links min)
- 1.E4 OG images on dynamic pages
- 1.E5 About page authority upgrade (methodology, vendor vetting)
- 1.E6 Playbook page live on Gumroad + integrated email capture

**Track 2 — Engine MVP (public)**
- 1.G1 Commit Supabase migrations
- 1.G2 Terra developer signup → 3 env vars filled
- 1.G3 Magic-link tested end-to-end on prod with real email
- 1.G4 `/onboarding` saves intake
- 1.G5 `/recommendation` returns Claude output with disclaimer + PrescribeCTA
- 1.G6 `/api/terra/*` OAuth + webhook ingesting biometrics
- 1.G7 Custom SMTP (`support@auraprotocols.com`) for branded magic links
- **Target: ≥50 wearable connections by end of Month 1**

**Track 3 — Clinical Backend (private, no public site yet)**
- 1.C1 Form Aura Clinical LLC
- 1.C2 Choose domain (recommend `auraclinical.com` — Q2)
- 1.C3 State (recommend Florida — Q3)
- 1.C4 MD network (recommend MDIntegrations — Q5)
- 1.C5 Pharmacy partner (recommend Empower primary, Strive Month 3 — Q4)
- 1.C6 HIPAA EHR setup (included with MDIntegrations)
- 1.C7 Healthcare payment processor (NOT Stripe — Authorize.net or Easy Pay Direct)
- 1.C8 Formulary attorney sign-off on prescribable SKUs
- 1.C9 Pricing locked against pharmacy partner cost
- 1.C10 Clinical waitlist landing page live (recommend launch BEFORE Engine public — Q7)

### Months 2–3 — Engine Growth + Clinical Soft-Launch + Month 3 Checkpoint

| Month | Milestone | Target |
|-------|-----------|--------|
| 2 | Engine connected users | ≥500 |
| 2 | First 5–15 Clinical subs (soft launch from waitlist + Engine routing) | ≥$3K MRR |
| 3 | **Clinical MRR — Checkpoint** | ≥$10K (33 active subs at $300 ARPU) |
| 3 | Editorial monthly affiliate revenue | ≥$1K |
| 3 | New blog posts indexed | ≥6 added this month |
| 3 | Second pharmacy partner signed (two-pharmacy rule by Month 3) | Done |

### Months 4–6 — Scale

| Month | Clinical MRR | Clinical subs | Engine users | Editorial revenue |
|-------|--------------|---------------|--------------|--------------------|
| 4 | ≥$25K | ~83 active | ≥1,000 | ≥$2K |
| 5 | ≥$45K | ~150 active | ≥1,800 | ≥$3.5K |
| 6 | **≥$60K** | **~200 active** | **≥2,500** | **≥$5K** |

Scaling levers Months 4–6: GLP-1 cross-sell (highest demand peptide); Engine paid tier decision; content velocity continues; second pharmacy partner adds redundancy + formulary breadth.

---

## 8. Review Points (Checkpoints with Diagnostic Ladders)

These are moments to **look at data and decide**, not auto-pilot triggers. The diagnostic ladders below are the playbook when a number misses — don't shut anything down without working the ladder first.

| Checkpoint | When | Pass | If missing |
|------------|------|------|------------|
| Validation read | End Month 0 (~2026-06-21) | ≥5 deposits, ≥3% capture, ≥15% Engine CTR | Work Ladder A |
| Clinical viability | End Month 3 (~2026-09-21) | Clinical MRR ≥$10K | Work Ladder B or C depending on size of miss |
| Founder runway | Before Month 0 paid spend | Written floor (≥6mo. OR bridge ≤15hr/wk) | Don't start paid spend |
| **Terra subscription gate** | Before subscribing $399/mo | (a) Terra startup credit confirmed, OR (b) Playbook ≥$1K MRR, OR (c) written runway ≥$10K | Defer Terra; ship `/connect` with "coming soon" copy; consider direct Whoop/Oura/Apple SDKs as fallback |
| Pivot discipline | Throughout | New idea → park in §9 | Date the decision when you take a fork |

### Ladder A — Month 0 validation underperformed

Don't pivot on impression alone. Work in order:

1. **Was traffic real?** Pull ad-platform delivery report. Did the $200 actually land on the validation pages, or was it eaten by bot traffic / wrong placements?
2. **Did the page load + track correctly?** Open in incognito, check console + analytics fires. UX bug = invalid signal.
3. **Was the page wrong, or the price?** Re-test one variable. Same positioning, $99 deposit instead of $299. If $99 converts → price is wrong, not concept.
4. **Was the audience wrong?** Pull any deposits/captures we did get. What's the segment? (Wearable owner? Age band? Existing peptide user?) Their match rate to your paid targeting matters.
5. **Only after all four** — consider Pivot A (affiliate-only) or extending Month 0 with a fresh $200 against revised hypotheses.

### Ladder B — Month 3 Clinical MRR in $3K–$7K range (behind but alive)

You have 30–70 active subs at $300 ARPU. Don't fold; diagnose:

1. **Is it consult conversion or Rx conversion?** Pull funnel. If consults are happening but not converting to Rx → MD network friction, formulary issue, or pricing shock at checkout.
2. **Is retention bleeding?** Pull cohort. If everyone's churning Month 2 → product issue (formulary not working / side effects / over-promise vs delivery).
3. **Is pricing right?** What % declined at checkout? Test $249 floor option for Recovery stack.
4. **Is the formulary right?** Look at what churned subs *wanted* vs. what we offered. Often a missing SKU (e.g., we didn't have tirzepatide on day one).
5. **Then decide:** narrow formulary / change pricing / pause scaling / extend Month 3 by 30 days with fixes.

### Ladder C — Month 3 Clinical MRR < $3K (concept didn't take)

This is the "fold or fundamentally redesign" zone. Convene Kearney + attorney. Options on the table:
- **Wind down Clinical** (LLC firewall exists for this exact moment) → continue Editorial + Engine standalone
- **Hard reset Clinical** with different positioning / pricing / vertical (e.g., GLP-1-only)
- **Sell or partner** the Clinical LLC asset to a telehealth co. that has acquisition channels but no biometric layer

Don't slow-burn a failing Clinical for sentiment — every month of zero traction costs ~$1.5K and erodes founder energy.

---

## 9. Pivot Tree (Pre-Thought + Will Grow Organically)

Some forks are pre-mortemed below. Others will emerge as we ship and learn — when they appear in conversation, add them here with a date so the trail is visible.

### Pre-thought pivots

**If Month 0 validation fails (Ladder A exhausted):**
- **Pivot A:** Editorial + Engine standalone, affiliate-only revenue. Ceiling ~$5–15K/mo. Real and survives.
- **Pivot B:** Defer Clinical 6 months; turn Engine into $19/mo SaaS protocol generator. Tests price tolerance before Rx complexity. Target $5K Engine MRR.

**If Month 3 Clinical kill-gate triggers (Ladder C):**
- Editorial + Engine continue standalone. Clinical LLC dissolved per attorney plan. Engine continues as free Editorial-funnel magnet.

**If a vendor approval falls through:**
- Approved (Limitless, Swiss Chems, GLP-1 Research Lab, Apollo) cover ~80% of catalog. No single rejection is fatal.

**Engine revenue model — defer decision until we have user behavior data:**
- Watch what users do once Engine has ≥500 connections. The right model will be obvious from the data (heavy users? feature gating? historical data lock-in?).

### Long-horizon optional bets (Months 6–12+, not committed)

Listed so we don't waste cycles re-discovering them later.

- **Aura private-label peptides** (own brand, fulfilled by approved compounder) — vertical integration play
- **Aura Editorial subscription** ($9/mo premium content) — owned-media monetization
- **Aura Coaching** (1-on-1 protocol design with human review) — high-margin services tier
- **B2B Engine API** (sell biometric recommendations to other clinics) — platform play
- **Mobile app** (native wearable integration) — friction reduction
- **GLP-1 vertical specialization** (if GLP-1 cross-sell dominates) — focused brand spinout

Plus whatever shows up organically — add it here when it does.

---

## 10. Recommended Answers to Open Strategic Questions

Each has a one-paragraph rationale. **These are my recommended defaults. Kearney makes the final call.**

### Q1: Homepage pattern → Recommend **qualifier quiz**

A 3-question quiz ("What's your top goal?" / "Do you use a wearable today?" / "Open to a prescribed option?") routes each visitor to the layer most likely to convert them: Editorial for browsers, Engine for biometric-curious, Clinical-waitlist for Rx-ready. Two-door is too binary. Splash gives no path forward. The quiz also captures email at the end. Build cost: small. Conversion lift vs. static homepage: 1.5–3x in comparable consumer-health funnels.

### Q2: Clinical domain → Recommend **`auraclinical.com`**

Clean brand extension (Aura family of products), SEO-friendly, reads as a legitimate clinic — which is what we need for FDA scrutiny, MD recruitment, and payer/processor trust. `aurarx.com` reads as pill-mill and triggers ad-platform restrictions. `auraprescribed.com` is awkward and weak. `auraclinical.com` is the lowest-risk, highest-trust option.

### Q3: Launch state → Recommend **Florida**

FL has the most permissive 503A formulary tolerance per public FDA enforcement patterns, a clean telehealth practice act (no in-state-presence requirement for MDs), no corporate-practice-of-medicine restriction, and the largest established compounding pharmacy ecosystem we can ship into. TX is a viable backup. AZ is tighter on formulary scrutiny. **Final answer requires attorney sign-off.**

### Q4: Pharmacy partner → Recommend **Empower Pharmacy (primary), Strive (secondary by Month 3)**

Empower is the largest 503A in the US with the broadest active peptide formulary (BPC-157, TB-500, CJC-1295, Ipamorelin, semaglutide, tirzepatide). Lowest reputational risk. Strive as secondary satisfies the two-pharmacy rule (failure mode #13) and covers Empower-side supply disruption. **Get pricing from both in Month 1.**

### Q5: MD network → Recommend **MDIntegrations**

Purpose-built EHR + MD network in one product = fastest time-to-launch + lowest integration risk. Wheel and Photon are good but require integrating two separate vendors. MDI also handles HIPAA-compliant intake forms out of the box (covers failure mode #19). Trade-off: less customization than rolling our own. Acceptable trade for speed.

### Q6: Engine revenue model → **Defer. Decide from Month 2 data.**

This is the one I shouldn't recommend a priori. We need ≥500 Engine users to see actual willingness-to-pay behavior. Until then, free maximizes the funnel into Clinical. **Premature monetization here would cap the moat.**

### Q7: Clinical waitlist landing page → Recommend **launch BEFORE Engine public launch (Month 1, Week 2)**

A waitlist captures intent without requiring Clinical to be fully operational. Provides both demand signal and a warm list to convert at Month 1 launch. Engine traffic during the public-launch build-out needs somewhere to convert — without a waitlist page, that intent leaks.

### Q8: Founder runway statement → **Write it down THIS WEEK.**

Precondition to all other spend. Without a written floor, every checkpoint becomes "do I keep going?" — much harder than "did we hit the number?" Even if the answer is "$X for Y months and Plan B is Z hours/week consulting" — write that down. **This is the cheapest, highest-leverage decision in the entire plan.**

### Q9: Should we launch a Clinical waitlist on `shop.auraprotocols.com` before the standalone Clinical site exists?

Recommend **yes** — a single page at `shop.auraprotocols.com/clinical-waitlist` (marked `noindex` initially), driven by Engine recommendations' "Get this prescribed" CTA. Once `auraclinical.com` is live, 301 redirect. Captures demand starting Month 1 without waiting for full Clinical infrastructure.

### Q10: Editorial monetization order — affiliate first, or Playbook first?

Recommend **Playbook first**. It's a one-time $97 vs. affiliate's ~$0.07/visitor. 50 Playbook sales/mo = $4,850. That same revenue from affiliate alone requires ~70K monthly sessions. The Playbook is the bridge revenue during Months 1–3 before Clinical compounds. Affiliate is the **long-run** revenue floor; Playbook is the **near-term** lever.

---

## 11. Weekly KPI Dashboard

Every Monday, 15-minute review. Tracked in a simple sheet or Notion table. **This is the single most important operating habit in the plan.**

### Editorial weekly KPIs

| Metric | Target trend | Why |
|--------|--------------|-----|
| Organic sessions | +20% MoM after homepage launch | SEO compound is the long-run moat |
| Top 5 organic queries + position | Track movement weekly | Early-warning on de-ranking |
| Vendor outbound clicks / session | ≥8% | Funnel health |
| Email signups | ≥2% of sessions | List is the Playbook revenue engine |
| Playbook sales | Ramp to 12+/mo by Month 3 | Bridge revenue |

### Engine weekly KPIs

| Metric | Target trend | Why |
|--------|--------------|-----|
| New wearable connections | 12/wk Month 1 → 100/wk Month 3 | Moat depth |
| Recommendations served | Tracks user activity | — |
| Recommendation → PrescribeCTA click rate | ≥15% | Funnel to Clinical |
| 7-day retention | ≥40% | Engine quality |

### Clinical weekly KPIs (starts Month 2)

| Metric | Target | Why |
|--------|--------|-----|
| Consult requests | Tracks demand | — |
| Consult → Rx conversion | ≥40% | MD network + product fit |
| MRR (WoW delta) | + ~$2.5K/wk by Month 3 | The number that matters |
| Churn (monthly) | <8% | Retention = LTV = everything |
| CAC by channel | vs. table in §5 | Spend discipline |

---

## 12. Permanent Rules (Earned the Hard Way — Do Not Re-Litigate)

| Rule | Why | Source |
|------|-----|--------|
| Never freestyle UI — port from approved mockup line-by-line | Burned tokens 2026-05-27 building generic cards | `feedback_match_mockup.md` |
| Never surface commission rates in user-facing copy | Customer-centric brand; rates are internal only | `feedback_no_commission_disclosure.md` |
| All affiliate links: `rel="noopener noreferrer sponsored"` | FTC + program compliance | Shop CLAUDE.md |
| All affiliate outreach: `support@auraprotocols.com` (never `k9misc@gmail.com`) | Brand legitimacy with vendors | `user_profile.md` |
| Engine privacy vocab: biometrics / fitness data — NEVER medical, clinical, patient, diagnosis, PHI | Avoid HIPAA scope on Engine; only Clinical layer touches PHI | Engine CLAUDE.md |
| Stripe OK for Editorial/Engine/Playbook — NEVER for Clinical | Stripe TOS forbid Rx; account closure risk | `legal_entities.md` |
| Aura Clinical = separate LLC, separate domain, separate processor, separate analytics, separate email | Blast-radius firewall against adverse-event liability | Pivot spec §3.1 |
| Two-pharmacy partner rule by Month 3 | FDA 503A tightening could kill SKU at single pharmacy | Pivot spec failure mode #13 |
| Disclaimer + PrescribeCTA on every Engine recommendation surface | Legal + safety floor; rules layer + LLM hybrid, never pure LLM | Engine CLAUDE.md |
| Anthropic prompts use `cache_control` ephemeral breakpoints | Cost guardrail | Engine CLAUDE.md |
| Don't re-debate answered open questions without new data | Decision discipline | This document |

---

## 13. Source Documents (Read in This Order)

When a new session starts cold:

1. **`/ROADMAP.md`** (this file) — strategic operating doc
2. **`/docs/READINESS.md`** — live audit + weekly KPIs
3. **`/docs/superpowers/specs/2026-05-24-aura-clinical-telehealth-pivot-design.md`** — master strategy + risk matrix
4. **`/docs/superpowers/plans/2026-05-24-shop-rebuild.md`** — Month 1 Editorial 19-task plan
5. **`/docs/superpowers/plans/2026-05-24-engine-mvp.md`** — Engine architecture
6. **`/docs/clinical/2026-05-25-attorney-intake.md`** — Clinical legal questions
7. **`/apps/engine/CLAUDE.md`** + **`/apps/shop/CLAUDE.md`** — brand constants
8. **Memory** — preferences, decisions, vendor history

---

## 14. How To Get Back On Task

1. Read §3 (Where We Are Right Now)
2. Open `docs/READINESS.md` → check External Dependencies table (who/what/when)
3. Find lowest-numbered Month not 100% done
4. Pick highest-impact unblocked item in that Month
5. If everything in current Month is blocked, work ahead on next-Month items with met dependencies
6. If unsure: "ROADMAP says Month X, READINESS shows Y blocked + Z available — which?"

---

## 15. How To Keep This File Honest

Update whenever:
- A Month rolls over → bump §3, mark items complete in §7
- A checkpoint hits → record result in §8
- A strategic question is answered → move Q from §10 to §12 (a rule) or to the Decisions Log
- A pivot is taken → update §9, date the fork chosen
- A vendor / partner / processor is chosen → update §1 status column + §10
- A KPI deviates >25% from §11 target → flag in §3 and start the matching diagnostic ladder

**If this file disagrees with the master spec, the master spec wins** unless an explicit dated decision overrides it (record those in the Decisions Log below).

---

## Decisions Log

(Append-only. Each entry: date, decision, why, who decided.)

- 2026-05-30 — Created this ROADMAP + READINESS system. Why: project focus wasn't surviving across sessions. Decided: Kearney.
- 2026-05-30 — Pushed Supabase + Anthropic env vars to Vercel `aura-engine` production. Why: unblock `/connect` (was 500). Decided: Kearney.
- 2026-05-30 — Committed Supabase migrations + wired CLI via `apps/engine/supabase/config.toml`. Why: complete ROADMAP item 1.G1; enable repeatable drift-checks. Decided: Kearney.
- 2026-05-30 — Discovered Terra Quick Start is $399/mo with no free dev tier (master spec was wrong). **Decision: do not subscribe today.** Sent sales outreach (`docs/outreach/2026-05-30-terra-sales-startup-credit.md`) requesting startup credit / extended trial. Engine `/connect` will ship with "coming soon" copy until subscription gate is met (see §8). Fallback: direct Whoop/Oura/Apple Health SDKs. Decided: Kearney.
