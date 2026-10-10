// Wholesale kit margins (owner-only reference, 2026-10-10): what each kit and each
// order earns at each volume tier, from the live catalog price, the supplier box
// prices synced from AIOS, the lot-cost defaults in shop_settings and the AIOS
// reference figures (3PL, GLP-1 processor, lab price per strength, competitors). Pure.
import { KIT_VIALS, MIN_KITS_PER_STRENGTH, tierFor, type KitRow, type Tier } from "@/lib/wholesale/rules";

// Card fees on the two wholesale charges (deposit + balance).
export const CARD_PCT = 0.029;
export const CARD_FIXED_CENTS = 30;
export const CHARGES_PER_ORDER = 2;
// GLP-1 strengths never go through Stripe (AllayPay); their percent comes from AIOS.
export const GLP_CLASS = "Incretin & Amylin Analogs";

export type Fulfillment = {
  vendor: string; postageLabel: string; estimates: string[];
  pickFirstCents: number; pickAdditionalCents: number; insertCents: number; packagingCents: number;
  postageCents: number; insuranceCents: number; labelApplyPerVialCents: number;
};
export type Competitor = { who: string; mg: number; priceCents: number; sameStrengthCents: number };

export type CostInputs = {
  tiers: Tier[];
  minKits: number;
  lotTestCents: number;                       // flat fallback when the lab has no price for a strength
  labPerStrength?: Record<string, number>;    // "slug/variant" → the default lab's test price
  inboundPerBoxCents: number;                 // inbound freight + customs per box of 10
  labelPerVialCents: number;                  // label printing
  kitBoxCents: number;                        // branded box per kit
  fulfillment: Fulfillment | null;            // null = not synced: 3PL and postage left out
  insuranceChargedCents: number;              // what the buyer pays for insurance on each order
  glpPct: number | null;                      // null = not synced: GLP-1s priced at card rates
  competitors?: Record<string, Competitor[]>;
};

export type TierMargin = { pct: number; revenueCents: number; profitCents: number; marginPct: number };
export type SupplierCase = { supplier: string; boxCents: number; costCents: number; tiers: TierMargin[]; worst: TierMargin };
export type KitMargin = {
  key: string; name: string; strength: string; chemicalClass: string; kitListCents: number; suppliers: number;
  glp: boolean; labCents: number; competitors: Competitor[]; low: SupplierCase; high: SupplierCase;
};

export function processorFee(glp: boolean, revenueCents: number, c: Pick<CostInputs, "glpPct">): number {
  if (glp && c.glpPct != null) return revenueCents * (c.glpPct / 100);
  return revenueCents * CARD_PCT + CARD_FIXED_CENTS * CHARGES_PER_ORDER;
}

// 3PL cost of shipping one order of `kits` kits (each kit is one boxed pick, as in
// AIOS), less the insurance the buyer pays. 0 when the 3PL isn't synced.
export function orderFulfillmentCents(kits: number, c: Pick<CostInputs, "fulfillment" | "insuranceChargedCents">): number {
  const f = c.fulfillment;
  if (!f || kits < 1) return 0;
  return f.pickFirstCents + f.pickAdditionalCents * (kits - 1) + f.insertCents + f.packagingCents + f.postageCents + f.insuranceCents - c.insuranceChargedCents;
}

// Everything one kit costs before fees: box + inbound + labels (printed and applied) + kit box.
export function kitCostCents(boxCents: number, c: CostInputs): number {
  const apply = c.fulfillment?.labelApplyPerVialCents ?? 0;
  return boxCents + c.inboundPerBoxCents + (c.labelPerVialCents + apply) * KIT_VIALS + c.kitBoxCents;
}

export const labFor = (key: string, c: Pick<CostInputs, "labPerStrength" | "lotTestCents">) => c.labPerStrength?.[key] ?? c.lotTestCents;

// Per kit, with the 3PL for the smallest order shared by its kits (and, for
// `worst`, the strength's lot test shared by the fewest kits allowed per strength).
function tierMargin(pct: number, kitListCents: number, costCents: number, glp: boolean, c: CostInputs, extraCents = 0): TierMargin {
  const revenueCents = Math.round(kitListCents * (1 - pct / 100));
  const shipShare = orderFulfillmentCents(c.minKits, c) / Math.max(1, c.minKits);
  const profitCents = Math.round(revenueCents - costCents - processorFee(glp, revenueCents, c) - shipShare - extraCents);
  return { pct, revenueCents, profitCents, marginPct: revenueCents > 0 ? (profitCents / revenueCents) * 100 : 0 };
}

function supplierCase(supplier: string, boxCents: number, kitListCents: number, glp: boolean, labCents: number, c: CostInputs): SupplierCase {
  const costCents = kitCostCents(boxCents, c);
  const lowestDiscount = Math.min(...c.tiers.map((t) => t.pct));
  return {
    supplier, boxCents, costCents,
    tiers: c.tiers.map((t) => tierMargin(t.pct, kitListCents, costCents, glp, c)),
    worst: tierMargin(lowestDiscount, kitListCents, costCents, glp, c, labCents / MIN_KITS_PER_STRENGTH),
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
    const glp = r.chemicalClass === GLP_CLASS;
    const labCents = labFor(key, c);
    const [lo, hi] = [boxes[0], boxes[boxes.length - 1]];
    out.push({
      key, name, strength: r.strength, chemicalClass: r.chemicalClass, kitListCents, suppliers: boxes.length, glp, labCents,
      competitors: [...(c.competitors?.[key] ?? [])].sort((a, b) => a.sameStrengthCents - b.sameStrengthCents),
      low: supplierCase(lo[0], lo[1], kitListCents, glp, labCents, c), high: supplierCase(hi[0], hi[1], kitListCents, glp, labCents, c),
    });
  }
  return { rows: out, missing };
}

// One order: its lines' kits at the order's tier, each strength's lot test (paid in
// full: the order is alone in its run, the worst case), the processor (a GLP-1 line
// sends the whole order to the GLP-1 processor), the 3PL for the whole order.
export type OrderLine = { m: KitMargin; kits: number };
export type OrderMargin = {
  kits: number; tier: Tier; belowMinimum: boolean; revenueCents: number; productCents: number; labCents: number;
  feesCents: number; fulfillmentCents: number; profitCents: number; marginPct: number; perVialCents: number; glp: boolean;
};
export function orderMargin(lines: OrderLine[], mode: "low" | "high", c: CostInputs): OrderMargin {
  const used = lines.filter((l) => l.kits > 0);
  const kits = used.reduce((n, l) => n + l.kits, 0);
  const tier = tierFor(kits, c.tiers);
  const revenueCents = used.reduce((n, l) => n + Math.round(l.m.kitListCents * (1 - tier.pct / 100)) * l.kits, 0);
  const productCents = used.reduce((n, l) => n + l.m[mode].costCents * l.kits, 0);
  const labCents = used.reduce((n, l) => n + l.m.labCents, 0);
  const glp = used.some((l) => l.m.glp);
  const feesCents = kits ? Math.round(processorFee(glp, revenueCents, c)) : 0;
  const fulfillmentCents = orderFulfillmentCents(kits, c);
  const profitCents = revenueCents - productCents - labCents - feesCents - fulfillmentCents;
  return {
    kits, tier, belowMinimum: kits < c.minKits, revenueCents, productCents, labCents, feesCents, fulfillmentCents, profitCents,
    marginPct: revenueCents > 0 ? (profitCents / revenueCents) * 100 : 0,
    perVialCents: kits ? Math.round(profitCents / (kits * KIT_VIALS)) : 0, glp,
  };
}

export function median(values: number[]): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
