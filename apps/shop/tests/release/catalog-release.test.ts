import { describe, it, expect } from "vitest";
import { compounds } from "../../src/data/catalog";
import { isPendingLot } from "../../src/lib/catalog";

// Run before unpausing Vercel:  RELEASE_CHECK=1 pnpm --filter @aura/shop test
// Fails while any catalog data is still a pre-sourcing placeholder.
describe.skipIf(!process.env.RELEASE_CHECK)("release check", () => {
  it("has no placeholder catalog data", () => {
    expect(compounds.filter((c) => c.placeholderData).map((c) => c.slug)).toEqual([]);
  });

  it("has no placeholder lots, and every non-pending lot has a certificate file", () => {
    for (const c of compounds) {
      if (isPendingLot(c.currentLot)) continue;
      expect(c.currentLot.lot, c.slug).not.toMatch(/^PLACEHOLDER/);
      expect(c.currentLot.coaFile, c.slug).toMatch(/^\/coa\/.+\.(pdf|png|jpg)$/);
    }
  });
});
