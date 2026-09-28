import { describe, it, expect } from "vitest";
import { compounds, CHEMICAL_CLASSES } from "@/data/catalog";

// Slugs with no registered CAS number. Each entry needs a comment naming the
// primary source consulted. Keep empty unless fetch-identity proved it.
const NO_CAS = new Set<string>([]);

const isBlend = (c: (typeof compounds)[number]) => c.components !== undefined;

describe("catalog integrity", () => {
  it("has the 27 launch compounds", () => {
    expect(compounds).toHaveLength(27);
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

  it("gives every compound at least one variant with a unique id and positive price", () => {
    for (const c of compounds) {
      expect(c.variants.length, c.slug).toBeGreaterThan(0);
      expect(new Set(c.variants.map((v) => v.id)).size, c.slug).toBe(c.variants.length);
      for (const v of c.variants) expect(v.priceUsd, c.slug).toBeGreaterThan(0);
    }
  });

  it("starts pack discounts at a single unit with 0%", () => {
    for (const c of compounds) expect(c.packDiscounts[0], c.slug).toEqual({ qty: 1, pct: 0 });
  });

  it("only references real compounds as blend components", () => {
    const slugs = new Set(compounds.map((c) => c.slug));
    for (const c of compounds) for (const s of c.components ?? []) expect(slugs.has(s), `${c.slug}→${s}`).toBe(true);
  });

  it("features exactly four compounds", () => {
    expect(compounds.filter((c) => c.featured)).toHaveLength(4);
  });
});
