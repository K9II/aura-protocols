// Merges code content with the database (catalog-ops.sql) into the shapes
// the storefront renders. Pure. Fail-closed: a product without a row is
// hidden, strengths come only from the database (hidden or archived ones
// never sell), drafts never appear.
import type { CatalogEntry, LiveCompound, LiveVariant, Lot, PendingLot, PublicCert, PublicLot, StockState } from "@/data/catalog-types";
import { visibleCerts, type CertRow, type CoaSettings } from "@/lib/coa/visibility";
import { certVerifyUrl, measuredPct } from "@/lib/coa/rules";

export type LotStockRow = {
  id: string; lot_number: string; slug: string; variant_id: string;
  purity_pct: number | null; method: "HPLC" | "HPLC+MS" | null; tested_on: string | null; coa_path: string | null;
  status: "draft" | "live" | "retired"; live_at: string | null;
  sellable: number; held: number; sold: number; available: number;
  purity_ok: boolean; endotoxin_ok: boolean;
};
export type CatalogOps = {
  products: Array<{ slug: string; shown: boolean }>;
  variants: Array<{
    slug: string; variant_id: string; strength: string; price_cents: number; low_at: number; threepl_sku: string | null;
    shown: boolean; archived_at: string | null; wholesale?: boolean;
  }>;
  lots: LotStockRow[];   // live + retired only (fetchCatalogOps filters drafts)
  certificates: CertRow[];   // non-draft lots only
  coa: CoaSettings;
};
export type LiveCatalog<C extends string = string> = { all: LiveCompound<C>[]; shown: LiveCompound<C>[]; lots: PublicLot[]; certificates: PublicCert[] };

// Sort order for strengths: mass units by amount in mg (mcg ÷ 1000), then IU
// by amount. Unknown shapes sort last.
export function strengthSortKey(strength: string): number {
  const m = /^(\d+(?:\.\d+)?) (mg|mcg|IU)$/.exec(strength);
  if (!m) return Number.MAX_SAFE_INTEGER;
  const n = Number(m[1]);
  return m[2] === "mg" ? n : m[2] === "mcg" ? n / 1000 : 1e9 + n;
}
export const byStrength = (a: { strength: string }, b: { strength: string }) =>
  strengthSortKey(a.strength) - strengthSortKey(b.strength) || a.strength.localeCompare(b.strength);

export function stockState(available: number, lowAt: number): StockState {
  if (available <= 0) return "out";
  return available <= lowAt ? "low" : "in";
}

// Public lots are live/retired, so the headline certificate always exists;
// these fallbacks only satisfy the type.
const toLot = (r: LotStockRow, coaUrl: (p: string) => string): Lot => ({
  lot: r.lot_number, purityPct: Number(r.purity_pct ?? 0), method: r.method ?? "HPLC", testedOn: r.tested_on ?? "", coaFile: r.coa_path ? coaUrl(r.coa_path) : "",
});
const byLiveAt = (a: LotStockRow, b: LotStockRow) => (a.live_at ?? "").localeCompare(b.live_at ?? "") || a.lot_number.localeCompare(b.lot_number);

export function mergeCatalog<C extends string>(content: CatalogEntry<C>[], ops: CatalogOps, coaUrl: (path: string) => string): LiveCatalog<C> {
  const shownBySlug = new Map(ops.products.map((p) => [p.slug, p.shown]));
  const lotsFor = (slug: string, variantId: string) =>
    ops.lots.filter((l) => l.slug === slug && l.variant_id === variantId && l.live_at).sort(byLiveAt);

  const all: LiveCompound<C>[] = [];
  const shown: LiveCompound<C>[] = [];
  const lots: PublicLot[] = [];
  const publicLot = new Map<string, { pub: PublicLot; chemicalClass: string }>();
  for (const c of content) {
    if (!shownBySlug.has(c.slug)) continue;
    const productShown = shownBySlug.get(c.slug) === true;
    const rows = ops.variants.filter((v) => v.slug === c.slug).sort(byStrength);
    const variants: LiveVariant[] = [];
    for (const row of rows) {
      const ever = lotsFor(c.slug, row.variant_id);
      // Public lot list (COA lookup, lot alerts, cart emails): shown products
      // only, including hidden and archived strengths — a customer may hold a
      // vial from one. onStore says whether its strength is selling now.
      if (productShown) {
        for (const l of ever) {
          const pub: PublicLot = {
            ...toLot(l, coaUrl), slug: c.slug, compoundName: c.name, variantId: row.variant_id, strength: row.strength, liveAt: l.live_at!,
            status: l.status === "retired" ? "retired" : l.available > 0 ? "live" : "sold_out",
            onStore: row.shown && !row.archived_at,
          };
          lots.push(pub);
          publicLot.set(l.id, { pub, chemicalClass: c.chemicalClass });
        }
      }
      if (row.archived_at) continue;
      const live = ever.filter((l) => l.status === "live" && l.coa_path);
      const availableVials = Math.max(0, live.reduce((s, l) => s + Math.max(0, l.available), 0));
      const selling = live.find((l) => l.available > 0) ?? live[live.length - 1];
      const lot: Lot | PendingLot = selling ? toLot(selling, coaUrl) : { pending: true };
      variants.push({
        id: row.variant_id, strength: row.strength, shown: row.shown,
        priceUsd: row.price_cents / 100, stock: stockState(availableVials, row.low_at), lot,
        wholesale: row.wholesale !== false,
      });
    }
    if (!variants.length) continue;
    all.push({ ...c, variants });
    // The storefront, cart, pricing and sitemap: product shown AND strength shown.
    const onStore = variants.filter((v) => v.shown);
    if (productShown && onStore.length) shown.push({ ...c, variants: onStore });
  }

  const shownCerts = visibleCerts(ops.certificates.filter((r) => publicLot.has(r.lot_id)), ops.coa);
  const labsByLot = new Map<string, Set<string>>();
  for (const r of shownCerts) (labsByLot.get(r.lot_id) ?? labsByLot.set(r.lot_id, new Set()).get(r.lot_id)!).add(r.lab_id);
  const certificates: PublicCert[] = shownCerts.map((r) => {
    const { pub, chemicalClass } = publicLot.get(r.lot_id)!;
    const measured = ops.coa.showMeasured ? r.measured_mg : null;
    return {
      id: r.id, lot: pub.lot, slug: pub.slug, compoundName: pub.compoundName, chemicalClass, strength: pub.strength,
      lotStatus: pub.status, shipping: pub.status === "live" && pub.onStore,
      labName: r.lab.name, labCity: r.lab.city, labIso: r.lab.iso17025,
      reportNumber: r.report_number, verifyUrl: certVerifyUrl(r.lab.verify_url_template, r.report_number, r.verify_code),
      testedOn: r.tested_on, coaFile: coaUrl(r.coa_path), purityPct: r.purity_pct, method: r.method,
      measuredMg: measured, measuredPct: measuredPct(measured, pub.strength),
      tests: { identity: r.identity, endotoxin: r.endotoxin, sterility: r.sterility, heavy_metals: r.heavy_metals, fentanyl: r.fentanyl },
      failed: r.result === "fail", note: r.note, correction: r.correction_note, correctedAt: r.corrected_at,
      // "Re-tested · N labs" only means something once customers can actually
      // see every certificate — off, they see one (the headline) per kind.
      labsOnLot: ops.coa.showAll ? labsByLot.get(r.lot_id)!.size : 1,
    };
  });
  return { all, shown, lots, certificates };
}

// RELEASE_CHECK (tests/release/catalog-release.test.ts): every code product
// has a row; every strength on the store can actually be sold.
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
