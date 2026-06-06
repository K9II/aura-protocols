import type { BiometricSnapshot } from "@/lib/terra/schema";

export interface SnapshotRow {
  user_id: string;
  source: string;
  captured_at: string;
  metric_date: string;
  recovery_score: number | null;
  hrv_ms: number | null;
  resting_hr_bpm: number | null;
  sleep_hours: number | null;
  deep_sleep_hours: number | null;
  rem_sleep_hours: number | null;
  steps: number | null;
  active_calories: number | null;
  glucose_avg_mgdl: number | null;
  glucose_variability: number | null;
  sleep_hrv_rmssd_ms: number | null;
  sleep_hrv_sdnn_ms: number | null;
  sleep_efficiency_pct: number | null;
  sleep_latency_min: number | null;
  awake_hours: number | null;
  respiration_bpm: number | null;
  spo2_pct: number | null;
  skin_temp_delta_c: number | null;
  body_temp_c: number | null;
  systolic_bp: number | null;
  diastolic_bp: number | null;
  vo2max: number | null;
  strain: number | null;
  stress_avg: number | null;
  workout_count: number | null;
  weight_kg: number | null;
  bodyfat_pct: number | null;
  hydration_ml: number | null;
  menstrual_phase: string | null;
  cycle_day: number | null;
  lh_miu_ml: number | null;
  fsh_miu_ml: number | null;
  e3g_ng_ml: number | null;
  pdg_ug_ml: number | null;
  calories_kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  raw: unknown;
}

type Snap = Partial<BiometricSnapshot> & { source: string; capturedAt: string; metricDate: string };

function n(v: number | null | undefined): number | null {
  return v ?? null;
}

export function toRow(userId: string, snap: Snap): SnapshotRow {
  return {
    user_id: userId,
    source: snap.source,
    captured_at: snap.capturedAt,
    metric_date: snap.metricDate,
    recovery_score: n(snap.recoveryScore),
    hrv_ms: n(snap.hrvMs),
    resting_hr_bpm: n(snap.restingHrBpm),
    sleep_hours: n(snap.sleepHours),
    deep_sleep_hours: n(snap.deepSleepHours),
    rem_sleep_hours: n(snap.remSleepHours),
    steps: n(snap.steps),
    active_calories: n(snap.activeCalories),
    glucose_avg_mgdl: n(snap.glucoseAvgMgdl),
    glucose_variability: n(snap.glucoseVariability),
    sleep_hrv_rmssd_ms: n(snap.sleepHrvRmssdMs),
    sleep_hrv_sdnn_ms: n(snap.sleepHrvSdnnMs),
    sleep_efficiency_pct: n(snap.sleepEfficiencyPct),
    sleep_latency_min: n(snap.sleepLatencyMin),
    awake_hours: n(snap.awakeHours),
    respiration_bpm: n(snap.respirationBpm),
    spo2_pct: n(snap.spo2Pct),
    skin_temp_delta_c: n(snap.skinTempDeltaC),
    body_temp_c: n(snap.bodyTempC),
    systolic_bp: n(snap.systolicBp),
    diastolic_bp: n(snap.diastolicBp),
    vo2max: n(snap.vo2max),
    strain: n(snap.strain),
    stress_avg: n(snap.stressAvg),
    workout_count: n(snap.workoutCount),
    weight_kg: n(snap.weightKg),
    bodyfat_pct: n(snap.bodyfatPct),
    hydration_ml: n(snap.hydrationMl),
    menstrual_phase: snap.menstrualPhase ?? null,
    cycle_day: n(snap.cycleDay),
    lh_miu_ml: n(snap.lhMiuMl),
    fsh_miu_ml: n(snap.fshMiuMl),
    e3g_ng_ml: n(snap.e3gNgMl),
    pdg_ug_ml: n(snap.pdgUgMl),
    calories_kcal: n(snap.caloriesKcal),
    protein_g: n(snap.proteinG),
    carbs_g: n(snap.carbsG),
    fat_g: n(snap.fatG),
    raw: snap.raw ?? null,
  };
}

// Data columns get coalesced (incoming wins only when non-null). Identity
// columns come from incoming; captured_at takes the later timestamp; raw
// prefers the incoming payload.
const IDENTITY = new Set(["user_id", "source", "captured_at", "metric_date", "raw"]);

export function coalesceRow(existing: SnapshotRow | null, incoming: SnapshotRow): SnapshotRow {
  if (!existing) return incoming;
  const merged = { ...existing } as SnapshotRow;
  for (const key of Object.keys(incoming) as (keyof SnapshotRow)[]) {
    if (IDENTITY.has(key as string)) continue;
    const inc = incoming[key];
    if (inc !== null && inc !== undefined) (merged[key] as unknown) = inc;
  }
  merged.user_id = incoming.user_id;
  merged.metric_date = incoming.metric_date;
  merged.source = incoming.source;
  merged.raw = incoming.raw ?? existing.raw;
  merged.captured_at =
    new Date(incoming.captured_at) > new Date(existing.captured_at)
      ? incoming.captured_at
      : existing.captured_at;
  return merged;
}
