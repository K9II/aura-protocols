import { describe, it, expect } from "vitest";
import { normalizeTerraDaily, normalizeTerraPayload, mapTerraType } from "@/lib/terra/normalize";
import { BiometricSnapshotSchema } from "@/lib/terra/schema";
import dailyFixture from "../../fixtures/terra/daily.json";
import sleepFixture from "../../fixtures/terra/sleep.json";
import bodyFixture from "../../fixtures/terra/body.json";
import activityFixture from "../../fixtures/terra/activity.json";
import menstruationFixture from "../../fixtures/terra/menstruation.json";
import hormoneFixture from "../../fixtures/terra/hormone.json";
import nutritionFixture from "../../fixtures/terra/nutrition.json";

describe("BiometricSnapshotSchema extensions", () => {
  it("validates a minimal weight-only snapshot with metricDate", () => {
    const parsed = BiometricSnapshotSchema.safeParse({
      source: "MANUAL",
      capturedAt: "2026-06-06T07:00:00Z",
      metricDate: "2026-06-06",
      weightKg: 81.2,
    });
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.weightKg).toBe(81.2);
  });

  it("accepts hormone + nutrition + menstrual fields", () => {
    const parsed = BiometricSnapshotSchema.safeParse({
      source: "OURA",
      capturedAt: "2026-06-06T07:00:00Z",
      metricDate: "2026-06-06",
      fshMiuMl: 42, lhMiuMl: 18, e3gNgMl: 30, pdgUgMl: 1.1,
      caloriesKcal: 2100, proteinG: 150, carbsG: 180, fatG: 70,
      menstrualPhase: "follicular", cycleDay: 12,
    });
    expect(parsed.success).toBe(true);
  });
});

describe("normalizeTerraDaily", () => {
  it("maps a Whoop daily payload to BiometricSnapshot", () => {
    const out = normalizeTerraDaily({
      provider: "WHOOP",
      metadata: { end_time: "2026-05-23T07:00:00Z" },
      scores: { recovery: 72 },
      heart_rate_data: {
        summary: { resting_hr_bpm: 54, avg_hrv_rmssd: 65 },
      },
      sleep_durations_data: {
        asleep: { duration_asleep_state_seconds: 27000 },
        sleep_stages: {
          deep_sleep_state_seconds: 4500,
          rem_sleep_state_seconds: 6000,
        },
      },
    });
    expect(out.source).toBe("WHOOP");
    expect(out.capturedAt).toBe("2026-05-23T07:00:00Z");
    expect(out.recoveryScore).toBe(72);
    expect(out.hrvMs).toBe(65);
    expect(out.restingHrBpm).toBe(54);
    expect(out.sleepHours).toBeCloseTo(7.5, 1);
    expect(out.deepSleepHours).toBeCloseTo(1.25, 2);
    expect(out.remSleepHours).toBeCloseTo(1.67, 2);
  });

  it("returns nulls for missing fields rather than throwing", () => {
    const out = normalizeTerraDaily({ provider: "OURA", metadata: { end_time: "2026-05-23T07:00:00Z" } });
    expect(out.source).toBe("OURA");
    expect(out.recoveryScore).toBeNull();
    expect(out.hrvMs).toBeNull();
  });
});

describe("normalizeTerraPayload — daily", () => {
  it("maps the daily model into daily-owned columns", () => {
    const out = normalizeTerraPayload("daily", dailyFixture, "WHOOP");
    expect(out.source).toBe("WHOOP");
    expect(out.metricDate).toBe("2026-06-06");
    expect(out.recoveryScore).toBe(71);
    expect(out.hrvMs).toBe(66);
    expect(out.restingHrBpm).toBe(53);
    expect(out.steps).toBe(8800);
    expect(out.stressAvg).toBe(28);
    expect(out.respirationBpm).toBeCloseTo(14.2, 1);
    expect(out.spo2Pct).toBe(97);
    expect(out.bodyTempC).toBe(36.6);
    expect(out.skinTempDeltaC).toBe(-0.2);
    expect(out.weightKg).toBeUndefined();
  });

  it("mapTerraType lowercases and falls back unknown types", () => {
    expect(mapTerraType("Sleep")).toBe("sleep");
    expect(mapTerraType("activity")).toBe("activity");
    expect(mapTerraType("garbage")).toBe("unknown");
  });

  it("unknown model returns only base identity fields, no throw", () => {
    const out = normalizeTerraPayload("unknown", { metadata: { end_time: "2026-06-06T07:00:00Z" } }, "OURA");
    expect(out.source).toBe("OURA");
    expect(out.metricDate).toBe("2026-06-06");
    expect(out.recoveryScore).toBeUndefined();
  });
});

