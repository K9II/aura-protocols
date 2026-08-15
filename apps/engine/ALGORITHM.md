# Aura Protocol Engine — How It Works

**Version:** June 2026  
**Audience:** Partners & Technical Reviewers

---

## Overview

The Aura Protocol Engine takes two inputs — a user's wearable biometric data and a short health profile — and produces a personalized peptide + nutrition protocol. The pipeline has four sequential layers: template selection, safety floor, tension detection, and LLM personalization. Each layer builds on the last; no layer can override the one below it.

```
Wearable Data (Terra)  ──┐
                          ├──▶  Rules Layer  ──▶  Tension Engine  ──▶  LLM (Claude)  ──▶  Protocol Output
User Intake Profile    ──┘
```

---

## 1. Data Inputs

### Wearable Telemetry (via Terra API)

The engine is designed around Terra's unified health data model. The following signals are ingested, normalized, and stored as daily rollup rows:

| Signal | Source Devices | How It's Used |
|---|---|---|
| HRV (avg 7–14d, RMSSD, SDNN) | WHOOP, Oura, Garmin | Primary recovery + stress indicator; drives RECOVERY and SLEEP_STRESS templates |
| Resting Heart Rate | WHOOP, Oura, Garmin, Fitbit | Safety flag (bradycardia / tachycardia contraindications) |
| Sleep (total, deep %, REM %, efficiency, latency) | Oura, Garmin, WHOOP | Drives SLEEP_STRESS and GH templates; quality metrics inform LLM rationale |
| Recovery Score | WHOOP | Direct RECOVERY template trigger below 50% |
| Strain / Active Calories | WHOOP, Garmin | Overreaching tension detection |
| Respiration Rate | WHOOP, Oura, Garmin | Contextual data for LLM rationale |
| SpO₂ | Oura, Garmin, Fitbit | Contextual |
| Skin Temp Delta | Oura | Hormonal shift tension signal |
| Steps | All devices | Activity baseline |
| Glucose Mean + Variability | Dexcom CGM | Primary METABOLIC template trigger |
| Weight / Body Fat % | Garmin, Fitbit | METABOLIC protocol personalization |
| Menstrual Phase / Cycle Day | Oura, Garmin | Hormonal shift tension; menopause context |
| Fertility Hormones (LH, FSH, E3G, PdG) | Compatible devices | Perimenopause / hormonal shift tension |
| Nutrition (calories, protein, carbs, fat) | Garmin, compatible apps | LLM nutrition stack personalization |

**Data grain:** one row per user per day. The engine looks back up to 14 days to compute averages and trends before generating a protocol. A protocol can be generated from a single day's snapshot; confidence labeling adjusts accordingly.

### User Intake Profile

Collected at onboarding in three steps:

1. **Identity:** age, biological sex, weight, activity level, primary goal
2. **Preferences:** Rx interest (prescription vs. research-grade), monthly budget, menopause status (female)
3. **Wearable connection:** device paired via Terra (or manual data entry if no device)

---

## 2. Template Selection

The first job of the rules layer is to classify the user into one of four protocol templates. Templates are mutually exclusive; the engine evaluates them in priority order:

| Priority | Template | Trigger Condition |
|---|---|---|
| 1 | **METABOLIC** | Fasting glucose avg > 100 mg/dL OR glucose variability > 36% OR primary goal = body composition |
| 2 | **RECOVERY** | 14-day average recovery score < 50% |
| 3 | **SLEEP_STRESS** | 14-day average sleep < 6 hours/night |
| 4 | **GH** | Default — no specific biometric threshold met; general performance / longevity |

Once a template is selected, all subsequent personalization stays within that template's compound set and dose ceilings.

---

## 3. Safety Floor

Before any protocol content is generated, the rules layer enforces non-negotiable safety checks. These cannot be overridden by the LLM layer.

### Contraindications

| Template | Condition | Action |
|---|---|---|
| METABOLIC | Current GLP-1 medication detected (structured intake OR free-text medication match) | Block METABOLIC template; route to clinical-only |
| RECOVERY | Anticoagulant medication detected (warfarin, eliquis, xarelto, etc.) | Add contraindication flag; route to clinical-only |
| Any | RHR < 40 bpm | Flag bradycardia; route to clinical |
| Any | RHR > 100 bpm | Flag tachycardia; route to clinical |

### Dose Ceilings

Hard upper limits are enforced per compound per template regardless of LLM output:

| Template | Compound | Ceiling |
|---|---|---|
| RECOVERY | BPC-157 | 500 mcg/day |
| RECOVERY | TB-500 | 5 mg/week |
| GH | CJC-1295 | 100 mcg/dose |
| GH | Ipamorelin | 300 mcg/dose |
| SLEEP_STRESS | DSIP | 0.3 mg/day |
| SLEEP_STRESS | Selank | 1.5 mg/day |
| METABOLIC | Semaglutide | 1.0 mg/week |
| METABOLIC | Retatrutide | 4.0 mg/week |
| METABOLIC | AOD-9604 | 500 mcg/day |

