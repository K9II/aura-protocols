// src/lib/coa/visibility.ts — which certificates customers see. Pure.
import { TEST_KEYS, type Method, type TestResult } from "@/lib/coa/rules";

export type CertRow = {
  id: string; lot_id: string; lab_id: string; report_number: string; tested_on: string; coa_path: string;
  purity_pct: number | null; method: Method | null; measured_mg: number | null;
  identity: TestResult; endotoxin: TestResult; sterility: TestResult; heavy_metals: TestResult; fentanyl: TestResult;
  result: "pass" | "fail"; note: string | null; correction_note: string | null; corrected_at: string | null; created_at: string;
  lab: { name: string; city: string | null; iso17025: boolean; verify_url_template: string | null };
};
export type CoaSettings = { showAll: boolean; showMeasured: boolean };
export const COA_DEFAULTS: CoaSettings = { showAll: false, showMeasured: false };

// A purity report is one kind; any other report is keyed by the tests it ran,
// so an endotoxin-only re-test doesn't hide the purity panel.
export function certKind(c: CertRow): string {
  return c.purity_pct != null ? "purity" : TEST_KEYS.filter((k) => c[k] !== "not_tested").join("+");
}

const newestFirst = (a: CertRow, b: CertRow) => b.tested_on.localeCompare(a.tested_on) || b.created_at.localeCompare(a.created_at);

// Off: passing certificates only, the latest of each kind per lot. On: all.
export function visibleCerts(rows: CertRow[], s: CoaSettings): CertRow[] {
  const sorted = [...rows].sort(newestFirst);
  if (s.showAll) return sorted;
  const seen = new Set<string>();
  return sorted.filter((c) => {
    if (c.result !== "pass") return false;
    const key = `${c.lot_id}|${certKind(c)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
