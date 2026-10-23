import { describe, it, expect } from "vitest";
import { SAMPLE_PANEL, SAMPLE_PANEL_COUNT } from "@/lib/coa/sample-panel";
import { PURITY_FLOOR_PCT } from "@/lib/constants";

describe("the ten-point sample panel", () => {
  it("has three groups and ten tests, purity at the store's floor", () => {
    expect(SAMPLE_PANEL.map(([g]) => g)).toEqual(["Identity & content", "Safety", "Vial"]);
    expect(SAMPLE_PANEL_COUNT).toBe(10);
    expect(SAMPLE_PANEL[0][1].find(([t]) => t === "Purity")?.[1]).toBe(`≥${PURITY_FLOOR_PCT}%`);
  });
});
