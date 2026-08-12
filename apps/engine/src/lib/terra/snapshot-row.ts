import type { BiometricSnapshot } from "@/lib/terra/schema";

/**
 * Maps a domain BiometricSnapshot (camelCase) to a `biometric_snapshots` DB row
 * (snake_case), defaulting metric_date from capturedAt and nulling any absent
 * metric. Single camel→snake boundary — reused by the manual upload route and
 * the dev seed route so the column set never drifts between them.
 */
export function biometricSnapshotToRow(
  userId: string,
  snap: BiometricSnapshot,
): Record<string, unknown> {
  return {
    user_id: userId,
    source: snap.source,
    captured_at: snap.capturedAt,
    metric_date: snap.metricDate ?? snap.capturedAt.slice(0, 10),
    recovery_score: snap.recoveryScore ?? null,
    hrv_ms: snap.hrvMs ?? null,
    resting_hr_bpm: snap.restingHrBpm ?? null,
    sleep_hours: snap.sleepHours ?? null,
    deep_sleep_hours: snap.deepSleepHours ?? null,
    rem_sleep_hours: snap.remSleepHours ?? null,
    steps: snap.steps ?? null,
    active_calories: snap.activeCalories ?? null,
    glucose_avg_mgdl: snap.glucoseAvgMgdl ?? null,
    glucose_variability: snap.glucoseVariability ?? null,
    sleep_hrv_rmssd_ms: snap.sleepHrvRmssdMs ?? null,
    sleep_hrv_sdnn_ms: snap.sleepHrvSdnnMs ?? null,
    sleep_efficiency_pct: snap.sleepEfficiencyPct ?? null,
    sleep_latency_min: snap.sleepLatencyMin ?? null,
    awake_hours: snap.awakeHours ?? null,
    respiration_bpm: snap.respirationBpm ?? null,
    spo2_pct: snap.spo2Pct ?? null,
    skin_temp_delta_c: snap.skinTempDeltaC ?? null,
    body_temp_c: snap.bodyTempC ?? null,
    systolic_bp: snap.systolicBp ?? null,
    diastolic_bp: snap.diastolicBp ?? null,
    vo2max: snap.vo2max ?? null,
    strain: snap.strain ?? null,
    stress_avg: snap.stressAvg ?? null,
    workout_count: snap.workoutCount ?? null,
    weight_kg: snap.weightKg ?? null,
    bodyfat_pct: snap.bodyfatPct ?? null,
    hydration_ml: snap.hydrationMl ?? null,
    menstrual_phase: snap.menstrualPhase ?? null,
    cycle_day: snap.cycleDay ?? null,
    lh_miu_ml: snap.lhMiuMl ?? null,
    fsh_miu_ml: snap.fshMiuMl ?? null,
    e3g_ng_ml: snap.e3gNgMl ?? null,
    pdg_ug_ml: snap.pdgUgMl ?? null,
    calories_kcal: snap.caloriesKcal ?? null,
    protein_g: snap.proteinG ?? null,
    carbs_g: snap.carbsG ?? null,
    fat_g: snap.fatG ?? null,
    raw: snap.raw ?? null,
  };
}
