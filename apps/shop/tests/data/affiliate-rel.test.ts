import { describe, it, expect } from "vitest";
import { products } from "@/data/products";

describe("affiliate data contract", () => {
  it("every product has at least one vendor with a URL", () => {
    for (const p of products) {
      expect(p.vendors.length).toBeGreaterThan(0);
      expect(typeof p.vendors[0].url).toBe("string");
      expect(p.vendors[0].url.length).toBeGreaterThan(0);
    }
  });
});
