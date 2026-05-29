import { describe, it, expect } from "vitest";
import { pickTemplate, applySafetyFloor, isMetabolicSignal } from "@/lib/recommend/rules";
import type { BiometricSnapshot } from "@/lib/terra/schema";
import type { ProfileContext } from "@/lib/profile/schema";

function snap(overrides: Partial<BiometricSnapshot> = {}): BiometricSnapshot {
  return { source: "WHOOP", capturedAt: "2026-05-23T07:00:00Z", recoveryScore: 70, hrvMs: 60, restingHrBpm: 55, sleepHours: 7.5, ...overrides };
}

function profile(overrides: Partial<ProfileContext> = {}): ProfileContext {
  return { using_peptides: false, interested_in_rx: false, onboarding_complete: true, ...overrides };
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
  it("picks METABOLIC when goal is body_comp (overrides all other signals)", () => {
    const series = Array.from({ length: 7 }, () => snap({ recoveryScore: 35 }));
    expect(pickTemplate(series, profile({ primary_goal: "body_comp" }))).toBe("METABOLIC");
  });
  it("picks METABOLIC when glucose avg is elevated", () => {
    const series = [snap({ glucoseAvgMgdl: 105 })];
    expect(pickTemplate(series)).toBe("METABOLIC");
  });
  it("picks METABOLIC when glucose variability is high", () => {
    const series = [snap({ glucoseVariability: 40 })];
    expect(pickTemplate(series)).toBe("METABOLIC");
  });
});

describe("isMetabolicSignal", () => {
  it("returns true when primary_goal is body_comp", () => {
    expect(isMetabolicSignal([snap()], profile({ primary_goal: "body_comp" }))).toBe(true);
  });
  it("returns true when glucose avg > 100", () => {
    expect(isMetabolicSignal([snap({ glucoseAvgMgdl: 110 })])).toBe(true);
  });
  it("returns true when glucose variability > 36", () => {
    expect(isMetabolicSignal([snap({ glucoseVariability: 38 })])).toBe(true);
  });
  it("returns false when all signals are normal", () => {
    expect(isMetabolicSignal([snap({ glucoseAvgMgdl: 85, glucoseVariability: 20 })], profile({ primary_goal: "recovery" }))).toBe(false);
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
  it("flags current_glp1_medication_detected for METABOLIC + ozempic", () => {
    const out = applySafetyFloor("METABOLIC", [snap()], profile({ current_medications: "Taking ozempic weekly" }));
    expect(out.contraindications).toContain("current_glp1_medication_detected");
  });
  it("flags current_glp1_medication_detected for METABOLIC + semaglutide", () => {
    const out = applySafetyFloor("METABOLIC", [snap()], profile({ current_medications: "semaglutide 0.5mg" }));
    expect(out.contraindications).toContain("current_glp1_medication_detected");
  });
  it("flags anticoagulant_detected for RECOVERY + warfarin", () => {
    const out = applySafetyFloor("RECOVERY", [snap()], profile({ current_medications: "warfarin 5mg daily" }));
    expect(out.contraindications).toContain("anticoagulant_detected");
  });
  it("does NOT flag glp1 contraindication for non-METABOLIC templates", () => {
    const out = applySafetyFloor("RECOVERY", [snap()], profile({ current_medications: "ozempic" }));
    expect(out.contraindications).not.toContain("current_glp1_medication_detected");
  });
});
