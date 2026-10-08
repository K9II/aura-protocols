// Wholesale: made-to-order 10-vial kits (spec 2026-10-08-wholesale-kits-design.md).
// Pure — safe on client and server. Prices are always rebuilt server-side.
import { FREE_SHIPPING_MIN_CENTS, INSURANCE_CENTS, SHIPPING_FLAT_CENTS, type PricedItem, type Rejection } from "@/lib/pricing";
import { addDays, daysBetween } from "@/lib/today/time";
import type { OrderStatus } from "@/lib/order-status";

export const KIT_VIALS = 10;
export const MAX_KITS_PER_LINE = 50;
export const CUTOFF_ANCHOR = "2026-10-05";   // a Monday; runs close every wholesale_run_days from here
export const TESTED_BEFORE_SHIP_DAYS = 5;
export const WHOLESALE_TERMS_VERSION = "2026-10-08";

// Pricing (2026-10-08): the first tier starts at the order minimum. Each batch's
// independent lot test is absorbed in the kit price — never shown as a charge.
export type Tier = { minKits: number; pct: number };
export const DEFAULT_TIERS: Tier[] = [{ minKits: 5, pct: 20 }, { minKits: 10, pct: 25 }, { minKits: 20, pct: 30 }];

export type WholesaleSettings = {
  open: boolean; tiers: Tier[]; depositPct: number; balanceDays: number; runDays: number; leadDays: number; nextCutoffOverride: string | null;
  minKits: number;          // smallest order
};
export type PricingSettings = Pick<WholesaleSettings, "tiers" | "depositPct" | "minKits">;

// The terms a customer accepts to turn wholesale on (compliance-scanned copy).
export const WHOLESALE_TERMS = [
  "Kits are made to order and ship after their lot passes independent testing.",
  "Your deposit is refundable until the order-by date; after that it is kept unless the lot fails testing.",
  "The balance is due within 7 days of our email saying your kits passed; unpaid orders are cancelled and the deposit is kept.",
  "For laboratory research use only. Not for human or animal use, and not for resale for human use.",
];

// The kits pictured on the signed-out page, in order (slug, variant id).
export const FEATURED_KITS: Array<[string, string]> = [
  ["bpc-157", "10mg"], ["retatrutide", "10mg"], ["tesamorelin", "10mg"], ["ss-31", "50mg"], ["bpc-157-tb-500-ghk-cu", "70mg"],
];

export function parseWholesaleSettings(row: {
  wholesale_open: boolean; wholesale_tiers: unknown; wholesale_deposit_pct: number; wholesale_balance_days: number;
  wholesale_run_days: number; wholesale_lead_days: number; wholesale_next_cutoff: string | null;
  wholesale_min_kits: number;
}): WholesaleSettings {
  const tiers = row.wholesale_tiers;
  const ok = Array.isArray(tiers) && tiers.length > 0
    && tiers.every((t, i) => Number.isInteger(t?.minKits) && Number.isInteger(t?.pct) && t.pct > 0 && t.pct < 90
      && (i === 0 ? t.minKits === row.wholesale_min_kits : t.minKits > tiers[i - 1].minKits && t.pct >= tiers[i - 1].pct));
  if (!ok) throw new Error(`wholesale tiers are invalid: ${JSON.stringify(tiers)} (minimum ${row.wholesale_min_kits})`);
  return {
    open: row.wholesale_open, tiers: tiers as Tier[], depositPct: row.wholesale_deposit_pct, balanceDays: row.wholesale_balance_days,
    runDays: row.wholesale_run_days, leadDays: row.wholesale_lead_days, nextCutoffOverride: row.wholesale_next_cutoff,
    minKits: row.wholesale_min_kits,
  };
}

// Below the first tier (an order under the minimum) prices at the first tier.
export function tierFor(kits: number, tiers: Tier[]): Tier {
  return [...tiers].reverse().find((t) => kits >= t.minKits) ?? tiers[0];
}

// The next discount step above the current one (from below the minimum, the second tier).
export function nextTier(kits: number, tiers: Tier[]): { pct: number; kitsNeeded: number } | null {
  const t = tiers.find((x) => x.minKits > kits && x.pct > tierFor(kits, tiers).pct);
  return t ? { pct: t.pct, kitsNeeded: t.minKits - kits } : null;
}

export type KitRow = {
  slug: string; name: string; designation: string | null; chemicalClass: string; variantId: string; strength: string; priceUsd: number;
};
type LiveLike = {
  slug: string; name: string; designation?: string; chemicalClass: string;
  variants: Array<{ id: string; strength: string; priceUsd: number; wholesale: boolean }>;
};

// Every strength on the store with its Wholesale switch on (pass LiveCatalog.shown).
export function kitRows(shown: LiveLike[]): KitRow[] {
  return shown.flatMap((c) => c.variants.filter((v) => v.wholesale).map((v) => ({
    slug: c.slug, name: c.name, designation: c.designation ?? null, chemicalClass: c.chemicalClass, variantId: v.id, strength: v.strength, priceUsd: v.priceUsd,
  })));
}

