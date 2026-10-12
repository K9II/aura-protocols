import { describe, it, expect } from "vitest";
import { certVerifyUrl, hasFailedTest, labelMg, measuredPct, parseCertificate, parseLab, TEST_KEYS, verifyUrl, type CertInput } from "@/lib/coa/rules";

const LAB = "11111111-1111-4111-8111-111111111111";
const input = (x: Partial<CertInput> = {}): CertInput => ({
  labId: LAB, reportNumber: "VGD-24109", testedOn: "2026-10-05", purity: "99.47", method: "HPLC+MS", measured: "", coaPath: "AP-1105/1791758296000.pdf", certNote: "",
  result: "pass", verifyCode: "",
  test_identity: "pass", test_endotoxin: "pass", test_sterility: "not_tested", test_heavy_metals: "not_tested", test_fentanyl: "not_tested", ...x,
});
const parse = (x: Partial<CertInput> = {}) => parseCertificate(input(x), "2026-10-11", new Set([LAB]));

describe("hasFailedTest", () => {
  it("is true when any test failed", () => {
    expect(hasFailedTest({ identity: "pass", endotoxin: "fail", sterility: "not_tested", heavy_metals: "not_tested", fentanyl: "not_tested" })).toBe(true);
    expect(hasFailedTest({ identity: "pass", endotoxin: "pass", sterility: "not_tested", heavy_metals: "not_tested", fentanyl: "not_tested" })).toBe(false);
  });
});

