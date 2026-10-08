import { describe, it, expect } from "vitest";
import type { Compound } from "@/data/catalog";
import { priceOrder, withCharges, SHIPPING_FLAT_CENTS, FREE_SHIPPING_MIN_CENTS, INSURANCE_CENTS } from "@/lib/pricing";

const base = {
  identity: {}, form: "Lyophilized powder", storage: "−20 °C", vialMl: 3, chemicalClass: "Peptide Fragments" as const,
  packDiscounts: [{ qty: 1, pct: 0 }, { qty: 3, pct: 10 }, { qty: 10, pct: 20 }],
};
const tested = { lot: "AP-0001", purityPct: 99.5, method: "HPLC" as const, testedOn: "2026-09-01", coaFile: "/coa/AP-0001.pdf" };
const list: Compound[] = [
  { ...base, slug: "alpha", name: "Alpha",
    variants: [{ id: "5mg", strength: "5 mg", shown: true, priceUsd: 49, stock: "in", lot: tested, wholesale: true }, { id: "10mg", strength: "10 mg", shown: true, priceUsd: 79, stock: "out", lot: tested, wholesale: true }] },
  // A strength with no live certified lot is always out (lib/catalog-merge.ts).
  { ...base, slug: "beta", name: "Beta",
    variants: [{ id: "5mg", strength: "5 mg", shown: true, priceUsd: 59, stock: "out", lot: { pending: true }, wholesale: true }] },
];

describe("priceOrder", () => {
  it("prices packs from the catalog with the pack discount, per pack", () => {
    const r = priceOrder([{ slug: "alpha", variantId: "5mg", packQty: 3, quantity: 2 }], list);
    expect(r.rejected).toEqual([]);
    expect(r.items).toEqual([{
      compoundSlug: "alpha", compoundName: "Alpha", chemicalClass: "Peptide Fragments", variantId: "5mg", strength: "5 mg",
      packQty: 3, quantity: 2, listUnitCents: 14700, packPct: 10, unitPriceCents: 13230, lineTotalCents: 26460, lotNumber: "AP-0001",
    }]);
    expect(r.subtotalCents).toBe(26460);
    expect(r.partnerDiscountCents).toBe(0);
  });

  it("charges $15 shipping under $300, none at or above it, and $5.50 insurance on every order", () => {
    expect([SHIPPING_FLAT_CENTS, FREE_SHIPPING_MIN_CENTS, INSURANCE_CENTS]).toEqual([1500, 30000, 550]);
    const small = priceOrder([{ slug: "alpha", variantId: "5mg", packQty: 1, quantity: 1 }], list);
    expect(small.shippingCents).toBe(SHIPPING_FLAT_CENTS);
    expect(small.insuranceCents).toBe(INSURANCE_CENTS);
    expect(small.totalBeforeTaxCents).toBe(4900 + SHIPPING_FLAT_CENTS + INSURANCE_CENTS);
    const under = priceOrder([{ slug: "alpha", variantId: "5mg", packQty: 1, quantity: 6 }], list); // 29400
    expect(under.shippingCents).toBe(SHIPPING_FLAT_CENTS);
    const over = priceOrder([{ slug: "alpha", variantId: "5mg", packQty: 1, quantity: 7 }], list); // 34300
    expect(over.shippingCents).toBe(0);
    expect(over.totalBeforeTaxCents).toBe(34300 + INSURANCE_CENTS);
  });

  it("rejects unknown items, pending lots, out-of-stock sizes and bad quantities", () => {
    const r = priceOrder([
      { slug: "nope", variantId: "5mg", packQty: 1, quantity: 1 },
      { slug: "beta", variantId: "5mg", packQty: 1, quantity: 1 },
      { slug: "alpha", variantId: "10mg", packQty: 1, quantity: 1 },
      { slug: "alpha", variantId: "5mg", packQty: 4, quantity: 1 },
      { slug: "alpha", variantId: "5mg", packQty: 1, quantity: 0 },
      { slug: "alpha", variantId: "5mg", packQty: 1, quantity: 51 },
    ], list);
    expect(r.items).toEqual([]);
    expect(r.rejected.map((x) => x.reason)).toEqual(["unknown", "pending_lot", "out_of_stock", "bad_pack", "bad_quantity", "bad_quantity"]);
    expect(r.shippingCents).toBe(0);
    expect(r.insuranceCents).toBe(0);
  });

  it("carries each item's chemical class for code eligibility", () => {
    const o = priceOrder([{ slug: "alpha", variantId: "5mg", packQty: 1, quantity: 1 }], list);
    expect(o.items[0].chemicalClass).toBe(list.find((c) => c.slug === "alpha")!.chemicalClass);
  });

  it("withCharges gives free shipping when the order has a free-shipping code", () => {
    const o = priceOrder([{ slug: "alpha", variantId: "5mg", packQty: 1, quantity: 1 }], list);
    expect(o.shippingCents).toBeGreaterThan(0);
    const free = withCharges({ ...o, freeShipping: true });
    expect(free.shippingCents).toBe(0);
    expect(free.totalBeforeTaxCents).toBe(o.totalBeforeTaxCents - o.shippingCents);
  });
});
