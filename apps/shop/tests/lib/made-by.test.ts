import { describe, it, expect } from "vitest";
import { madeBy } from "@/lib/catalog";
import { catalogContent } from "@/data/catalog";
import { findViolations } from "../../scripts/compliance-scan.mjs";

describe("madeBy (Compound data row)", () => {
  it("peptides: solid-phase synthesis, HPLC-purified", () => {
    expect(madeBy({ slug: "bpc-157" })).toBe("Solid-phase synthesis, HPLC-purified");
    expect(madeBy({ slug: "mots-c" })).toBe("Solid-phase synthesis, HPLC-purified");
  });

  it("non-peptides don't claim peptide synthesis or HPLC purification", () => {
    expect(madeBy({ slug: "nad-plus" })).toBe("Chemical synthesis");
    expect(madeBy({ slug: "slu-pp-332" })).toBe("Chemical synthesis");
    expect(madeBy({ slug: "igf-1-lr3" })).toBe("Recombinant expression, HPLC-purified");
    expect(madeBy({ slug: "ghk-cu" })).toBe("Solid-phase synthesis, then copper complexation, HPLC-purified");
  });

  it("no product's row trips the compliance scanner", () => {
    for (const c of catalogContent) expect(findViolations(madeBy(c)), c.slug).toEqual([]);
  });
});
