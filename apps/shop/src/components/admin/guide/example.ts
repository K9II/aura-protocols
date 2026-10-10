// The Discounts chapter's worked example, priced by the real engine so the
// Guide stays true when the store-wide maximum changes. Basket: Compound A
// (1 vial, no pack price) + Compound B (10-pack at the store's 10-pack price), with a
// 25%-off-items batch code (VIP-OCT-…). Server-only (engine → pricing → catalog).
import { applyDiscounts } from "@/lib/discounts/engine";
import { withCharges, type PricedItem } from "@/lib/pricing";
import type { CodeTerms } from "@/lib/discounts/rules";
import { STD_PACKS } from "@/data/catalog";

export const EXAMPLE_CODE = "VIP-OCT-H3XWA";
export const EXAMPLE_CODE_PCT = 25;
export const EXAMPLE_PACK_PCT = STD_PACKS.find((p) => p.qty === 10)?.pct ?? 0;

function item(slug: string, name: string, listUnitCents: number, packPct: number, packQty: number): PricedItem {
  const unit = Math.round((listUnitCents * (100 - packPct)) / 100);
  return { compoundSlug: slug, compoundName: name, chemicalClass: "example", variantId: slug, strength: "", packQty, quantity: 1, listUnitCents, packPct, unitPriceCents: unit, lineTotalCents: unit, lotNumber: "" };
}

const ITEMS = [item("a", "Compound A, 1 vial", 12_000, 0, 1), item("b", "Compound B, 10-pack", 50_000, EXAMPLE_PACK_PCT, 10)];
const CODE: CodeTerms = { kind: "item_pct", value: EXAMPLE_CODE_PCT, stackOnTop: false, freeShipping: false, minOrderCents: null, includeSlugs: [], excludeSlugs: [], includeClasses: [], excludeClasses: [] };

export type ExampleLine = { name: string; note: string; listCents: number; withoutCents: number; withCents: number };
export type Example = { lines: ExampleLine[]; listCents: number; withoutCents: number; goodsCents: number; offPct: number; capped: boolean; freeShipping: boolean };

export function vipExample(capPct: number): Example {
  const base = withCharges({ items: ITEMS, rejected: [], subtotalCents: ITEMS.reduce((s, i) => s + i.lineTotalCents, 0), partnerDiscountCents: 0, shippingCents: 0, insuranceCents: 0, totalBeforeTaxCents: 0 });
  const r = applyDiscounts(base, { auto: null, code: CODE, capPct });
  const lines = ITEMS.map((i, k) => ({
    name: i.compoundName,
    note: i.packPct ? `pack price is ${i.packPct}% off` : "no pack price",
    listCents: i.listUnitCents * i.quantity,
    withoutCents: i.lineTotalCents,
    withCents: i.lineTotalCents - r.lineDiscounts[k].savingCents,
  }));
  const goodsCents = r.subtotalCents - r.partnerDiscountCents;
  return {
    lines, listCents: r.listCents, withoutCents: r.subtotalCents, goodsCents,
    offPct: Math.round(((r.listCents - goodsCents) / r.listCents) * 100),
    capped: r.cappedCents > 0, freeShipping: r.shippingCents === 0,
  };
}
