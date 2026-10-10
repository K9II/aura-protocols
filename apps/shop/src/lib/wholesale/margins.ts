// Wholesale kit margins (owner-only reference, 2026-10-10): what each kit earns at
// each volume tier, from the live catalog price, the supplier box prices synced from
// AIOS and the lot-cost defaults in shop_settings. Pure.
import { KIT_VIALS, type KitRow, type Tier } from "@/lib/wholesale/rules";

// Card fees on the two wholesale charges (deposit + balance).
export const CARD_PCT = 0.029;
export const CARD_FIXED_CENTS = 30;
export const CHARGES_PER_ORDER = 2;

export type CostInputs = {
  tiers: Tier[];
  lotTestCents: number;          // absorbed; carried in full by a lone kit (worst case)
  inboundPerBoxCents: number;    // inbound freight + customs per box of 10
  labelPerVialCents: number;
};

export type TierMargin = { pct: number; revenueCents: number; profitCents: number; marginPct: number };
export type SupplierCase = { supplier: string; boxCents: number; costCents: number; tiers: TierMargin[]; worst: TierMargin };
export type KitMargin = { key: string; name: string; strength: string; chemicalClass: string; kitListCents: number; low: SupplierCase; high: SupplierCase; suppliers: number };

const tierMargin = (pct: number, kitListCents: number, costCents: number, extraCents = 0): TierMargin => {
  const revenueCents = Math.round(kitListCents * (1 - pct / 100));
  const feesCents = revenueCents * CARD_PCT + CARD_FIXED_CENTS * CHARGES_PER_ORDER;
  const profitCents = Math.round(revenueCents - costCents - feesCents - extraCents);
  return { pct, revenueCents, profitCents, marginPct: revenueCents > 0 ? (profitCents / revenueCents) * 100 : 0 };
};

function supplierCase(supplier: string, boxCents: number, kitListCents: number, c: CostInputs): SupplierCase {
  const costCents = boxCents + c.inboundPerBoxCents + c.labelPerVialCents * KIT_VIALS;
  const lowestDiscount = Math.min(...c.tiers.map((t) => t.pct));
  return {
    supplier, boxCents, costCents,
    tiers: c.tiers.map((t) => tierMargin(t.pct, kitListCents, costCents)),
    worst: tierMargin(lowestDiscount, kitListCents, costCents, c.lotTestCents),
  };
}

// rows: every strength offered as a kit; prices: "slug/variant" → supplier → box cents.
export function kitMargins(rows: KitRow[], prices: Record<string, Record<string, number>>, c: CostInputs): { rows: KitMargin[]; missing: string[] } {
  const out: KitMargin[] = [];
  const missing: string[] = [];
  for (const r of rows) {
    const key = `${r.slug}/${r.variantId}`;
    const name = r.designation ? `${r.designation} (${r.name})` : r.name;
    const boxes = Object.entries(prices[key] ?? {}).sort((a, b) => a[1] - b[1]);
    if (!boxes.length) { missing.push(`${name} ${r.strength}`); continue; }
    const kitListCents = Math.round(r.priceUsd * 100) * KIT_VIALS;
    const [lo, hi] = [boxes[0], boxes[boxes.length - 1]];
    out.push({
      key, name, strength: r.strength, chemicalClass: r.chemicalClass, kitListCents, suppliers: boxes.length,
      low: supplierCase(lo[0], lo[1], kitListCents, c), high: supplierCase(hi[0], hi[1], kitListCents, c),
    });
  }
  return { rows: out, missing };
}

export function median(values: number[]): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
