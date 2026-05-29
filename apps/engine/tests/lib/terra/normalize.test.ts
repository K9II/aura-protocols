import { describe, it, expect } from "vitest";
import { normalizeTerraDaily } from "@/lib/terra/normalize";

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
