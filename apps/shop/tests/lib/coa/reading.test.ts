import { describe, it, expect } from "vitest";
import { EMPTY_CERT, filledHead, filledMessage, lotMismatch, lotMismatchParts, matchLab, mergeReading, parseReading, productNames, READING_JSON_SCHEMA, type Reading } from "@/lib/coa/reading";

const TODAY = "2026-10-12";
const R = (x: Partial<Reading> = {}): Reading => ({
  lab_name: "Vanguard Laboratory", lab_city: "Olympia, WA", report_number: "VGD-24109", verify_code: "2d9dede6-9823-4650-a72f-532b92f83477",
  tested_on: "2026-10-05", purity_pct: 99.47, method: "HPLC+MS", measured_mg: 10.42,
  identity: "pass", endotoxin: "pass", sterility: null, heavy_metals: null, fentanyl: null,
  product_name: "Tirzepatide", strength_label: "10 mg", batch: "N8326", ...x,
});
const labs = [
  { id: "v", name: "Vanguard Laboratory", city: "Olympia, WA", verify_url_template: null },
  { id: "i", name: "ILS Laboratories", city: "San Diego, CA", verify_url_template: null },
  { id: "f", name: "Freedom Diagnostics", city: "Franklin, TN", verify_url_template: null },
  { id: "n", name: "Not recorded", city: null, verify_url_template: null },
];

describe("parseReading", () => {
  it("accepts a full reading", () => {
    expect(parseReading(R(), TODAY)).toEqual(R());
  });
  it("returns null for a non-object or a wrong shape", () => {
    expect(parseReading("nope", TODAY)).toBeNull();
    expect(parseReading({ lab_name: 3 }, TODAY)).toBeNull();
  });
  it("drops values the form could never save", () => {
    const r = parseReading(R({ purity_pct: 85, measured_mg: 0, tested_on: "2026-13-40", method: "GC" as never }), TODAY)!;
    expect(r.purity_pct).toBeNull();
    expect(r.measured_mg).toBeNull();
    expect(r.tested_on).toBeNull();
    expect(r.method).toBeNull();
  });
  it("drops a future test date and trims strings, empty → null", () => {
    const r = parseReading(R({ tested_on: "2026-10-13", report_number: "  VGD-1  ", verify_code: "  " }), TODAY)!;
    expect(r.tested_on).toBeNull();
    expect(r.report_number).toBe("VGD-1");
    expect(r.verify_code).toBeNull();
  });
  it("drops a verify code with spaces and caps long strings", () => {
    const r = parseReading(R({ verify_code: "ab cd", report_number: "x".repeat(80) }), TODAY)!;
    expect(r.verify_code).toBeNull();
    expect(r.report_number).toBeNull();
  });
  it("drops a report number under 2 characters", () => {
    expect(parseReading(R({ report_number: "V" }), TODAY)!.report_number).toBeNull();
    expect(parseReading(R({ report_number: "VG" }), TODAY)!.report_number).toBe("VG");
  });
});

describe("READING_JSON_SCHEMA", () => {
  it("required matches the property set, no extra properties, and every property is nullable via anyOf (never an array type)", () => {
    const props = READING_JSON_SCHEMA.properties as Record<string, { type?: unknown; anyOf?: unknown }>;
    expect([...READING_JSON_SCHEMA.required].sort()).toEqual(Object.keys(props).sort());
    expect(READING_JSON_SCHEMA.additionalProperties).toBe(false);
    for (const p of Object.values(props)) {
      expect(Array.isArray(p.type)).toBe(false);
      expect(Array.isArray(p.anyOf)).toBe(true);
    }
  });
});

describe("matchLab", () => {
  it("matches lab names loosely", () => {
    expect(matchLab("Vanguard Laboratories, Inc.", labs)).toEqual({ labId: "v" });
    expect(matchLab("ILS Lab", labs)).toEqual({ labId: "i" });
    expect(matchLab("FREEDOM DIAGNOSTICS LLC", labs)).toEqual({ labId: "f" });
  });
  it("never matches Not recorded, and reports an unknown lab", () => {
    expect(matchLab("Not recorded", labs)).toEqual({ unknown: true });
    expect(matchLab("Kestrel Analytical", labs)).toEqual({ unknown: true });
  });
  it("null name → nothing", () => {
    expect(matchLab(null, labs)).toBeNull();
  });
});

