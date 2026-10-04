import { describe, it, expect } from "vitest";
import { applyCodeDiscount, applyPartnerCode } from "@/lib/partners/discounts";
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
    expect(r.shippingCents).toBe(1500); // $275.40 < $300
    expect(r.totalBeforeTaxCents).toBe(27540 + 1500 + r.insuranceCents);
  });

  it("decides free shipping on the discounted amount", () => {
    // 2 vials at $160 = $320.00; after code $288.00 → shipping charged.
    const r = applyPartnerCode(order([item({ quantity: 2, listUnitCents: 16000, unitPriceCents: 16000, lineTotalCents: 32000 })]));
    expect(r.partnerDiscountCents).toBe(3200);
    expect(r.shippingCents).toBe(1500);
  });

  it("a partner code beats the 5% 2-pack discount (code is 10% off list)", () => {
    const twoPack = item({ packQty: 2, listUnitCents: 9800, packPct: 5, unitPriceCents: 9310, lineTotalCents: 9310 });
    const r = applyPartnerCode(order([twoPack]));
    expect(r.lineDiscounts[0]).toEqual({ index: 0, source: "code", savingCents: 490 }); // 9310 − 8820
  });
});

describe("applyCodeDiscount", () => {
  it("is what applyPartnerCode does at 10%", () => {
    const priced = order([
      item({ quantity: 2, lineTotalCents: 13800 }),
      item({ packQty: 3, listUnitCents: 23700, packPct: 10, unitPriceCents: 21330, lineTotalCents: 21330 }),
    ]);
    expect(applyCodeDiscount(priced, 10)).toEqual(applyPartnerCode(priced));
  });

  it("uses the given percentage, still never stacking on a better pack price", () => {
    const priced = order([
      item({}),
      item({ packQty: 10, listUnitCents: 79000, packPct: 20, unitPriceCents: 63200, lineTotalCents: 63200 }),
    ]);
    const r = applyCodeDiscount(priced, 15);
    expect(r.lineDiscounts).toEqual([{ index: 0, source: "code", savingCents: 1035 }, { index: 1, source: "pack", savingCents: 0 }]);
    expect(r.partnerDiscountCents).toBe(1035);
  });
});
