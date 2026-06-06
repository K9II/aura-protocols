import type { BiometricSnapshot } from "@/lib/terra/schema";
import type { BiometricTrends, Tension, TensionSeverity } from "@/lib/recommend/schema";
import type { ProfileContext } from "@/lib/profile/schema";

function avg(values: Array<number | null | undefined>): number | null {
  const real = values.filter((v): v is number => typeof v === "number");
  if (real.length === 0) return null;
  return real.reduce((a, b) => a + b, 0) / real.length;
}

// overreaching is biometric-only: 1 driver = watch, 2 = elevated, 3+ = high.
function severityByCount(n: number): TensionSeverity {
  if (n >= 3) return "high";
  if (n === 2) return "elevated";
  return "watch";
}

function detectOverreaching(series: BiometricSnapshot[], trends: BiometricTrends): Tension | null {
  const drivers: string[] = [];
  const strain = avg(series.map((s) => s.strain));
  if (strain !== null && strain >= 14) drivers.push("strain_high");
  if (trends.hrv.direction === "down") drivers.push("hrv_down_7d");
  if (trends.recovery.current !== null && trends.recovery.current < 50) drivers.push("recovery_low");
  if (trends.rhr.direction === "up") drivers.push("rhr_up_7d");
  const rmssd = avg(series.map((s) => s.sleepHrvRmssdMs));
  if (rmssd !== null && rmssd < 30) drivers.push("sleep_hrv_low");

  if (drivers.length === 0) return null;
  return {
    id: "overreaching",
    severity: severityByCount(drivers.length),
    drivers,
    implication: "Recovery capacity is lagging training load; favor restoration over stimulus.",
  };
}

// Gated tensions: gate alone = watch, +1–2 biometric drivers = elevated, +3 = high.
function severityGated(bioDriverCount: number): TensionSeverity {
  if (bioDriverCount >= 3) return "high";
  if (bioDriverCount >= 1) return "elevated";
  return "watch";
}

function detectHormonalShift(
  series: BiometricSnapshot[],
  trends: BiometricTrends,
  profile: ProfileContext | null,
): Tension | null {
  if (profile?.menopause_status !== "peri" && profile?.menopause_status !== "post") return null;

  const bio: string[] = [];
  const fsh = avg(series.map((s) => s.fshMiuMl));
  if (fsh !== null && fsh > 25) bio.push("fsh_high");
  const e3g = avg(series.map((s) => s.e3gNgMl));
  if (e3g !== null && e3g < 5) bio.push("estrogen_low");
  const pdg = avg(series.map((s) => s.pdgUgMl));
  if (pdg !== null && pdg < 1) bio.push("progesterone_low");
  if (trends.sleep.direction === "down") bio.push("sleep_declining");
  const skin = avg(series.map((s) => s.skinTempDeltaC));
  if (skin !== null && skin > 0.3) bio.push("thermoregulation_shift");

  return {
    id: "hormonal_shift",
    severity: severityGated(bio.length),
    drivers: ["endocrine_transition_reported", ...bio],
    implication: "Endocrine baseline is shifting and affecting sleep/recovery; account for it in dosing.",
  };
}

export function detectTensions(
  series: BiometricSnapshot[],
  trends: BiometricTrends,
  profile: ProfileContext | null = null,
): Tension[] {
  const out: Tension[] = [];
  const o = detectOverreaching(series, trends);
  if (o) out.push(o);
  const h = detectHormonalShift(series, trends, profile);
  if (h) out.push(h);
  return out;
}
