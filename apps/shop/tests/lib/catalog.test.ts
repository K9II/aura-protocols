import { describe, it, expect } from "vitest";
import type { Compound } from "@/data/catalog";
import {
  findCompound, compoundsInClass, relatedCompounds,
  isPendingLot, vialLabel, vialCap, classCounts, strengthMg, packOptions, strengthInPriceUnit,
  fromPackPriceUsd, toPackPriceUsd, perVialUsd,
} from "@/lib/catalog";
import { catalogContent } from "@/data/catalog";
import { liveFixture } from "../helpers/live-catalog";
import { linePriceUsd } from "@/lib/cart";

const base = {
  identity: {}, form: "Lyophilized powder", storage: "−20 °C", vialMl: 3,
  packDiscounts: [{ qty: 1, pct: 0 }, { qty: 3, pct: 10 }],
} satisfies Pick<Compound, "identity" | "form" | "storage" | "vialMl" | "packDiscounts">;

const lotA = { lot: "AP-0001", purityPct: 99.6, method: "HPLC" as const, testedOn: "2026-09-01", coaFile: "/coa/AP-0001.pdf" };
const lotC = { lot: "AP-0003", purityPct: 99.1, method: "HPLC+MS" as const, testedOn: "2026-09-02", coaFile: "" };
const fixture: Compound[] = [
  { ...base, slug: "a", name: "Alpha", chemicalClass: "Peptide Fragments",
    variants: [{ id: "5mg", strength: "5 mg", shown: true, priceUsd: 49, stock: "in", availableVials: 50, lot: lotA }, { id: "10mg", strength: "10 mg", shown: true, priceUsd: 79, stock: "in", availableVials: 50, lot: lotA }] },
  { ...base, slug: "b", name: "Beta", chemicalClass: "Peptide Fragments",
    variants: [{ id: "5mg", strength: "5 mg", shown: true, priceUsd: 59, stock: "out", availableVials: 0, lot: { pending: true } }] },
  { ...base, slug: "c", name: "Gamma", chemicalClass: "Blends", components: ["a", "b"],
    variants: [{ id: "blend", strength: "10 mg", shown: true, priceUsd: 99, stock: "in", availableVials: 50, lot: lotC }] },
];
const compounds = liveFixture();

