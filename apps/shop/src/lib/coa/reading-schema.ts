// src/lib/coa/reading-schema.ts — validates the certificate reader's JSON (spec 2026-10-12-coa-autofill-design.md).
// Server side only (lib/coa/read.ts): zod stays out of the certificate form's
// bundle, which imports lib/coa/reading.ts for the Reading type and the merge rules.
import "server-only";
import { z } from "zod";
import { METHODS, PURITY_MIN } from "@/lib/coa/rules";
import type { Reading } from "@/lib/coa/reading";

const TEXT_MAX = 60;   // report number cap (rules.ts REPORT_RE allows 60)
const CODE_MAX = 80;   // verify code cap (parseCertificate)
const NAME_MAX = 120;

const testVal = z.enum(["pass", "fail", "not_tested"]).nullable();
const ReadingSchema = z.object({
  lab_name: z.string().nullable(), lab_city: z.string().nullable(),
  report_number: z.string().nullable(), verify_code: z.string().nullable(),
  tested_on: z.string().nullable(), purity_pct: z.number().nullable(), method: z.string().nullable(), measured_mg: z.number().nullable(),
  identity: testVal, endotoxin: testVal, sterility: testVal, heavy_metals: testVal, fentanyl: testVal,
  product_name: z.string().nullable(), strength_label: z.string().nullable(), batch: z.string().nullable(),
});
// Compile-time: the schema and the Reading type list the same fields with the
// same types (method is narrowed to METHODS by parseReading).
type Raw = Omit<z.infer<typeof ReadingSchema>, "method">;
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const schemaMatchesReading: Same<Raw, Omit<Reading, "method">> = true;
void schemaMatchesReading;

// JSON schema sent to the model as output_config.format (structured outputs:
// every property required, no extra properties, nullable via anyOf — some
// providers reject an array `type`, so every nullable property is a
// two-branch anyOf instead of `type: [x, "null"]`).
const S = { anyOf: [{ type: "string" }, { type: "null" }] } as const;
const N = { anyOf: [{ type: "number" }, { type: "null" }] } as const;
const METHOD_PROP = { anyOf: [{ type: "string", enum: [...METHODS] }, { type: "null" }] } as const;
const T = { anyOf: [{ type: "string", enum: ["pass", "fail", "not_tested"] }, { type: "null" }] } as const;
export const READING_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: Object.keys(ReadingSchema.shape),
  properties: {
    lab_name: S, lab_city: S, report_number: S, verify_code: S,
    tested_on: { ...S, description: "YYYY-MM-DD" }, purity_pct: N,
    method: METHOD_PROP, measured_mg: N,
    identity: T, endotoxin: T, sterility: T, heavy_metals: T, fentanyl: T,
    product_name: S, strength_label: S, batch: S,
  },
} as const;

const clean = (s: string | null, max: number, min = 1): string | null => {
  const t = s?.trim() ?? "";
  return t && t.length >= min && t.length <= max ? t : null;
};
const realDate = (s: string | null, today: string): string | null => {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) return null;
  return s > today ? null : s;
};

// Validates the model's JSON and drops what the form could never save.
export function parseReading(raw: unknown, today: string): Reading | null {
  const p = ReadingSchema.safeParse(raw);
  if (!p.success) return null;
  const r = p.data;
  const code = clean(r.verify_code, CODE_MAX);
  return {
    lab_name: clean(r.lab_name, NAME_MAX), lab_city: clean(r.lab_city, NAME_MAX),
    report_number: clean(r.report_number, TEXT_MAX, 2),
    verify_code: code && !/\s/.test(code) && code.length >= 2 ? code : null,
    tested_on: realDate(r.tested_on, today),
    purity_pct: r.purity_pct !== null && r.purity_pct >= PURITY_MIN && r.purity_pct <= 100 ? r.purity_pct : null,
    method: METHODS.find((m) => m === r.method) ?? null,
    measured_mg: r.measured_mg !== null && r.measured_mg > 0 && r.measured_mg <= 100000 ? r.measured_mg : null,
    identity: r.identity, endotoxin: r.endotoxin, sterility: r.sterility, heavy_metals: r.heavy_metals, fentanyl: r.fentanyl,
    product_name: clean(r.product_name, NAME_MAX), strength_label: clean(r.strength_label, NAME_MAX), batch: clean(r.batch, NAME_MAX),
  };
}
