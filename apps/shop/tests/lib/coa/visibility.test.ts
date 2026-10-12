import { describe, it, expect } from "vitest";
import { certKind, visibleCerts, type CertRow } from "@/lib/coa/visibility";

const row = (x: Partial<CertRow>): CertRow => ({
  id: "c1", lot_id: "L1", lab_id: "vgd", report_number: "R1", verify_code: null, tested_on: "2026-10-05", coa_path: "AP-1105/1.pdf",
  purity_pct: 99.47, method: "HPLC+MS", measured_mg: 10.42,
  identity: "pass", endotoxin: "pass", sterility: "not_tested", heavy_metals: "not_tested", fentanyl: "not_tested",
  result: "pass", note: null, correction_note: null, corrected_at: null, created_at: "2026-10-05T10:00:00Z",
  lab: { name: "Vanguard Laboratory", city: "Olympia, WA", iso17025: true, verify_url_template: "https://v.example/{report}" }, ...x,
});

describe("certKind", () => {
  it("purity reports are one kind; others are keyed by what they tested", () => {
    expect(certKind(row({}))).toBe("purity");
    expect(certKind(row({ purity_pct: null, method: null, identity: "not_tested", endotoxin: "pass", sterility: "pass" }))).toBe("endotoxin+sterility");
  });
});

describe("visibleCerts", () => {
  const failed = row({ id: "c0", lab_id: "fd", tested_on: "2026-09-30", endotoxin: "fail", result: "fail", note: "Damaged sample." });
  const retest = row({ id: "c1" });
  const older = row({ id: "c-old", tested_on: "2026-09-01" });
  const endo = row({ id: "c2", purity_pct: null, method: null, identity: "not_tested", sterility: "pass", tested_on: "2026-10-08" });
  it("switch off: passing only, the latest of each kind per lot, newest first", () => {
    expect(visibleCerts([failed, retest, older, endo], { showAll: false, showMeasured: false }).map((c) => c.id)).toEqual(["c2", "c1"]);
  });
  it("switch on: every certificate, newest first", () => {
    expect(visibleCerts([failed, retest, older, endo], { showAll: true, showMeasured: false }).map((c) => c.id)).toEqual(["c2", "c1", "c0", "c-old"]);
  });
  it("keeps lots apart", () => {
    const other = row({ id: "x", lot_id: "L2", tested_on: "2026-08-01" });
    expect(visibleCerts([retest, other], { showAll: false, showMeasured: false }).map((c) => c.id)).toEqual(["c1", "x"]);
  });
});
