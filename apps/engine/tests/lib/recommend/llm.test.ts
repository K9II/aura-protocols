import { describe, it, expect, vi } from "vitest";

const createMock = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: class FakeAnthropic {
    messages = { create: createMock };
  },
}));

import { personalizeProtocol } from "@/lib/recommend/llm";

describe("personalizeProtocol", () => {
  it("calls Anthropic with prompt-cached system block and returns validated output", async () => {
    createMock.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify({
        template: "RECOVERY", headline: "Personalized recovery stack",
        steps: [{ compound: "BPC-157", dose: "250 mcg/day", timing: "AM", rationale: "soft tissue", resonance: 0.82, resonanceReason: "recovery score 40 trending down 7d", titration: null }],
        lifestyle: ["Sleep 8h"], cycle: "4 on / 2 off", caveats: ["Stop on adverse signal"],
        protein: [], vitamins: [], foods: [],
      }) }],
    });

    const out = await personalizeProtocol({
      template: "RECOVERY",
      rules: { template: "RECOVERY", triggers: ["recovery_chronically_low"], contraindications: [], doseCeilings: { "BPC-157_mcg_per_day": 500 } },
      series: [{ source: "WHOOP", capturedAt: "2026-05-23T07:00:00Z", recoveryScore: 40, hrvMs: 35, sleepHours: 6 }],
    });

    expect(createMock).toHaveBeenCalledOnce();
    const args = createMock.mock.calls[0][0];
    expect(Array.isArray(args.system)).toBe(true);
    expect(args.system.length).toBe(2);
    expect(args.system[0].cache_control).toEqual({ type: "ephemeral" });
    expect(args.system[1].cache_control).toEqual({ type: "ephemeral" });
    expect(out.template).toBe("RECOVERY");
    expect(out.headline).toMatch(/recovery/i);
  });

  it("documents the Spec-1 profile signals and weight trend in the system prompt", async () => {
    createMock.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify({
        template: "METABOLIC", headline: "stack",
        steps: [{ compound: "AOD-9604", dose: "300 mcg/day", timing: "AM", rationale: "lipolysis", resonance: 0.6, resonanceReason: "body_comp goal", titration: null }],
        lifestyle: [], cycle: "ongoing", caveats: ["educational only"], protein: [], vitamins: [], foods: [],
      }) }],
    });

    await personalizeProtocol({
      template: "METABOLIC",
      rules: { template: "METABOLIC", triggers: ["glp1_recently_stopped"], contraindications: [], doseCeilings: {} },
      series: [{ source: "MANUAL", capturedAt: "2026-05-23T07:00:00Z" }],
      profile: { using_peptides: false, interested_in_rx: false, onboarding_complete: true, glp1_status: "recently_stopped", menopause_status: "post" },
    });

    const calls = createMock.mock.calls;
    const promptText = calls[calls.length - 1][0].system.map((b: { text: string }) => b.text).join("\n");
    expect(promptText).toContain("glp1_status");
    expect(promptText).toContain("recently_stopped");
    expect(promptText).toContain("menopause_status");
    expect(promptText).toMatch(/weight/i);
  });

  it("throws when the LLM returns malformed JSON", async () => {
    createMock.mockResolvedValue({ content: [{ type: "text", text: "not json" }] });
    await expect(personalizeProtocol({
      template: "GH",
      rules: { template: "GH", triggers: [], contraindications: [], doseCeilings: {} },
      series: [],
    })).rejects.toThrow(/parse|schema/i);
  });
});
