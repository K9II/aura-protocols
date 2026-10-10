import { describe, it, expect } from "vitest";
import { catalogContent as compounds, CHEMICAL_CLASSES } from "@/data/catalog";

// Slugs with no registered CAS number. Each entry needs a comment naming the
// primary source consulted. Keep empty unless fetch-identity proved it.
const NO_CAS = new Set<string>([]);

const isBlend = (c: (typeof compounds)[number]) => c.components !== undefined;

describe("catalog integrity", () => {
  // Which are shown is Aura Store's call (catalog_products.shown; the seed
  // hides the six incretin & amylin analogs — tests/data/catalog-ops-sql.test.ts).
  // Strengths live in Aura Store (catalog_variants, managed in /admin/catalog);
  // the seed's strengths are checked in tests/data/catalog-ops-sql.test.ts.
  it("has the 29 catalog compounds, content only (no strengths, prices, stock or lots)", () => {
    expect(compounds).toHaveLength(29);
    for (const c of compounds) {
      expect(c, c.slug).not.toHaveProperty("currentLot");
      expect(c, c.slug).not.toHaveProperty("variants");
    }
  });

  it("has unique slugs", () => {
    expect(new Set(compounds.map((c) => c.slug)).size).toBe(compounds.length);
  });

  it("uses only known chemical classes", () => {
    for (const c of compounds) expect(CHEMICAL_CLASSES).toContain(c.chemicalClass);
  });

  it("never uses coded names or 'stack'", () => {
    for (const c of compounds) {
      expect(c.name).not.toMatch(/stack/i);
      expect(c.name).not.toMatch(/\b(GLP-\dR|GIP\d-|IP\d-)/);
    }
  });

  it("gives every non-blend compound formula, MW and a source (CAS unless exempted)", () => {
    for (const c of compounds.filter((x) => !isBlend(x))) {
      expect(c.identity.formula, c.slug).toBeTruthy();
      expect(c.identity.molecularWeight, c.slug).toMatch(/g\/mol$/);
      expect(c.identity.source, c.slug).toMatch(/^https:\/\//);
      if (!NO_CAS.has(c.slug)) expect(c.identity.cas, c.slug).toMatch(/^\d{2,7}-\d{2}-\d$/);
    }
  });

  it("offers 2 / 5 / 10-vial packs at 5 / 10 / 15% off, and no single vial", () => {
    for (const c of compounds) {
      expect(c.packDiscounts, c.slug).toEqual([{ qty: 2, pct: 5 }, { qty: 5, pct: 10 }, { qty: 10, pct: 15 }]);
    }
  });

  it("only references real compounds as blend components", () => {
    const slugs = new Set(compounds.map((c) => c.slug));
    for (const c of compounds) for (const s of c.components ?? []) expect(slugs.has(s), `${c.slug}→${s}`).toBe(true);
  });

  it("features exactly four compounds, none of them incretin & amylin analogs", () => {
    const featured = compounds.filter((c) => c.featured);
    expect(featured).toHaveLength(4);
    expect(featured.some((c) => c.chemicalClass === "Incretin & Amylin Analogs")).toBe(false);
  });
});
