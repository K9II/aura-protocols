import { describe, it, expect } from "vitest";
import { pickTemplate, applySafetyFloor } from "@/lib/recommend/rules";
import type { BiometricSnapshot } from "@/lib/terra/schema";

function snap(overrides: Partial<BiometricSnapshot> = {}): BiometricSnapshot {
  return { source: "WHOOP", capturedAt: "2026-05-23T07:00:00Z", recoveryScore: 70, hrvMs: 60, restingHrBpm: 55, sleepHours: 7.5, ...overrides };
}

describe("pickTemplate", () => {
  it("picks RECOVERY when recovery score is chronically low", () => {
    expect(pickTemplate(Array.from({ length: 7 }, () => snap({ recoveryScore: 35 })))).toBe("RECOVERY");
  });
  it("picks SLEEP_STRESS when sleep is chronically short", () => {
    expect(pickTemplate(Array.from({ length: 7 }, () => snap({ recoveryScore: 70, sleepHours: 5 })))).toBe("SLEEP_STRESS");
  });
  it("defaults to GH when nothing is alarming", () => {
    expect(pickTemplate(Array.from({ length: 7 }, () => snap()))).toBe("GH");
  });
});

describe("applySafetyFloor", () => {
  it("flags bradycardia contraindication when resting HR is dangerously low", () => {
    expect(applySafetyFloor("GH", [snap({ restingHrBpm: 30 })]).contraindications).toContain("bradycardia_resting_hr_below_40");
  });
  it("enforces BPC-157 dose ceiling for Recovery template", () => {
    expect(applySafetyFloor("RECOVERY", [snap()]).doseCeilings["BPC-157_mcg_per_day"]).toBeLessThanOrEqual(500);
  });
  it("enforces CJC/Ipa dose ceiling for GH template", () => {
    const out = applySafetyFloor("GH", [snap()]);
    expect(out.doseCeilings["CJC-1295_mcg_per_dose"]).toBeLessThanOrEqual(100);
    expect(out.doseCeilings["IPAMORELIN_mcg_per_dose"]).toBeLessThanOrEqual(300);
  });
});
