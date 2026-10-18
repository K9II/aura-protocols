import type { LiveCatalog } from "@/lib/catalog-merge";

// The demo server (next dev, :3100) shows its demo lots as a fully tested lot would read: all
// seven results passed and the measured amount shown (Alvester, 2026-10-18 — the demo is what
// processors' and banks' reviewers are walked through, so it should read as launch will).
// Only in development, and only lots numbered DEMO-… or TEST-…: the store's records are never
// changed, and the production build shows exactly what's on file. RELEASE_CHECK fails while any
// demo or test lot is live.
export const DEMO_LOT = /^(DEMO|TEST)-/i;

export function withDemoResults<C extends string>(live: LiveCatalog<C>): LiveCatalog<C> {
  const strengthMg = (s: string) => { const m = /([\d.]+)\s*mg/i.exec(s); return m ? Number(m[1]) : null; };
  return {
    ...live,
    certificates: live.certificates.map((c) => DEMO_LOT.test(c.lot) ? {
      ...c,
      tests: { identity: "pass", endotoxin: "pass", sterility: "pass", heavy_metals: "pass", fentanyl: "pass" },
      measuredMg: c.measuredMg ?? strengthMg(c.strength),
      measuredPct: c.measuredPct ?? (strengthMg(c.strength) !== null ? 100 : null),
    } : c),
  };
}
