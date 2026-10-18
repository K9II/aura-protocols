import type { PublicCert, PublicLot } from "@/data/catalog-types";

// The home hero's lot certificate card (components/store/LotProof.tsx). Pure.

export type ProofRow = { test: string; result: string; done: boolean };

// The lot the hero shows: the newest live lot whose strength is on the store.
export function proofLot(lots: PublicLot[]): PublicLot | null {
  const live = lots.filter((l) => l.status === "live" && l.onStore);
  live.sort((a, b) => b.liveAt.localeCompare(a.liveAt));
  return live[0] ?? null;
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
