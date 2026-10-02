import { describe, it, expect } from "vitest";
import type { Compound } from "@/data/catalog";
import {
  findCompound, compoundsInClass, relatedCompounds,
  isPendingLot, findLot, vialLabel, classCounts,
  fromPackPriceUsd, toPackPriceUsd, perVialUsd,
} from "@/lib/catalog";
import { compounds } from "@/data/catalog";

const base = {
  identity: {}, form: "Lyophilized powder", storage: "−20 °C", vialMl: 3,
  packDiscounts: [{ qty: 1, pct: 0 }, { qty: 3, pct: 10 }],
} satisfies Pick<Compound, "identity" | "form" | "storage" | "vialMl" | "packDiscounts">;

const fixture: Compound[] = [
  { ...base, slug: "a", name: "Alpha", chemicalClass: "Peptide Fragments",
    variants: [{ id: "5mg", strength: "5 mg", priceUsd: 49, stock: "in" }, { id: "10mg", strength: "10 mg", priceUsd: 79, stock: "in" }],
    currentLot: { lot: "AP-0001", purityPct: 99.6, method: "HPLC", testedOn: "2026-09-01", coaFile: "/coa/AP-0001.pdf" } },
  { ...base, slug: "b", name: "Beta", chemicalClass: "Peptide Fragments",
    variants: [{ id: "5mg", strength: "5 mg", priceUsd: 59, stock: "low" }], currentLot: { pending: true } },
  { ...base, slug: "c", name: "Gamma", chemicalClass: "Blends", components: ["a", "b"],
    variants: [{ id: "blend", strength: "10 mg", priceUsd: 99, stock: "in" }],
    currentLot: { lot: "AP-0003", purityPct: 99.1, method: "HPLC+MS", testedOn: "2026-09-02", coaFile: "" } },
];

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
    expect(isPendingLot(fixture[1].currentLot)).toBe(true);
    expect(isPendingLot(fixture[0].currentLot)).toBe(false);
  });

  it("finds a lot case-insensitively and ignores pending lots", () => {
    expect(findLot("ap-0003", fixture)?.compound.slug).toBe("c");
    expect(findLot("AP-9999", fixture)).toBeUndefined();
  });

  it("shortens long blend names for the vial label", () => {
    expect(vialLabel({ ...fixture[2], name: "BPC-157 / TB-500 / GHK-Cu" })).toBe("BPC-157 +");
    expect(vialLabel(fixture[0])).toBe("Alpha");
    expect(vialLabel({ ...fixture[0], name: "PT-141 (Bremelanotide)" })).toBe("PT-141");
    expect(vialLabel({ ...fixture[0], name: "SS-31 (Elamipretide)" })).toBe("SS-31");
  });

  // Measured in-browser 2026-09-28: at the smallest name size (10.5) an
  // 11-character label ends at x≈82 of the 94-unit label edge.
  it("keeps every listed compound's vial label within 11 characters", () => {
    for (const c of compounds) expect(vialLabel(c).length, c.slug).toBeLessThanOrEqual(11);
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
      { id: "5mg", strength: "5 mg", priceUsd: 49, stock: "in" as const },
      { id: "10mg", strength: "10 mg", priceUsd: 79, stock: "in" as const },
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
