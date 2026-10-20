import { describe, it, expect } from "vitest";
import type { PublicCert } from "@/data/catalog-types";
import { lotCertSummary } from "@/lib/coa/lot-summary";

const cert = (over: Partial<PublicCert>): PublicCert => ({
  id: "c", lot: "L1", slug: "s", compoundName: "X", chemicalClass: "c", strength: "10 mg", lotStatus: "live", shipping: true,
  labName: "Lab A", labCity: null, labIso: false, reportNumber: "R1", verifyUrl: null, testedOn: "2026-10-01", coaFile: "f1.pdf",
  purityPct: 99.1, method: "HPLC", measuredMg: null, measuredPct: null,
  tests: { identity: "pass", endotoxin: "not_tested", sterility: "not_tested", heavy_metals: "not_tested", fentanyl: "not_tested" },
  failed: false, note: null, correction: null, correctedAt: null, labsOnLot: 1, ...over,
});

describe("lotCertSummary", () => {
  it("is null for a lot with no visible certificate", () => {
    expect(lotCertSummary([cert({})], "OTHER")).toBeNull();
  });

  it("headline = newest passing certificate with a purity; each test from the newest certificate that ran it", () => {
    const s = lotCertSummary([
      cert({ id: "a", testedOn: "2026-10-01", coaFile: "old.pdf" }),
      cert({ id: "b", testedOn: "2026-10-05", purityPct: null, labName: "Lab B", labIso: true,
        tests: { identity: "not_tested", endotoxin: "pass", sterility: "pass", heavy_metals: "not_tested", fentanyl: "not_tested" } }),
      cert({ id: "c", testedOn: "2026-10-03", coaFile: "new.pdf", tests: { identity: "pass", endotoxin: "fail", sterility: "not_tested", heavy_metals: "pass", fentanyl: "not_tested" } }),
    ], "L1")!;
    expect(s.headline.coaFile).toBe("new.pdf");
    expect(s.count).toBe(3);
    expect(s.tests).toEqual({ identity: "pass", endotoxin: "pass", sterility: "pass", heavy_metals: "pass", fentanyl: "not_tested" });
    expect(s.isoLab).toBe("Lab B");
  });

  it("never headlines a failed certificate while a passing one exists; lists the failed ones", () => {
    const s = lotCertSummary([cert({ id: "ok", testedOn: "2026-10-01" }), cert({ id: "bad", testedOn: "2026-10-09", failed: true, note: "low" })], "L1")!;
    expect(s.headline.id).toBe("ok");
    expect(s.failed.map((c) => c.id)).toEqual(["bad"]);
  });
});
