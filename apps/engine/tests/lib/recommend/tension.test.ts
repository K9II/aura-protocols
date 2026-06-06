import { describe, it, expect } from "vitest";
import { TensionSchema } from "@/lib/recommend/schema";

describe("TensionSchema", () => {
  it("accepts a valid tension", () => {
    const parsed = TensionSchema.safeParse({
      id: "overreaching",
      severity: "high",
      drivers: ["strain_high", "recovery_low"],
      implication: "Recovery capacity is lagging training load.",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects an unknown id", () => {
    const parsed = TensionSchema.safeParse({
      id: "perimenopause",
      severity: "watch",
      drivers: [],
      implication: "x",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects an unknown severity", () => {
    const parsed = TensionSchema.safeParse({
      id: "overreaching",
      severity: "critical",
      drivers: [],
      implication: "x",
    });
    expect(parsed.success).toBe(false);
  });
});
