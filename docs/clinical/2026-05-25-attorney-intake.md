# Aura Clinical — Healthcare Attorney Consultation Intake

**Date prepared:** 2026-05-25
**Prepared by:** Kearney Adams Jr., founder, Aura Protocols LLC
**Purpose:** Maximize a 1–2 hour paid consult with a telehealth-specialized healthcare attorney. The goal of the engagement is a go/no-go signal on launching a peptide-focused telehealth business in a single US state, plus a concrete entity-structure recommendation.

---

## 1. About me

- Solo non-technical founder. Full-time on this project.
- Bootstrapped — total runway for legal, entity, insurance, and pre-launch infrastructure is approximately **$8,000–20,000 over the next 4–6 months**.
- I already own and operate `shop.auraprotocols.com`, a Next.js affiliate site for research-grade peptides. It is currently pre-revenue. The site links to third-party vendors (Core Peptides, Limitless Life Nootropics, Swiss Chems, etc.) under "research use only" disclaimers and FTC affiliate disclosures. I do not handle product or take payment for product.
- **Aura Protocols LLC** is already formed (LegalZoom). It owns the affiliate site and will own the upcoming "Engine" biometric product (see §2.2). This is the entity I currently operate under.
- I have **not** yet formed any clinical/medical entity, signed any pharmacy or MD agreement, taken on any patient, or made any prescribed-medication claim. I am at the pre-formation stage of the clinical side and want legal direction before spending.

---

## 2. The business I am building

### 2.1 The three layers

I am building **one combined company** with three customer-facing surfaces:

| Layer | Surface | Role | Monetization |
|---|---|---|---|
| **Editorial** | `auraprotocols.com` (planned: collapse `shop.auraprotocols.com` into apex) | SEO/education entry point. Reviews, comparisons, peptide dosing guides. | Affiliate commissions on research-grade vendor links (third-party). |
| **Engine** | Same site as Editorial, dynamic routes (`/connect`, `/recommend`). | Free biometric-driven peptide protocol recommender. User connects Whoop/Oura/Apple Health via Terra API aggregator; we return a personalized protocol suggestion. | None directly — converts qualified leads downstream. |
| **Clinical** | `auraclinical.com` (or similar TBD) — **separate brand, separate LLC, separate domain, separate payment processor, separate analytics** | Vertical telehealth. Patient intake → licensed MD review → prescribed compounded peptides → recurring subscription. | $250–500/mo subscription per patient. **This is the primary revenue driver.** |

### 2.2 Funnel logic

1. User finds Editorial via SEO (searches for peptide info, dosing, vendor comparisons).
2. CTAs route them to the Engine to "get a personalized protocol."
3. Engine outputs a recommendation. Every recommendation surface shows two CTAs:
   - **"Get this prescribed at Aura Clinical →"** (primary — routes to the Clinical brand)
   - **"Buy research-grade vials →"** (secondary — third-party affiliate links, "research use only" disclaimers)
4. Clinical path: async intake form (pre-populated with Engine output), state-licensed MD reviews, compounding pharmacy ships, recurring monthly subscription.

### 2.3 Intended formulary at Clinical launch

I am aware that the FDA enforcement posture toward compounded peptides has tightened materially in 2024–2025 (CJC-1295 Cat 2 listing, semaglutide shortage exemption sunset, increased 503A inspections). I want the attorney's read on what is **realistically prescribable and compoundable today** in our launch state from the following candidate list:

- Sermorelin (GH-releasing)
- Compounded semaglutide / tirzepatide (where still allowed)
- NAD+ injections
- Testosterone (HRT)
- Oxytocin
- Sildenafil / tadalafil (compounded oral troches)
- BPC-157, TB-500, CJC-1295, Ipamorelin — I understand these are likely **not** safely prescribable through a 503A pharmacy partnership in today's environment, but want the attorney's confirmation and any nuance per state.

### 2.4 Launch posture

