import { describe, it, expect } from "vitest";
import { findCompound, materialTestingRows } from "@/lib/catalog";
import { liveFixture } from "../helpers/live-catalog";

const compounds = liveFixture();
import { findViolations } from "../../scripts/compliance-scan.mjs";

describe("material & testing rows", () => {
  it("peptides: SPPS + preparative HPLC, then identity, purity, certificate", () => {
    expect(materialTestingRows(findCompound("bpc-157", compounds)!).map((r) => r.label))
      .toEqual(["Synthesis", "Purification", "Identity", "Purity", "Certificate"]);
    expect(materialTestingRows(findCompound("bpc-157", compounds)!)[0].value).toBe("Solid-phase peptide synthesis (SPPS)");
  });

  it("non-peptides don't claim peptide synthesis", () => {
    for (const slug of ["nad-plus", "slu-pp-332"]) {
      const rows = materialTestingRows(findCompound(slug, compounds)!);
      expect(rows[0].value, slug).toBe("Chemical synthesis");
      expect(rows.some((r) => r.label === "Purification"), slug).toBe(false);
    }
    expect(materialTestingRows(findCompound("igf-1-lr3", compounds)!)[0].value).toBe("Recombinant expression");
  });

  it("no row trips the compliance scanner", () => {
    for (const c of compounds) for (const r of materialTestingRows(c)) expect(findViolations(r.value), c.slug).toEqual([]);
  });
});
