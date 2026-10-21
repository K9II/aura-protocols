import type { PublicCert, PublicLot } from "@/data/catalog-types";

// The home hero's lot certificate card (components/store/LotProof.tsx). Pure.

export type ProofRow = { test: string; result: string; done: boolean };

// The lot the home page features: the newest live lot on the store that passed all seven
// tests (a Tier 1 lot; Alvester 2026-10-20: the range lots get Vanguard Gold, so the home page
// mustn't fall to one of them); the newest live lot if none has all seven, or with no certs given.
export function proofLot(lots: PublicLot[], certs?: PublicCert[]): PublicLot | null {
  const live = lots.filter((l) => l.status === "live" && l.onStore);
  live.sort((a, b) => b.liveAt.localeCompare(a.liveAt));
  return (certs && live.find((l) => passedAllSeven(l, certs))) ?? live[0] ?? null;
}

// Whether a lot is the newest live lot on the store (the home page says "newest" only then).
export function isNewestLot(lot: PublicLot, lots: PublicLot[]): boolean {
  return proofLot(lots)?.lot === lot.lot;
}

// All seven tests on the lot's own visible certificates.
export function passedAllSeven(lot: PublicLot, certs: PublicCert[]): boolean {
  return lotProofRows(lot, certs).every((r) => r.done);
}

// The seven tests, in the hero's order, each from the lot's own visible certificates.
// Customers only see passing certificates (lib/coa/visibility.ts), so a result is either
// there or "Not tested". Quantity shows only while "Show measured amount" is on.
export function lotProofRows(lot: PublicLot, certs: PublicCert[]): ProofRow[] {
  const mine = certs.filter((c) => c.lot === lot.lot);
  const passed = (k: keyof PublicCert["tests"]) => mine.some((c) => c.tests[k] === "pass");
  const row = (test: string, done: boolean, word = "Pass"): ProofRow => ({ test, result: done ? word : "Not tested", done });
  return [
    row("Identity", passed("identity")),
    row("Purity", true),
    row("Quantity", mine.some((c) => c.measuredMg !== null)),
    row("Endotoxin", passed("endotoxin")),
    row("Sterility", passed("sterility")),
    row("Heavy metals", passed("heavy_metals")),
    row("Fentanyl", passed("fentanyl"), "Clear"),
  ];
}
