import type { BiometricSnapshot } from "@/lib/terra/schema";
import type { ProtocolTemplateId } from "@/lib/constants";
import type { RulesSummary } from "@/lib/recommend/schema";
import type { ProfileContext } from "@/lib/profile/schema";

function avg(values: Array<number | null | undefined>): number | null {
  const real = values.filter((v): v is number => typeof v === "number");
  if (real.length === 0) return null;
  return real.reduce((a, b) => a + b, 0) / real.length;
}

// ─── Medication keyword lists ────────────────────────────────────────────────

const GLP1_KEYWORDS = ["ozempic", "wegovy", "semaglutide", "mounjaro", "tirzepatide", "rybelsus", "saxenda", "victoza"];
const ANTICOAGULANT_KEYWORDS = ["warfarin", "eliquis", "xarelto", "coumadin", "apixaban", "rivaroxaban", "heparin", "lovenox"];

const CANCER_KEYWORDS = [
  "chemotherapy", "chemo", "tamoxifen", "letrozole", "anastrozole", "exemestane",
  "trastuzumab", "bevacizumab", "immunotherapy", "cancer", "oncology", "tumor",
  "lymphoma", "leukemia", "melanoma", "radiation therapy",
];
const HYPERTHYROID_KEYWORDS = ["methimazole", "propylthiouracil", "ptu", "tapazole"];
const HYPOTHYROID_KEYWORDS = ["levothyroxine", "synthroid", "armour thyroid", "liothyronine", "cytomel", "np thyroid"];
const CARDIAC_HISTORY_KEYWORDS = [
  "heart failure", "chf", "cardiomyopathy", "heart attack", "myocardial infarction",
  "stent", "bypass", "cabg", "pacemaker", "defibrillator",
];
const INSULIN_KEYWORDS = [
  "insulin", "lantus", "levemir", "basaglar", "tresiba", "toujeo",
  "humalog", "novolog", "apidra", "fiasp",
];
const KIDNEY_KEYWORDS = [
  "dialysis", "kidney disease", "ckd", "chronic kidney", "renal failure",
  "nephropathy", "kidney transplant",
];
const HRT_KEYWORDS = [
  "estradiol", "estrogen", "progesterone", "testosterone gel", "androgel",
  "depo-testosterone", "premarin", "estrace", "hormone replacement",
];
const DIABETES_MED_KEYWORDS = [
  "metformin", "glucophage",
  "jardiance", "empagliflozin", "farxiga", "dapagliflozin", "invokana", "canagliflozin",
  "januvia", "sitagliptin", "tradjenta", "linagliptin", "onglyza", "saxagliptin",
  "glipizide", "glucotrol", "glyburide", "glibenclamide", "glimepiride", "amaryl",
  "acarbose", "precose", "pioglitazone", "actos", "rosiglitazone",
];

