import { describe, it, expect } from "vitest";
import { mergeCatalog, stockState, catalogReleaseProblems, strengthSortKey, type CatalogOps, type LotStockRow } from "@/lib/catalog-merge";
import type { CatalogEntry } from "@/data/catalog-types";

const entry = (slug: string): CatalogEntry => ({
  slug, name: slug.toUpperCase(), chemicalClass: "Peptide Fragments", identity: {}, form: "Lyophilized powder",
  storage: "cold", vialMl: 3, packDiscounts: [{ qty: 2, pct: 5 }],
});
type VariantRow = CatalogOps["variants"][number];
const vrow = (slug: string, strength: string, over: Partial<VariantRow> = {}): VariantRow => ({
  slug, variant_id: strength.replace(/\s+/g, "").toLowerCase(), strength, price_cents: 7900, low_at: 20, threepl_sku: null,
  shown: true, archived_at: null, ...over,
});
const lot = (over: Partial<LotStockRow>): LotStockRow => ({
  id: "l1", lot_number: "BPC-2609-01", slug: "bpc-157", variant_id: "10mg", purity_pct: 99.4, method: "HPLC+MS",
  tested_on: "2026-09-18", coa_path: "BPC-2609-01/1.pdf", status: "live", live_at: "2026-09-24T00:00:00Z",
  sellable: 200, held: 0, sold: 0, available: 200, ...over,
});
const ops = (over: Partial<CatalogOps> = {}): CatalogOps => ({
  products: [{ slug: "bpc-157", shown: true }],
  variants: [vrow("bpc-157", "10 mg")],
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
    expect(m.shown[0].variants[0]).toMatchObject({ priceUsd: 79, stock: "out", lot: { pending: true } });
  });

  it("a product with no row, or with shown = false, is hidden; strengths come from the database only", () => {
    const m = mergeCatalog([entry("bpc-157"), entry("tb-500")], ops(), url);
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
    expect(v).not.toHaveProperty("availableVials"); // counts never reach the browser (competitors read page data)
    expect(v.stock).toBe("in");
    // low stock still comes from the sum over live lots (12 + 15 > low_at 20; either alone would be low)
    const two = mergeCatalog([entry("bpc-157")], ops({ lots: [
      lot({ id: "d", lot_number: "BPC-2609-02", live_at: "2026-09-01T00:00:00Z", available: 12 }),
      lot({ id: "e", lot_number: "BPC-2610-02", live_at: "2026-10-01T00:00:00Z", available: 15 }),
    ] }), url);
    expect(two.shown[0].variants[0].stock).toBe("in");
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

  it("keeps a hidden product's lots out of the public lot list", () => {
    const m = mergeCatalog([entry("bpc-157"), entry("tb-500")], ops({
      products: [{ slug: "bpc-157", shown: true }, { slug: "tb-500", shown: false }],
      variants: [vrow("bpc-157", "10 mg", { low_at: 10 }), vrow("tb-500", "10 mg", { price_cents: 8900, low_at: 10 })],
      lots: [lot({}), lot({ id: "l2", lot_number: "TB-2609-01", slug: "tb-500" })],
    }), url);
    expect(m.all.map((c) => c.slug)).toEqual(["bpc-157", "tb-500"]);
    expect(m.all[1].variants[0].lot).toMatchObject({ lot: "TB-2609-01" });
    expect(m.lots.map((l) => l.lot)).toEqual(["BPC-2609-01"]);
  });

  it("marks a live lot with nothing left as sold_out in the public list", () => {
    const m = mergeCatalog([entry("bpc-157")], ops({ lots: [lot({ available: 0, sold: 200 })] }), url);
    expect(m.lots[0].status).toBe("sold_out");
  });

  it("carries the per-strength wholesale switch (default on when the column is missing)", () => {
    const ops = { products: [{ slug: "bpc-157", shown: true }], lots: [],
      variants: [
        { slug: "bpc-157", variant_id: "10mg", strength: "10 mg", price_cents: 6800, low_at: 5, threepl_sku: null, shown: true, archived_at: null, wholesale: false },
        { slug: "bpc-157", variant_id: "5mg", strength: "5 mg", price_cents: 4200, low_at: 5, threepl_sku: null, shown: true, archived_at: null },
      ] };
    const live = mergeCatalog([{ slug: "bpc-157", name: "BPC-157", chemicalClass: "Peptide", packDiscounts: [] } as never], ops as never, (p) => p);
    const v = Object.fromEntries(live.all[0].variants.map((x) => [x.id, x.wholesale]));
    expect(v).toEqual({ "5mg": true, "10mg": false });
  });
});

