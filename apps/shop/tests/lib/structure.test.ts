import { describe, it, expect } from "vitest";
import { structurePanels, structureCaption, legendElements } from "@/lib/structure";

describe("structure helpers", () => {
  it("returns the panels for a product, in order", () => {
    expect(structurePanels("bpc-157-tb-500-ghk-cu-kpv").map((s) => s.id)).toEqual(["bpc-157", "tb-500", "ghk-cu", "kpv"]);
    expect(structurePanels("no-such-slug")).toEqual([]);
  });

  it("captions each source honestly", () => {
    expect(structureCaption("computed")).toBe("Computed model — one of many shapes this molecule can take.");
    expect(structureCaption("pubchem-3d")).toBe("Computed model — one of many shapes this molecule can take.");
    expect(structureCaption("crystal-modeled")).toBe("Modeled from the published crystal structure (1984).");
    expect(structureCaption("predicted")).toBe("Predicted structure (ESMFold) — one of many shapes this protein can take.");
  });

  it("legend lists the elements present, in a fixed order", () => {
    expect(legendElements(structurePanels("ghk-cu"))).toEqual(["C", "O", "N", "Cu"]);
  });
});
