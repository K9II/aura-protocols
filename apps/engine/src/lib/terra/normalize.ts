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

const NORMALIZERS: Record<TerraModel, (raw: Raw) => Partial<BiometricSnapshot>> = {
  daily: normalizeDaily,
  sleep: () => ({}),        // implemented in Task 6
  body: () => ({}),         // implemented in Task 6
  activity: () => ({}),     // implemented in Task 7
  menstruation: () => ({}), // implemented in Task 7
  hormone: () => ({}),      // implemented in Task 8
  nutrition: () => ({}),    // implemented in Task 8
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
