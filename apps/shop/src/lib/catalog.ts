// RELATIVE IMPORTS ONLY (reachable from next.config.ts).
import { CHEMICAL_CLASSES, compounds as listedCompounds } from "../data/catalog";
import type { ChemicalClass, Compound, Lot, PendingLot } from "../data/catalog";

export function findCompound(slug: string, list: Compound[] = listedCompounds): Compound | undefined {
  return list.find((c) => c.slug === slug);
}

export function compoundsInClass(cls: ChemicalClass, list: Compound[] = listedCompounds): Compound[] {
  return list.filter((c) => c.chemicalClass === cls);
}

export function relatedCompounds(c: Compound, count = 4, list: Compound[] = listedCompounds): Compound[] {
  const others = list.filter((o) => o.slug !== c.slug);
  const same = others.filter((o) => o.chemicalClass === c.chemicalClass);
  const rest = others.filter((o) => o.chemicalClass !== c.chemicalClass);
  return [...same, ...rest].slice(0, count);
}

export function fromPriceUsd(c: Compound): number {
  return Math.min(...c.variants.map((v) => v.priceUsd));
}

const round2 = (n: number) => Math.round(n * 100) / 100;

// Per-vial price inside a pack, after that pack's discount.
export function perVialUsd(priceUsd: number, packQty: number, c: Compound): number {
  const pct = c.packDiscounts.find((p) => p.qty === packQty)?.pct ?? 0;
  return round2(priceUsd * (1 - pct / 100));
}

// What the cheapest purchasable option costs: cheapest variant in the smallest pack.
export function fromPackPriceUsd(c: Compound): number {
  const smallest = c.packDiscounts.reduce((a, b) => (b.qty < a.qty ? b : a));
  return round2(Math.min(...c.variants.map((v) => v.priceUsd)) * smallest.qty * (1 - smallest.pct / 100));
}

// The priciest purchasable option: priciest variant in the largest pack.
export function toPackPriceUsd(c: Compound): number {
  const largest = c.packDiscounts.reduce((a, b) => (b.qty > a.qty ? b : a));
  return round2(Math.max(...c.variants.map((v) => v.priceUsd)) * largest.qty * (1 - largest.pct / 100));
}

export function isPendingLot(lot: Lot | PendingLot): lot is PendingLot {
  return "pending" in lot;
}

export function findLot(
  lotNo: string,
  list: Compound[] = listedCompounds,
): { compound: Compound; lot: Lot } | undefined {
  const needle = lotNo.trim().toUpperCase();
  for (const compound of list) {
    const lot = compound.currentLot;
    if (!isPendingLot(lot) && lot.lot.toUpperCase() === needle) return { compound, lot };
  }
  return undefined;
}

// Vial labels fit ~11 characters at the smallest name size (see Vial.tsx).
// Parenthetical synonyms drop ("PT-141 (Bremelanotide)" → "PT-141"); long
// blends show their first component plus "+".
export function vialLabel(c: Compound): string {
  const name = c.name.replace(/\s*\([^)]*\)\s*$/, "");
  if (name.length <= 11 || !name.includes(" / ")) return name;
  return `${name.split(" / ")[0]} +`;
}

export function classCounts(list: Compound[] = listedCompounds): Array<{ cls: ChemicalClass; count: number }> {
  return CHEMICAL_CLASSES.map((cls) => ({ cls, count: list.filter((c) => c.chemicalClass === cls).length }))
    .filter((x) => x.count > 0);
}
