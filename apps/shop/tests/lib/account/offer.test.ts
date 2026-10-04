import { describe, it, expect } from "vitest";
import { NEW_ACCOUNT_DAYS, NEW_ACCOUNT_PCT, OFFER_DAYS_TEXT, OFFER_PCT_TEXT, offerEndsAt, offerLive } from "@/lib/account/offer";

describe("new-account offer", () => {
  it("is 15%", () => { expect(NEW_ACCOUNT_PCT).toBe(15); });

  it("ends exactly NEW_ACCOUNT_DAYS days after sign-up", () => {
    expect(NEW_ACCOUNT_DAYS).toBe(14);
    expect(offerEndsAt(Date.parse("2026-10-04T15:30:00Z"))).toBe("2026-10-18T15:30:00.000Z");
  });

  it("builds every copy fragment from the two constants", () => {
    expect(OFFER_PCT_TEXT).toBe("15%");
    expect(OFFER_DAYS_TEXT).toBe("14 days");
  });

  it("is live inside the window with no paid order", () => {
    expect(offerLive({ createdAt: "2026-10-04T15:30:00Z", hasPaidOrder: false, nowMs: Date.parse("2026-10-18T15:00:00Z") }))
      .toEqual({ endsAt: "2026-10-18T15:30:00.000Z" });
  });

  it("is gone after the end date", () => {
    expect(offerLive({ createdAt: "2026-10-04T15:30:00Z", hasPaidOrder: false, nowMs: Date.parse("2026-10-18T15:30:01Z") })).toBeNull();
  });

  it("is gone once the account has a paid order", () => {
    expect(offerLive({ createdAt: "2026-10-04T15:30:00Z", hasPaidOrder: true, nowMs: Date.parse("2026-10-05T00:00:00Z") })).toBeNull();
  });
});
