// src/lib/coa/rules.ts — pure rules for certificates and labs (spec 2026-10-11-coa-library-design.md). No I/O.
import { PURITY_FLOOR_PCT } from "@/lib/constants";

// Owned here (moved from catalog-ops/rules, which re-exports them) so this file
// imports nothing from catalog-merge's chain — catalog-merge imports this file.
export const METHODS = ["HPLC", "HPLC+MS"] as const;
export const PURITY_MIN = 90;

export const TEST_KEYS = ["identity", "endotoxin", "sterility", "heavy_metals", "fentanyl"] as const;
export type TestKey = (typeof TEST_KEYS)[number];
export const TEST_LABEL: Record<TestKey, string> = { identity: "Identity", endotoxin: "Endotoxin", sterility: "Sterility", heavy_metals: "Heavy metals", fentanyl: "Fentanyl" };
export const TEST_RESULTS = ["pass", "fail", "not_tested"] as const;
export type TestResult = (typeof TEST_RESULTS)[number];
export type Tests = Record<TestKey, TestResult>;
export type Method = (typeof METHODS)[number];
export const CERT_NOTE_MAX = 500;
export const CORRECTION_MAX = 300;
const REPORT_RE = /^\S(.{0,58}\S)?$/;

// Form field names, shared by CertificateFields, Receive a lot and the actions.
export type CertInput = {
  labId: string; reportNumber: string; testedOn: string; purity: string; method: string; measured: string; coaPath: string; certNote: string;
  result: string;   // the owner's pick: "pass" | "fail"
  verifyCode: string;
} & { [K in TestKey as `test_${K}`]: string };
export type CertValue = {
  labId: string; reportNumber: string; testedOn: string; purityPct: number | null; method: Method | null; measuredMg: number | null;
  coaPath: string; tests: Tests; result: "pass" | "fail"; note: string | null; verifyCode: string | null;
};

// The owner sets Pass/Failed. A failed test is only flagged to the owner.
export function failedTests(t: Tests): string[] {
  return TEST_KEYS.filter((k) => t[k] === "fail").map((k) => TEST_LABEL[k]);
}
export function hasFailedTest(t: Tests): boolean {
  return failedTests(t).length > 0;
}

export function parseCertificate(i: CertInput, today: string, labIds: ReadonlySet<string>):
  { ok: true; value: CertValue; warnings: { purity?: string; failedTest?: string } } | { ok: false; fieldErrors: Record<string, string> } {
  const e: Record<string, string> = {};
  if (!labIds.has(i.labId)) e.labId = "Pick the lab.";
  const reportNumber = i.reportNumber.trim();
  if (!REPORT_RE.test(reportNumber) || reportNumber.length < 2) e.reportNumber = "The lab's report number, as printed.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(i.testedOn)) e.testedOn = "Pick the test date.";
  else if (i.testedOn > today) e.testedOn = "The test date can't be in the future.";
  let purityPct: number | null = null;
  if (i.purity.trim()) {
    const p = Number(i.purity.trim());
    if (!Number.isFinite(p) || p < PURITY_MIN || p > 100) e.purity = `Between ${PURITY_MIN} and 100, or blank.`;
    else purityPct = Math.round(p * 100) / 100;
  }
  const method = purityPct === null ? null : METHODS.find((m) => m === i.method) ?? null;
  if (purityPct !== null && !method) e.method = "Pick HPLC or HPLC + MS.";
  let measuredMg: number | null = null;
  if (i.measured.trim()) {
    const m = Number(i.measured.trim());
    if (!Number.isFinite(m) || m <= 0 || m > 100000) e.measured = "Milligrams, like 10.42.";
    else measuredMg = Math.round(m * 100) / 100;
  }
  const tests = {} as Tests;
  for (const k of TEST_KEYS) {
    const v = TEST_RESULTS.find((r) => r === i[`test_${k}`]);
    if (!v) e[`test_${k}`] = "Pick Pass, Fail or Not tested.";
    tests[k] = v ?? "not_tested";
  }
  if (purityPct === null && !e.purity && TEST_KEYS.every((k) => tests[k] === "not_tested")) e.tests = "Record the purity or at least one test.";
  const coaPath = i.coaPath.trim();
  if (!coaPath) e.coa = "Attach the certificate PDF.";
  const note = i.certNote.trim().slice(0, CERT_NOTE_MAX) || null;
  const result = i.result === "pass" || i.result === "fail" ? i.result : null;
  if (!result) e.result = "Pick Pass or Failed.";
  if (result === "fail" && !note) e.certNote = "Say what failed. Customers see this note when every certificate is shown.";
  const verifyCode = i.verifyCode.trim() || null;
  if (verifyCode && (verifyCode.length < 2 || verifyCode.length > 80 || /\s/.test(verifyCode))) e.verifyCode = "The code from the lab's QR or verify link, no spaces.";
  if (Object.keys(e).length) return { ok: false, fieldErrors: e };
  return {
    ok: true,
    warnings: {
      ...(purityPct !== null && purityPct < PURITY_FLOOR_PCT ? { purity: `Below the ${PURITY_FLOOR_PCT}% shown on the site.` } : {}),
      ...(result === "pass" && failedTests(tests).length ? { failedTest: `Saved as Pass although ${failedTests(tests).join(", ")} failed on this report.` } : {}),
    },
    value: { labId: i.labId, reportNumber, testedOn: i.testedOn, purityPct, method, measuredMg, coaPath, tests, result: result!, note, verifyCode },
  };
}

export function verifyUrl(template: string | null, report: string): string | null {
  return template ? template.replace("{report}", encodeURIComponent(report)) : null;
}

// The lab's verify link, keyed by the certificate's verify code when it has
// one (Vanguard's QR id, ILS's access code) and by the report number otherwise.
export function certVerifyUrl(template: string | null, reportNumber: string, verifyCode: string | null): string | null {
  return verifyUrl(template, verifyCode ?? reportNumber);
}

// "10 mg" → 10, "500 mcg" → 0.5; IU (and anything else) has no mass.
export function labelMg(strength: string): number | null {
  const m = /^(\d+(?:\.\d+)?) (mg|mcg)$/.exec(strength);
  if (!m) return null;
  return m[2] === "mg" ? Number(m[1]) : Number(m[1]) / 1000;
}
export function measuredPct(measuredMg: number | null, strength: string): number | null {
  const label = labelMg(strength);
  return measuredMg == null || !label ? null : Math.round((measuredMg / label) * 100);
}

export type LabValue = { name: string; city: string | null; verifyUrlTemplate: string | null; iso17025: boolean; verifyHint: string | null };
export function parseLab(i: { name: string; city: string; verify: string; iso: string; hint: string }):
  { ok: true; value: LabValue } | { ok: false; fieldErrors: Record<string, string> } {
  const e: Record<string, string> = {};
  const name = i.name.trim();
  if (name.length < 2 || name.length > 80) e.name = "The lab's name, 2–80 characters.";
  const city = i.city.trim().slice(0, 80) || null;
  const verify = i.verify.trim() || null;
  if (verify && (!/^https:\/\//.test(verify) || !verify.includes("{report}") || verify.length > 200)) {
    e.verify = "An https:// link with {report} where the report number goes.";
  }
  const verifyHint = i.hint.trim().slice(0, 200) || null;
  if (Object.keys(e).length) return { ok: false, fieldErrors: e };
  return { ok: true, value: { name, city, verifyUrlTemplate: verify, iso17025: i.iso === "on", verifyHint } };
}
