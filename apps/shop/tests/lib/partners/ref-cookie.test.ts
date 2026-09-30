import { describe, it, expect, beforeEach } from "vitest";

const DAY = 24 * 3600 * 1000;

describe("referral cookie", () => {
  beforeEach(() => { process.env.PARTNER_REF_SECRET = "test-secret-please-change"; });

  it("signs a code and reads it back within 60 days", async () => {
    const { signRef, readRef } = await import("@/lib/partners/ref-cookie");
    const now = Date.UTC(2026, 9, 1);
    const v = signRef("SMITHLAB", now);
    expect(readRef(v, now + 59 * DAY)).toBe("SMITHLAB");
  });

  it("expires after exactly 60 days", async () => {
    const { signRef, readRef } = await import("@/lib/partners/ref-cookie");
    const now = Date.UTC(2026, 9, 1);
    expect(readRef(signRef("SMITHLAB", now), now + 60 * DAY + 1)).toBeNull();
  });

  it("rejects forged, malformed or missing values", async () => {
    const { signRef, readRef } = await import("@/lib/partners/ref-cookie");
    const now = Date.UTC(2026, 9, 1);
    const [code, ts, sig] = signRef("SMITHLAB", now).split(".");
    expect(readRef(`OTHER.${ts}.${sig}`, now)).toBeNull();
    expect(readRef(`${code}.${ts}`, now)).toBeNull();
    expect(readRef(undefined, now)).toBeNull();
  });
});
