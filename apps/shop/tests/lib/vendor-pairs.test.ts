import { describe, it, expect } from "vitest";
import { getVendorPairs } from "@/lib/vendorPairs";

describe("getVendorPairs", () => {
  it("returns 20 pairs (21 possible minus the 1 curated pair)", () => {
    expect(getVendorPairs().length).toBe(20);
  });

  it("excludes the curated Limitless vs Swiss Chems pair", () => {
    const pairs = getVendorPairs();
    const hasCurated = pairs.some(
      (p) =>
        (p.vendorA === "Limitless Life Nootropics" && p.vendorB === "Swiss Chems") ||
        (p.vendorA === "Swiss Chems" && p.vendorB === "Limitless Life Nootropics")
    );
    expect(hasCurated).toBe(false);
  });

  it("every pair has at least one shared product and a unique slug", () => {
    const pairs = getVendorPairs();
    const slugs = new Set<string>();
    for (const p of pairs) {
      expect(p.sharedProducts.length).toBeGreaterThan(0);
      expect(slugs.has(p.slug)).toBe(false);
      slugs.add(p.slug);
    }
  });

  it("slugs use the vendorId scheme in alphabetical id order", () => {
    const pairs = getVendorPairs();
    const apolloBehemoth = pairs.find(
      (p) =>
        (p.vendorA === "Apollo Peptide Sciences" && p.vendorB === "Behemoth Labz") ||
        (p.vendorA === "Behemoth Labz" && p.vendorB === "Apollo Peptide Sciences")
    );
    expect(apolloBehemoth?.slug).toBe("apollo-vs-behemoth");
  });
});
