import type { BiometricSnapshot } from "@/lib/terra/schema";
import type { BiometricTrends, TrendDirection, TrendMetric } from "@/lib/recommend/schema";

function mean(values: Array<number | null | undefined>): number | null {
  const real = values.filter((v): v is number => typeof v === "number");
  if (real.length === 0) return null;
  return real.reduce((a, b) => a + b, 0) / real.length;
}

function round(n: number | null, digits: number): number | null {
  if (n === null) return null;
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

function directionFor(metric: string, delta: number | null): TrendDirection {
  if (delta === null) return "flat";
  const thresholds: Record<string, number> = {
    hrv: 3,
    rhr: 2,
    sleep: 0.3,
    recovery: 5,
    glucose: 5,
    weight: 0.3,
  };
  const t = thresholds[metric] ?? 0;
  if (Math.abs(delta) < t) return "flat";
  return delta > 0 ? "up" : "down";
}

function trendMetric(
  series: BiometricSnapshot[],
  pick: (s: BiometricSnapshot) => number | null | undefined,
  metric: string,
  digits = 1,
): TrendMetric {
  const sorted = [...series].sort(
    (a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime(),
  );
  const values = sorted.map(pick);

  const last7 = values.slice(-7);
  const prior7 = values.slice(-14, -7);
  const current = values.length > 0 ? (values[values.length - 1] ?? null) : null;
  const mean7d = mean(last7);
  const meanPrior = mean(prior7);

  const delta7d =
    mean7d !== null && meanPrior !== null
      ? mean7d - meanPrior
      : null;

  return {
    current: round(current, digits),
    mean7d: round(mean7d, digits),
    delta7d: round(delta7d, digits),
    direction: directionFor(metric, delta7d),
  };
}

export function computeTrends(series: BiometricSnapshot[]): BiometricTrends {
  const hasGlucose = series.some((s) => typeof s.glucoseAvgMgdl === "number");
  const hasWeight = series.some((s) => typeof s.weightKg === "number");
  return {
    hrv: trendMetric(series, (s) => s.hrvMs, "hrv"),
    rhr: trendMetric(series, (s) => s.restingHrBpm, "rhr"),
    sleep: trendMetric(series, (s) => s.sleepHours, "sleep"),
    recovery: trendMetric(series, (s) => s.recoveryScore, "recovery", 0),
    ...(hasGlucose ? { glucose: trendMetric(series, (s) => s.glucoseAvgMgdl, "glucose", 0) } : {}),
    ...(hasWeight ? { weight: trendMetric(series, (s) => s.weightKg, "weight") } : {}),
  };
}
