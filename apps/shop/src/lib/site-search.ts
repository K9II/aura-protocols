import type { ChemicalClass, Compound } from "@/data/catalog";
import { CHEMICAL_CLASSES } from "@/data/catalog";
import { isPendingLot } from "@/lib/catalog";
import { LOT_NUMBER_RE } from "@/lib/catalog-ops/rules";

// Storefront search (nav → SiteSearch, mock approved 2026-10-14). Pure: the
// browser searches the live, shown catalog it already has (CartProvider).

export const SEARCH_MAX_RESULTS = 8;

// "Popular searches" before typing: the featured compounds, then the first blend nickname.
export function popularSearches(catalog: Compound[]): string[] {
  const featured = catalog.filter((c) => c.featured).map((c) => c.name);
  const nickname = catalog.find((c) => c.designation)?.designation;
  return nickname ? [...featured, nickname] : featured;
}

// Classes that have at least one shown compound, in catalog order.
export function searchClasses(catalog: Compound[]): Array<{ cls: ChemicalClass; count: number }> {
  return CHEMICAL_CLASSES.map((cls) => ({ cls, count: catalog.filter((c) => c.chemicalClass === cls).length }))
    .filter((x) => x.count > 0);
}

// Lowercase letters, digits and "+" only: "bpc 157", "BPC-157" and "bpc157" all match.
export function normalizeQuery(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9+]/g, "");
}

// Best first: name starts with it, nickname starts with it, name contains it, nickname contains it, class contains it.
function rank(c: Compound, q: string): number {
  const name = normalizeQuery(c.name);
  const des = c.designation ? normalizeQuery(c.designation) : "";
  if (name.startsWith(q)) return 0;
  if (des.startsWith(q)) return 1;
  if (name.includes(q)) return 2;
  if (des.includes(q)) return 3;
  if (normalizeQuery(c.chemicalClass).includes(q)) return 4;
  return -1;
}

// Compounds matching the query, within one class when a class is picked.
// A class with no query lists the whole class in catalog order.
export function searchCompounds(catalog: Compound[], query: string, cls: ChemicalClass | null = null): Compound[] {
  const pool = cls ? catalog.filter((c) => c.chemicalClass === cls) : catalog;
  const q = normalizeQuery(query);
  if (!q) return cls ? pool : [];
  return pool
    .map((c, i) => ({ c, i, r: rank(c, q) }))
    .filter((x) => x.r >= 0)
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .slice(0, SEARCH_MAX_RESULTS)
    .map((x) => x.c);
}

export type LotSuggestion = { lot: string; compound: Compound | null; strength: string | null };

// A lot-number row: the lot selling now on a shown strength (named), or —
// when the query says "lot …" or matches no compound — a COA Lookup for it.
export function lotSuggestion(catalog: Compound[], query: string, compoundHits: number): LotSuggestion | null {
  const said = /^\s*lot\b/i.test(query);
  const lot = query.replace(/^\s*lot[\s#:]*/i, "").trim().toUpperCase();
  if (!LOT_NUMBER_RE.test(lot) || !/\d/.test(lot)) return null;
  for (const c of catalog) {
    for (const v of c.variants) {
      if (!isPendingLot(v.lot) && v.lot.lot.toUpperCase() === lot) return { lot: v.lot.lot, compound: c, strength: v.strength };
    }
  }
  return said || compoundHits === 0 ? { lot, compound: null, strength: null } : null;
}

// the lot's certificate page (an unknown lot comes back to the lookup)
export function coaLookupHref(lot: string): string {
  return `/coa/${encodeURIComponent(lot)}`;
}

export function shopClassHref(cls: ChemicalClass): string {
  return `/products?cat=${encodeURIComponent(cls)}`;
}