describe("catalog helpers", () => {
  it("finds a compound by slug", () => {
    expect(findCompound("b", fixture)?.name).toBe("Beta");
    expect(findCompound("nope", fixture)).toBeUndefined();
  });

  it("filters by chemical class", () => {
    expect(compoundsInClass("Peptide Fragments", fixture).map((c) => c.slug)).toEqual(["a", "b"]);
  });

  it("puts same-class compounds first in related, excludes self, caps the count", () => {
    expect(relatedCompounds(fixture[0], 2, fixture).map((c) => c.slug)).toEqual(["b", "c"]);
    expect(relatedCompounds(fixture[0], 1, fixture).map((c) => c.slug)).toEqual(["b"]);
  });

  it("detects pending lots", () => {
    expect(isPendingLot(fixture[1].variants[0].lot)).toBe(true);
    expect(isPendingLot(fixture[0].variants[0].lot)).toBe(false);
  });

  it("shortens long blend names for the vial label", () => {
    expect(vialLabel({ ...fixture[2], name: "BPC-157 / TB-500 / GHK-Cu" })).toBe("BPC-157 +");
    expect(vialLabel(fixture[0])).toBe("Alpha");
    expect(vialLabel({ ...fixture[0], name: "PT-141 (Bremelanotide)" })).toBe("PT-141");
    expect(vialLabel({ ...fixture[0], name: "SS-31 (Elamipretide)" })).toBe("SS-31");
  });

  // Measured in-browser 2026-09-28: at the smallest name size (10.5) an
  // 11-character label ends at x≈82 of the 94-unit label edge.
  // Shown-at-launch products (the incretin & amylin analogs are hidden).
  it("keeps every shown-at-launch compound's vial label within 11 characters", () => {
    for (const c of catalogContent.filter((x) => x.chemicalClass !== "Incretin & Amylin Analogs")) expect(vialLabel(c).length, c.slug).toBeLessThanOrEqual(11);
  });

  it("rotates vial caps red → black → white through the content catalog", () => {
    expect(catalogContent.slice(0, 4).map(vialCap)).toEqual(["red", "black", "white", "red"]);
  });

  it("keeps a compound's cap whatever is shown or hidden", () => {
    const shownOnly = compounds.filter((c) => c.chemicalClass !== "Incretin & Amylin Analogs");
    const i = catalogContent.findIndex((c) => c.slug === shownOnly[0].slug);
    expect(vialCap(shownOnly[0])).toBe((["red", "black", "white"] as const)[i % 3]);
  });

  it("gives a compound outside the content catalog a red cap", () => {
    expect(vialCap({ ...fixture[0], slug: "not-listed" })).toBe("red");
  });

  it("reads a vial strength in mg", () => {
    expect(strengthMg("10 mg")).toBe(10);
    expect(strengthMg("250 mcg")).toBe(0.25);
    expect(strengthMg("500 mg")).toBe(500);
    expect(() => strengthMg("10 IU")).toThrow();
  });

  it("parses every listed strength", () => {
    for (const c of compounds) for (const v of c.variants) expect(strengthMg(v.strength), `${c.slug} ${v.strength}`).toBeGreaterThan(0);
  });

  it("prices each pack: total, mg in the pack, per vial and per mg", () => {
    const bpc = compounds.find((c) => c.slug === "bpc-157")!;   // $79 / 10 mg vial
    expect(packOptions(bpc, "10mg")).toEqual([
      { qty: 2, pct: 5, packUsd: 150.1, listUsd: 158, perVialUsd: 75.05, perMgUsd: 7.51, totalLabel: "20 mg" },
      { qty: 5, pct: 10, packUsd: 355.5, listUsd: 395, perVialUsd: 71.1, perMgUsd: 7.11, totalLabel: "50 mg" },
      { qty: 10, pct: 20, packUsd: 632, listUsd: 790, perVialUsd: 63.2, perMgUsd: 6.32, totalLabel: "100 mg" },
    ]);
  });

  it("labels mcg packs in mcg and prices them per mg", () => {
    const slu = compounds.find((c) => c.slug === "slu-pp-332")!;   // 250 mcg vials
    const [two] = packOptions(slu, slu.variants[0].id);
    expect(two.totalLabel).toBe("500 mcg");
    expect(two.perMgUsd).toBeCloseTo(two.packUsd / 0.5, 2);
  });

  it("prices IU strengths per IU and never throws on a stored unit", () => {
    expect(strengthInPriceUnit("5000 IU")).toEqual({ amount: 5000, unit: "IU" });
    expect(strengthInPriceUnit("250 mcg")).toEqual({ amount: 0.25, unit: "mg" });
    expect(strengthInPriceUnit("10 mg")).toEqual({ amount: 10, unit: "mg" });
    expect(() => strengthInPriceUnit("10 ml")).toThrow();
    const bpc = compounds.find((c) => c.slug === "bpc-157")!;
    const iu = { ...bpc, variants: [{ ...bpc.variants[0], id: "5000iu", strength: "5000 IU", priceUsd: 400 }] };
    expect(packOptions(iu, "5000iu")[0]).toEqual(
      { qty: 2, pct: 5, packUsd: 760, listUsd: 800, perVialUsd: 380, perMgUsd: 0.08, totalLabel: "10000 IU" },
    );
  });

  it("matches the cart's line price for every listed pack", () => {
    for (const c of compounds) for (const v of c.variants) for (const o of packOptions(c, v.id)) {
      expect(o.packUsd, `${c.slug} ${v.id} ×${o.qty}`).toBe(linePriceUsd({ slug: c.slug, variantId: v.id, packQty: o.qty, quantity: 1 }, compounds));
    }
  });

  it("counts compounds per class in CHEMICAL_CLASSES order, omitting empty classes", () => {
    expect(classCounts(fixture)).toEqual([
      { cls: "Peptide Fragments", count: 2 },
      { cls: "Blends", count: 1 },
    ]);
  });
});

describe("pack prices", () => {
  const c = {
    ...fixture[0],
    variants: [
      { id: "5mg", strength: "5 mg", shown: true, priceUsd: 49, stock: "in" as const, availableVials: 50, lot: lotA },
      { id: "10mg", strength: "10 mg", shown: true, priceUsd: 79, stock: "in" as const, availableVials: 50, lot: lotA },
    ],
    packDiscounts: [{ qty: 2, pct: 5 }, { qty: 5, pct: 10 }, { qty: 10, pct: 20 }],
  };
  it("from = cheapest variant in the smallest pack, after its discount", () => {
    expect(fromPackPriceUsd(c)).toBe(93.1);   // 49 × 2 × 0.95
  });
  it("to = priciest variant in the largest pack, after its discount", () => {
    expect(toPackPriceUsd(c)).toBe(632);      // 79 × 10 × 0.80
  });
  it("per-vial price after a pack's discount", () => {
    expect(perVialUsd(49, 2, c)).toBe(46.55);
    expect(perVialUsd(49, 10, c)).toBe(39.2);
  });
});
