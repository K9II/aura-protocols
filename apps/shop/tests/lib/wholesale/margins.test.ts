import { describe, it, expect } from "vitest";
import { kitMargins, median } from "@/lib/wholesale/margins";
import type { KitRow } from "@/lib/wholesale/rules";

const TIERS = [{ minKits: 5, pct: 20 }, { minKits: 10, pct: 25 }, { minKits: 20, pct: 30 }];
const COSTS = { tiers: TIERS, minKits: 5, lotTestCents: 25000, inboundPerBoxCents: 1500, labelPerVialCents: 40, kitBoxCents: 0, fulfillment: null, insuranceChargedCents: 0, glpPct: null };
const row = (slug: string, priceUsd: number, designation: string | null = null): KitRow => ({
  slug, name: slug.toUpperCase(), designation, chemicalClass: "Peptide Fragments", variantId: "10mg", strength: "10 mg", priceUsd,
});

describe("kitMargins", () => {
  it("KPV 10 mg at $84/vial with a $44 box: worked by hand", () => {
    const { rows } = kitMargins([row("kpv", 84)], { "kpv/10mg": { Nana: 4400, LKZ: 9000 } }, COSTS);
    const lo = rows[0].low;
    expect(rows[0].kitListCents).toBe(84000);
    expect(lo.supplier).toBe("Nana");
    expect(lo.costCents).toBe(4400 + 1500 + 400);            // box + inbound + 10 labels
    // 20% off: revenue $672; fees 2.9% + 2 × 30¢ = $20.09; profit 672 − 63 − 20.09 = $588.91
    expect(lo.tiers[0].revenueCents).toBe(67200);
    expect(lo.tiers[0].profitCents).toBe(58891);
    expect(lo.tiers[0].marginPct).toBeCloseTo(87.63, 1);
    // a lone kit carries the whole $250 lot test
    expect(lo.worst.profitCents).toBe(58891 - 25000);
    expect(rows[0].high.supplier).toBe("LKZ");
    expect(rows[0].high.tiers[2].marginPct).toBeLessThan(lo.tiers[2].marginPct);
  });

  it("strengths without a supplier price are listed as missing, with the APro name", () => {
    const { rows, missing } = kitMargins([row("retatrutide", 125, "APro-G3RT"), row("kpv", 84)], { "kpv/10mg": { Nana: 4400 } }, COSTS);
    expect(rows.map((r) => r.key)).toEqual(["kpv/10mg"]);
    expect(missing).toEqual(["APro-G3RT (RETATRUTIDE) 10 mg"]);
  });

  it("median", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
    expect(median([])).toBe(0);
  });
});
