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

  // Age + sex routing
  it("picks SLEEP_STRESS for female + peri menopause with no other signal", () => {
    expect(pickTemplate([snap()], profile({ biological_sex: "female", menopause_status: "peri" }))).toBe("SLEEP_STRESS");
  });
  it("picks SLEEP_STRESS for female + post menopause with no other signal", () => {
    expect(pickTemplate([snap()], profile({ biological_sex: "female", menopause_status: "post" }))).toBe("SLEEP_STRESS");
  });
  it("does NOT override RECOVERY with menopause routing when recovery is critically low", () => {
    const series = Array.from({ length: 7 }, () => snap({ recoveryScore: 35 }));
    expect(pickTemplate(series, profile({ biological_sex: "female", menopause_status: "peri" }))).toBe("RECOVERY");
  });
  it("does NOT override METABOLIC with menopause routing when glucose is elevated", () => {
    expect(pickTemplate([snap({ glucoseAvgMgdl: 105 })], profile({ biological_sex: "female", menopause_status: "post" }))).toBe("METABOLIC");
  });
  it("male + no signals defaults to GH regardless of age", () => {
    expect(pickTemplate([snap()], profile({ biological_sex: "male", age: 70 }))).toBe("GH");
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
  // ── Existing biometric contraindications ──────────────────────────────────
  it("flags bradycardia contraindication when resting HR is dangerously low", () => {
    expect(applySafetyFloor("GH", [snap({ restingHrBpm: 30 })]).contraindications).toContain("bradycardia_resting_hr_below_40");
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
  it("flags current_glp1_medication_detected for METABOLIC + structured glp1_status=current with no free text", () => {
    const out = applySafetyFloor("METABOLIC", [snap()], profile({ glp1_status: "current" }));
    expect(out.contraindications).toContain("current_glp1_medication_detected");
  });
  it("does NOT flag glp1 contraindication for structured glp1_status=current on non-METABOLIC", () => {
    const out = applySafetyFloor("RECOVERY", [snap()], profile({ glp1_status: "current" }));
    expect(out.contraindications).not.toContain("current_glp1_medication_detected");
  });
  it("does NOT double-list the glp1 contraindication when both structured and free text indicate current use", () => {
    const out = applySafetyFloor("METABOLIC", [snap()], profile({ glp1_status: "current", current_medications: "ozempic weekly" }));
    expect(out.contraindications.filter((c) => c === "current_glp1_medication_detected")).toHaveLength(1);
  });
  it("adds glp1_recently_stopped trigger when glp1_status=recently_stopped", () => {
    const out = applySafetyFloor("METABOLIC", [snap()], profile({ glp1_status: "recently_stopped" }));
    expect(out.triggers).toContain("glp1_recently_stopped");
  });
  it("does NOT add glp1_recently_stopped trigger for glp1_status=never", () => {
    const out = applySafetyFloor("METABOLIC", [snap()], profile({ glp1_status: "never" }));
    expect(out.triggers).not.toContain("glp1_recently_stopped");
  });
  it("adds menopause_peri trigger when menopause_status=peri", () => {
    const out = applySafetyFloor("GH", [snap()], profile({ menopause_status: "peri" }));
    expect(out.triggers).toContain("menopause_peri");
  });
  it("adds menopause_post trigger when menopause_status=post", () => {
    const out = applySafetyFloor("GH", [snap()], profile({ menopause_status: "post" }));
    expect(out.triggers).toContain("menopause_post");
  });
  it("does NOT add a menopause trigger for pre or not_applicable", () => {
    expect(applySafetyFloor("GH", [snap()], profile({ menopause_status: "pre" })).triggers.some((t) => t.startsWith("menopause_"))).toBe(false);
    expect(applySafetyFloor("GH", [snap()], profile({ menopause_status: "not_applicable" })).triggers.some((t) => t.startsWith("menopause_"))).toBe(false);
  });
  it("adds no Spec-1 triggers or contraindications when profile is null", () => {
    const out = applySafetyFloor("METABOLIC", [snap()], null);
    expect(out.contraindications).not.toContain("current_glp1_medication_detected");
    expect(out.triggers.some((t) => t === "glp1_recently_stopped" || t.startsWith("menopause_"))).toBe(false);
  });

  // ── Task 1: Weight-adjusted dose ceilings ─────────────────────────────────
  it("enforces BPC-157 dose ceiling for Recovery template (baseline)", () => {
    expect(applySafetyFloor("RECOVERY", [snap()]).doseCeilings["BPC-157_mcg_per_day"]).toBeLessThanOrEqual(500);
  });
  it("enforces CJC/Ipa dose ceiling for GH template (baseline)", () => {
    const out = applySafetyFloor("GH", [snap()]);
    expect(out.doseCeilings["CJC-1295_mcg_per_dose"]).toBeLessThanOrEqual(100);
    expect(out.doseCeilings["IPAMORELIN_mcg_per_dose"]).toBeLessThanOrEqual(300);
  });
  it("scales BPC-157 ceiling down proportionally for a 40 kg user", () => {
    const out = applySafetyFloor("RECOVERY", [snap()], profile({ weight_kg: 40 }));
    expect(out.doseCeilings["BPC-157_mcg_per_day"]).toBeCloseTo(250, 0);
  });
  it("scales TB-500 ceiling up proportionally for a 120 kg user", () => {
    const out = applySafetyFloor("RECOVERY", [snap()], profile({ weight_kg: 120 }));
    expect(out.doseCeilings["TB-500_mg_per_week"]).toBeCloseTo(7.5, 1);
  });
  it("scales AOD-9604 ceiling for a 40 kg user", () => {
    const out = applySafetyFloor("METABOLIC", [snap()], profile({ weight_kg: 40 }));
    expect(out.doseCeilings["AOD-9604_mcg_per_day"]).toBeCloseTo(250, 0);
  });
  it("does NOT scale semaglutide ceiling with weight (fixed titration)", () => {
    const out40 = applySafetyFloor("METABOLIC", [snap()], profile({ weight_kg: 40 }));
    const out160 = applySafetyFloor("METABOLIC", [snap()], profile({ weight_kg: 160 }));
    expect(out40.doseCeilings["SEMAGLUTIDE_mg_per_week"]).toBe(out160.doseCeilings["SEMAGLUTIDE_mg_per_week"]);
  });
  it("does NOT scale DSIP or SELANK ceilings with weight", () => {
    const out40 = applySafetyFloor("SLEEP_STRESS", [snap()], profile({ weight_kg: 40 }));
    const out160 = applySafetyFloor("SLEEP_STRESS", [snap()], profile({ weight_kg: 160 }));
    expect(out40.doseCeilings["DSIP_mg_per_day"]).toBe(out160.doseCeilings["DSIP_mg_per_day"]);
  });
  it("returns base ceilings unchanged when weight_kg is null", () => {
    const out = applySafetyFloor("RECOVERY", [snap()], profile({ weight_kg: null }));
    expect(out.doseCeilings["BPC-157_mcg_per_day"]).toBe(500);
    expect(out.doseCeilings["TB-500_mg_per_week"]).toBe(5);
  });

  // ── Task 2: Age + sex dose modifier ──────────────────────────────────────
  it("applies 0.75× ceiling for user aged 65+", () => {
    const out = applySafetyFloor("RECOVERY", [snap()], profile({ weight_kg: 80, age: 70 }));
    expect(out.doseCeilings["BPC-157_mcg_per_day"]).toBeCloseTo(375, 0);
  });
  it("applies 0.85× CJC ceiling for female user (sex-dosed compound)", () => {
    const out = applySafetyFloor("GH", [snap()], profile({ weight_kg: 80, biological_sex: "female" }));
    expect(out.doseCeilings["CJC-1295_mcg_per_dose"]).toBeCloseTo(85, 0);
  });
  it("applies stacked 0.75 × 0.85 modifier for female aged 65+", () => {
    const out = applySafetyFloor("GH", [snap()], profile({ weight_kg: 80, age: 70, biological_sex: "female" }));
    expect(out.doseCeilings["CJC-1295_mcg_per_dose"]).toBeCloseTo(63.8, 0);
  });
  it("does NOT apply sex modifier to BPC-157 (non-sex-dosed compound)", () => {
    const outM = applySafetyFloor("RECOVERY", [snap()], profile({ weight_kg: 80, biological_sex: "male" }));
    const outF = applySafetyFloor("RECOVERY", [snap()], profile({ weight_kg: 80, biological_sex: "female" }));
    expect(outM.doseCeilings["BPC-157_mcg_per_day"]).toBe(outF.doseCeilings["BPC-157_mcg_per_day"]);
  });
  it("no modifier applied when profile is null", () => {
    const out = applySafetyFloor("GH", [snap()], null);
    expect(out.doseCeilings["CJC-1295_mcg_per_dose"]).toBe(100);
    expect(out.doseCeilings["IPAMORELIN_mcg_per_dose"]).toBe(300);
  });
  it("flags minor_gh_secretagogue_contraindicated for GH template when age < 18", () => {
    const out = applySafetyFloor("GH", [snap()], profile({ age: 16 }));
    expect(out.contraindications).toContain("minor_gh_secretagogue_contraindicated");
  });
  it("does NOT flag minor contraindication for age 18", () => {
    const out = applySafetyFloor("GH", [snap()], profile({ age: 18 }));
    expect(out.contraindications).not.toContain("minor_gh_secretagogue_contraindicated");
  });
  it("does NOT flag minor contraindication on non-GH templates", () => {
    const out = applySafetyFloor("RECOVERY", [snap()], profile({ age: 16 }));
    expect(out.contraindications).not.toContain("minor_gh_secretagogue_contraindicated");
  });

  // ── Task 3: Expanded contraindication library ─────────────────────────────

  // Cancer
  it("flags cancer_history_detected on GH template when cancer keyword present", () => {
    const out = applySafetyFloor("GH", [snap()], profile({ current_medications: "on tamoxifen post breast cancer" }));
    expect(out.contraindications).toContain("cancer_history_detected");
  });
  it("flags cancer_history_detected on RECOVERY template", () => {
    const out = applySafetyFloor("RECOVERY", [snap()], profile({ current_medications: "chemotherapy" }));
    expect(out.contraindications).toContain("cancer_history_detected");
  });
  it("does NOT flag cancer_history_detected on METABOLIC or SLEEP_STRESS templates", () => {
    expect(applySafetyFloor("METABOLIC", [snap()], profile({ current_medications: "cancer" })).contraindications).not.toContain("cancer_history_detected");
    expect(applySafetyFloor("SLEEP_STRESS", [snap()], profile({ current_medications: "cancer" })).contraindications).not.toContain("cancer_history_detected");
  });

  // Hyperthyroid
  it("flags hyperthyroidism_medication_detected on GH template for methimazole", () => {
    const out = applySafetyFloor("GH", [snap()], profile({ current_medications: "methimazole 10mg daily" }));
    expect(out.contraindications).toContain("hyperthyroidism_medication_detected");
  });
  it("flags hyperthyroidism_medication_detected for PTU", () => {
    const out = applySafetyFloor("GH", [snap()], profile({ current_medications: "PTU 50mg" }));
    expect(out.contraindications).toContain("hyperthyroidism_medication_detected");
  });
  it("does NOT flag hyperthyroidism on non-GH templates", () => {
    const out = applySafetyFloor("RECOVERY", [snap()], profile({ current_medications: "methimazole" }));
    expect(out.contraindications).not.toContain("hyperthyroidism_medication_detected");
  });

  // Cardiac history
  it("flags cardiac_history_detected on GH template for heart failure mention", () => {
    const out = applySafetyFloor("GH", [snap()], profile({ current_medications: "carvedilol for heart failure" }));
    expect(out.contraindications).toContain("cardiac_history_detected");
  });
  it("flags cardiac_history_detected for stent keyword", () => {
    const out = applySafetyFloor("GH", [snap()], profile({ current_medications: "aspirin post stent placement" }));
    expect(out.contraindications).toContain("cardiac_history_detected");
  });
  it("does NOT flag cardiac_history on non-GH templates", () => {
    const out = applySafetyFloor("METABOLIC", [snap()], profile({ current_medications: "heart failure meds" }));
    expect(out.contraindications).not.toContain("cardiac_history_detected");
  });

  // Insulin
  it("flags insulin_dependent_diabetes_detected on METABOLIC for insulin keyword", () => {
    const out = applySafetyFloor("METABOLIC", [snap()], profile({ current_medications: "insulin glargine nightly" }));
    expect(out.contraindications).toContain("insulin_dependent_diabetes_detected");
  });
  it("flags insulin_dependent_diabetes_detected for Lantus brand name", () => {
    const out = applySafetyFloor("METABOLIC", [snap()], profile({ current_medications: "Lantus 20 units bedtime" }));
    expect(out.contraindications).toContain("insulin_dependent_diabetes_detected");
  });
  it("does NOT flag insulin contraindication on non-METABOLIC templates", () => {
    const out = applySafetyFloor("GH", [snap()], profile({ current_medications: "insulin" }));
    expect(out.contraindications).not.toContain("insulin_dependent_diabetes_detected");
  });

  // Kidney
  it("flags kidney_disease_detected on METABOLIC for dialysis keyword", () => {
    const out = applySafetyFloor("METABOLIC", [snap()], profile({ current_medications: "on dialysis three times weekly" }));
    expect(out.contraindications).toContain("kidney_disease_detected");
  });
  it("flags kidney_disease_detected for CKD keyword", () => {
    const out = applySafetyFloor("METABOLIC", [snap()], profile({ current_medications: "CKD stage 3" }));
    expect(out.contraindications).toContain("kidney_disease_detected");
  });
  it("does NOT flag kidney contraindication on non-METABOLIC templates", () => {
    const out = applySafetyFloor("RECOVERY", [snap()], profile({ current_medications: "dialysis" }));
    expect(out.contraindications).not.toContain("kidney_disease_detected");
  });

  // Hypothyroid trigger
  it("adds hypothyroid_medication_detected trigger on GH template for levothyroxine", () => {
    const out = applySafetyFloor("GH", [snap()], profile({ current_medications: "levothyroxine 50mcg" }));
    expect(out.triggers).toContain("hypothyroid_medication_detected");
  });
  it("adds hypothyroid_medication_detected trigger on SLEEP_STRESS for synthroid", () => {
    const out = applySafetyFloor("SLEEP_STRESS", [snap()], profile({ current_medications: "Synthroid 75mcg" }));
    expect(out.triggers).toContain("hypothyroid_medication_detected");
  });
  it("does NOT add hypothyroid trigger on METABOLIC template", () => {
    const out = applySafetyFloor("METABOLIC", [snap()], profile({ current_medications: "levothyroxine" }));
    expect(out.triggers).not.toContain("hypothyroid_medication_detected");
  });

  // HRT trigger
  it("adds hrt_detected trigger on any template for estradiol", () => {
    expect(applySafetyFloor("GH", [snap()], profile({ current_medications: "estradiol patch" })).triggers).toContain("hrt_detected");
    expect(applySafetyFloor("METABOLIC", [snap()], profile({ current_medications: "estradiol" })).triggers).toContain("hrt_detected");
    expect(applySafetyFloor("RECOVERY", [snap()], profile({ current_medications: "estradiol" })).triggers).toContain("hrt_detected");
  });
  it("adds hrt_detected trigger for androgel", () => {
    const out = applySafetyFloor("GH", [snap()], profile({ current_medications: "androgel 1.62%" }));
    expect(out.triggers).toContain("hrt_detected");
  });
  it("does NOT add hrt_detected when no HRT keywords present", () => {
    const out = applySafetyFloor("GH", [snap()], profile({ current_medications: "aspirin 81mg" }));
    expect(out.triggers).not.toContain("hrt_detected");
  });

  // Diabetes meds trigger
  it("adds diabetes_medication_detected trigger on METABOLIC for metformin", () => {
    const out = applySafetyFloor("METABOLIC", [snap()], profile({ current_medications: "metformin 1000mg twice daily" }));
    expect(out.triggers).toContain("diabetes_medication_detected");
  });
  it("adds diabetes_medication_detected trigger for Jardiance", () => {
    const out = applySafetyFloor("METABOLIC", [snap()], profile({ current_medications: "Jardiance 10mg" }));
    expect(out.triggers).toContain("diabetes_medication_detected");
  });
  it("does NOT add diabetes trigger on non-METABOLIC templates", () => {
    const out = applySafetyFloor("GH", [snap()], profile({ current_medications: "metformin" }));
    expect(out.triggers).not.toContain("diabetes_medication_detected");
  });
});
