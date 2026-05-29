import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/recommend/llm", () => ({
  personalizeProtocol: vi.fn(async (input) => ({
    template: input.template,
    headline: "stub",
    steps: [{ compound: "X", dose: "y", timing: "z", rationale: "r" }],
    lifestyle: [],
    cycle: "c",
    caveats: ["c1"],
  })),
}));

import { recommend } from "@/lib/recommend";

describe("recommend", () => {
  it("returns rules summary + LLM output for a healthy series", async () => {
    const out = await recommend([
      { source: "WHOOP", capturedAt: "2026-05-23T07:00:00Z", recoveryScore: 70, hrvMs: 60, sleepHours: 7.5 },
    ]);
    expect(out.rules.template).toBe("GH");
    expect(out.output.template).toBe("GH");
  });

  it("forces RECOVERY when recovery score is chronically low", async () => {
    const series = Array.from({ length: 7 }, () => ({
      source: "WHOOP" as const,
      capturedAt: "2026-05-23T07:00:00Z",
      recoveryScore: 35,
      hrvMs: 28,
      sleepHours: 6,
    }));
    const out = await recommend(series);
    expect(out.rules.template).toBe("RECOVERY");
    expect(out.rules.triggers).toContain("recovery_chronically_low");
  });
});
