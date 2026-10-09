import { describe, it, expect } from "vitest";
import { defaultLabFeeCents, mapSupplierPrices, storePricesFor, variantIdOf } from "../../scripts/supplier-prices-map.mjs";

const variants = [{ slug: "bpc-157", variant_id: "10mg" }, { slug: "slu-pp-332", variant_id: "250mcg" }];

describe("mapSupplierPrices (AIOS → supplier_prices)", () => {
  it("one row per supplier with a box price, for strengths the store has", () => {
    const { rows, skipped } = mapSupplierPrices([
      { shop: "bpc-157", size: "10 mg", cost: { lkz_kit: 70, nana_kit: 52, us_b: 16.8, uther_kit: null } },
      { shop: "slu-pp-332", size: "250 mcg", cost: { ehz_kit: 64.5 } },
      { shop: "tb-500", size: "10 mg", cost: { lkz_kit: 90 } },
      { name: "no shop link", size: "5 mg", cost: { lkz_kit: 10 } },
    ], variants);
    expect(rows).toEqual([
      { supplier: "LKZ", slug: "bpc-157", variant_id: "10mg", box_cents: 7000 },
      { supplier: "Nana", slug: "bpc-157", variant_id: "10mg", box_cents: 5200 },
      { supplier: "EHZ", slug: "slu-pp-332", variant_id: "250mcg", box_cents: 6450 },
    ]);
    expect(skipped).toEqual({ notInStore: 1, duplicate: 0 });
  });

  it("the first AIOS row wins when two map to the same strength", () => {
    const { rows, skipped } = mapSupplierPrices([
      { shop: "bpc-157", size: "10 mg", cost: { lkz_kit: 70 } },
      { shop: "bpc-157", size: "10mg", cost: { lkz_kit: 99 } },
    ], variants);
    expect(rows).toHaveLength(1);
    expect(rows[0].box_cents).toBe(7000);
    expect(skipped.duplicate).toBe(1);
  });

  it("variant ids follow the store rule", () => {
    expect(variantIdOf("250 mcg")).toBe("250mcg");
    expect(variantIdOf("10 MG")).toBe("10mg");
  });

  it("the default lab's flat fee per lot, or null without one", () => {
    expect(defaultLabFeeCents({ defaults: { lab: "vanguard_silver" }, rates: { labs: { vanguard_silver: { price: 250 } } } })).toBe(25000);
    expect(defaultLabFeeCents({ defaults: { lab: "janoshik" }, rates: { labs: { janoshik: { per_product: true } } } })).toBeNull();
  });

  it("store → AIOS: the store's retail price for each AIOS product it sells, and what moved", () => {
    const r = storePricesFor(
      [{ id: "bpc157-10", shop: "bpc-157", size: "10 mg", price: 65 }, { id: "slupp", shop: "slu-pp-332", size: "250 mcg" }, { id: "tb500-10", shop: "tb-500", size: "10 mg", price: 90 }],
      [{ slug: "bpc-157", variant_id: "10mg", price_cents: 7900 }, { slug: "slu-pp-332", variant_id: "250mcg", price_cents: 7900 }],
    );
    expect(r.prices).toEqual({ "bpc157-10": 79, slupp: 79 });
    expect(r.changes).toEqual([{ id: "bpc157-10", from: 65, to: 79 }, { id: "slupp", from: null, to: 79 }]);
  });
});
