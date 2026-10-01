import { describe, it, expect } from "vitest";
import { heldCash, receivedCents, splitPayout } from "@/lib/partners/payout-math";

const base = { carryCents: 0, pref: "cash" as const, splitCashPct: 50, w9Checked: true };

describe("splitPayout", () => {
  it("pays cash at or above $100 with a checked W-9", () => {
    expect(splitPayout({ ...base, netCents: 10000 })).toEqual({ cashCents: 10000, creditValueCents: 0, newCarryCents: 0 });
  });

  it("carries cash below $100, and cash without a checked W-9", () => {
    expect(splitPayout({ ...base, netCents: 9999 })).toEqual({ cashCents: 0, creditValueCents: 0, newCarryCents: 9999 });
    expect(splitPayout({ ...base, netCents: 50000, w9Checked: false })).toEqual({ cashCents: 0, creditValueCents: 0, newCarryCents: 50000 });
  });

  it("adds the carry to this run's cash", () => {
    expect(splitPayout({ ...base, netCents: 4600, carryCents: 5400 })).toEqual({ cashCents: 10000, creditValueCents: 0, newCarryCents: 0 });
  });

  it("issues all-credit at 1.3× with no minimum", () => {
    expect(splitPayout({ ...base, pref: "credit", netCents: 1590 })).toEqual({ cashCents: 0, creditValueCents: 2067, newCarryCents: 0 });
  });

  it("splits by percentage: credit now, cash when it reaches $100", () => {
    expect(splitPayout({ ...base, pref: "split", netCents: 23640 })).toEqual({ cashCents: 11820, creditValueCents: 15366, newCarryCents: 0 });
    expect(splitPayout({ ...base, pref: "split", netCents: 10800 })).toEqual({ cashCents: 0, creditValueCents: 7020, newCarryCents: 5400 });
  });

  it("uses a negative carry (post-payout refunds) before paying anything", () => {
    expect(splitPayout({ ...base, pref: "credit", netCents: 3000, carryCents: -5000 })).toEqual({ cashCents: 0, creditValueCents: 0, newCarryCents: -2000 });
    expect(splitPayout({ ...base, pref: "credit", netCents: 8000, carryCents: -5000 })).toEqual({ cashCents: 0, creditValueCents: 3900, newCarryCents: 0 });
  });

  it("carries a negative net (deductions larger than earnings)", () => {
    expect(splitPayout({ ...base, netCents: -1200, carryCents: 3000 })).toEqual({ cashCents: 0, creditValueCents: 0, newCarryCents: 1800 });
  });

  it("pays an already-payable carry even when this run's net is zero or negative", () => {
    expect(splitPayout({ ...base, netCents: -500, carryCents: 50000 })).toEqual({ cashCents: 49500, creditValueCents: 0, newCarryCents: 0 });
    expect(splitPayout({ ...base, netCents: -500, carryCents: 50000, w9Checked: false })).toEqual({ cashCents: 0, creditValueCents: 0, newCarryCents: 49500 });
    expect(splitPayout({ ...base, netCents: 0, carryCents: 12000 })).toEqual({ cashCents: 12000, creditValueCents: 0, newCarryCents: 0 });
    expect(splitPayout({ ...base, netCents: -5000, carryCents: 3000 })).toEqual({ cashCents: 0, creditValueCents: 0, newCarryCents: -2000 });
  });
});

describe("heldCash", () => {
  it("is nothing when no cash is carried", () => {
    expect(heldCash({ carryCents: 0, w9Checked: false })).toBeNull();
    expect(heldCash({ carryCents: -1764, w9Checked: true })).toBeNull();
  });

  it("is held for the W-9 until it's checked, then for the $100 minimum", () => {
    expect(heldCash({ carryCents: 1764, w9Checked: false })).toEqual({ cents: 1764, reason: "w9" });
    expect(heldCash({ carryCents: 1764, w9Checked: true })).toEqual({ cents: 1764, reason: "minimum" });
  });
});

describe("receivedCents", () => {
  it("counts credit when issued and cash only once it's sent", () => {
    expect(receivedCents([
      { cash_cents: 12000, credit_cents: 0, status: "queued" },
      { cash_cents: 15000, credit_cents: 2600, status: "paid" },
      { cash_cents: 0, credit_cents: 1300, status: "credited" },
      { cash_cents: 0, credit_cents: 500, status: "queued" },
    ])).toBe(15000 + 2600 + 1300 + 500);
  });

  it("is zero with no payouts", () => {
    expect(receivedCents([])).toBe(0);
  });
});
