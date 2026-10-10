import { describe, it, expect } from "vitest";
import { NEW_ACCOUNT_DAYS, NEW_ACCOUNT_PCT, OFFER_DAYS_TEXT, OFFER_PCT_TEXT, discountPct, discountPctWith, offerEndsAt, offerLive } from "@/lib/account/offer";
import { CODE_DISCOUNT_PCT } from "@/lib/partners/tiers";

describe("new-account offer", () => {
  it("is 25% (Kearney 2026-10-06; was 15)", () => { expect(NEW_ACCOUNT_PCT).toBe(25); });

  it("ends exactly NEW_ACCOUNT_DAYS days after sign-up", () => {
    expect(NEW_ACCOUNT_DAYS).toBe(3);
    expect(offerEndsAt(Date.parse("2026-10-04T15:30:00Z"))).toBe("2026-10-07T15:30:00.000Z");
  });

  it("builds every copy fragment from the two constants", () => {
    expect(OFFER_PCT_TEXT).toBe("25%");
    expect(OFFER_DAYS_TEXT).toBe("3 days");
  });

  it("is live inside the window with no paid order", () => {
    expect(offerLive({ createdAt: "2026-10-04T15:30:00Z", hasPaidOrder: false, nowMs: Date.parse("2026-10-07T15:00:00Z") }))
      .toEqual({ endsAt: "2026-10-07T15:30:00.000Z" });
  });

  it("is gone after the end date", () => {
    expect(offerLive({ createdAt: "2026-10-04T15:30:00Z", hasPaidOrder: false, nowMs: Date.parse("2026-10-07T15:30:01Z") })).toBeNull();
  });

  it("is gone once the account has a paid order", () => {
    expect(offerLive({ createdAt: "2026-10-04T15:30:00Z", hasPaidOrder: true, nowMs: Date.parse("2026-10-05T00:00:00Z") })).toBeNull();
  });
});

describe("discountPct: which percent wins between the new-account offer and a partner code", () => {
  it("is null when neither applies", () => {
    expect(discountPct(false, false)).toBeNull();
  });

  it("is the new-account percent, flagged as such, when only the offer applies", () => {
    expect(discountPct(true, false)).toEqual({ pct: NEW_ACCOUNT_PCT, newAccount: true });
  });

  it("is the partner code's percent, not flagged, when only the code applies", () => {
    expect(discountPct(false, true)).toEqual({ pct: CODE_DISCOUNT_PCT, newAccount: false });
  });

  it("is the new-account percent (today's 25% beats the code's 10%) when both apply", () => {
    expect(discountPct(true, true)).toEqual({ pct: NEW_ACCOUNT_PCT, newAccount: true });
  });
});

describe("discountPctWith: the same rule, parameterized over whatever percents are configured", () => {
  it("picks the new-account percent when it's larger (15 vs. 10)", () => {
    expect(discountPctWith(15, 10, true, true)).toEqual({ pct: 15, newAccount: true });
  });

  it("picks the partner code's percent when it's larger (5 vs. 10), and does not flag it as new-account", () => {
    expect(discountPctWith(5, 10, true, true)).toEqual({ pct: 10, newAccount: false });
  });

  it("is null when neither applies, regardless of the configured percents", () => {
    expect(discountPctWith(5, 10, false, false)).toBeNull();
  });

  it("is the offer alone, flagged new-account, when there's no code", () => {
    expect(discountPctWith(5, 10, true, false)).toEqual({ pct: 5, newAccount: true });
  });

  it("is the code alone, not flagged new-account, when there's no offer", () => {
    expect(discountPctWith(5, 10, false, true)).toEqual({ pct: 10, newAccount: false });
  });
});
