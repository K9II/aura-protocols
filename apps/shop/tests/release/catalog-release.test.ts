import { describe, it, expect } from "vitest";
import { MATERIAL_TESTING_PLACEHOLDER } from "../../src/lib/catalog";

// Run before unpausing Vercel:  RELEASE_CHECK=1 pnpm --filter @aura/shop test
// Prices, lots and certificates no longer live in code (data/catalog.ts is
// content only); the live-DB check (every shown strength has a live lot with
// a certificate) is added with the Aura Store release check.
describe.skipIf(!process.env.RELEASE_CHECK)("release check", () => {
  it("Material & testing values are confirmed by sourcing (not placeholders)", () => {
    expect(MATERIAL_TESTING_PLACEHOLDER, "confirm supplier process + lab panel, then set to false in lib/catalog.ts").toBe(false);
  });
});
