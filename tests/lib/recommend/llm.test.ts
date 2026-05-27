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
        steps: [{ compound: "BPC-157", dose: "250 mcg/day", timing: "AM", rationale: "soft tissue" }],
        lifestyle: ["Sleep 8h"], cycle: "4 on / 2 off", caveats: ["Stop on adverse signal"],
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
    expect(args.system[0].cache_control).toEqual({ type: "ephemeral" });
    expect(out.template).toBe("RECOVERY");
    expect(out.headline).toMatch(/recovery/i);
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
