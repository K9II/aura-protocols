import { describe, it, expect } from "vitest";
import {
  tierFor, nextTier, commissionCents, projectEarnings, clearsAt,
  CODE_DISCOUNT_PCT, CLEARING_DAYS, CASH_MIN_CENTS, CREDIT_MULTIPLIER,
} from "@/lib/partners/tiers";

describe("tiers", () => {
  it("uses the approved constants", () => {
    expect([CODE_DISCOUNT_PCT, CLEARING_DAYS, CASH_MIN_CENTS, CREDIT_MULTIPLIER]).toEqual([10, 15, 10000, 1.3]);
  });

  it("moves to 15% at exactly $15,000 and 20% at exactly $40,000 of lifetime sales", () => {
    expect(tierFor(1_499_999)).toBe(10);
    expect(tierFor(1_500_000)).toBe(15);
    expect(tierFor(3_999_999)).toBe(15);
    expect(tierFor(4_000_000)).toBe(20);
  });

  it("reports the next tier and what's left to reach it", () => {
    expect(nextTier(942_000)).toEqual({ pct: 15, fromCents: 1_500_000, remainingCents: 558_000 });
    expect(nextTier(1_500_000)).toEqual({ pct: 20, fromCents: 4_000_000, remainingCents: 2_500_000 });
    expect(nextTier(4_000_000)).toBeNull();
  });

  it("rounds commission to the cent", () => {
    expect(commissionCents(6210, 10)).toBe(621);
    expect(commissionCents(21333, 15)).toBe(3200);
  });

  it("clears 15 days after shipping", () => {
    expect(clearsAt("2026-10-01T12:00:00.000Z")).toBe("2026-10-16T12:00:00.000Z");
  });

  it("projects a year at the tier held when each month begins", () => {
    // 20 orders × $180 = $3,600/month: months 1–5 at 10%, 15% from month 6 (lifetime $18,000).
    const r = projectEarnings({ ordersPerMonth: 20, avgOrderCents: 18000, multiplier: 1 });
    expect(r.firstMonthCents).toBe(36000);
    expect(r.totalCents).toBe(5 * 36000 + 7 * 54000);
    expect(r.finalTierPct).toBe(15);
    expect(r.reachedAt).toEqual({ 15: 6 });
  });

  it("applies the 1.3× store-credit multiplier to every month", () => {
    const r = projectEarnings({ ordersPerMonth: 20, avgOrderCents: 18000, multiplier: 1.3 });
    expect(r.firstMonthCents).toBe(46800);
    expect(r.totalCents).toBe(725400); // 1.3 × (5 × $360 + 7 × $540)
  });

  it("reaches 20% when volume is high enough", () => {
    const r = projectEarnings({ ordersPerMonth: 100, avgOrderCents: 20000, multiplier: 1 }); // $20,000/month
    expect(r.reachedAt).toEqual({ 15: 2, 20: 3 });
    expect(r.finalTierPct).toBe(20);
  });
});
