// One discount per line, never stacked: each line keeps its pack price or
// takes the partner code's 10% off list, whichever is lower for the customer.
// Pure — used by checkout (server) and the checkout form preview (client).
import { withCharges, type PricedOrder } from "@/lib/pricing";
import { CODE_DISCOUNT_PCT } from "@/lib/partners/tiers";

export type LineDiscount = { index: number; source: "code" | "pack" | "none"; savingCents: number };
export type DiscountedOrder = PricedOrder & { lineDiscounts: LineDiscount[] };

export function applyPartnerCode(priced: PricedOrder): DiscountedOrder {
  const lineDiscounts: LineDiscount[] = priced.items.map((i, index) => {
    const codeUnit = Math.round((i.listUnitCents * (100 - CODE_DISCOUNT_PCT)) / 100);
    if (codeUnit < i.unitPriceCents) return { index, source: "code", savingCents: (i.unitPriceCents - codeUnit) * i.quantity };
    return { index, source: i.packPct > 0 ? "pack" : "none", savingCents: 0 };
  });
  const partnerDiscountCents = lineDiscounts.reduce((s, d) => s + d.savingCents, 0);
  return { ...withCharges({ ...priced, partnerDiscountCents }), lineDiscounts };
}
