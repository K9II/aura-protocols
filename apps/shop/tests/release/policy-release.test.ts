import { describe, it, expect } from "vitest";
import { GOVERNING_STATE, DISPATCH_BUSINESS_DAYS } from "../../src/lib/constants";

// Run before unpausing Vercel:  RELEASE_CHECK=1 pnpm --filter @aura/shop test
// Fails while the policy pages still carry launch placeholders.
describe.skipIf(!process.env.RELEASE_CHECK)("release check — policies", () => {
  it("names the governing state in the Terms", () => {
    expect(GOVERNING_STATE, "set GOVERNING_STATE in lib/constants.ts (LLC state)").not.toBeNull();
  });

  it("states a dispatch time on the Shipping page", () => {
    expect(DISPATCH_BUSINESS_DAYS, "set DISPATCH_BUSINESS_DAYS once Rapid confirms").not.toBeNull();
  });
});