describe("mergeReading", () => {
  it("fills every empty field and lists them; never Result, note or PDF", () => {
    const { draft, filled, unknownLab } = mergeReading({ ...EMPTY_CERT, coaPath: "AP-1105/1.pdf" }, R(), labs);
    expect(draft).toMatchObject({
      labId: "v", reportNumber: "VGD-24109", verifyCode: "2d9dede6-9823-4650-a72f-532b92f83477", testedOn: "2026-10-05",
      purity: "99.47", method: "HPLC+MS", measured: "10.42", result: "", certNote: "", coaPath: "AP-1105/1.pdf",
    });
    expect(draft.tests).toEqual({ identity: "pass", endotoxin: "pass", sterility: "not_tested", heavy_metals: "not_tested", fentanyl: "not_tested" });
    expect([...filled].sort()).toEqual(["endotoxin", "identity", "labId", "measured", "method", "purity", "reportNumber", "testedOn", "verifyCode"]);
    expect(unknownLab).toBeNull();
  });
  it("keeps anything the owner typed", () => {
    const start = { ...EMPTY_CERT, reportNumber: "KA-1", purity: "98.9", tests: { ...EMPTY_CERT.tests, endotoxin: "fail" as const } };
    const { draft, filled } = mergeReading(start, R(), labs);
    expect(draft.reportNumber).toBe("KA-1");
    expect(draft.purity).toBe("98.9");
    expect(draft.method).toBe("HPLC+MS");   // purity was typed → method counts as the owner's
    expect(draft.tests.endotoxin).toBe("fail");
    expect(filled.has("reportNumber") || filled.has("purity") || filled.has("method") || filled.has("endotoxin")).toBe(false);
  });
  it("fills HPLC over the default method when purity is empty", () => {
    const { draft, filled } = mergeReading(EMPTY_CERT, R({ method: "HPLC" }), labs);
    expect(draft.method).toBe("HPLC");
    expect(filled.has("method")).toBe(true);
  });
  it("marks method from the PDF even when it equals the default; nothing when the report has none", () => {
    const { filled } = mergeReading(EMPTY_CERT, R({ method: "HPLC+MS" }), labs);
    expect(filled.has("method")).toBe(true);   // read from the PDF, so the owner checks it
    const { filled: f2 } = mergeReading(EMPTY_CERT, R({ method: null }), labs);
    expect(f2.has("method")).toBe(false);
  });
  it("unknown lab: leaves Lab empty and returns the name/city", () => {
    const { draft, filled, unknownLab } = mergeReading(EMPTY_CERT, R({ lab_name: "Kestrel Analytical", lab_city: "Austin, TX" }), labs);
    expect(draft.labId).toBe("");
    expect(filled.has("labId")).toBe(false);
    expect(unknownLab).toEqual({ name: "Kestrel Analytical", city: "Austin, TX" });
  });
  it("a lab already picked is left alone and no note is raised", () => {
    const { draft, unknownLab } = mergeReading({ ...EMPTY_CERT, labId: "f" }, R({ lab_name: "Kestrel Analytical" }), labs);
    expect(draft.labId).toBe("f");
    expect(unknownLab).toBeNull();
  });
});

