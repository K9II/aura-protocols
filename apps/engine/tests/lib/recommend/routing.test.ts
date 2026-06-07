import { describe, it, expect } from "vitest";
import { resolveRouting } from "@/lib/recommend/routing";
import type { ProfileContext } from "@/lib/profile/schema";
import type { RulesSummary } from "@/lib/recommend/schema";

function rules(overrides: Partial<RulesSummary> = {}): RulesSummary {
  return { template: "GH", triggers: [], contraindications: [], doseCeilings: {}, ...overrides };
}

function profile(overrides: Partial<ProfileContext> = {}): ProfileContext {
  return { using_peptides: false, interested_in_rx: false, onboarding_complete: true, ...overrides };
}

describe("resolveRouting", () => {
  it("returns clinical_only when contraindications are present", () => {
    expect(resolveRouting({ profile: null, rules: rules({ contraindications: ["bradycardia_resting_hr_below_40"] }) })).toBe("clinical_only");
  });
  it("clinical_only overrides interested_in_rx=true", () => {
    expect(resolveRouting({ profile: profile({ interested_in_rx: true }), rules: rules({ contraindications: ["anticoagulant_detected"] }) })).toBe("clinical_only");
  });
  it("returns clinical_primary when interested_in_rx=true and no contraindications", () => {
    expect(resolveRouting({ profile: profile({ interested_in_rx: true }), rules: rules() })).toBe("clinical_primary");
  });
  it("returns affiliate_primary when interested_in_rx=false and no contraindications", () => {
    expect(resolveRouting({ profile: profile({ interested_in_rx: false }), rules: rules() })).toBe("affiliate_primary");
  });
  it("returns affiliate_primary when profile is null and no contraindications", () => {
    expect(resolveRouting({ profile: null, rules: rules() })).toBe("affiliate_primary");
  });
});
