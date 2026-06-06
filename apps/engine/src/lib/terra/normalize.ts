import type { BiometricSnapshot } from "@/lib/terra/schema";

type Raw = Record<string, any>;

export type TerraModel =
  | "activity" | "athlete" | "body" | "daily"
  | "hormone" | "menstruation" | "nutrition" | "sleep";

const KNOWN_MODELS = new Set<TerraModel>([
  "activity", "athlete", "body", "daily", "hormone", "menstruation", "nutrition", "sleep",
]);

export function mapTerraType(type: string): TerraModel | "unknown" {
  const t = type.toLowerCase();
  return KNOWN_MODELS.has(t as TerraModel) ? (t as TerraModel) : "unknown";
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
function secondsToHours(seconds: unknown): number | null {
  const n = num(seconds);
  return n === null ? null : Math.round((n / 3600) * 100) / 100;
}
function secondsToMinutes(seconds: unknown): number | null {
  const n = num(seconds);
  return n === null ? null : Math.round((n / 60) * 10) / 10;
}

function capturedAtOf(raw: Raw): string {
  return raw.metadata?.end_time ?? raw.metadata?.start_time ?? raw.timestamp ?? new Date().toISOString();
}

// ---- per-model normalizers: each returns ONLY the columns it owns ----
function normalizeDaily(raw: Raw): Partial<BiometricSnapshot> {
  return {
    recoveryScore: num(raw.scores?.recovery ?? raw.recovery_score),
    hrvMs: num(raw.heart_rate_data?.summary?.avg_hrv_rmssd ?? raw.hrv_ms),
    restingHrBpm: num(raw.heart_rate_data?.summary?.resting_hr_bpm ?? raw.resting_hr_bpm),
    steps: num(raw.distance_data?.steps) as number | null,
    activeCalories: num(raw.active_durations_data?.activity_seconds),
    stressAvg: num(raw.stress_data?.avg_stress_level),
    respirationBpm: num(raw.respiration_data?.breaths_data?.avg_breaths_per_min),
    spo2Pct: num(raw.oxygen_data?.avg_saturation_percentage),
    bodyTempC: num(raw.temperature_data?.body_temperature_c),
    skinTempDeltaC: num(raw.temperature_data?.skin_temperature_delta_c),
  };
}

function normalizeSleep(raw: Raw): Partial<BiometricSnapshot> {
  const sd = raw.sleep_durations_data ?? {};
  return {
    sleepHours: secondsToHours(sd.asleep?.duration_asleep_state_seconds),
    deepSleepHours: secondsToHours(sd.sleep_stages?.deep_sleep_state_seconds),
    remSleepHours: secondsToHours(sd.sleep_stages?.rem_sleep_state_seconds),
    awakeHours: secondsToHours(sd.awake?.duration_awake_state_seconds),
    sleepLatencyMin: secondsToMinutes(sd.asleep?.duration_to_fall_asleep_seconds),
    sleepEfficiencyPct: num(sd.sleep_efficiency_pct),
    sleepHrvRmssdMs: num(raw.heart_rate_data?.summary?.avg_hrv_rmssd),
    sleepHrvSdnnMs: num(raw.heart_rate_data?.summary?.avg_hrv_sdnn),
  };
}

function normalizeBody(raw: Raw): Partial<BiometricSnapshot> {
  const measurements = raw.measurements_data?.measurements ?? [];
  const latest = measurements.length ? measurements[measurements.length - 1] : {};
  return {
    weightKg: num(latest.weight_kg),
    bodyfatPct: num(latest.bodyfat_percentage),
    glucoseAvgMgdl: num(raw.glucose_data?.day_avg_blood_glucose_mg_per_dL),
    glucoseVariability: num(raw.glucose_data?.glucose_variability),
    systolicBp: num(raw.blood_pressure_data?.day_avg?.systolic_bp),
    diastolicBp: num(raw.blood_pressure_data?.day_avg?.diastolic_bp),
    hydrationMl: num(raw.hydration_data?.day_total_water_consumption_ml),
    vo2max: num(raw.oxygen_data?.vo2max_ml_per_min_per_kg),
  };
}

function normalizeActivity(raw: Raw): Partial<BiometricSnapshot> {
  return {
    strain: num(raw.strain_data?.strain_level),
    workoutCount: (num(raw.workout_count) ?? 1) as number,
    activeCalories: num(raw.calories_data?.net_activity_calories),
    steps: num(raw.distance_data?.steps) as number | null,
  };
}

function normalizeMenstruation(raw: Raw): Partial<BiometricSnapshot> {
  const m = raw.menstruation_data ?? {};
  return {
    menstrualPhase: typeof m.current_phase === "string" ? m.current_phase : null,
    cycleDay: num(m.day_in_cycle) as number | null,
  };
}

function normalizeHormone(raw: Raw): Partial<BiometricSnapshot> {
  const h = raw.hormone_data ?? {};
  return {
    lhMiuMl: num(h.lh_mIU_per_ml),
    fshMiuMl: num(h.fsh_mIU_per_ml),
    e3gNgMl: num(h.e3g_ng_per_ml),
    pdgUgMl: num(h.pdg_ug_per_ml),
  };
}

function normalizeNutrition(raw: Raw): Partial<BiometricSnapshot> {
  const macros = raw.summary?.macros ?? {};
  return {
    caloriesKcal: num(macros.calories) as number | null,
    proteinG: num(macros.protein_g),
    carbsG: num(macros.carbohydrates_g),
    fatG: num(macros.fat_g),
    hydrationMl: num(raw.summary?.water_ml) as number | null,
  };
}

const NORMALIZERS: Record<TerraModel, (raw: Raw) => Partial<BiometricSnapshot>> = {
  daily: normalizeDaily,
  sleep: normalizeSleep,
  body: normalizeBody,
  activity: normalizeActivity,
  menstruation: normalizeMenstruation,
  hormone: normalizeHormone,
  nutrition: normalizeNutrition,
  athlete: () => ({}),      // static profile — no snapshot contribution
};

export function normalizeTerraPayload(
  model: TerraModel | "unknown",
  raw: Raw,
  provider: string,
): Partial<BiometricSnapshot> & { source: string; capturedAt: string; metricDate: string } {
  const source = provider.toUpperCase();
  const capturedAt = capturedAtOf(raw);
  const metricDate = capturedAt.slice(0, 10);
  const owned = model === "unknown" ? {} : NORMALIZERS[model](raw);
  return { source, capturedAt, metricDate, raw, ...owned };
}

// ---- legacy single-shape normalizer (kept; used by older callers/tests) ----
export function normalizeTerraDaily(raw: Raw): BiometricSnapshot {
  const provider = (raw.provider ?? raw.user?.provider ?? "UNKNOWN").toString().toUpperCase();
  const capturedAt =
    raw.metadata?.end_time ??
    raw.metadata?.start_time ??
    raw.timestamp ??
    new Date().toISOString();

  return {
    source: provider,
    capturedAt,
    recoveryScore: num(raw.scores?.recovery ?? raw.recovery_score),
    hrvMs: num(raw.heart_rate_data?.summary?.avg_hrv_rmssd ?? raw.hrv_ms),
    restingHrBpm: num(raw.heart_rate_data?.summary?.resting_hr_bpm ?? raw.resting_hr_bpm),
    sleepHours: secondsToHours(raw.sleep_durations_data?.asleep?.duration_asleep_state_seconds),
    deepSleepHours: secondsToHours(raw.sleep_durations_data?.sleep_stages?.deep_sleep_state_seconds),
    remSleepHours: secondsToHours(raw.sleep_durations_data?.sleep_stages?.rem_sleep_state_seconds),
    steps: num(raw.distance_data?.steps) as number | null,
    activeCalories: num(raw.active_durations_data?.activity_seconds),
    glucoseAvgMgdl: num(raw.glucose_data?.day_avg_blood_glucose_mg_per_dL),
    glucoseVariability: num(raw.glucose_data?.glucose_variability),
    raw,
  };
}

// shared helpers re-exported for sibling normalizer tasks
export const __helpers = { num, secondsToHours, secondsToMinutes };