describe("strengths from the database", () => {
  const ss31 = (variants: VariantRow[], lots: LotStockRow[] = []) =>
    mergeCatalog([entry("ss-31")], ops({ products: [{ slug: "ss-31", shown: true }], variants, lots }), url);

  it("sorts strengths: mcg, then mg by amount, IU last", () => {
    const m = ss31([vrow("ss-31", "50 mg"), vrow("ss-31", "5000 IU"), vrow("ss-31", "250 mcg"), vrow("ss-31", "10 mg"), vrow("ss-31", "1.5 mg")]);
    expect(m.all[0].variants.map((v) => v.strength)).toEqual(["250 mcg", "1.5 mg", "10 mg", "50 mg", "5000 IU"]);
    expect(m.all[0].variants.map((v) => v.id)).toEqual(["250mcg", "1.5mg", "10mg", "50mg", "5000iu"]);
  });

  it("a hidden strength is in all (marked) but not on the store", () => {
    const m = ss31([vrow("ss-31", "10 mg"), vrow("ss-31", "30 mg", { shown: false })]);
    expect(m.all[0].variants.map((v) => [v.id, v.shown])).toEqual([["10mg", true], ["30mg", false]]);
    expect(m.shown[0].variants.map((v) => v.id)).toEqual(["10mg"]);
  });

  it("an archived strength is in neither all nor shown", () => {
    const m = ss31([vrow("ss-31", "10 mg"), vrow("ss-31", "50 mg", { archived_at: "2026-10-04T09:02:00Z" })]);
    expect(m.all[0].variants.map((v) => v.id)).toEqual(["10mg"]);
    expect(m.shown[0].variants.map((v) => v.id)).toEqual(["10mg"]);
  });

  it("a product with no strength on the store is left out of shown (but stays in all)", () => {
    const m = ss31([vrow("ss-31", "30 mg", { shown: false })]);
    expect(m.shown).toEqual([]);
    expect(m.all.map((c) => c.slug)).toEqual(["ss-31"]);
  });

  it("public lots keep hidden and archived strengths' lots, marked off the store", () => {
    const m = ss31(
      [vrow("ss-31", "10 mg"), vrow("ss-31", "30 mg", { shown: false }), vrow("ss-31", "50 mg", { archived_at: "2026-10-04T09:02:00Z" })],
      [lot({ id: "a", lot_number: "SS10-1", slug: "ss-31", variant_id: "10mg" }), lot({ id: "b", lot_number: "SS30-1", slug: "ss-31", variant_id: "30mg" }),
       lot({ id: "c", lot_number: "SS50-1", slug: "ss-31", variant_id: "50mg", status: "retired" })],
    );
    expect(m.lots.map((l) => [l.lot, l.strength, l.onStore])).toEqual([["SS10-1", "10 mg", true], ["SS30-1", "30 mg", false], ["SS50-1", "50 mg", false]]);
  });

  it("strengthSortKey: mcg ÷ 1000, IU after every mass unit", () => {
    expect(strengthSortKey("250 mcg")).toBe(0.25);
    expect(strengthSortKey("10 mg")).toBe(10);
    expect(strengthSortKey("1 IU")).toBeGreaterThan(strengthSortKey("100000 mg"));
  });
});

describe("catalogReleaseProblems", () => {
  it("flags shown strengths without a live certified lot and code products without a row", () => {
    const problems = catalogReleaseProblems([entry("bpc-157"), entry("tb-500")], ops(), url);
    expect(problems).toEqual(["tb-500: no catalog_products row", "bpc-157 10mg: no live lot with a certificate"]);
    expect(catalogReleaseProblems([entry("bpc-157")], ops({ lots: [lot({})] }), url)).toEqual([]);
  });
  it("a hidden or archived strength needs no live lot", () => {
    const variants = [vrow("bpc-157", "10 mg"), vrow("bpc-157", "20 mg", { shown: false }), vrow("bpc-157", "50 mg", { archived_at: "2026-10-04T00:00:00Z" })];
    expect(catalogReleaseProblems([entry("bpc-157")], ops({ variants, lots: [lot({})] }), url)).toEqual([]);
  });
});
