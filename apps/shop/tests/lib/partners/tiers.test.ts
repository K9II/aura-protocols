import { describe, it, expect } from "vitest";
import {
  tierFor, nextTier, commissionCents, projectEarnings, clearsAt,
  CODE_DISCOUNT_PCT, CLEARING_DAYS, CASH_MIN_CENTS, CREDIT_MULTIPLIER,
} from "@/lib/partners/tiers";

describe("tiers", () => {
  it("uses the approved constants", () => {
    expect([CODE_DISCOUNT_PCT, CLEARING_DAYS, CASH_MIN_CENTS, CREDIT_MULTIPLIER]).toEqual([10, 15, 10000, 1.3]);
  });

  it("moves to 15% at exactly $3,000 and 20% at exactly $5,000 of lifetime sales", () => {
    expect(tierFor(299_999)).toBe(10);
    expect(tierFor(300_000)).toBe(15);
    expect(tierFor(499_999)).toBe(15);
    expect(tierFor(500_000)).toBe(20);
  });

  it("reports the next tier and what's left to reach it", () => {
    expect(nextTier(52_020)).toEqual({ pct: 15, fromCents: 300_000, remainingCents: 247_980 });
    expect(nextTier(300_000)).toEqual({ pct: 20, fromCents: 500_000, remainingCents: 200_000 });
    expect(nextTier(500_000)).toBeNull();
  });

  it("rounds commission to the cent", () => {
    expect(commissionCents(6210, 10)).toBe(621);
    expect(commissionCents(21333, 15)).toBe(3200);
  });

  it("clears 15 days after shipping", () => {
    expect(clearsAt("2026-10-01T12:00:00.000Z")).toBe("2026-10-16T12:00:00.000Z");
  });

  it("projects a year at the tier held when each month begins", () => {
    // 20 orders × $180 = $3,600/month: month 1 at 10%, 15% in month 2 (lifetime $3,600), 20% from month 3 ($7,200).
    const r = projectEarnings({ ordersPerMonth: 20, avgOrderCents: 18000, multiplier: 1 });
    expect(r.firstMonthCents).toBe(36000);
    expect(r.totalCents).toBe(36000 + 54000 + 10 * 72000);
    expect(r.finalTierPct).toBe(20);
    expect(r.reachedAt).toEqual({ 15: 2, 20: 3 });
  });

  it("applies the 1.3× store-credit multiplier to every month", () => {
    const r = projectEarnings({ ordersPerMonth: 20, avgOrderCents: 18000, multiplier: 1.3 });
    expect(r.firstMonthCents).toBe(46800);
    expect(r.totalCents).toBe(1053000); // 1.3 × ($360 + $540 + 10 × $720)
  });

  it("passes through 15% on the way to 20% at lower volume", () => {
    const r = projectEarnings({ ordersPerMonth: 4, avgOrderCents: 18000, multiplier: 1 }); // $720/month
    expect(r.reachedAt).toEqual({ 15: 6, 20: 8 });
    expect(r.finalTierPct).toBe(20);
  });
});
