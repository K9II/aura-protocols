import { describe, it, expect } from "vitest";
import { resolveDashboardRoute } from "@/lib/recommend/dashboard-route";

describe("resolveDashboardRoute", () => {
  it("returns signin when there is no user", () => {
    expect(resolveDashboardRoute({ hasUser: false, onboardingComplete: false })).toBe("signin");
  });
  it("returns signin even if onboardingComplete is true but no user", () => {
    expect(resolveDashboardRoute({ hasUser: false, onboardingComplete: true })).toBe("signin");
  });
  it("returns onboarding when user exists but onboarding is incomplete", () => {
    expect(resolveDashboardRoute({ hasUser: true, onboardingComplete: false })).toBe("onboarding");
  });
  it("returns hub when user exists and onboarding is complete", () => {
    expect(resolveDashboardRoute({ hasUser: true, onboardingComplete: true })).toBe("hub");
  });
});
