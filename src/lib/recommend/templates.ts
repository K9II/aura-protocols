import type { ProtocolTemplateId } from "@/lib/constants";

export interface TemplateSkeleton {
  headline: string;
  steps: Array<{ compound: string; dose: string; timing: string; rationale: string }>;
  lifestyle: string[];
  cycle: string;
  caveats: string[];
}

export const TEMPLATE_SKELETONS: Record<ProtocolTemplateId, TemplateSkeleton> = {
  METABOLIC: {
    headline: "Metabolic Stack — GLP-1 class + AOD-9604 for body composition support",
    steps: [
      { compound: "Semaglutide", dose: "0.25–1.0 mg/week subcutaneous (titrate slowly)", timing: "Once weekly, same day each week", rationale: "GLP-1 receptor agonist; supports satiety signaling and glycemic regulation" },
      { compound: "Retatrutide (optional, advanced)", dose: "2.0–4.0 mg/week subcutaneous", timing: "Once weekly; do not combine with Semaglutide", rationale: "Triple agonist (GLP-1/GIP/glucagon); research-phase compound requiring clinical supervision" },
      { compound: "AOD-9604", dose: "250–500 mcg/day subcutaneous", timing: "Fasted AM injection", rationale: "GH fragment targeting lipolysis; does not raise IGF-1 or fasting glucose" },
    ],
    lifestyle: ["Caloric deficit of 300–500 kcal/day recommended", "Protein floor: 1.8 g/kg bodyweight/day to preserve lean mass", "Resistance training ≥ 3x/week to offset muscle-sparing risk", "Monitor fasting glucose weekly during ramp"],
    cycle: "Semaglutide: continuous titration under clinical guidance. AOD-9604: 4 weeks on, 2 weeks off.",
    caveats: [
      "Semaglutide and Retatrutide are prescription-grade GLP-1 agonists. Educational use only — obtain via licensed clinician.",
      "Do NOT combine Semaglutide with Retatrutide or other GLP-1 medications.",
      "Contraindicated with personal or family history of medullary thyroid carcinoma or MEN2.",
      "Common side effects: nausea, vomiting, injection-site reactions. Titrate slowly.",
      "Consult a clinician before starting if you use insulin or other diabetes medications.",
    ],
  },
  RECOVERY: {
    headline: "Recovery Stack — BPC-157 ± TB-500 with sleep + load management",
    steps: [
      { compound: "BPC-157", dose: "250–500 mcg/day subcutaneous (split AM/PM)", timing: "30 min pre-workout or post-soft-tissue insult", rationale: "Supports gut + soft tissue repair signaling" },
      { compound: "TB-500 (optional, weeks 1–4)", dose: "2.5–5 mg/week subcutaneous, split into 2 doses", timing: "Loading phase only; taper at week 5", rationale: "Adds systemic recovery support for acute injuries" },
    ],
    lifestyle: ["Sleep target: 8h+ for 14 nights", "Cap zone-5 work at 2 sessions/week during the cycle", "Protein floor: 1.6 g/kg bodyweight/day"],
    cycle: "4 weeks on, 2 weeks off, re-assess on biometrics",
    caveats: ["Stop and consult a clinician if any GI bleeding, new chest pain, or unusual swelling appears.", "Do not combine with anticoagulants without clinician supervision."],
  },
  GH: {
    headline: "GH Stack — CJC-1295 (no-DAC) + Ipamorelin for sleep-phase GH pulse",
    steps: [
      { compound: "CJC-1295 (no-DAC)", dose: "100 mcg subcutaneous", timing: "Bedtime, on empty stomach", rationale: "Aligns GHRH pulse with natural slow-wave sleep window" },
      { compound: "Ipamorelin", dose: "200–300 mcg subcutaneous", timing: "Bedtime, paired with CJC dose", rationale: "Selective GHRP that does not raise cortisol or prolactin" },
    ],
    lifestyle: ["Last meal ≥ 2 hours before injection", "Keep alcohol < 2 drinks/week during the cycle", "Track AM fasted glucose weekly"],
    cycle: "5 days on, 2 days off, 8–12 weeks then re-assess",
    caveats: ["Watch for fasting glucose drift > 10 mg/dL above baseline.", "Pause and consult a clinician if persistent edema, joint pain, or numbness appears."],
  },
  SLEEP_STRESS: {
    headline: "Sleep & Stress — DSIP + Selank stacked with circadian fixes",
    steps: [
      { compound: "DSIP", dose: "100–300 mcg subcutaneous", timing: "30 min before bed, 3–4 nights/week", rationale: "Supports slow-wave sleep entry on high-stress days" },
      { compound: "Selank", dose: "250–500 mcg intranasal, 1–2x/day", timing: "Morning + early afternoon, not within 6 h of bed", rationale: "Anxiolytic without sedation; supports daytime composure" },
    ],
    lifestyle: ["Fixed wake time, 7 days/week", "10 minutes of outdoor light within 30 min of waking", "No caffeine after 12:00"],
    cycle: "4 weeks on, 2 weeks off",
    caveats: ["Do not combine with prescription sedatives without clinician supervision.", "If sleep latency does not improve in 14 days, reassess inputs before extending the cycle."],
  },
};
