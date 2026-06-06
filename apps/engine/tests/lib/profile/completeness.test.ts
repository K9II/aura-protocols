import { describe, it, expect } from "vitest";
import { computeCompletenessScore } from "@/lib/profile/completeness";
import { UserProfileSchema } from "@/lib/profile/schema";
import type { ProfileContext } from "@/lib/profile/schema";

const fullProfile: ProfileContext = {
  age: 34,
  biological_sex: "male",
  weight_kg: 80,
  activity_level: "active",
  primary_goal: "body_comp",
  current_medications: "none",
  using_peptides: false,
  interested_in_rx: false,
  budget_tier: "100_200",
  onboarding_complete: true,
};

describe("computeCompletenessScore", () => {
  it("returns 100 score and null nextPrompt for a fully populated profile", () => {
    const { score, nextPrompt } = computeCompletenessScore(fullProfile);
    expect(score).toBe(100);
    expect(nextPrompt).toBeNull();
  });

  it("returns 0 score and first prompt for null profile", () => {
    const { score, nextPrompt } = computeCompletenessScore(null);
    expect(score).toBe(0);
    expect(nextPrompt).toBeTruthy();
  });

  it("returns partial score and correct next prompt for partially filled profile", () => {
    const partial: ProfileContext = {
      age: 28,
      primary_goal: "recovery",
      using_peptides: false,
      interested_in_rx: false,
      onboarding_complete: false,
    };
    const { score, nextPrompt } = computeCompletenessScore(partial);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(100);
    expect(nextPrompt).toBeTruthy();
  });
});

describe("UserProfileSchema wedge fields", () => {
  it("accepts glp1 + menopause enums", () => {
    const parsed = UserProfileSchema.partial().safeParse({
      glp1_status: "recently_stopped",
      glp1_stopped_month: "2026-04",
      menopause_status: "peri",
    });
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.glp1_status).toBe("recently_stopped");
  });

  it("rejects an invalid glp1_status", () => {
    const parsed = UserProfileSchema.partial().safeParse({ glp1_status: "sometimes" });
    expect(parsed.success).toBe(false);
  });
});