describe("lotMismatch", () => {
  const lot = { names: ["MOTS-c"], strength: "10 mg", lotNumber: "AP-1107" };
  it("silent when product and strength match (any spelling)", () => {
    expect(lotMismatch(R({ product_name: "MOTS-c (Mitochondrial ORF)", strength_label: "10mg" }), lot)).toBeNull();
    expect(lotMismatch(R({ product_name: "mots c 10 mg", strength_label: null }), lot)).toBeNull();
  });
  it("wrong product", () => {
    expect(lotMismatch(R({ product_name: "Tirzepatide", strength_label: "30 mg", batch: "N8326" }), lot))
      .toBe("This report is for Tirzepatide 30 mg, batch N8326. You're adding it to MOTS-c 10 mg, lot AP-1107. Check you attached the right PDF.");
  });
  it("parts: what the report is for, and the lot it's being added to", () => {
    expect(lotMismatchParts(R({ product_name: "Tirzepatide", strength_label: "30 mg", batch: "N8326" }), lot))
      .toEqual({ report: "Tirzepatide 30 mg, batch N8326", ours: "MOTS-c 10 mg, lot AP-1107" });
    expect(lotMismatchParts(R({ product_name: "MOTS-c", strength_label: "10 mg" }), lot)).toBeNull();
  });
  it("right product, wrong strength", () => {
    expect(lotMismatch(R({ product_name: "MOTS-c", strength_label: "40 mg", batch: null }), lot))
      .toBe("This report is for MOTS-c 40 mg. You're adding it to MOTS-c 10 mg, lot AP-1107. Check you attached the right PDF.");
  });
  it("a blend matches on any component or its designation", () => {
    const glow = { names: ["GLOW", "BPC-157 / TB-500 / GHK-Cu", "BPC-157", "TB-500", "GHK-Cu"], strength: "70 mg", lotNumber: "AP-1200" };
    expect(lotMismatch(R({ product_name: "GHK-Cu blend", strength_label: "70 mg" }), glow)).toBeNull();
  });
  it("silent when the report shows neither product nor strength", () => {
    expect(lotMismatch(R({ product_name: null, strength_label: null }), lot)).toBeNull();
  });
  it("batch alone never warns", () => {
    expect(lotMismatch(R({ product_name: "MOTS-c", strength_label: "10 mg", batch: "ZZZ" }), lot)).toBeNull();
  });
  it("a blend's strengths sum to the lot's single strength", () => {
    const glow = { names: ["GLOW", "BPC-157 / TB-500 / GHK-Cu"], strength: "70 mg", lotNumber: "AP-1200" };
    expect(lotMismatch(R({ product_name: "GLOW", strength_label: "10mg/10mg/50mg" }), glow)).toBeNull();
    const cagrisema = { names: ["CagriSema"], strength: "10 mg", lotNumber: "AP-1300" };
    expect(lotMismatch(R({ product_name: "CagriSema", strength_label: "5 mg + 5 mg" }), cagrisema)).toBeNull();
  });
  it("a sum that doesn't add up still warns", () => {
    const tirz = { names: ["Tirzepatide"], strength: "10 mg", lotNumber: "AP-1400" };
    expect(lotMismatch(R({ product_name: "Tirzepatide", strength_label: "40 mg" }), tirz)).not.toBeNull();
  });
  it("mcg converts to mg, thousands commas allowed", () => {
    const tirz = { names: ["Tirzepatide"], strength: "10 mg", lotNumber: "AP-1400" };
    expect(lotMismatch(R({ product_name: "Tirzepatide", strength_label: "10000 mcg" }), tirz)).toBeNull();
    expect(lotMismatch(R({ product_name: "Tirzepatide", strength_label: "10,000 mcg" }), tirz)).toBeNull();
    expect(lotMismatch(R({ product_name: "Tirzepatide", strength_label: "500 mcg" }), tirz)).not.toBeNull();
  });
  it("IU against a lot in mg can't be compared, so it's silent", () => {
    const tirz = { names: ["Tirzepatide"], strength: "10 mg", lotNumber: "AP-1400" };
    expect(lotMismatch(R({ product_name: "Tirzepatide", strength_label: "500 IU" }), tirz)).toBeNull();
  });
  it("a strength label with the product's own name isn't repeated in the message", () => {
    const tirz = { names: ["Tirzepatide"], strength: "10 mg", lotNumber: "AP-1400" };
    expect(lotMismatch(R({ product_name: "Tirzepatide", strength_label: "Tirzepatide 30 mg", batch: null }), tirz))
      .toBe("This report is for Tirzepatide 30 mg. You're adding it to Tirzepatide 10 mg, lot AP-1400. Check you attached the right PDF.");
  });
});

describe("productNames / filledMessage", () => {
  it("name, designation, components — de-duplicated", () => {
    expect(productNames({ name: "BPC-157 / TB-500", designation: "Wolverine", components: ["BPC-157", "TB-500"] }))
      .toEqual(["BPC-157 / TB-500", "Wolverine", "BPC-157", "TB-500"]);
    expect(productNames({ name: "MOTS-c" })).toEqual(["MOTS-c"]);
  });
  it("counts fields", () => {
    expect(filledMessage(1)).toBe("Filled 1 field from the PDF. Check each one.");
    expect(filledMessage(9)).toBe("Filled 9 fields from the PDF. Check each one.");
    expect(filledHead(1)).toBe("Filled 1 field from the PDF");
    expect(filledHead(9)).toBe("Filled 9 fields from the PDF");
  });
});
