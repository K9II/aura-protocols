import { describe, it, expect } from "vitest";
import {
  coaLookupHref, lotSuggestion, normalizeQuery, popularSearches, searchClasses, searchCompounds, shopClassHref, SEARCH_MAX_RESULTS,
} from "@/lib/site-search";
import { GLP_CODE_NAMES } from "@/data/glp-code-names";
import { liveFixture, LOT } from "../helpers/live-catalog";

const catalog = liveFixture();
const names = (q: string, cls: Parameters<typeof searchCompounds>[2] = null) => searchCompounds(catalog, q, cls).map((c) => c.name);

describe("site search", () => {
  it("normalizes spacing, case and punctuation", () => {
    expect(normalizeQuery(" BPC-157 ")).toBe("bpc157");
    expect(normalizeQuery("NAD+")).toBe("nad+");
  });

  it("finds a compound however it is typed", () => {
    for (const q of ["bpc-157", "BPC 157", "bpc157"]) expect(names(q)[0]).toBe("BPC-157");
  });

  it("puts names that start with the query first", () => {
    const hits = names("bpc");
    expect(hits[0]).toBe("BPC-157");
    expect(hits).toContain("BPC-157 / TB-500 / GHK-Cu / KPV");
  });

  it("matches a blend nickname", () => {
    expect(names("wolverine")).toEqual(["BPC-157 / TB-500"]);
    expect(names("klow")).toEqual(["BPC-157 / TB-500 / GHK-Cu / KPV"]);
  });

  it("matches a class name", () => {
    expect(searchCompounds(catalog, "blends").every((c) => c.chemicalClass === "Blends")).toBe(true);
  });

  it("never matches a hidden GLP-1 code name", () => {
    for (const code of Object.values(GLP_CODE_NAMES)) expect(names(code)).toEqual([]);
  });

  it("returns nothing for an empty query, and caps the list", () => {
    expect(names("  ")).toEqual([]);
    expect(names("e").length).toBeLessThanOrEqual(SEARCH_MAX_RESULTS);
  });

  it("lists a whole class when one is picked, and narrows within it", () => {
    const fragments = searchCompounds(catalog, "", "Peptide Fragments");
    expect(fragments.map((c) => c.slug)).toEqual(catalog.filter((c) => c.chemicalClass === "Peptide Fragments").map((c) => c.slug));
    expect(names("bpc", "Blends").every((n) => n.includes("/"))).toBe(true);
    expect(names("bpc", "Peptide Fragments")).toEqual(["BPC-157"]);
  });

  it("names a lot selling now", () => {
    const s = lotSuggestion(catalog, LOT.lot.toLowerCase(), 0);
    expect(s?.lot).toBe(LOT.lot);
    expect(s?.compound).not.toBeNull();
  });

  it("offers a COA lookup for an unknown lot only when asked or nothing else matches", () => {
    expect(lotSuggestion(catalog, "lot XYZ-9999", 3)).toEqual({ lot: "XYZ-9999", compound: null, strength: null });
    expect(lotSuggestion(catalog, "XYZ-9999", 0)).toEqual({ lot: "XYZ-9999", compound: null, strength: null });
    expect(lotSuggestion(catalog, "bpc-157", 1)).toBeNull();
    expect(lotSuggestion(catalog, "semax", 0)).toBeNull(); // no digit: not a lot number
  });

  it("builds links", () => {
    expect(coaLookupHref("AP 1")).toBe("/coa/AP%201");
    expect(shopClassHref("Cofactors & Conjugates")).toBe("/products?cat=Cofactors%20%26%20Conjugates");
  });

  it("suggests featured compounds and shown classes", () => {
    expect(popularSearches(catalog)).toEqual([...catalog.filter((c) => c.featured).map((c) => c.name), "Wolverine"]);
    expect(searchClasses(catalog).reduce((n, x) => n + x.count, 0)).toBe(catalog.length);
    expect(searchClasses(catalog.filter((c) => c.chemicalClass !== "Blends")).map((x) => x.cls)).not.toContain("Blends");
  });
});
