import { describe, it, expect } from "vitest";
import { parseReading, READING_JSON_SCHEMA } from "@/lib/coa/reading-schema";
import type { Reading } from "@/lib/coa/reading";

const TODAY = "2026-10-12";
const R = (x: Partial<Reading> = {}): Reading => ({
  lab_name: "Vanguard Laboratory", lab_city: "Olympia, WA", report_number: "VGD-24109", verify_code: "2d9dede6-9823-4650-a72f-532b92f83477",
  tested_on: "2026-10-05", purity_pct: 99.47, method: "HPLC+MS", measured_mg: 10.42,
  identity: "pass", endotoxin: "pass", sterility: null, heavy_metals: null, fentanyl: null,
  product_name: "Tirzepatide", strength_label: "10 mg", batch: "N8326", ...x,
});

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
