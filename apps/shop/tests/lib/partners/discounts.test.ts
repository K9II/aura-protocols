import { describe, it, expect } from "vitest";
import { applyPartnerCode } from "@/lib/partners/discounts";
import { withCharges, type PricedItem, type PricedOrder } from "@/lib/pricing";

function item(over: Partial<PricedItem>): PricedItem {
  return {
    compoundSlug: "x", compoundName: "X", variantId: "10mg", strength: "10 mg", packQty: 1, quantity: 1,
    listUnitCents: 6900, packPct: 0, unitPriceCents: 6900, lineTotalCents: 6900, lotNumber: "AP-0001", ...over,
  };
}
function order(items: PricedItem[]): PricedOrder {
  const subtotalCents = items.reduce((s, i) => s + i.lineTotalCents, 0);
  return withCharges({ items, rejected: [], subtotalCents, partnerDiscountCents: 0, shippingCents: 0, insuranceCents: 0, totalBeforeTaxCents: 0 });
}

describe("applyPartnerCode", () => {
  it("takes 10% off a single vial", () => {
    const r = applyPartnerCode(order([item({})]));
    expect(r.partnerDiscountCents).toBe(690);
    expect(r.lineDiscounts).toEqual([{ index: 0, source: "code", savingCents: 690 }]);
  });

  it("keeps the pack price when it is equal or better — never both", () => {
    const threePack = item({ packQty: 3, listUnitCents: 23700, packPct: 10, unitPriceCents: 21330, lineTotalCents: 21330 });
    const tenPack = item({ packQty: 10, listUnitCents: 79000, packPct: 20, unitPriceCents: 63200, lineTotalCents: 63200 });
    const r = applyPartnerCode(order([threePack, tenPack]));
    expect(r.partnerDiscountCents).toBe(0);
    expect(r.lineDiscounts.map((d) => d.source)).toEqual(["pack", "pack"]);
  });

  it("matches the approved checkout mock: 3-pack keeps −10%, single vial gets the code", () => {
    const threePack = item({ compoundSlug: "bpc-157", packQty: 3, listUnitCents: 23700, packPct: 10, unitPriceCents: 21330, lineTotalCents: 21330 });
    const single = item({ compoundSlug: "mots-c" });
    const r = applyPartnerCode(order([threePack, single]));
    expect(r.subtotalCents).toBe(28230);
    expect(r.partnerDiscountCents).toBe(690);
    expect(r.subtotalCents - r.partnerDiscountCents).toBe(27540);
    expect(r.shippingCents).toBe(0); // $275.40 ≥ $250
    expect(r.totalBeforeTaxCents).toBe(27540 + r.insuranceCents);
  });

  it("decides free shipping on the discounted amount", () => {
    // 4 singles at $69 = $276.00; after code $248.40 → shipping charged.
    const r = applyPartnerCode(order([item({ quantity: 4, lineTotalCents: 27600 })]));
    expect(r.partnerDiscountCents).toBe(2760);
    expect(r.shippingCents).toBe(1500);
  });
});