// APro-designated compounds lead with the designation; the scientific name always shows alongside.
export function kitTitle(r: { name: string; designation: string | null }): { title: string; scientific: string | null } {
  return r.designation ? { title: r.designation, scientific: r.name } : { title: r.name, scientific: null };
}

export function featuredKits(rows: KitRow[]): KitRow[] {
  return FEATURED_KITS.flatMap(([slug, id]) => rows.filter((r) => r.slug === slug && r.variantId === id));
}

export type KitLine = { slug: string; variantId: string; kits: number };
export type WholesaleQuote = {
  items: PricedItem[]; rejected: Rejection[]; kits: number; tier: Tier;
  belowMinimum: boolean; kitsToMinimum: number;
  subtotalCents: number; shippingCents: number; insuranceCents: number;
  depositCents: number;             // charged at checkout (no tax): depositPct of the kits
  balanceBeforeTaxCents: number;    // the rest of the kits + shipping + insurance; tax is added from the checkout quote
  totalBeforeTaxCents: number;
};

export function priceWholesale(lines: KitLine[], rows: KitRow[], s: PricingSettings): WholesaleQuote {
  const rejected: Rejection[] = [];
  const merged = new Map<string, { row: KitRow; kits: number }>();
  for (const l of lines) {
    const row = rows.find((r) => r.slug === l.slug && r.variantId === l.variantId);
    if (!row) { rejected.push({ slug: l.slug, variantId: l.variantId, reason: "unknown" }); continue; }
    if (!Number.isInteger(l.kits) || l.kits < 1) { rejected.push({ slug: l.slug, variantId: l.variantId, reason: "bad_quantity" }); continue; }
    const key = `${l.slug}/${l.variantId}`;
    const kits = (merged.get(key)?.kits ?? 0) + l.kits;
    if (kits > MAX_KITS_PER_LINE) { rejected.push({ slug: l.slug, variantId: l.variantId, reason: "bad_quantity" }); merged.delete(key); continue; }
    merged.set(key, { row, kits });
  }
  const kits = [...merged.values()].reduce((n, m) => n + m.kits, 0);
  const tier = tierFor(kits, s.tiers);
  const items: PricedItem[] = [...merged.values()].map(({ row, kits: q }) => {
    const listUnitCents = Math.round(row.priceUsd * 100 * KIT_VIALS);
    const unitPriceCents = Math.round(listUnitCents * (1 - tier.pct / 100));
    return {
      compoundSlug: row.slug, compoundName: row.name, chemicalClass: row.chemicalClass, variantId: row.variantId, strength: row.strength,
      packQty: KIT_VIALS, quantity: q, listUnitCents, packPct: tier.pct, unitPriceCents, lineTotalCents: unitPriceCents * q,
      lotNumber: "",   // made to order: the run's lot is assigned when it passes (Part 2)
    };
  });
  const subtotalCents = items.reduce((n, i) => n + i.lineTotalCents, 0);
  const shippingCents = items.length === 0 || subtotalCents >= FREE_SHIPPING_MIN_CENTS ? 0 : SHIPPING_FLAT_CENTS;
  const insuranceCents = items.length === 0 ? 0 : INSURANCE_CENTS;
  const depositCents = Math.round(subtotalCents * s.depositPct / 100);
  const totalBeforeTaxCents = subtotalCents + shippingCents + insuranceCents;
  return {
    items, rejected, kits, tier, belowMinimum: kits < s.minKits, kitsToMinimum: Math.max(0, s.minKits - kits),
    subtotalCents, shippingCents, insuranceCents, depositCents, balanceBeforeTaxCents: totalBeforeTaxCents - depositCents, totalBeforeTaxCents,
  };
}

// The run an order placed on `today` (shop date, YYYY-MM-DD) joins: the owner's
// override while it hasn't passed, else the next date on the anchor's cadence.
// Orders placed on the cutoff day itself still join that run.
export function cutoffFor(today: string, s: { runDays: number; override: string | null }): string {
  if (s.override && s.override >= today) return s.override;
  const since = daysBetween(CUTOFF_ANCHOR, today);
  const k = Math.max(0, Math.ceil(since / s.runDays));
  return addDays(CUTOFF_ANCHOR, k * s.runDays);
}

export function estimatedDates(cutoff: string, leadDays: number): { testedAbout: string; shipsAbout: string } {
  const shipsAbout = addDays(cutoff, leadDays);
  return { testedAbout: addDays(shipsAbout, -TESTED_BEFORE_SHIP_DAYS), shipsAbout };
}

export function canCancelWholesale(o: { status: OrderStatus; wholesale_cutoff_on: string | null }, today: string): boolean {
  return o.status === "deposit_paid" && !!o.wholesale_cutoff_on && today <= o.wholesale_cutoff_on;
}
