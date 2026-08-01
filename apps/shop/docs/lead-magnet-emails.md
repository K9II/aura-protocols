# Lead Magnet — Goal-Personalized Starting Protocol Emails

Reference copy for the 4 Brevo automation workflows behind the `/cheat-sheet` email
opt-in (see `EmailCapture.tsx`, `src/lib/constants.ts`). Each automation triggers on
form submission where the `GOAL` contact attribute equals one of the 4 values below,
and sends that goal's email.

This file is the source of truth for what's pasted into Brevo's email template
editor — Brevo doesn't store this content in our repo, so keep this in sync
whenever the copy changes there.

**GOAL attribute values (must match exactly, case-sensitive):**
- Maintaining Muscle During GLP-1
- Weight Loss
- Muscle & Performance
- Sleep & Recovery

**Conventions used below:**
- Doses/frequencies/routes are pulled from `src/data/cheatSheet.ts` — keep both in sync.
- Every compound links to its own `/products/<slug>` page (not a specific vendor's
  affiliate link) so the email doesn't play favorites among vendors — visitors
  compare vendors on the product page itself.
- Every email ends with the same Engine bridge CTA per the personalization plan
  (see memory `leadmagnet_personalization_plan`) — the wearable connection is the
  "real" personalization, the email is the instant-gratification piece.
- Compliance framing on every email: research-use-only status, explicit "not medical
  advice," and an explicit instruction to consult a physician before starting anything
  — no commission rates ever mentioned (see memory `feedback_no_commission_disclosure`).

---

## 1. Maintaining Muscle During GLP-1

**Subject:** The 2-compound stack for keeping muscle on GLP-1

Hey — you told us your #1 goal is maintaining muscle while on a GLP-1. Here's a research-backed starting point.

GLP-1s (Semaglutide, Tirzepatide, Retatrutide) don't distinguish between fat and lean tissue — a real share of the weight lost on these drugs is muscle. The two compounds below are studied for counteracting that specific effect, on top of whatever GLP-1 you're already taking:

- **CJC-1295 / Ipamorelin** — 1–2 mg/week (CJC-1295) + 100–300 mcg/dose 2–3×/day fasted (Ipamorelin), both SubQ. A GHRH analog + GH secretagogue pair studied for GH pulse amplification — the mechanism behind preserving lean mass during a caloric deficit.
- **IGF-1 LR3** — 20–50 mcg/day, SubQ/IM, post-training. Long-acting IGF-1 analog studied for muscle protein synthesis — the downstream signal GH pulses are trying to trigger.

→ [See CJC-1295/Ipamorelin sourcing](https://shop.auraprotocols.com/products/cjc-1295-ipamorelin) · [See IGF-1 LR3 sourcing](https://shop.auraprotocols.com/products/igf-1-lr3)

**Make it personal:** connect your Whoop, Oura, or Apple Health and the Aura Engine tunes timing and dosing to your actual recovery and sleep data — not a generic protocol.

*These compounds are for research use only and have not been evaluated by the FDA for the uses described above. Nothing here is medical advice — consult a physician before starting any new compound, especially alongside a prescription medication.*

---

## 2. Weight Loss

**Subject:** Your weight-loss starting protocol — 3 compounds, real doses

Here's the research-backed starting point for your #1 goal: weight loss.

- **Semaglutide** — 0.25 mg → 2.4 mg, weekly, SubQ. GLP-1 receptor agonist studied for appetite regulation and blood-sugar control (FDA-approved compound, studied in the STEP trials).
- **Retatrutide** — 1 mg → up to 12 mg, weekly, SubQ. Triple GLP-1/GIP/glucagon agonist — Phase 3 data recorded up to 24.2% body-weight reduction, the highest of any compound in its class.
- **AOD-9604** — 250–300 mcg/day, SubQ, fasted AM. hGH fragment studied specifically for fat metabolism, without the blood-sugar or IGF-1 effects of full-length GH peptides.

→ [See Semaglutide sourcing](https://shop.auraprotocols.com/products/semaglutide) · [See Retatrutide sourcing](https://shop.auraprotocols.com/products/retatrutide) · [See AOD-9604 sourcing](https://shop.auraprotocols.com/products/aod-9604)

**Make it personal:** connect a wearable and the Aura Engine tunes this to your actual recovery and metabolic data.

*These compounds are for research use only and have not been evaluated by the FDA for the uses described above. Nothing here is medical advice — consult a physician before starting any new compound, especially alongside a prescription medication.*

---

## 3. Muscle & Performance

**Subject:** Your muscle & performance starting protocol

Here's the research-backed starting point for your #1 goal: muscle and performance.

- **CJC-1295 / Ipamorelin** — 1–2 mg/week + 100–300 mcg/dose 2–3×/day fasted, SubQ. The most-studied GH-axis pairing for lean-mass and recovery research.
- **Tesamorelin** — 1–2 mg/day, SubQ. GHRH analog (FDA-approved as Egrifta) studied for visceral-fat reduction and body composition alongside GH stimulation.
- **IGF-1 LR3** — 20–50 mcg/day, SubQ/IM, post-training. Extended-half-life IGF-1 analog studied for muscle protein synthesis.

→ [See CJC-1295/Ipamorelin sourcing](https://shop.auraprotocols.com/products/cjc-1295-ipamorelin) · [See Tesamorelin sourcing](https://shop.auraprotocols.com/products/tesamorelin) · [See IGF-1 LR3 sourcing](https://shop.auraprotocols.com/products/igf-1-lr3)

**Make it personal:** connect your Whoop, Oura, or Apple Health and the Aura Engine tunes dosing and timing to your training load and recovery data.

*These compounds are for research use only and have not been evaluated by the FDA for the uses described above. Nothing here is medical advice — consult a physician before starting any new compound, especially alongside a prescription medication.*

---

## 4. Sleep & Recovery

**Subject:** Your sleep & recovery starting protocol

Here's the research-backed starting point for your #1 goal: sleep and recovery.

- **DSIP (Delta Sleep-Inducing Peptide)** — 100–300 mcg/dose, SubQ, nightly before bed. Studied since the 1970s for slow-wave sleep promotion — the most sleep-specific compound in this protocol.
- **BPC-157** — 250–500 mcg/day, SubQ/oral. One of the most-studied peptides for tissue repair and recovery between training sessions.
- **Epithalon** — 5–10 mg/day, SubQ/IV, in 10–20 day cycles (1–2×/year). Studied for pineal gland regulation and melatonin output.

→ [See DSIP sourcing](https://shop.auraprotocols.com/products/dsip) · [See BPC-157 sourcing](https://shop.auraprotocols.com/products/bpc-157) · [See Epithalon sourcing](https://shop.auraprotocols.com/products/epithalon)

**Make it personal:** connect your Whoop, Oura, or Apple Health and the Aura Engine tunes this to your actual sleep and recovery data.

*These compounds are for research use only and have not been evaluated by the FDA for the uses described above. Nothing here is medical advice — consult a physician before starting any new compound, especially alongside a prescription medication.*

---

## Status

- [ ] Automation 1 (Maintaining Muscle During GLP-1) built in Brevo
- [ ] Automation 2 (Weight Loss) built in Brevo
- [ ] Automation 3 (Muscle & Performance) built in Brevo
- [ ] Automation 4 (Sleep & Recovery) built in Brevo

Drafted 2026-08-01. Update this checklist as each automation goes live.