- **Single launch state:** considering Florida, Texas, or Arizona. Open to attorney's recommendation based on telehealth practice acts, corporate practice of medicine rules, formulary tolerance, and patient demand density.
- **Async-first** (questionnaire + asynchronous physician review), with synchronous video on request or when state law requires.
- **Subscription billing** via Stripe (telehealth-legal use case, distinct from the affiliate side).
- **Vendor-platform UI** (Healthie, Spruce Health, or similar) rather than custom EHR. Will brand the platform.
- **MD network** via Wheel, SteadyMD, OpenLoop, or similar — or direct contract with a single licensed MD in the launch state.
- **Compounding pharmacy partner** TBD — discovery calls planned with Empower (TX), Olympia (FL), Tailor Made (KY).

### 2.5 The relationship between Aura Protocols LLC (affiliate + Engine) and Aura Clinical (telehealth)

- I intend to keep these as **two separate LLCs**.
- The Editorial/Engine side links users to the Clinical brand via clear "get this prescribed at our sister brand" handoffs, similar to how Hims/Hers operate their content properties.
- I do not want a category-level adverse event on either side to be able to take down the other.

---

## 3. Questions for the attorney

### 3.1 Entity structure & corporate practice of medicine

1. In our recommended launch state (FL / TX / AZ), what is the correct legal structure?
   - Single LLC?
   - LLC + Professional Corporation (PC) with a Management Services Organization (MSO) agreement?
   - Other?
2. Who must own the PC (if required)? Must it be a licensed physician in the same state? What is the standard MSO arrangement that lets a non-licensed founder operate the business side legally?
3. What is the realistic all-in cost for entity formation, operating agreements, MSO agreement, and registered agents?
4. Are there states where the corporate practice of medicine doctrine is loose enough that a regular LLC works, and would you recommend any of those over the three I've named?

### 3.2 Telehealth practice act — launch state

1. Does the launch state allow **async-only** patient-physician relationship establishment, or is initial synchronous (video) contact required?
2. Is there an in-state physical address / "physician establishment" requirement?
3. What are the minimum documentation, identity-verification, and informed-consent requirements?
4. Any state-specific advertising or disclosure rules I need to know about (e.g., Florida required disclaimers)?

### 3.3 Formulary and FDA enforcement reality

1. Given the current FDA enforcement posture, which of the candidate substances in §2.3 are realistically prescribable through a 503A compounding pharmacy in our launch state, today?
2. What is your read on the BPC-157 / TB-500 / CJC-1295 / Ipamorelin path — is there any compliant route, or should I treat these as not available regardless of demand?
3. What is the current status of compounded semaglutide / tirzepatide for non-shortage prescribing, and how does that interact with state pharmacy board rules?
4. Are there compounded-peptide categories I'm not considering that you've seen work well for similar telehealth startups (e.g., specific GLP-1 analogs, growth factor blends, sermorelin combinations)?

### 3.4 MD network and physician relationship

1. We are deciding between (a) contracting a single licensed MD in the launch state, vs (b) using a telehealth MD network platform (Wheel, SteadyMD, OpenLoop). What are the legal differences, particularly around anti-kickback statutes, fee-splitting prohibitions, and the patient-physician relationship?
2. If we use a network platform, do we need a separate Medical Director relationship with a single state-licensed MD anyway?
3. What is the typical compensation structure — per-consult fee, salary, equity — that does not violate fee-splitting rules?
4. What liability flows back to me / the LLC vs. stays with the prescribing MD?

### 3.5 Pharmacy partnership

1. What contractual terms should I require from a 503A compounding pharmacy partner to insulate Aura Clinical from a pharmacy-side regulatory action?
2. Are there pharmacy-side red flags I should screen for (recent FDA warning letters, state board actions, formulary restrictions, ownership structure)?
3. Is the "pharmacy ships direct to patient" model legally cleaner than "pharmacy ships to clinic, clinic re-ships"?

