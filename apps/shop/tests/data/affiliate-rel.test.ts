import { describe, it, expect } from "vitest";
import { products } from "@/data/products";
import { comparisons } from "@/data/comparisons";

const VENDOR_HOSTS = [
  "corepeptides.com",
  "limitlesslifenootropics.com",
  "swisschems.is",
  "behemothlabz.com",
  "glp1researchlab.com",
  "ignitepeptides.com",
  "apollopeptidesciences.com",
];

function isVendorUrl(u: string | undefined) {
  if (!u) return false;
  try {
    const host = new URL(u).host;
    return VENDOR_HOSTS.some((h) => host === h || host.endsWith("." + h));
  } catch {
    return false;
  }
}

describe("affiliate data contract", () => {
  it("every product has at least one vendor with a URL", () => {
    for (const p of products) {
      expect(p.vendors.length).toBeGreaterThan(0);
      expect(typeof p.vendors[0].url).toBe("string");
      expect(p.vendors[0].url.length).toBeGreaterThan(0);
    }
  });

  it("every comparison vendor URL is a known affiliate host", () => {
    for (const c of comparisons) {
      expect(isVendorUrl(c.vendorAUrl)).toBe(true);
      expect(isVendorUrl(c.vendorBUrl)).toBe(true);
    }
  });
});
