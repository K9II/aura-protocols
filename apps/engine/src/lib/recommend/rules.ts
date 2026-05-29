import type { BiometricSnapshot } from "@/lib/terra/schema";
import type { ProtocolTemplateId } from "@/lib/constants";
import type { RulesSummary } from "@/lib/recommend/schema";
import type { ProfileContext } from "@/lib/profile/schema";

function avg(values: Array<number | null | undefined>): number | null {
  const real = values.filter((v): v is number => typeof v === "number");
  if (real.length === 0) return null;
  return real.reduce((a, b) => a + b, 0) / real.length;
}

const GLP1_KEYWORDS = ["ozempic", "wegovy", "semaglutide", "mounjaro", "tirzepatide", "rybelsus", "saxenda", "victoza"];
const ANTICOAGULANT_KEYWORDS = ["warfarin", "eliquis", "xarelto", "coumadin", "apixaban", "rivaroxaban", "heparin", "lovenox"];

function detectMedications(medications: string | null | undefined, keywords: string[]): boolean {
  if (!medications) return false;
  const lower = medications.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

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
  return "GH";
}

const DOSE_CEILINGS_BY_TEMPLATE: Record<ProtocolTemplateId, Record<string, number>> = {
  RECOVERY: { "BPC-157_mcg_per_day": 500, "TB-500_mg_per_week": 5 },
  GH: { "CJC-1295_mcg_per_dose": 100, "IPAMORELIN_mcg_per_dose": 300 },
  SLEEP_STRESS: { "DSIP_mg_per_day": 0.3, "SELANK_mg_per_day": 1.5 },
  METABOLIC: { "SEMAGLUTIDE_mg_per_week": 1.0, "RETATRUTIDE_mg_per_week": 4.0, "AOD-9604_mcg_per_day": 500 },
};

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

  if (template === "METABOLIC" && detectMedications(profile?.current_medications, GLP1_KEYWORDS)) {
    contraindications.push("current_glp1_medication_detected");
  }
  if (template === "RECOVERY" && detectMedications(profile?.current_medications, ANTICOAGULANT_KEYWORDS)) {
    contraindications.push("anticoagulant_detected");
  }

  return { template, triggers, contraindications, doseCeilings: DOSE_CEILINGS_BY_TEMPLATE[template] };
}
