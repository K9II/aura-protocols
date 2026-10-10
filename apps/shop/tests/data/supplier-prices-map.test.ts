import { describe, it, expect } from "vitest";
import { defaultLabFeeCents, mapSupplierPrices, referenceFor, storePricesFor, variantIdOf } from "../../scripts/supplier-prices-map.mjs";

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

describe("referenceFor", () => {
  const sheet = {
    defaults: { threepl: "pipship", postage: "box", partner_pct: 8, lab: "bt" },
    rates: { labs: { bt: { label: "BTLabs · PPI", price: 150, prices: { "kpv-10": 125, "gone-5": 90 } } } },
    fulfillment: { vendors: [{ key: "pipship", short: "PipShip", pick_first: 4, pick_additional: 0.5, insert_per_order: 0.1, label_apply_per_vial: 0.35, insurance_per_order: 4.95,
      postage_default: "box", postage_options: [{ key: "box", label: "FedEx 2Day", postage: 12.88, packaging: 0.36 }],
      status: { pick_first: "confirmed", insurance_per_order: "estimate", label_apply_per_vial: "estimate", postage: "confirmed" } }] },
    products: [
      { id: "kpv-10", shop: "kpv", size: "10 mg", mg: 10, competitors: [{ who: "Oath", mg: 10, price: 60 }, { who: "PP", mg: 20, price: 100 }] },
      { id: "gone-5", shop: "gone", size: "5 mg", mg: 5, competitors: [{ who: "Oath", mg: 5, price: 40 }] },
    ],
  };
  const ref: Record<string, any> = Object.fromEntries(referenceFor(sheet, [{ slug: "kpv", variant_id: "10mg" }]).map((r) => [r.kind, r.data]));
  it("copies the default 3PL in cents, flagging estimates", () => {
    expect(ref.fulfillment).toMatchObject({ vendor: "PipShip", pickFirstCents: 400, pickAdditionalCents: 50, insertCents: 10, packagingCents: 36, postageCents: 1288, insuranceCents: 495, labelApplyPerVialCents: 35 });
    expect(ref.fulfillment.estimates).toEqual(["label_apply_per_vial", "insurance_per_order"]);
  });
  it("copies the GLP-1 processor percent", () => expect(ref.processor).toEqual({ glpPct: 8 }));
  it("competitor prices for store strengths only, scaled to the store's strength", () => {
    expect(Object.keys(ref.competitors)).toEqual(["kpv/10mg"]);
    expect(ref.competitors["kpv/10mg"][1]).toEqual({ who: "PP", mg: 20, priceCents: 10000, sameStrengthCents: 5000 });
  });
  it("the default lab's price per store strength", () => expect(ref.lab).toEqual({ name: "BTLabs · PPI", flatCents: 15000, perStrength: { "kpv/10mg": 12500 } }));
  it("leaves out what AIOS doesn't have", () => expect(referenceFor({ products: [] }, [])).toEqual([]));
});