function detectMedications(medications: string | null | undefined, keywords: string[]): boolean {
  if (!medications) return false;
  const lower = medications.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

// ─── Weight-adjusted dose ceilings ──────────────────────────────────────────

const REFERENCE_WEIGHT_KG = 80;

// Compounds where body mass affects safe dose; excludes fixed-titration drugs
// (semaglutide, retatrutide) and very-low-dose peptides (DSIP, selank) whose
// clinical ranges are not weight-indexed.
const WEIGHT_DOSED_COMPOUNDS = new Set([
  "BPC-157_mcg_per_day",
  "TB-500_mg_per_week",
  "CJC-1295_mcg_per_dose",
  "IPAMORELIN_mcg_per_dose",
  "AOD-9604_mcg_per_day",
]);

function applyWeightAdjustment(
  ceilings: Record<string, number>,
  weightKg: number | null | undefined,
): Record<string, number> {
  if (!weightKg) return ceilings;
  const scale = weightKg / REFERENCE_WEIGHT_KG;
  return Object.fromEntries(
    Object.entries(ceilings).map(([key, val]) =>
      WEIGHT_DOSED_COMPOUNDS.has(key) ? [key, Math.round(val * scale * 10) / 10] : [key, val],
    ),
  );
}

// ─── Age + sex dose modifier ─────────────────────────────────────────────────

// Compounds where sex-based dosing is supported by research (GH secretagogues).
const SEX_DOSED_COMPOUNDS = new Set(["CJC-1295_mcg_per_dose", "IPAMORELIN_mcg_per_dose"]);

function applyDoseMod(
  ceilings: Record<string, number>,
  profile: ProfileContext | null | undefined,
): Record<string, number> {
  if (!profile) return ceilings;

  const ageMod = profile.age !== null && profile.age !== undefined && profile.age >= 65 ? 0.75 : 1.0;
  const sexMod = profile.biological_sex === "female" ? 0.85 : 1.0;

  return Object.fromEntries(
    Object.entries(ceilings).map(([key, val]) => {
      let mod = ageMod;
      if (SEX_DOSED_COMPOUNDS.has(key)) mod *= sexMod;
      return mod === 1.0 ? [key, val] : [key, Math.round(val * mod * 10) / 10];
    }),
  );
}

// ─── Base dose ceilings ───────────────────────────────────────────────────────

const DOSE_CEILINGS_BY_TEMPLATE: Record<ProtocolTemplateId, Record<string, number>> = {
  RECOVERY: { "BPC-157_mcg_per_day": 500, "TB-500_mg_per_week": 5 },
  GH: { "CJC-1295_mcg_per_dose": 100, "IPAMORELIN_mcg_per_dose": 300 },
  SLEEP_STRESS: { "DSIP_mg_per_day": 0.3, "SELANK_mg_per_day": 1.5 },
  METABOLIC: { "SEMAGLUTIDE_mg_per_week": 1.0, "RETATRUTIDE_mg_per_week": 4.0, "AOD-9604_mcg_per_day": 500 },
};

// ─── Template selection ──────────────────────────────────────────────────────

export function isMetabolicSignal(series: BiometricSnapshot[], profile: ProfileContext | null = null): boolean {
  if (profile?.primary_goal === "body_comp") return true;
  const glucoseAvg = avg(series.map((s) => s.glucoseAvgMgdl));
  if (glucoseAvg !== null && glucoseAvg > 100) return true;
  const glucoseVar = avg(series.map((s) => s.glucoseVariability));
  if (glucoseVar !== null && glucoseVar > 36) return true;
  return false;
}

export function pickTemplate(series: BiometricSnapshot[], profile: ProfileContext | null = null): ProtocolTemplateId {
  if (isMetabolicSignal(series, profile)) return "METABOLIC";

  const recovery = avg(series.map((s) => s.recoveryScore));
  const sleep = avg(series.map((s) => s.sleepHours));

  if (recovery !== null && recovery < 50) return "RECOVERY";
  if (sleep !== null && sleep < 6) return "SLEEP_STRESS";

  // Female + peri/post menopause with no stronger biometric signal → sleep/stress
  // stack addresses hormonal sleep disruption better than GH secretagogues.
  if (
    profile?.biological_sex === "female" &&
    (profile.menopause_status === "peri" || profile.menopause_status === "post")
  ) {
    return "SLEEP_STRESS";
  }

  return "GH";
}

// ─── Safety floor ─────────────────────────────────────────────────────────────

export function applySafetyFloor(
  template: ProtocolTemplateId,
  series: BiometricSnapshot[],
  profile: ProfileContext | null = null,
): RulesSummary {
  const triggers: string[] = [];
  const contraindications: string[] = [];

  const recovery = avg(series.map((s) => s.recoveryScore));
  const hrv = avg(series.map((s) => s.hrvMs));
  const rhr = avg(series.map((s) => s.restingHrBpm));
  const sleep = avg(series.map((s) => s.sleepHours));

  if (recovery !== null && recovery < 50) triggers.push("recovery_chronically_low");
  if (hrv !== null && hrv < 30) triggers.push("hrv_chronically_low");
  if (sleep !== null && sleep < 6) triggers.push("sleep_chronically_short");
  if (rhr !== null && rhr < 40) contraindications.push("bradycardia_resting_hr_below_40");
  if (rhr !== null && rhr > 100) contraindications.push("tachycardia_resting_hr_above_100");

  // Structured intake signals (positioning-neutral context for the LLM layer).
  if (profile?.glp1_status === "recently_stopped") triggers.push("glp1_recently_stopped");
  if (profile?.menopause_status === "peri") triggers.push("menopause_peri");
  if (profile?.menopause_status === "post") triggers.push("menopause_post");

  // GLP-1 contraindication: trust structured intake OR free-text match.
  // Single push prevents double-listing when both signals are present.
  if (
    template === "METABOLIC" &&
    (profile?.glp1_status === "current" || detectMedications(profile?.current_medications, GLP1_KEYWORDS))
  ) {
    contraindications.push("current_glp1_medication_detected");
  }

  if (template === "RECOVERY" && detectMedications(profile?.current_medications, ANTICOAGULANT_KEYWORDS)) {
    contraindications.push("anticoagulant_detected");
  }

  // ── Age-based contraindications ────────────────────────────────────────────
  const age = profile?.age ?? null;

  // GH secretagogues are absolutely contraindicated in minors (open growth plates).
  if (template === "GH" && age !== null && age < 18) {
    contraindications.push("minor_gh_secretagogue_contraindicated");
  }

  // ── Expanded contraindication library ─────────────────────────────────────
  const meds = profile?.current_medications;

  // Cancer/oncology: GH secretagogues and BPC-157 are pro-growth — absolute block.
  if ((template === "GH" || template === "RECOVERY") && detectMedications(meds, CANCER_KEYWORDS)) {
    contraindications.push("cancer_history_detected");
  }

  // Hyperthyroidism meds: GH secretagogues can exacerbate.
  if (template === "GH" && detectMedications(meds, HYPERTHYROID_KEYWORDS)) {
    contraindications.push("hyperthyroidism_medication_detected");
  }

  // Cardiac history: GH secretagogues increase water retention / cardiac load.
  if (template === "GH" && detectMedications(meds, CARDIAC_HISTORY_KEYWORDS)) {
    contraindications.push("cardiac_history_detected");
  }

  // Insulin-dependent diabetes + GLP-1 analog peptides require MD oversight.
  if (template === "METABOLIC" && detectMedications(meds, INSULIN_KEYWORDS)) {
    contraindications.push("insulin_dependent_diabetes_detected");
  }

  // Kidney disease: renal clearance affects METABOLIC peptide dosing significantly.
  if (template === "METABOLIC" && detectMedications(meds, KIDNEY_KEYWORDS)) {
    contraindications.push("kidney_disease_detected");
  }

  // ── Interaction triggers (context for LLM, not hard blocks) ───────────────

  // Hypothyroid meds interact with GH axis — flag for LLM personalization.
  if ((template === "GH" || template === "SLEEP_STRESS") && detectMedications(meds, HYPOTHYROID_KEYWORDS)) {
    triggers.push("hypothyroid_medication_detected");
  }

  // HRT: important drug-context signal across all templates.
  if (detectMedications(meds, HRT_KEYWORDS)) {
    triggers.push("hrt_detected");
  }

  // Non-insulin diabetes meds: drug-drug interaction context for METABOLIC.
  if (template === "METABOLIC" && detectMedications(meds, DIABETES_MED_KEYWORDS)) {
    triggers.push("diabetes_medication_detected");
  }

  // ── Build final dose ceilings ─────────────────────────────────────────────
  const baseCeilings = DOSE_CEILINGS_BY_TEMPLATE[template];
  const weightAdjusted = applyWeightAdjustment(baseCeilings, profile?.weight_kg);
  const doseCeilings = applyDoseMod(weightAdjusted, profile);

  return { template, triggers, contraindications, doseCeilings };
}
