import type { BiometricSnapshot } from "@/lib/terra/schema";

type Raw = Record<string, any>;

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function secondsToHours(seconds: unknown): number | null {
  const n = num(seconds);
  return n === null ? null : Math.round((n / 3600) * 100) / 100;
}

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
