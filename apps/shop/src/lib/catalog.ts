// RELATIVE IMPORTS ONLY (reachable from next.config.ts).
import { CHEMICAL_CLASSES, catalogContent } from "../data/catalog";
import { VIAL_LINE_MAX } from "./constants";
import type { ChemicalClass, Compound, Lot, PendingLot } from "../data/catalog";

// The catalog is always a parameter: storefront callers pass the live
// catalog (lib/catalog-live.ts); there are no code prices to fall back to.
export function findCompound(slug: string, list: Compound[]): Compound | undefined {
  return list.find((c) => c.slug === slug);
}

export function compoundsInClass(cls: ChemicalClass, list: Compound[]): Compound[] {
  return list.filter((c) => c.chemicalClass === cls);
}

export function relatedCompounds(c: Compound, count: number, list: Compound[]): Compound[] {
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

// The unit a strength is priced per: mass strengths per mg (mcg ÷ 1000),
// IU strengths per IU. Every unit the admin can store (mg, mcg, IU) reads;
// anything else throws so a typo can never print a wrong unit price.
export type PriceUnit = "mg" | "IU";
export function strengthInPriceUnit(strength: string): { amount: number; unit: PriceUnit } {
  const iu = strength.match(/^\s*([\d.]+)\s*IU\s*$/i);
  if (iu) return { amount: parseFloat(iu[1]), unit: "IU" };
  return { amount: strengthMg(strength), unit: "mg" };
}

export type PackOption = {
  qty: number;          // vials in the pack
  pct: number;          // pack discount
  packUsd: number;      // what the pack costs (same math as the cart line)
  listUsd: number;      // before the pack discount
  perVialUsd: number;
  perMgUsd: number;     // per mg — or per IU for an IU strength (strengthInPriceUnit)
  totalLabel: string;   // material in the pack, in the vial's unit: "20 mg", "500 mcg"
};

// Every pack size of one variant, priced for the product page.
export function packOptions(c: Compound, variantId: string): PackOption[] {
  const v = c.variants.find((x) => x.id === variantId);
  if (!v) return [];
  const [, amount, unit] = v.strength.match(/([\d.]+)\s*(\w+)/)!;
  const { amount: per } = strengthInPriceUnit(v.strength);
  return c.packDiscounts.map(({ qty, pct }) => {
    const packUsd = round2(v.priceUsd * qty * (1 - pct / 100));
    return {
      qty,
      pct,
      packUsd,
      listUsd: round2(v.priceUsd * qty),
      perVialUsd: perVialUsd(v.priceUsd, qty, c),
      perMgUsd: round2(packUsd / (per * qty)),
      totalLabel: `${round2(parseFloat(amount) * qty)} ${unit}`,
    };
  });
}

export function isPendingLot(lot: Lot | PendingLot): lot is PendingLot {
  return "pending" in lot;
}

// Designation of a compound (catalog content), or null. Shown with the
// scientific name, never instead of it: "GLOW (BPC-157 / TB-500 / GHK-Cu)".
// The GLP-1 APro names are stored in GLP_CODE_NAMES (data/glp-code-names.ts) and never shown (2026-10-10).
export function designationFor(slug: string): string | null {
  return catalogContent.find((c) => c.slug === slug)?.designation ?? null;
}

export function compoundTitle(c: { slug: string; name: string }): string {
  const d = designationFor(c.slug);
  return d ? `${d} (${c.name})` : c.name;
}

// Vial labels fit ~11 characters at the smallest name size (see Vial.tsx).
// A designation (APro name, blend nickname) leads; otherwise parenthetical
// synonyms drop ("PT-141 (Bremelanotide)" → "PT-141") and long blends show
// their first component plus "+".
export function vialLabel(c: { name: string; designation?: string | null }): string {
  if (c.designation) return c.designation;
  const name = c.name.replace(/\s*\([^)]*\)\s*$/, "");
  if (name.length <= 11 || !name.includes(" / ")) return name;
  return `${name.split(" / ")[0]} +`;
}

