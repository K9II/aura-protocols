import { describe, it, expect } from "vitest";
import { basketOrder, typicalBaskets, worstCase } from "@/lib/discounts/preview";
import type { CodeTerms } from "@/lib/discounts/rules";
import type { Compound } from "@/data/catalog";

const packs = [{ qty: 2, pct: 5 }, { qty: 5, pct: 10 }, { qty: 10, pct: 20 }];
const mk = (slug: string, cls: Compound["chemicalClass"], usd: number, featured = false): Compound => ({
  slug, name: slug.toUpperCase(), chemicalClass: cls, identity: {}, form: "", storage: "", vialMl: 3, featured,
  variants: [{ id: "10mg", strength: "10 mg", priceUsd: usd, stock: "in" }], packDiscounts: packs, currentLot: { pending: true },
});
const list = [mk("mots-c", "Mitochondrial & Metabolic", 69), mk("bpc-157", "Peptide Fragments", 79, true), mk("blend", "Blends", 99)];
const spring: CodeTerms = { kind: "order_pct", value: 20, stackOnTop: true, freeShipping: true, minOrderCents: 15000, includeSlugs: [], excludeSlugs: [], includeClasses: [], excludeClasses: ["Blends"] };

describe("basket previews", () => {
  it("builds a priced basket even for a pending-lot compound", () => {
    const o = basketOrder(list[1], 10);
    expect(o.items[0]).toMatchObject({ listUnitCents: 79000, unitPriceCents: 63200, chemicalClass: "Peptide Fragments" });
  });

  it("typical baskets: cheapest eligible 2-pack, then the featured compound at 2/5/10", () => {
    const rows = typicalBaskets(spring, list, 30);
    expect(rows.map((r) => r.label)).toEqual(["MOTS-C × 2", "BPC-157 × 2", "BPC-157 × 5", "BPC-157 × 10"]);
    expect(rows[0]).toMatchObject({ codeUsed: false, note: "under the $150 minimum" });
    expect(rows[3]).toMatchObject({ paysCents: 55300, offPct: 30, capped: true });
  });

  it("worst case considers the new-account percent and reports the cap", () => {
    const w = worstCase(spring, list, 30)!;
    expect(w.offPct).toBe(30);
    expect(w.capped).toBe(true);
    expect(w.uncappedOffPct).toBeGreaterThan(30);
  });

  it("worst case is null when no listed item is eligible", () => {
    expect(worstCase({ ...spring, includeClasses: ["Cofactors & Conjugates"] }, list, 30)).toBeNull();
  });
});