### 3.6 Patient relationship establishment & ongoing care

1. What does a defensible initial-consult workflow look like for an async-first telehealth (questionnaire content, supporting documents required, MD review documentation)?
2. What follow-up cadence is legally adequate — quarterly check-ins, annual labs, asynchronous messaging only?
3. What records-retention obligations apply, and how should the EHR platform support them?

### 3.7 Marketing, advertising & FTC/FDA claims

1. Given the affiliate side (Aura Protocols LLC) uses content like "best peptides for weight loss" and "vendor X vs vendor Y" comparisons, can the Editorial site link to Aura Clinical CTAs without creating a conflict of interest disclosure problem or an off-label promotion issue?
2. What efficacy, performance, or anti-aging claims can Aura Clinical make in its own marketing without triggering FTC or FDA action?
3. What disclaimers must appear on the Engine output (which is a biometric-driven *suggestion* engine, not a diagnosis) and on Clinical marketing pages?
4. Can the Engine output legally pre-populate intake forms used by the prescribing MD? Does that create a legal-practice-of-medicine question for the software?

### 3.8 Data, HIPAA, and the Engine/Clinical boundary

1. The Engine collects wearable fitness data (HRV, sleep, recovery, steps). It does **not** collect medical history or diagnoses. **Is this PHI or fitness data,** and does HIPAA apply to the Engine side, the Clinical side, or both?
2. When a user clicks "get this prescribed" and the Engine output is handed off to the Clinical intake, at what point does the data become PHI and trigger HIPAA?
3. Recommended technical and legal controls at that boundary (BAAs with which vendors, what to log vs not log, breach notification readiness)?
4. We will not use Meta Pixel or untreated GA on Clinical pages. Anything else we must positively exclude?

### 3.9 Affiliate site / Clinical brand separation

1. Same founder, same employees (just me), separate LLCs, separate brands, linked via "sister brand" CTAs. Is that enough legal separation to prevent a regulatory action against one from reaching the other?
2. Should there be an arms-length agreement between Aura Protocols LLC and Aura Clinical LLC governing the lead-handoff and any compensation between them?
3. Anti-kickback risk: if Aura Protocols LLC drives leads to Aura Clinical, and Clinical pays Aura Protocols a per-lead fee or revenue share, does that violate any federal or state anti-kickback / patient-brokering laws?

### 3.10 Insurance

1. What insurance coverage is non-negotiable at launch (entity malpractice, general liability, cyber/HIPAA breach, D&O)?
2. Recommended brokers or carriers for a single-state telehealth at this scale?
3. Approximate cost ranges for the policies above?

### 3.11 Multi-state expansion

1. What is the right legal pattern to expand from one launch state to multi-state — same LLC + new state foreign registrations, or new PC per state?
2. What are the high-cost / high-friction states I should defer indefinitely?

---

## 4. What I want to walk out of the consult with

A clear, written recommendation on:

1. **Entity structure** for the launch state (LLC, LLC+PC+MSO, or other), with estimated total formation cost.
2. **Go/no-go on the candidate launch states** (FL, TX, AZ — or attorney-recommended alternative).
3. **Realistic launch formulary** given current FDA/state pharmacy board enforcement.
4. **MD network model** (platform vs direct hire) given anti-kickback and fee-splitting rules.
5. **Affiliate-to-Clinical lead handoff structure** that does not trigger anti-kickback / patient-brokering exposure.
6. **List of next legal deliverables** (operating agreements, BAAs, patient consent forms, marketing disclaimers) and rough cost to produce them.
7. **Any deal-breaker** I should know now before spending another dollar.

---

## 5. Out of scope for this consult

- IP / trademark strategy (separate matter, lower priority).
- Employment law (no employees planned at launch).
- Tax structure (will engage a CPA separately).
- Detailed contract drafting (this consult is strategy + structure; drafting is a follow-on engagement).
