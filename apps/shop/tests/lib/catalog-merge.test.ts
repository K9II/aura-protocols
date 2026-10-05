import { describe, it, expect } from "vitest";
import { mergeCatalog, stockState, catalogReleaseProblems, type CatalogOps, type LotStockRow } from "@/lib/catalog-merge";
import type { CatalogEntry } from "@/data/catalog-types";

const entry = (slug: string, variants: string[] = ["10mg"]): CatalogEntry => ({
  slug, name: slug.toUpperCase(), chemicalClass: "Peptide Fragments", identity: {}, form: "Lyophilized powder",
  storage: "cold", vialMl: 3, variants: variants.map((id) => ({ id, strength: id.replace("mg", " mg") })),
  packDiscounts: [{ qty: 2, pct: 5 }],
});
const lot = (over: Partial<LotStockRow>): LotStockRow => ({
  id: "l1", lot_number: "BPC-2609-01", slug: "bpc-157", variant_id: "10mg", purity_pct: 99.4, method: "HPLC+MS",
  tested_on: "2026-09-18", coa_path: "BPC-2609-01/1.pdf", status: "live", live_at: "2026-09-24T00:00:00Z",
  sellable: 200, held: 0, sold: 0, available: 200, ...over,
});
const ops = (over: Partial<CatalogOps> = {}): CatalogOps => ({
  products: [{ slug: "bpc-157", shown: true }],
  variants: [{ slug: "bpc-157", variant_id: "10mg", price_cents: 7900, low_at: 20, threepl_sku: null }],
  lots: [],
  ...over,
});
const url = (p: string) => `https://x/coa/${p}`;

describe("stockState", () => {
  it("out at 0, low at or under the level, else in", () => {
    expect(stockState(0, 20)).toBe("out");
    expect(stockState(-3, 20)).toBe("out");
    expect(stockState(20, 20)).toBe("low");
    expect(stockState(21, 20)).toBe("in");
  });
});

describe("mergeCatalog", () => {
  it("prices from the database; no lot → out of stock, COA pending", () => {
    const m = mergeCatalog([entry("bpc-157")], ops(), url);
    expect(m.shown).toHaveLength(1);
    expect(m.shown[0].variants[0]).toMatchObject({ priceUsd: 79, stock: "out", availableVials: 0, lot: { pending: true } });
  });

  it("a product with no row, or with shown = false, is hidden; a strength with no row is dropped", () => {
    const m = mergeCatalog([entry("bpc-157", ["10mg", "20mg"]), entry("tb-500")], ops(), url);
    expect(m.shown.map((c) => c.slug)).toEqual(["bpc-157"]);
    expect(m.all.map((c) => c.slug)).toEqual(["bpc-157"]);
    expect(m.shown[0].variants.map((v) => v.id)).toEqual(["10mg"]);
    const hidden = mergeCatalog([entry("bpc-157")], ops({ products: [{ slug: "bpc-157", shown: false }] }), url);
    expect(hidden.shown).toEqual([]);
    expect(hidden.all).toHaveLength(1);
  });

  it("sums available over live lots and sells the oldest lot that has vials", () => {
    const m = mergeCatalog([entry("bpc-157")], ops({ lots: [
      lot({ id: "a", lot_number: "BPC-2608-01", live_at: "2026-08-01T00:00:00Z", available: 0, sold: 200 }),
      lot({ id: "b", lot_number: "BPC-2609-01", live_at: "2026-09-01T00:00:00Z", available: 12 }),
      lot({ id: "c", lot_number: "BPC-2610-01", live_at: "2026-10-01T00:00:00Z", available: 200 }),
    ] }), url);
    const v = m.shown[0].variants[0];
    expect(v.availableVials).toBe(212);
    expect(v.stock).toBe("in");
    expect(v.lot).toEqual({ lot: "BPC-2609-01", purityPct: 99.4, method: "HPLC+MS", testedOn: "2026-09-18", coaFile: "https://x/coa/BPC-2609-01/1.pdf" });
  });

  it("all live lots sold out → out of stock, showing the last live lot", () => {
    const m = mergeCatalog([entry("bpc-157")], ops({ lots: [lot({ available: 0, sold: 200 })] }), url);
    expect(m.shown[0].variants[0]).toMatchObject({ stock: "out", lot: { lot: "BPC-2609-01" } });
  });

  it("retired lots never sell but stay in the public lot list", () => {
    const m = mergeCatalog([entry("bpc-157")], ops({ lots: [lot({ status: "retired", available: 40 })] }), url);
    expect(m.shown[0].variants[0].stock).toBe("out");
    expect(m.lots).toEqual([expect.objectContaining({ lot: "BPC-2609-01", status: "retired", compoundName: "BPC-157", strength: "10 mg" })]);
  });

  it("marks a live lot with nothing left as sold_out in the public list", () => {
    const m = mergeCatalog([entry("bpc-157")], ops({ lots: [lot({ available: 0, sold: 200 })] }), url);
    expect(m.lots[0].status).toBe("sold_out");
  });
});

describe("catalogReleaseProblems", () => {
  it("flags shown strengths without a live certified lot and code products without a row", () => {
    const problems = catalogReleaseProblems([entry("bpc-157"), entry("tb-500")], ops(), url);
    expect(problems).toEqual(["tb-500: no catalog_products row", "bpc-157 10mg: no live lot with a certificate"]);
    expect(catalogReleaseProblems([entry("bpc-157")], ops({ lots: [lot({})] }), url)).toEqual([]);
  });
});