---

## 4. Tension Detection

Tensions are cross-signal biometric patterns that sit alongside the protocol and nuance the LLM's personalization. They don't change the template but do inform compound rationale, dosing conservatism, and lifestyle recommendations.

Three tension types are currently active:

### Overreaching
Detected when training load is outpacing recovery capacity.

**Drivers:** high strain average + recovery below 45% + HRV trending down over 7 days + rising resting HR  
**Implication:** favour restoration over stimulus; LLM deprioritizes performance compounds and foregrounds recovery-first language

### Metabolic Rebound
Detected in post-GLP-1 or post-intervention metabolic windows.

**Drivers:** GLP-1 recently stopped + weight rising trend + protein intake below threshold  
**Implication:** lean-mass preservation is the priority; LLM emphasises protein targets and metabolic stability compounds

### Hormonal Shift
Detected when endocrine baseline is changing.

**Drivers:** perimenopausal status reported + sleep efficiency declining + HRV suppressed + skin temp variability (where available)  
**Implication:** LLM accounts for endocrine context in compound rationale and lifestyle guidance; dosing is conservative

Tensions are displayed in the protocol terminal as a dedicated band, ranked by severity (high / elevated / watch).

---

## 5. LLM Personalization

Once the rules layer has established a safe template envelope and detected any tensions, Claude (Anthropic) personalizes the protocol within that envelope.

**What Claude receives:**
- The selected template and its compound set
- The user's actual 14-day biometric averages (not just the template trigger value)
- The full intake profile
- Any detected tensions
- Dose ceiling constraints

**What Claude produces:**
- **Compound rationale:** written against the user's specific biometric values (e.g. "Your 14-day HRV average of 22ms, down 11ms from the prior period…")
- **Resonance scores (0–1):** how strongly each compound is supported by the biometric signal pattern
- **Titration schedules:** where dose-ramping is clinically appropriate
- **Nutrition stack:** protein sources, vitamins/supplements, and whole-food recommendations tuned to the protocol goal
- **Lifestyle recommendations:** specific to the biometric pattern, not generic
- **Safety caveats:** template-appropriate warnings

**Hard constraint:** Claude operates within the compound set and dose ceilings defined by the rules layer. It cannot introduce new compounds or exceed dose ceilings. The rules layer always runs first; Claude personalizes within its output.

---

## 6. Vendor Routing

The final step determines how the protocol is fulfilled. Routing is determined by two signals from the intake profile and one from the rules layer:

| State | Routing Mode | Behavior |
|---|---|---|
| No contraindications + no Rx interest | `affiliate_primary` | Research-grade vendor links shown; Aura Clinical shown as "launching soon" |
| No contraindications + Rx interest = yes | `clinical_primary` | Aura Clinical shown first; research-grade vendors shown as secondary option |
| Contraindication detected | `clinical_only` | Research-grade vendor links suppressed; clinical-only route enforced |

In `affiliate_primary` mode, compounds are matched to vendor inventory and surfaced in a vendor rail below the protocol card with COA-verified supplier links.

---

## 7. Protocol Output Structure

Each generated protocol contains:

```
Protocol Output
├── Template (METABOLIC / RECOVERY / GH / SLEEP_STRESS)
├── Headline (one-line summary)
├── Steps (1–2 compounds)
│   ├── Compound name
│   ├── Dose + administration route
│   ├── Timing guidance
│   ├── Rationale (grounded in user's biometric values)
│   ├── Resonance score (0–1)
│   └── Titration schedule (where applicable)
├── Lifestyle recommendations (4–6 items)
├── Protocol cycle (duration + off-cycle guidance)
├── Safety caveats
├── Protein stack (2 items)
├── Vitamin / supplement stack (3–4 items)
└── Food recommendations (4–5 items)
```

All protocol outputs are stored against the user's account with a timestamp. When new wearable data arrives via Terra webhook, the dashboard flags that newer data exists and prompts regeneration. This creates a closed-loop system: biometrics change → protocol updates → user adjusts behaviour → biometrics change.

---

## 8. What Terra Enables

Without a connected wearable, the engine can generate a protocol from manual data entry — but it is limited to a single snapshot and cannot compute trends. Terra's API unlocks:

| Capability | Manual Entry | Terra-Connected |
|---|---|---|
| Single-day protocol | ✓ | ✓ |
| 14-day trend analysis | ✗ | ✓ |
| Automatic data refresh | ✗ | ✓ (webhook) |
| HRV trend detection | ✗ | ✓ |
| Sleep architecture breakdown | ✗ | ✓ |
| Overreaching tension detection | ✗ | ✓ |
| CGM glucose data (Dexcom) | ✗ | ✓ |
| Hormonal data (LH/FSH/E3G/PdG) | ✗ | ✓ |
| Protocol freshness / re-run prompts | ✗ | ✓ |

The Terra integration is the unlock that turns a one-time recommendation into a continuously adapting protocol engine.

---

*Aura Protocols LLC — Confidential*
