// One discount per line, never stacked: each line keeps its pack price or
// takes the code's 10% off list (partner or welcome code), whichever is lower for the customer.
// Pure — used by checkout (server) and the checkout form preview (client).
import { withCharges, type PricedOrder } from "@/lib/pricing";
import { CODE_DISCOUNT_PCT } from "@/lib/partners/tiers";

export type LineDiscount = { index: number; source: "code" | "pack" | "none"; savingCents: number };
export type DiscountedOrder = PricedOrder & { lineDiscounts: LineDiscount[] };

// Any 10%-off-list code (partner code or subscriber welcome code) uses the
// same rule: per line, the larger of the pack discount or the code.
export function applyCodeDiscount(priced: PricedOrder, pct: number): DiscountedOrder {
  const lineDiscounts: LineDiscount[] = priced.items.map((i, index) => {
    const codeUnit = Math.round((i.listUnitCents * (100 - pct)) / 100);
    if (codeUnit < i.unitPriceCents) return { index, source: "code", savingCents: (i.unitPriceCents - codeUnit) * i.quantity };
    return { index, source: i.packPct > 0 ? "pack" : "none", savingCents: 0 };
  });
  const partnerDiscountCents = lineDiscounts.reduce((s, d) => s + d.savingCents, 0);
  return { ...withCharges({ ...priced, partnerDiscountCents }), lineDiscounts };
}

export function applyPartnerCode(priced: PricedOrder): DiscountedOrder {
  return applyCodeDiscount(priced, CODE_DISCOUNT_PCT);
}