// The name as printed on the vial: one line, or two for a two-component blend
// without a nickname ("Retatrutide /" over "Cagrilintide", Alvester 2026-10-15,
// option A) so its full scientific name shows instead of "Retatrutide +".
// A nicknamed blend leads with its scientific name too (Alvester 2026-10-20, mock
// https://claude.ai/artifact/5Jztza1ZdMz4z1pz5GWGV3): two components "BPC-157 /" over
// "TB-500"; three or four two per line, "BPC-157 · TB-500" over "GHK-Cu · KPV" (Vial draws
// a line longer than VIAL_LINE_MAX a size smaller). The nickname moves to the small print (vialParts).
// VIAL_LINE_MAX lives in lib/constants.ts (the vial reads it without pulling in the catalog).
export { VIAL_LINE_MAX };
export function vialName(c: { name: string; designation?: string | null }): [string] | [string, string] {
  if (c.designation) {
    const parts = c.name.replace(/\s*\([^)]*\)\s*$/, "").split(" / ");
    if (parts.length === 2) return [`${parts[0]}\u00a0/`, parts[1]];
    if (parts.length === 3 || parts.length === 4) return [parts.slice(0, 2).join(" · "), parts.slice(2).join(" · ")];
    return [c.designation];
  }
  const one = vialLabel(c);
  if (!one.endsWith(" +")) return [one];
  const parts = c.name.replace(/\s*\([^)]*\)\s*$/, "").split(" / ");
  // A no-break space keeps the "/" on the first line when a narrow placard wraps.
  const lines: [string, string] = [`${parts[0]}\u00a0/`, parts[1]];
  if (parts.length !== 2 || lines.some((l) => l.length > VIAL_LINE_MAX)) return [one];
  return lines;
}

// A vial name with a line past VIAL_LINE_MAX ("BPC-157 · TB-500"): the vial draws it a size
// smaller, and so do the placards beside it (.s-name-long).
export function vialNameLong(c: { name: string; designation?: string | null }): boolean {
  return vialName(c).some((l) => l.length > VIAL_LINE_MAX);
}

// The small type on a nicknamed blend's vial, under its scientific name: the nickname in
// capitals ("WOLVERINE"), where LYOPHILIZED is on every other vial (2026-10-20). Nothing for
// anything else.
export function vialParts(c: { designation?: string | null; components?: string[] }): string[] {
  if (!c.designation || !c.components?.length) return [];
  return [c.designation.toUpperCase()];
}

// Cap colors rotate through the content catalog for variety; a compound keeps
// the same cap on its card and its product page, whatever is shown or hidden.
export type VialCap = "red" | "black" | "white";
const CAP_ROTATION: VialCap[] = ["red", "black", "white"];

export function vialCap(c: { slug: string }): VialCap {
  const i = catalogContent.findIndex((o) => o.slug === c.slug);
  return i < 0 ? "red" : CAP_ROTATION[i % CAP_ROTATION.length];
}

export function classCounts(list: Compound[]): Array<{ cls: ChemicalClass; count: number }> {
  return CHEMICAL_CLASSES.map((cls) => ({ cls, count: list.filter((c) => c.chemicalClass === cls).length }))
    .filter((x) => x.count > 0);
}

// "Made by" row in Compound data (the Material & testing section was removed
// 2026-10-10; testing is shown by the lot boxes, certificate and trust row).
// PLACEHOLDER until sourcing confirms each supplier's process — the release
// check fails while true.
export const MADE_BY_PLACEHOLDER = true;

const NOT_HPLC_PURIFIED = new Set(["nad-plus", "slu-pp-332"]);
const PROCESS: Record<string, string> = {
  "nad-plus": "Chemical synthesis",
  "slu-pp-332": "Chemical synthesis",
  "igf-1-lr3": "Recombinant expression",
  "glutathione": "Fermentation",
  "ghk-cu": "Solid-phase synthesis, then copper complexation",
};

export function madeBy(c: { slug: string }): string {
  const process = PROCESS[c.slug] ?? "Solid-phase synthesis";
  return NOT_HPLC_PURIFIED.has(c.slug) ? process : `${process}, HPLC-purified`;
}
