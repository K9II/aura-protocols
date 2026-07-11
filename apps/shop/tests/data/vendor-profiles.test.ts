import { describe, it, expect } from "vitest";
import { products } from "@/data/products";
import { vendorProfiles } from "@/data/vendorProfiles";

describe("vendor profiles data contract", () => {
  it("has exactly one profile per vendor referenced in products.ts", () => {
    const productVendors = new Set(products.flatMap((p) => p.vendors.map((v) => v.vendor)));
    const profileVendors = new Set(vendorProfiles.map((v) => v.vendor));
    expect(profileVendors).toEqual(productVendors);
  });

  it("has no duplicate vendor entries", () => {
    const names = vendorProfiles.map((v) => v.vendor);
    expect(new Set(names).size).toBe(names.length);
  });

  it("scores are all in the 1-5 range", () => {
    for (const v of vendorProfiles) {
      for (const score of Object.values(v.scores)) {
        expect(score).toBeGreaterThanOrEqual(1);
        expect(score).toBeLessThanOrEqual(5);
      }
    }
  });

  it("does not mention price or commission anywhere in summary, pros, or cons", () => {
    const bannedPattern = /\$|commission|per order|per sale/i;
    for (const v of vendorProfiles) {
      expect(v.summary).not.toMatch(bannedPattern);
      for (const p of [...v.pros, ...v.cons]) {
        expect(p).not.toMatch(bannedPattern);
      }
    }
  });
});
