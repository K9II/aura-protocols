import { describe, it, expect } from "vitest";
import { profileToIntakeState, emptyIntakeState } from "@/lib/profile/intake-state";
import type { ProfileContext } from "@/lib/profile/schema";

describe("emptyIntakeState", () => {
  it("returns blank strings and false flags", () => {
    const s = emptyIntakeState();
    expect(s.step1).toEqual({ age: "", biological_sex: "", weight: "", weight_unit: "lbs", activity_level: "" });
    expect(s.step2.using_peptides).toBe(false);
    expect(s.step3).toEqual({ interested_in_rx: false, budget_tier: "" });
  });
});

describe("profileToIntakeState", () => {
  it("returns empty state when profile is null", () => {
    expect(profileToIntakeState(null)).toEqual(emptyIntakeState());
  });

  it("maps a populated profile into step state, weight in kg", () => {
    const profile: ProfileContext = {
      age: 34,
      biological_sex: "female",
      weight_kg: 80,
      activity_level: "active",
      primary_goal: "body_comp",
      current_medications: "none",
      using_peptides: true,
      peptides_detail: "BPC-157",
      interested_in_rx: true,
      budget_tier: "100_200",
      glp1_status: "recently_stopped",
      glp1_stopped_month: "2026-03",
      menopause_status: "peri",
      onboarding_complete: true,
    };
    const s = profileToIntakeState(profile);
    expect(s.step1).toEqual({ age: "34", biological_sex: "female", weight: "80", weight_unit: "kg", activity_level: "active" });
    expect(s.step2).toEqual({
      primary_goal: "body_comp",
      current_medications: "none",
      using_peptides: true,
      peptides_detail: "BPC-157",
      glp1_status: "recently_stopped",
      glp1_stopped_month: "2026-03",
      menopause_status: "peri",
    });
    expect(s.step3).toEqual({ interested_in_rx: true, budget_tier: "100_200" });
  });

  it("coerces null fields to empty strings", () => {
    const profile = { onboarding_complete: false, using_peptides: false, interested_in_rx: false } as ProfileContext;
    const s = profileToIntakeState(profile);
    expect(s.step1.age).toBe("");
    expect(s.step2.primary_goal).toBe("");
    expect(s.step3.budget_tier).toBe("");
  });
});
