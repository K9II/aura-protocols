// src/lib/coa/reading.ts — pure rules for the certificate reader (spec 2026-10-12-coa-autofill-design.md). No I/O.
// The reader (lib/coa/read.ts) returns a Reading; the form merges it into its
// draft here. The owner's typed values always win; Result is never touched.
import { z } from "zod";
import { METHODS, NOT_RECORDED_LAB, PURITY_MIN, TEST_KEYS, type TestKey, type TestResult } from "@/lib/coa/rules";

// The certificate form's draft (shared by CertificateFields, Receive a lot, Add/Edit certificate).
export type CertDraft = {
  labId: string; reportNumber: string; verifyCode: string; testedOn: string; purity: string; method: string; measured: string; coaPath: string; certNote: string;
  result: "" | "pass" | "fail"; tests: Record<TestKey, TestResult>;
};
export const EMPTY_CERT: CertDraft = {
  labId: "", reportNumber: "", verifyCode: "", testedOn: "", purity: "", method: "HPLC+MS", measured: "", coaPath: "", certNote: "", result: "",
  tests: { identity: "not_tested", endotoxin: "not_tested", sterility: "not_tested", heavy_metals: "not_tested", fentanyl: "not_tested" },
};

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
export type Reading = Omit<z.infer<typeof ReadingSchema>, "method"> & { method: (typeof METHODS)[number] | null };

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

const LAB_NOISE = new Set(["lab", "labs", "laboratory", "laboratories", "inc", "llc", "ltd", "co", "corp", "the", "testing", "services"]);
const labKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").split(" ").filter((w) => w && !LAB_NOISE.has(w)).join(" ");

type LabLike = { id: string; name: string; city: string | null };
// The active lab the report names, or { unknown } — "Not recorded" never matches.
export function matchLab(name: string | null, labs: LabLike[]): { labId: string } | { unknown: true } | null {
  if (!name) return null;
  const k = labKey(name);
  if (!k) return null;
  const hit = labs.find((l) => l.name !== NOT_RECORDED_LAB && labKey(l.name) === k);
  return hit ? { labId: hit.id } : { unknown: true };
}

export type FillKey = "labId" | "reportNumber" | "verifyCode" | "testedOn" | "purity" | "method" | "measured" | TestKey;

// Fills only empty fields. Method counts as empty while it's still the
// default and no purity was typed. Never touches result, certNote or coaPath.
export function mergeReading(draft: CertDraft, r: Reading, labs: LabLike[]):
  { draft: CertDraft; filled: Set<FillKey>; unknownLab: { name: string; city: string | null } | null } {
  const next: CertDraft = { ...draft, tests: { ...draft.tests } };
  const filled = new Set<FillKey>();
  let unknownLab: { name: string; city: string | null } | null = null;
  const put = (k: "reportNumber" | "verifyCode" | "testedOn" | "purity" | "measured", v: string | number | null) => {
    if (v === null || next[k] !== "") return;
    next[k] = String(v);
    filled.add(k);
  };
  if (next.labId === "") {
    const m = matchLab(r.lab_name, labs);
    if (m && "labId" in m) { next.labId = m.labId; filled.add("labId"); }
    else if (m && r.lab_name) unknownLab = { name: r.lab_name, city: r.lab_city };
  }
  const methodIsDefault = draft.method === EMPTY_CERT.method && draft.purity === "";
  put("reportNumber", r.report_number);
  put("verifyCode", r.verify_code);
  put("testedOn", r.tested_on);
  put("purity", r.purity_pct);
  put("measured", r.measured_mg);
  if (methodIsDefault && r.method) { next.method = r.method; filled.add("method"); }
  for (const k of TEST_KEYS) {
    const v = r[k];
    if (v && v !== "not_tested" && next.tests[k] === "not_tested") { next.tests[k] = v; filled.add(k); }
  }
  return { draft: next, filled, unknownLab };
}

