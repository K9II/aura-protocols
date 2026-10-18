import { describe, it, expect } from "vitest";
import { demoResultsOn, withDemoResults } from "@/lib/demo-lots";
import type { LiveCatalog } from "@/lib/catalog-merge";
import type { PublicCert } from "@/data/catalog-types";

const cert = (lot: string): PublicCert => ({
  lot, strength: "10 mg", measuredMg: null, measuredPct: null,
  tests: { identity: "not_tested", endotoxin: "pass", sterility: "not_tested", heavy_metals: "not_tested", fentanyl: "not_tested" },
} as PublicCert);

describe("withDemoResults (demo server only)", () => {
  it("shows DEMO-/TEST- lots fully tested and leaves real lots exactly as on file", () => {
    const live = { all: [], shown: [], lots: [], certificates: [cert("DEMO-MOTSC-01"), cert("test-mots-01"), cert("MOT-2611-02")] } as unknown as LiveCatalog;
    const [demo, test, real] = withDemoResults(live).certificates;
    for (const c of [demo, test]) {
      expect(Object.values(c.tests).every((t) => t === "pass")).toBe(true);
      expect(c.measuredMg).toBe(10);
    }
    expect(real).toEqual(cert("MOT-2611-02"));
  });
});

describe("demoResultsOn", () => {
  it("is on for next dev and for the demo's production build (AURA_DEMO=1), never on Vercel", () => {
    expect(demoResultsOn({ NODE_ENV: "development" })).toBe(true);
    expect(demoResultsOn({ NODE_ENV: "production", AURA_DEMO: "1" })).toBe(true);
    expect(demoResultsOn({ NODE_ENV: "production" })).toBe(false);
    expect(demoResultsOn({ NODE_ENV: "production", AURA_DEMO: "1", VERCEL: "1" })).toBe(false);
    expect(demoResultsOn({ NODE_ENV: "development", VERCEL: "1" })).toBe(false);
  });
});