describe("parseCertificate", () => {
  it("parses a full purity panel", () => {
    const r = parse({ measured: "10.42" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toEqual({
      labId: LAB, reportNumber: "VGD-24109", testedOn: "2026-10-05", purityPct: 99.47, method: "HPLC+MS", measuredMg: 10.42,
      coaPath: "AP-1105/1791758296000.pdf", note: null, result: "pass", verifyCode: null,
      tests: { identity: "pass", endotoxin: "pass", sterility: "not_tested", heavy_metals: "not_tested", fentanyl: "not_tested" },
    });
  });
  it("refuses a verify code with a space", () => {
    const r = parse({ verifyCode: "dGMrBI hahnc3q-z" });
    expect(!r.ok && r.fieldErrors.verifyCode).toMatch(/no spaces/i);
  });
  it("keeps a valid verify code", () => {
    const r = parse({ verifyCode: "dGMrBI-hahnc3q-z" });
    expect(r.ok && r.value.verifyCode).toBe("dGMrBI-hahnc3q-z");
  });
  it("allows a report with no purity (endotoxin/sterility only); method is then ignored", () => {
    const r = parse({ purity: "", method: "HPLC", test_identity: "not_tested", test_sterility: "pass" });
    expect(r.ok && r.value.purityPct === null && r.value.method === null).toBe(true);
  });
  it("needs something recorded", () => {
    const r = parse({ purity: "", test_identity: "not_tested", test_endotoxin: "not_tested" });
    expect(!r.ok && r.fieldErrors.tests).toBe("Record the purity or at least one test.");
  });
  it("the owner picks the result; it must be Pass or Failed", () => {
    const r = parse({ result: "" });
    expect(!r.ok && r.fieldErrors.result).toBe("Pick Pass or Failed.");
  });
  it("a failed test is flagged, never overrides the owner's Pass", () => {
    const r = parse({ test_endotoxin: "fail", result: "pass" });
    expect(r.ok && r.value.result).toBe("pass");
    expect(r.ok && r.warnings.failedTest).toBe("Saved as Pass although Endotoxin failed on this report.");
  });
  it("Failed needs a note, with or without a failed test", () => {
    const r = parse({ test_endotoxin: "fail", result: "fail" });
    expect(!r.ok && r.fieldErrors.certNote).toMatch(/say what failed/i);
    const ok = parse({ test_endotoxin: "fail", result: "fail", certNote: "Sample vial damaged in transit." });
    expect(ok.ok && ok.value.result).toBe("fail");
    const shortFill = parse({ result: "fail", measured: "6.2", certNote: "Fill 62% of label." });
    expect(shortFill.ok && shortFill.value.result).toBe("fail");
  });
  it("refuses an unknown lab, a bad report number, a future date, purity out of range, a bad measured amount, no PDF", () => {
    const r = parseCertificate(input({ labId: "x", reportNumber: " ", testedOn: "2026-10-12", purity: "89", measured: "ten", coaPath: "" }), "2026-10-11", new Set([LAB]));
    expect(!r.ok && Object.keys(r.fieldErrors).sort()).toEqual(["coa", "labId", "measured", "purity", "reportNumber", "testedOn"]);
  });
  it("warns below the purity floor", () => {
    const r = parse({ purity: "98.5" });
    expect(r.ok && r.warnings.purity).toMatch(/below the 99%/i);
  });
  it("keeps every test key", () => {
    expect(TEST_KEYS).toEqual(["identity", "endotoxin", "sterility", "heavy_metals", "fentanyl"]);
  });
});

describe("verifyUrl", () => {
  it("fills {report}, URL-encoded; none without a template", () => {
    expect(verifyUrl("https://verifiedbyvanguard.com/verify/{report}", "VGD 24/109")).toBe("https://verifiedbyvanguard.com/verify/VGD%2024%2F109");
    expect(verifyUrl(null, "X")).toBeNull();
  });
});

describe("certVerifyUrl", () => {
  it("uses the verify code when set, the report number otherwise", () => {
    expect(certVerifyUrl("https://portal.ils-lab.com/verify/{report}", "LL0001", "dGMrBI-hahnc3q-z")).toBe("https://portal.ils-lab.com/verify/dGMrBI-hahnc3q-z");
    expect(certVerifyUrl("https://portal.ils-lab.com/verify/{report}", "LL0001", null)).toBe("https://portal.ils-lab.com/verify/LL0001");
  });
});

describe("labelMg / measuredPct", () => {
  it("reads mg and mcg labels; IU has no mass", () => {
    expect(labelMg("10 mg")).toBe(10);
    expect(labelMg("500 mcg")).toBe(0.5);
    expect(labelMg("5000 IU")).toBeNull();
  });
  it("rounds measured as a percent of the label", () => {
    expect(measuredPct(10.42, "10 mg")).toBe(104);
    expect(measuredPct(8.61, "10 mg")).toBe(86);
    expect(measuredPct(null, "10 mg")).toBeNull();
    expect(measuredPct(3, "5000 IU")).toBeNull();
  });
});

describe("parseLab", () => {
  it("needs a name; verify link must be https and contain {report}", () => {
    expect(parseLab({ name: "Vanguard Laboratory", city: "Olympia, WA", verify: "https://verifiedbyvanguard.com/verify/{report}", iso: "on", hint: "" }))
      .toEqual({ ok: true, value: { name: "Vanguard Laboratory", city: "Olympia, WA", verifyUrlTemplate: "https://verifiedbyvanguard.com/verify/{report}", iso17025: true, verifyHint: null } });
    const bad = parseLab({ name: "", city: "", verify: "http://x.com/verify", iso: "", hint: "" });
    expect(!bad.ok && Object.keys(bad.fieldErrors).sort()).toEqual(["name", "verify"]);
    expect(parseLab({ name: "BTLabs", city: "", verify: "", iso: "", hint: "" })).toEqual({ ok: true, value: { name: "BTLabs", city: null, verifyUrlTemplate: null, iso17025: false, verifyHint: null } });
  });
  it("keeps an optional verify hint", () => {
    const r = parseLab({ name: "Vanguard Laboratory", city: "", verify: "", iso: "", hint: "The certificate ID from the QR code." });
    expect(r.ok && r.value.verifyHint).toBe("The certificate ID from the QR code.");
  });
});
