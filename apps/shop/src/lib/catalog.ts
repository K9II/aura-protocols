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

// "10 mg" → 10, "250 mcg" → 0.25. Throws on any other unit so a typo can
// never print a wrong price per mg.
export function strengthMg(strength: string): number {
  const m = strength.match(/^\s*([\d.]+)\s*(mg|mcg)\s*$/i);
  if (!m) throw new Error(`Unreadable strength: "${strength}"`);
  const amount = parseFloat(m[1]);
  return m[2].toLowerCase() === "mcg" ? amount / 1000 : amount;
}

export type PackOption = {
  qty: number;          // vials in the pack
  pct: number;          // pack discount
  packUsd: number;      // what the pack costs (same math as the cart line)
  listUsd: number;      // before the pack discount
  perVialUsd: number;
  perMgUsd: number;
  totalLabel: string;   // material in the pack, in the vial's unit: "20 mg", "500 mcg"
};

// Every pack size of one variant, priced for the product page.
export function packOptions(c: Compound, variantId: string): PackOption[] {
  const v = c.variants.find((x) => x.id === variantId);
  if (!v) return [];
  const [, amount, unit] = v.strength.match(/([\d.]+)\s*(\w+)/)!;
  const mg = strengthMg(v.strength);
  return c.packDiscounts.map(({ qty, pct }) => {
    const packUsd = round2(v.priceUsd * qty * (1 - pct / 100));
    return {
      qty,
      pct,
      packUsd,
      listUsd: round2(v.priceUsd * qty),
      perVialUsd: perVialUsd(v.priceUsd, qty, c),
      perMgUsd: round2(packUsd / (mg * qty)),
      totalLabel: `${round2(parseFloat(amount) * qty)} ${unit}`,
    };
  });
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

// Cap colors rotate through the listed catalog for variety; a compound keeps
// the same cap on its card and its product page.
export type VialCap = "red" | "black" | "white";
const CAP_ROTATION: VialCap[] = ["red", "black", "white"];

export function vialCap(c: Compound): VialCap {
  const i = listedCompounds.findIndex((o) => o.slug === c.slug);
  return i < 0 ? "red" : CAP_ROTATION[i % CAP_ROTATION.length];
}

export function classCounts(list: Compound[] = listedCompounds): Array<{ cls: ChemicalClass; count: number }> {
  return CHEMICAL_CLASSES.map((cls) => ({ cls, count: list.filter((c) => c.chemicalClass === cls).length }))
    .filter((x) => x.count > 0);
}

// Material & testing (spec §4). PLACEHOLDER until sourcing confirms the
// supplier's process and our lab's panel — the release check fails while true.
export const MATERIAL_TESTING_PLACEHOLDER = true;

export type MaterialRow = { label: string; value: string };

const NON_PEPTIDE = new Set(["nad-plus", "slu-pp-332"]);
const SYNTHESIS: Record<string, string> = {
  "nad-plus": "Chemical synthesis",
  "slu-pp-332": "Chemical synthesis",
  "igf-1-lr3": "Recombinant expression",
  "glutathione": "Fermentation",
  "ghk-cu": "Solid-phase peptide synthesis (SPPS), then copper complexation",
};

export function materialTestingRows(c: Compound): MaterialRow[] {
  const rows: MaterialRow[] = [{ label: "Synthesis", value: SYNTHESIS[c.slug] ?? "Solid-phase peptide synthesis (SPPS)" }];
  if (!NON_PEPTIDE.has(c.slug)) rows.push({ label: "Purification", value: "Preparative HPLC" });
  rows.push(
    { label: "Identity", value: "Mass spectrometry, every lot" },
    { label: "Purity", value: "Analytical HPLC, every lot" },
    { label: "Certificate", value: "Posted for each lot before it ships" },
  );
  return rows;
}
