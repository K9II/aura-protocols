import { describe, it, expect } from "vitest";
import { products } from "@/data/products";
import { comparisons } from "@/data/comparisons";

const VENDOR_HOSTS = [
  "corepeptides.com",
  "limitlesslifenootropics.com",
  "swisschems.is",
  "behemothlabz.com",
  "blueskypeptide.com",
  "peptidesciences.com",
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
  it("every product has affiliate metadata pointing at a known vendor", () => {
    for (const p of products) {
      expect(p.affiliate).toBeTruthy();
      expect(typeof p.affiliate.url).toBe("string");
      expect(isVendorUrl(p.affiliate.url)).toBe(true);
    }
  });

  it("every comparison vendor URL is a known affiliate host", () => {
    for (const c of comparisons) {
      expect(isVendorUrl(c.vendorAUrl)).toBe(true);
      expect(isVendorUrl(c.vendorBUrl)).toBe(true);
    }
  });
});
