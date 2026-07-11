import { describe, it, expect } from "vitest";
import { generateStaticParams } from "@/app/compare/[slug]/page";
import { comparisons } from "@/data/comparisons";
import { getVendorPairs } from "@/lib/vendorPairs";

describe("compare/[slug] generateStaticParams", () => {
  it("includes both curated and generated pair slugs", async () => {
    const params = await generateStaticParams();
    const slugs = params.map((p: { slug: string }) => p.slug);

    for (const c of comparisons) {
      expect(slugs).toContain(c.slug);
    }
    for (const pair of getVendorPairs()) {
      expect(slugs).toContain(pair.slug);
    }
    expect(slugs.length).toBe(comparisons.length + getVendorPairs().length);
  });
});
