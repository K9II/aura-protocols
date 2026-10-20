import type { CertTest, PublicCert } from "../../data/catalog-types";

// One lot's certificates boiled down for the product page's Lot record (2026-10-19, replaces
// the full-width certificates table): the headline certificate (the newest passing one with a
// purity, else the newest), each test's result from the newest certificate that ran it, and
// what the lot's certificates say about the lab. `certs` is already the visible set.
export const SUMMARY_TESTS = [
  ["identity", "Identity"],
  ["endotoxin", "Endotoxin"],
  ["sterility", "Sterility"],
  ["heavy_metals", "Metals"],
  ["fentanyl", "Fentanyl"],
] as const;

export type LotCertSummary = {
  headline: PublicCert;
  count: number;
  tests: Record<(typeof SUMMARY_TESTS)[number][0], CertTest>;
  isoLab: string | null;
  failed: PublicCert[];
};

export function lotCertSummary(certs: PublicCert[], lot: string): LotCertSummary | null {
  const mine = certs.filter((c) => c.lot === lot).sort((a, b) => b.testedOn.localeCompare(a.testedOn));
  if (!mine.length) return null;
  const headline = mine.find((c) => !c.failed && c.purityPct != null) ?? mine[0];
  const tests = Object.fromEntries(SUMMARY_TESTS.map(([k]) => [k, mine.find((c) => c.tests[k] !== "not_tested")?.tests[k] ?? "not_tested"])) as LotCertSummary["tests"];
  return {
    headline,
    count: mine.length,
    tests,
    isoLab: mine.find((c) => c.labIso)?.labName ?? null,
    failed: mine.filter((c) => c.failed),
  };
}
