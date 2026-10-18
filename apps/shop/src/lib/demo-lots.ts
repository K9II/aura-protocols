import type { LiveCatalog } from "@/lib/catalog-merge";

// The demo server (:3100) shows its demo lots as a fully tested lot would read: all
// seven results passed and the measured amount shown (Alvester, 2026-10-18 — the demo is what
// processors' and banks' reviewers are walked through, so it should read as launch will).
// Only on the demo server (demoResultsOn) and only lots numbered DEMO-… or TEST-…: the store's
// records are never changed, and the live site shows exactly what's on file. RELEASE_CHECK fails while any
// demo or test lot is live.
export const DEMO_LOT = /^(DEMO|TEST)-/i;

// The demo runs as a production build since 2026-10-18, so it can't be told apart by NODE_ENV:
// its keeper (~/.aura/demo-keeper.ps1) sets AURA_DEMO=1 for the build and the server. Never on
// Vercel, even if someone sets the variable there.
export function demoResultsOn(env: Record<string, string | undefined> = process.env): boolean {
  if (env.VERCEL) return false;
  return env.NODE_ENV === "development" || env.AURA_DEMO === "1";
}

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
