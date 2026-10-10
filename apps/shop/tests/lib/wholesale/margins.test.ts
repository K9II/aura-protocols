import { describe, it, expect } from "vitest";
import { GLP_CLASS, kitCostCents, kitMargins, median, orderFulfillmentCents, orderMargin, type CostInputs, type Fulfillment } from "@/lib/wholesale/margins";
import type { KitRow } from "@/lib/wholesale/rules";

const TIERS = [{ minKits: 5, pct: 20 }, { minKits: 10, pct: 25 }, { minKits: 20, pct: 30 }];
const COSTS = { tiers: TIERS, minKits: 5, lotTestCents: 25000, inboundPerBoxCents: 1500, labelPerVialCents: 40, kitBoxCents: 0, fulfillment: null, insuranceChargedCents: 0, glpPct: null };
const row = (slug: string, priceUsd: number, designation: string | null = null, chemicalClass = "Peptide Fragments"): KitRow => ({
  slug, name: slug.toUpperCase(), designation, chemicalClass, variantId: "10mg", strength: "10 mg", priceUsd,
});

// With the AIOS reference synced: 3PL, GLP-1 processor, lab price per strength, kit box.
const SHIP: Fulfillment = {
  vendor: "PipShip", postageLabel: "FedEx 2Day One Rate", estimates: [],
  pickFirstCents: 300, pickAdditionalCents: 50, insertCents: 25, packagingCents: 100,
  postageCents: 1500, insuranceCents: 495, labelApplyPerVialCents: 35,
};
const SYNCED: CostInputs = {
  ...COSTS, kitBoxCents: 450, fulfillment: SHIP, insuranceChargedCents: 550, glpPct: 8,
  labPerStrength: { "kpv/10mg": 15000 },
};
const PRICES = { "kpv/10mg": { Nana: 4400 }, "tirzepatide/10mg": { Nana: 2600 } };
const synced = () => {
  const { rows } = kitMargins([row("kpv", 84), row("tirzepatide", 75, "APro-G2TRZ", GLP_CLASS)], PRICES, SYNCED);
  return { kpv: rows[0], tirz: rows[1] };
};

describe("costs from the AIOS reference", () => {
  it("3PL per order: first pick, extra picks, insert, packaging, postage, insurance, less what the buyer pays", () => {
    expect(orderFulfillmentCents(5, SYNCED)).toBe(300 + 4 * 50 + 25 + 100 + 1500 + 495 - 550);
    expect(orderFulfillmentCents(0, SYNCED)).toBe(0);
    expect(orderFulfillmentCents(5, COSTS)).toBe(0);              // not synced: left out
  });

  it("kit cost adds label application and the kit box", () => {
    expect(kitCostCents(4400, SYNCED)).toBe(4400 + 1500 + (40 + 35) * 10 + 450);
    expect(kitCostCents(4400, COSTS)).toBe(4400 + 1500 + 400);
  });

  it("per kit, the smallest order's 3PL is shared by its kits; the lab price is per strength with a flat fallback", () => {
    const { kpv, tirz } = synced();
    expect(kpv.labCents).toBe(15000);
    expect(tirz.labCents).toBe(25000);
    expect(tirz.glp).toBe(true);
    // 67200 − 7100 − (2.9% + 60¢) − 2070 / 5
    expect(kpv.low.tiers[0].profitCents).toBe(Math.round(67200 - 7100 - (67200 * 0.029 + 60) - 2070 / 5));
    expect(kpv.low.worst.profitCents).toBe(Math.round(67200 - 7100 - (67200 * 0.029 + 60) - 2070 / 5 - 15000));
    // GLP-1: the processor's 8%, no Stripe fixed fee
    expect(tirz.low.tiers[0].profitCents).toBe(Math.round(60000 - 5300 - 60000 * 0.08 - 2070 / 5));
  });
});

describe("orderMargin", () => {
  it("one strength × 5 kits at card rates: worked by hand", () => {
    const { kpv } = synced();
    const o = orderMargin([{ m: kpv, kits: 5 }], "low", SYNCED);
    expect(o.kits).toBe(5);
    expect(o.tier.pct).toBe(20);
    expect(o.belowMinimum).toBe(false);
    expect(o.revenueCents).toBe(336000);
    expect(o.productCents).toBe(35500);
    expect(o.labCents).toBe(15000);                                // one strength, one test
    expect(o.feesCents).toBe(9804);                                // 2.9% + 2 × 30¢
    expect(o.fulfillmentCents).toBe(2070);
    expect(o.profitCents).toBe(273626);
    expect(o.marginPct).toBeCloseTo(81.44, 1);
    expect(o.perVialCents).toBe(5473);
    expect(o.glp).toBe(false);
  });

  it("a GLP-1 line sends the whole order to the GLP-1 processor, and each strength pays its own test", () => {
    const { kpv, tirz } = synced();
    const o = orderMargin([{ m: kpv, kits: 3 }, { m: tirz, kits: 2 }], "low", SYNCED);
    expect(o.glp).toBe(true);
    expect(o.revenueCents).toBe(67200 * 3 + 60000 * 2);
    expect(o.labCents).toBe(15000 + 25000);
    expect(o.feesCents).toBe(Math.round(321600 * 0.08));
    expect(o.profitCents).toBe(321600 - 31900 - 40000 - 25728 - 2070);
  });

  it("tier follows the order's kits; below the minimum is flagged at the first tier", () => {
    const { kpv } = synced();
    expect(orderMargin([{ m: kpv, kits: 10 }], "low", SYNCED).tier.pct).toBe(25);
    const small = orderMargin([{ m: kpv, kits: 2 }], "low", SYNCED);
    expect(small.belowMinimum).toBe(true);
    expect(small.tier.pct).toBe(20);
  });

  it("empty lines cost nothing", () => {
    const { kpv } = synced();
    const o = orderMargin([{ m: kpv, kits: 0 }], "low", SYNCED);
    expect([o.kits, o.revenueCents, o.labCents, o.feesCents, o.fulfillmentCents, o.profitCents, o.perVialCents]).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });
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
