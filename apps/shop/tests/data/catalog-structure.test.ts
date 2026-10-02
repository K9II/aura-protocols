import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { allCompounds } from "@/data/catalog";
import { STRUCTURES, STRUCTURE_PANELS } from "@/data/catalog-structure";

const PUBLIC = join(__dirname, "..", "..", "public");

describe("3D structures", () => {
  it("every catalog product has at least one structure panel", () => {
    for (const c of allCompounds) expect(STRUCTURE_PANELS[c.slug]?.length, c.slug).toBeGreaterThan(0);
  });

  it("blends get one panel per component; CJC-1295 / Ipamorelin gets both molecules", () => {
    for (const c of allCompounds.filter((x) => x.components && x.components.length)) {
      expect(STRUCTURE_PANELS[c.slug], c.slug).toEqual(c.components);
    }
    expect(STRUCTURE_PANELS["cjc-1295-ipamorelin"]).toEqual(["cjc-1295-no-dac", "ipamorelin"]);
  });

  it("every referenced structure exists, has its file, and the file has atoms", () => {
    for (const ids of Object.values(STRUCTURE_PANELS)) for (const id of ids) {
      const s = STRUCTURES[id];
      expect(s, id).toBeTruthy();
      const path = join(PUBLIC, s.file);
      expect(existsSync(path), path).toBe(true);
      expect(readFileSync(path, "utf8"), id).toMatch(/V2000|V3000/);
      expect(s.heavyAtoms, id).toBeGreaterThan(0);
      expect(s.ref, id).toMatch(/^https:\/\//);
    }
  });

  it("uses PubChem's own 3D model where it exists, the crystal model for GHK-Cu, a prediction for IGF-1 LR3", () => {
    for (const id of ["kpv", "epithalon", "glutathione", "nad-plus", "slu-pp-332"]) expect(STRUCTURES[id].source, id).toBe("pubchem-3d");
    expect(STRUCTURES["ghk-cu"].source).toBe("crystal-modeled");
    expect(STRUCTURES["ghk-cu"].elements).toContain("Cu");
    expect(STRUCTURES["igf-1-lr3"].source).toBe("predicted");
    expect(STRUCTURES["bpc-157"].source).toBe("computed");
  });
});
