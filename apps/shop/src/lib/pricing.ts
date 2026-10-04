// Server-authoritative order pricing. The browser's cart is only a list of
// (slug, variant, pack, quantity); every price, discount and shipping charge
// is rebuilt here from the catalog. Pure — safe to import on client and server.
import { compounds as listedCompounds, type Compound } from "@/data/catalog";
import { FLAT_SHIPPING_USD, FREE_SHIPPING_THRESHOLD_USD, SHIPPING_INSURANCE_USD, type CartLine } from "@/lib/cart";
import { isPendingLot } from "@/lib/catalog";

export const SHIPPING_FLAT_CENTS = Math.round(FLAT_SHIPPING_USD * 100);
export const FREE_SHIPPING_MIN_CENTS = Math.round(FREE_SHIPPING_THRESHOLD_USD * 100);
export const INSURANCE_CENTS = Math.round(SHIPPING_INSURANCE_USD * 100);
export const MAX_PACKS_PER_LINE = 50;

export type PricedItem = {
  compoundSlug: string;
  compoundName: string;
  chemicalClass: string;  // for include/exclude rules on discount codes
  variantId: string;
  strength: string;
  packQty: number;
  quantity: number;
  listUnitCents: number;  // one pack at list price, before any discount
  packPct: number;        // pack discount already in unitPriceCents (5, 10, 20)
  unitPriceCents: number; // one pack, after the pack discount
  lineTotalCents: number;
  lotNumber: string;
};

export type RejectReason = "unknown" | "pending_lot" | "out_of_stock" | "bad_pack" | "bad_quantity";
export type Rejection = { slug: string; variantId: string; reason: RejectReason };

export type PricedOrder = {
  items: PricedItem[];
  rejected: Rejection[];
  subtotalCents: number;         // items at pack prices
  partnerDiscountCents: number;  // every discount beyond pack price (partner code, new-account percent, discount code), after the store-wide cap — set by lib/discounts/engine.ts; 0 here. Legacy name (orders.partner_discount_cents).
  freeShipping?: boolean;        // a free-shipping discount code applies
  shippingCents: number;         // decided on subtotal − partner discount, or 0 with freeShipping
  insuranceCents: number;
  totalBeforeTaxCents: number;   // subtotal − partner discount + shipping + insurance
};

export function priceOrder(lines: CartLine[], list: Compound[] = listedCompounds): PricedOrder {
  const items: PricedItem[] = [];
  const rejected: Rejection[] = [];
  for (const line of lines) {
    const reject = (reason: RejectReason) => rejected.push({ slug: line.slug, variantId: line.variantId, reason });
    const c = list.find((x) => x.slug === line.slug);
    const v = c?.variants.find((x) => x.id === line.variantId);
    if (!c || !v) { reject("unknown"); continue; }
    if (isPendingLot(c.currentLot)) { reject("pending_lot"); continue; }
    if (v.stock === "out") { reject("out_of_stock"); continue; }
    const pack = c.packDiscounts.find((p) => p.qty === line.packQty);
    if (!pack) { reject("bad_pack"); continue; }
    if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > MAX_PACKS_PER_LINE) { reject("bad_quantity"); continue; }
    const listUnitCents = Math.round(v.priceUsd * 100 * line.packQty);
    const unitPriceCents = Math.round(listUnitCents * (1 - pack.pct / 100));
    items.push({
      compoundSlug: c.slug, compoundName: c.name, chemicalClass: c.chemicalClass, variantId: v.id, strength: v.strength,
      packQty: line.packQty, quantity: line.quantity, listUnitCents, packPct: pack.pct, unitPriceCents,
      lineTotalCents: unitPriceCents * line.quantity, lotNumber: c.currentLot.lot,
    });
  }
  const subtotalCents = items.reduce((s, i) => s + i.lineTotalCents, 0);
  return withCharges({ items, rejected, subtotalCents, partnerDiscountCents: 0, shippingCents: 0, insuranceCents: 0, totalBeforeTaxCents: 0 });
}

// Recomputes shipping, insurance and the pre-tax total from subtotal − partner
// discount. Exported so lib/partners/discounts.ts applies the same rule.
export function withCharges(o: PricedOrder): PricedOrder {
  const goods = o.subtotalCents - o.partnerDiscountCents;
  const shippingCents = o.items.length === 0 || o.freeShipping || goods >= FREE_SHIPPING_MIN_CENTS ? 0 : SHIPPING_FLAT_CENTS;
  const insuranceCents = o.items.length === 0 ? 0 : INSURANCE_CENTS;
  return { ...o, shippingCents, insuranceCents, totalBeforeTaxCents: goods + shippingCents + insuranceCents };
}
