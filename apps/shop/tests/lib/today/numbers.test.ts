import { describe, it, expect } from "vitest";
import { countChange, numbersView, pctChange, type SalesSummary } from "@/lib/today/numbers";
import { periodRanges } from "@/lib/today/periods";

const NOW = Date.parse("2026-10-06T15:42:00Z"); // Tue Oct 6, 9:42 am MDT
const sum = (o: Partial<SalesSummary> = {}): SalesSummary => ({
  salesCents: 0, orders: 0, chargedCents: 0, shippingCents: 0, taxCents: 0, refundedCents: 0, refundedOrders: 0,
  firstTimeOrders: 0, repeatOrders: 0, newAccounts: 0, buckets: [], top: [], ...o,
});

describe("numbers", () => {
  it("percent change, count change, and nothing when there's nothing to compare with", () => {
    expect(pctChange(134650, 110369)).toEqual({ dir: "up", text: "▲ 22%" });
    expect(pctChange(96, 100)).toEqual({ dir: "dn", text: "▼ 4%" });
    expect(pctChange(100, 100)).toEqual({ dir: "flat", text: "no change" });
    expect(pctChange(500, 0)).toBeNull();
    expect(countChange(5, 3)).toEqual({ dir: "up", text: "▲ 2" });
    expect(countChange(1, 4)).toEqual({ dir: "dn", text: "▼ 3" });
    expect(countChange(0, 0)).toEqual({ dir: "flat", text: "no change" });
  });

  it("today: hero, minis, hourly bars with the current hour, top strengths", () => {
    const v = numbersView("today", periodRanges("today", NOW), sum({
      salesCents: 134650, orders: 5, chargedCents: 143118, shippingCents: 2750, taxCents: 5718, firstTimeOrders: 3, repeatOrders: 2, newAccounts: 11,
      buckets: [{ at: "2026-10-06T07:00", cents: 100000 }, { at: "2026-10-06T09:00", cents: 30000 }],
      top: [{ name: "BPC-157", strength: "10 mg", vials: 6, cents: 41400 }, { name: "TB-500", strength: "10 mg", vials: 1, cents: 29600 }],
    }), sum({ salesCents: 110369, orders: 3, newAccounts: 8 }), NOW);
    expect(v.sales).toBe("$1,346.50");
    expect(v.salesChange).toEqual({ dir: "up", text: "▲ 22%" });
    expect(v.vs).toBe("vs yesterday by now");
    expect([v.charged, v.shipping, v.tax]).toEqual(["$1,431.18", "$27.50", "$57.18"]);
    expect(v.refund).toBeNull();
    expect(v.minis.map((m) => m.value)).toEqual(["5", "$269.30", "11", "3 · 2"]);
    expect(v.minis[0]).toMatchObject({ change: { dir: "up", text: "▲ 2" }, suffix: "vs yesterday" });
    expect(v.minis[1].change).toEqual({ dir: "dn", text: "▼ 27%" });
    expect(v.minis[2].change).toEqual({ dir: "up", text: "▲ 3" });
    expect(v.minis[3]).toMatchObject({ change: null, note: "orders" });
    expect(v.chart).toMatchObject({ title: "Sales by hour", range: "through 9 am", axis: ["12a", "6a", "12p", "6p", "11p"] });
    expect(v.chart.bars).toHaveLength(24);
    expect(v.chart.bars[7]).toMatchObject({ h: 100, zero: false, now: false, tip: "07:00 · $1,000.00" });
    expect(v.chart.bars[9]).toMatchObject({ h: 30, now: true });
    expect(v.chart.bars[0]).toMatchObject({ h: 1, zero: true });
    expect(v.topTitle).toBe("Top strengths · today");
    expect(v.top[0]).toEqual({ rank: 1, label: "BPC-157 · 10 mg", vials: "6 vials", sales: "$414.00", pct: 100 });
    expect(v.top[1]).toMatchObject({ vials: "1 vial", pct: 71 });
  });

  it("30 days: daily bars, date range, refunds line, repeat share, percent change for counts", () => {
    const v = numbersView("30d", periodRanges("30d", NOW),
      sum({ salesCents: 3891240, orders: 142, firstTimeOrders: 88, repeatOrders: 54, newAccounts: 318, refundedCents: 25800, refundedOrders: 1 }),
      sum({ salesCents: 3413368, orders: 128, newAccounts: 338 }), NOW);
    expect(v.vs).toBe("vs prior 30 days");
    expect(v.refund).toBe("refunded $258.00 (1 order)");
    expect(v.minis[0].change).toEqual({ dir: "up", text: "▲ 11%" });
    expect(v.minis[0].suffix).toBeUndefined();
    expect(v.minis[2].change).toEqual({ dir: "dn", text: "▼ 6%" });
    expect(v.minis[3].note).toBe("38% repeat");
    expect(v.chart).toMatchObject({ title: "Sales by day", range: "Sep 7 – Oct 6" });
    expect(v.chart.bars).toHaveLength(30);
    expect(v.chart.bars[29].now).toBe(true);
    expect(v.topTitle).toBe("Top strengths · 30 days");
    expect(v.top).toEqual([]);
  });
});