describe("normalizeTerraPayload — sleep", () => {
  it("maps sleep-owned columns and nothing else", () => {
    const out = normalizeTerraPayload("sleep", sleepFixture, "OURA");
    expect(out.sleepHours).toBeCloseTo(7.5, 1);
    expect(out.deepSleepHours).toBeCloseTo(1.25, 2);
    expect(out.remSleepHours).toBeCloseTo(1.67, 2);
    expect(out.awakeHours).toBeCloseTo(0.5, 2);
    expect(out.sleepLatencyMin).toBeCloseTo(12, 1);
    expect(out.sleepEfficiencyPct).toBe(88);
    expect(out.sleepHrvRmssdMs).toBe(64);
    expect(out.sleepHrvSdnnMs).toBe(58);
    expect(out.weightKg).toBeUndefined();
    expect(out.recoveryScore).toBeUndefined();
  });
});

describe("normalizeTerraPayload — body", () => {
  it("maps body-owned columns and nothing else", () => {
    const out = normalizeTerraPayload("body", bodyFixture, "WITHINGS");
    expect(out.weightKg).toBe(81.4);
    expect(out.bodyfatPct).toBe(18.5);
    expect(out.glucoseAvgMgdl).toBe(96);
    expect(out.glucoseVariability).toBe(22);
    expect(out.systolicBp).toBe(118);
    expect(out.diastolicBp).toBe(76);
    expect(out.hydrationMl).toBe(2400);
    expect(out.vo2max).toBeCloseTo(47.2, 1);
    expect(out.sleepHours).toBeUndefined();
  });
});

describe("normalizeTerraPayload — activity", () => {
  it("maps activity-owned columns", () => {
    const out = normalizeTerraPayload("activity", activityFixture, "STRAVA");
    expect(out.strain).toBeCloseTo(14.6, 1);
    expect(out.workoutCount).toBe(1);
    expect(out.activeCalories).toBe(540);
    expect(out.steps).toBe(12400);
    expect(out.weightKg).toBeUndefined();
  });
});

describe("normalizeTerraPayload — menstruation", () => {
  it("maps menstrual phase + cycle day", () => {
    const out = normalizeTerraPayload("menstruation", menstruationFixture, "OURA");
    expect(out.menstrualPhase).toBe("follicular");
    expect(out.cycleDay).toBe(12);
    expect(out.sleepHours).toBeUndefined();
  });
});

describe("normalizeTerraPayload — hormone", () => {
  it("maps fertility/cycle hormones (menopause-wedge signals)", () => {
    const out = normalizeTerraPayload("hormone", hormoneFixture, "OURA");
    expect(out.lhMiuMl).toBeCloseTo(18.4, 1);
    expect(out.fshMiuMl).toBeCloseTo(42.1, 1);
    expect(out.e3gNgMl).toBeCloseTo(30.6, 1);
    expect(out.pdgUgMl).toBeCloseTo(1.2, 1);
  });
});

describe("normalizeTerraPayload — nutrition", () => {
  it("maps nutrition day-summary macros + water", () => {
    const out = normalizeTerraPayload("nutrition", nutritionFixture, "MANUAL");
    expect(out.caloriesKcal).toBe(2180);
    expect(out.proteinG).toBe(152);
    expect(out.carbsG).toBe(184);
    expect(out.fatG).toBe(71);
    expect(out.hydrationMl).toBe(2600);
  });
});
