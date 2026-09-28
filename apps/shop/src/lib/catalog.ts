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

// Vial labels have ~14 characters of room at the approved label size.
export function vialLabel(c: Compound): string {
  if (c.name.length <= 14 || !c.name.includes(" / ")) return c.name;
  return `${c.name.split(" / ")[0]} +`;
}

export function classCounts(list: Compound[] = listedCompounds): Array<{ cls: ChemicalClass; count: number }> {
  return CHEMICAL_CLASSES.map((cls) => ({ cls, count: list.filter((c) => c.chemicalClass === cls).length }))
    .filter((x) => x.count > 0);
}
