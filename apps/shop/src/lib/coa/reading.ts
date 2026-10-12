// src/lib/coa/reading.ts — pure rules for the certificate reader (spec 2026-10-12-coa-autofill-design.md). No I/O.
// The reader (lib/coa/read.ts) returns a Reading; the form merges it into its
// draft here. The owner's typed values always win; Result is never touched.
import { METHODS, NOT_RECORDED_LAB, TEST_KEYS, type TestKey, type TestResult } from "@/lib/coa/rules";

// The certificate form's draft (shared by CertificateFields, Receive a lot, Add/Edit certificate).
export type CertDraft = {
  labId: string; reportNumber: string; verifyCode: string; testedOn: string; purity: string; method: string; measured: string; coaPath: string; certNote: string;
  result: "" | "pass" | "fail"; tests: Record<TestKey, TestResult>;
};
export const EMPTY_CERT: CertDraft = {
  labId: "", reportNumber: "", verifyCode: "", testedOn: "", purity: "", method: "HPLC+MS", measured: "", coaPath: "", certNote: "", result: "",
  tests: { identity: "not_tested", endotoxin: "not_tested", sterility: "not_tested", heavy_metals: "not_tested", fentanyl: "not_tested" },
};

// What the reader returns (lib/coa/read.ts; validated by lib/coa/reading-schema.ts,
// kept out of this file so the form's bundle never pulls in zod).
type TestVal = "pass" | "fail" | "not_tested" | null;
export type Reading = {
  lab_name: string | null; lab_city: string | null;
  report_number: string | null; verify_code: string | null;
  tested_on: string | null; purity_pct: number | null; method: (typeof METHODS)[number] | null; measured_mg: number | null;
  identity: TestVal; endotoxin: TestVal; sterility: TestVal; heavy_metals: TestVal; fentanyl: TestVal;
  product_name: string | null; strength_label: string | null; batch: string | null;
};

const LAB_NOISE = new Set(["lab", "labs", "laboratory", "laboratories", "inc", "llc", "ltd", "co", "corp", "the", "testing", "services"]);
const labKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").split(" ").filter((w) => w && !LAB_NOISE.has(w)).join(" ");

// Two lab names are the same lab once case, punctuation and filler words
// ("Labs", "Inc.") are dropped. The form uses it to spot a switched-off lab.
export function sameLabName(a: string, b: string): boolean {
  const k = labKey(a);
  return k !== "" && k === labKey(b);
}

type LabLike = { id: string; name: string; city: string | null };
// The active lab the report names, or { unknown } — "Not recorded" never matches.
export function matchLab(name: string | null, labs: LabLike[]): { labId: string } | { unknown: true } | null {
  if (!name || !labKey(name)) return null;
  const hit = labs.find((l) => l.name !== NOT_RECORDED_LAB && sameLabName(l.name, name));
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
type LotRef = { names: string[]; strength: string; lotNumber: string };
// The two halves of the warning, so the form can bold them (mock f2); lotMismatch
// is the plain sentence, used only by tests now — CertificateFields renders its
// own JSX from lotMismatchParts. The two must stay word-for-word the same; a
// component test checks the JSX warning's textContent against this function.
export function lotMismatchParts(r: Reading, lot: LotRef): { report: string; ours: string } | null {
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
  return { report: `${what}${r.batch ? `, batch ${r.batch}` : ""}`, ours: `${lot.names[0]} ${lot.strength}, lot ${lot.lotNumber}` };
}
export function lotMismatch(r: Reading, lot: LotRef): string | null {
  const m = lotMismatchParts(r, lot);
  return m && `This report is for ${m.report}. You're adding it to ${m.ours}. Check you attached the right PDF.`;
}

// Names a report may use for a product: scientific name, designation, blend
// components, and each part of a "/" name (a blend whose components aren't listed).
export function productNames(c: { name: string; designation?: string; components?: string[] }): string[] {
  const parts = c.name.split("/").map((x) => x.trim());
  return [...new Set([c.name, c.designation, ...(c.components ?? []), ...parts].filter((x): x is string => !!x))];
}

export const filledHead = (n: number) => `Filled ${n} field${n === 1 ? "" : "s"} from the PDF`;
// One source for the tail: filledMessage (tests) and CertificateFields' JSX
// (bolds the head) both build off the same string, never a slice-by-length.
export const FILLED_TAIL = ". Check each one.";
export const filledMessage = (n: number) => `${filledHead(n)}${FILLED_TAIL}`;