// Product-name matching only (never changed by the strength logic below).
const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const STRENGTH_RE = /(\d+(?:\.\d+)?)\s*(mg|mcg|iu)\b/i;
const nameOnly = (s: string) => s.replace(new RegExp(STRENGTH_RE.source, "gi"), " ");

// Strength matching: every number+unit found in the text (thousands commas
// allowed), mcg converted to mg; IU stays its own unit.
const STRENGTH_RE_G = /([\d,]+(?:\.\d+)?)\s*(mg|mcg|iu)\b/gi;
type Amt = { n: number; u: "mg" | "iu" };
function parseStrengths(s: string | null): Amt[] {
  if (!s) return [];
  const out: Amt[] = [];
  for (const m of s.matchAll(new RegExp(STRENGTH_RE_G.source, STRENGTH_RE_G.flags))) {
    const n = Number(m[1].replace(/,/g, ""));
    const unit = m[2].toLowerCase();
    out.push(unit === "mcg" ? { n: n / 1000, u: "mg" } : { n, u: unit as "mg" | "iu" });
  }
  return out;
}
const EPS = 1e-6;
const approxEq = (a: number, b: number) => Math.abs(a - b) < EPS;

// Fine when the lot's strength equals the first value or the same-unit sum
// (after mcg→mg) — a blend's report prints one line per component. Silent
// when the report has no strength, or the units simply aren't comparable
// (a report in IU against a lot in mg, say) — never a false warning.
function strengthMatches(values: Amt[], ours: Amt | null): boolean {
  if (!ours || values.length === 0) return true;
  const sameUnit = values.filter((v) => v.u === ours.u);
  if (sameUnit.length === 0) return true;
  if (values[0].u === ours.u && approxEq(values[0].n, ours.n)) return true;
  return approxEq(sameUnit.reduce((a, v) => a + v.n, 0), ours.n);
}

// True once the number+unit matches are stripped out and letters remain —
// the label names the product too ("Tirzepatide 30 mg"), so showing it
// verbatim in the message would repeat the name.
function hasExtraText(label: string): boolean {
  const stripped = label.replace(new RegExp(STRENGTH_RE_G.source, STRENGTH_RE_G.flags), "");
  return /[a-z]/i.test(stripped);
}
const formatStrengths = (values: Amt[]) => values.map((v) => `${v.n} ${v.u}`).join(" / ");

// A warning when the report names another product or strength (batch never
// decides — the report prints the supplier's batch, not our lot number).
export function lotMismatch(r: Reading, lot: { names: string[]; strength: string; lotNumber: string }): string | null {
  const product = r.product_name ? nameOnly(r.product_name).trim() : "";
  const p = squash(product);
  const productOff = p.length > 0 && !lot.names.some((n) => { const q = squash(n); return q.length > 0 && (p.includes(q) || q.includes(p)); });

  const labelValues = parseStrengths(r.strength_label);
  const values = labelValues.length > 0 ? labelValues : parseStrengths(r.product_name);
  const ours = parseStrengths(lot.strength)[0] ?? null;
  const strengthOff = !strengthMatches(values, ours);

  if (!productOff && !strengthOff) return null;
  const shownStrength = r.strength_label
    ? (hasExtraText(r.strength_label) ? formatStrengths(labelValues) : r.strength_label)
    : formatStrengths(values);
  const what = [product || lot.names[0], shownStrength].filter(Boolean).join(" ");
  return `This report is for ${what}${r.batch ? `, batch ${r.batch}` : ""}. You're adding it to ${lot.names[0]} ${lot.strength}, lot ${lot.lotNumber}. Check you attached the right PDF.`;
}

// Names a report may use for a product: scientific name, designation, blend components.
export function productNames(c: { name: string; designation?: string; components?: string[] }): string[] {
  return [...new Set([c.name, c.designation, ...(c.components ?? [])].filter((x): x is string => !!x))];
}

export const filledMessage = (n: number) => `Filled ${n} field${n === 1 ? "" : "s"} from the PDF. Check each one.`;
