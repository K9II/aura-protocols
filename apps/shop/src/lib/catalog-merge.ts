// Merges code content with the database (catalog-ops.sql) into the shapes
// the storefront renders. Pure. Fail-closed: a product without a row is
// hidden, a strength without a row isn't sold, drafts never appear.
import type { CatalogEntry, LiveCompound, LiveVariant, Lot, PendingLot, PublicLot, StockState } from "@/data/catalog-types";

export type LotStockRow = {
  id: string; lot_number: string; slug: string; variant_id: string;
  purity_pct: number; method: "HPLC" | "HPLC+MS"; tested_on: string; coa_path: string | null;
  status: "draft" | "live" | "retired"; live_at: string | null;
  sellable: number; held: number; sold: number; available: number;
};
export type CatalogOps = {
  products: Array<{ slug: string; shown: boolean }>;
  variants: Array<{ slug: string; variant_id: string; price_cents: number; low_at: number; threepl_sku: string | null }>;
  lots: LotStockRow[];   // live + retired only (fetchCatalogOps filters drafts)
};
export type LiveCatalog<C extends string = string> = { all: LiveCompound<C>[]; shown: LiveCompound<C>[]; lots: PublicLot[] };

export function stockState(available: number, lowAt: number): StockState {
  if (available <= 0) return "out";
  return available <= lowAt ? "low" : "in";
}

const toLot = (r: LotStockRow, coaUrl: (p: string) => string): Lot => ({
  lot: r.lot_number, purityPct: Number(r.purity_pct), method: r.method, testedOn: r.tested_on, coaFile: r.coa_path ? coaUrl(r.coa_path) : "",
});
const byLiveAt = (a: LotStockRow, b: LotStockRow) => (a.live_at ?? "").localeCompare(b.live_at ?? "") || a.lot_number.localeCompare(b.lot_number);

export function mergeCatalog<C extends string>(content: CatalogEntry<C>[], ops: CatalogOps, coaUrl: (path: string) => string): LiveCatalog<C> {
  const shownBySlug = new Map(ops.products.map((p) => [p.slug, p.shown]));
  const variantRow = new Map(ops.variants.map((v) => [`${v.slug}:${v.variant_id}`, v]));
  const lotsFor = (slug: string, variantId: string) =>
    ops.lots.filter((l) => l.slug === slug && l.variant_id === variantId && l.live_at).sort(byLiveAt);

  const all: LiveCompound<C>[] = [];
  const shown: LiveCompound<C>[] = [];
  const lots: PublicLot[] = [];
  for (const c of content) {
    if (!shownBySlug.has(c.slug)) continue;
    const variants: LiveVariant[] = [];
    for (const v of c.variants) {
      const row = variantRow.get(`${c.slug}:${v.id}`);
      if (!row) continue;
      const ever = lotsFor(c.slug, v.id);
      const live = ever.filter((l) => l.status === "live" && l.coa_path);
      const availableVials = Math.max(0, live.reduce((s, l) => s + Math.max(0, l.available), 0));
      const selling = live.find((l) => l.available > 0) ?? live[live.length - 1];
      const lot: Lot | PendingLot = selling ? toLot(selling, coaUrl) : { pending: true };
      variants.push({ ...v, priceUsd: row.price_cents / 100, stock: stockState(availableVials, row.low_at), availableVials, lot });
      for (const l of ever) {
        lots.push({
          ...toLot(l, coaUrl), slug: c.slug, compoundName: c.name, variantId: v.id, strength: v.strength, liveAt: l.live_at!,
          status: l.status === "retired" ? "retired" : l.available > 0 ? "live" : "sold_out",
        });
      }
    }
    if (!variants.length) continue;
    const compound: LiveCompound<C> = { ...c, variants };
    all.push(compound);
    if (shownBySlug.get(c.slug)) shown.push(compound);
  }
  return { all, shown, lots };
}

// RELEASE_CHECK (tests/release/catalog-release.test.ts): every code product
// has a row; every shown strength can actually be sold.
export function catalogReleaseProblems(content: CatalogEntry[], ops: CatalogOps, coaUrl: (path: string) => string): string[] {
  const rows = new Set(ops.products.map((p) => p.slug));
  const problems = content.filter((c) => !rows.has(c.slug)).map((c) => `${c.slug}: no catalog_products row`);
  for (const c of mergeCatalog(content, ops, coaUrl).shown) {
    for (const v of c.variants) {
      if (!ops.lots.some((l) => l.slug === c.slug && l.variant_id === v.id && l.status === "live" && l.coa_path)) {
        problems.push(`${c.slug} ${v.id}: no live lot with a certificate`);
      }
    }
  }
  return problems;
}
