import { describe, it, expect } from "vitest";
import { isNewestLot, lotProofRows, passedAllSeven, proofLot } from "@/lib/lot-proof";
import type { PublicCert, PublicLot } from "@/data/catalog-types";

const lot = (o: Partial<PublicLot>): PublicLot => ({ slug: "mots-c", compoundName: "MOTS-c", variantId: "10mg", strength: "10 mg", lot: "L-1", purityPct: 99.5, method: "HPLC", testedOn: "2026-11-01", coaFile: "/c.pdf", status: "live", liveAt: "2026-11-02T10:00:00Z", onStore: true, ...o });
const cert = (o: Partial<PublicCert> & { tests?: Partial<PublicCert["tests"]> }): PublicCert => ({
  lot: "L-1", measuredMg: null, ...o,
  tests: { identity: "not_tested", endotoxin: "not_tested", sterility: "not_tested", heavy_metals: "not_tested", fentanyl: "not_tested", ...o.tests },
} as PublicCert);

describe("proofLot", () => {
  it("picks the newest live lot whose strength is on the store", () => {
    expect(proofLot([
      lot({ lot: "OLD", liveAt: "2026-10-01T00:00:00Z" }),
      lot({ lot: "NEW", liveAt: "2026-11-05T00:00:00Z" }),
      lot({ lot: "GONE", liveAt: "2026-12-01T00:00:00Z", status: "sold_out" }),
      lot({ lot: "HIDDEN", liveAt: "2026-12-02T00:00:00Z", onStore: false }),
    ])!.lot).toBe("NEW");
  });
  it("is null before the first release", () => expect(proofLot([])).toBeNull());
});

describe("lotProofRows", () => {
  it("lists the seven tests from the lot's own certificates, across all of them", () => {
    const rows = lotProofRows(lot({}), [
      cert({ tests: { identity: "pass" } }),
      cert({ measuredMg: 10.1, tests: { endotoxin: "pass", fentanyl: "pass" } }),
      cert({ lot: "OTHER", tests: { sterility: "pass" } }),
    ]);
    expect(rows.map((r) => `${r.test}:${r.result}`)).toEqual([
      "Identity:Pass", "Purity:Pass", "Quantity:Pass", "Endotoxin:Pass", "Sterility:Not tested", "Heavy metals:Not tested", "Fentanyl:Clear",
    ]);
  });
});

describe("proofLot: the home page features a lot that passed all seven (2026-10-20)", () => {
  const base = { compoundName: "X", variantId: "10mg", strength: "10 mg", purityPct: 99.5, method: "HPLC", testedOn: "2026-10-01", coaFile: "/c.pdf", status: "live" as const, onStore: true };
  const lots = [
    { ...base, slug: "mots-c", lot: "MOT-NEW", liveAt: "2026-10-20T10:00:00Z" },
    { ...base, slug: "bpc-157-tb-500-blend", lot: "WOLV-OLDER", liveAt: "2026-10-19T10:00:00Z" },
  ];
  const all = { identity: "pass", endotoxin: "pass", sterility: "pass", heavy_metals: "pass", fentanyl: "pass" } as const;
  const gold = { identity: "pass", endotoxin: "pass", sterility: "pass", heavy_metals: "not_tested", fentanyl: "not_tested" } as const;
  const cert = (lot: string, tests: typeof all | typeof gold) => ({ lot, measuredMg: 10, tests }) as unknown as PublicCert;

  it("skips a newer Gold-tested lot for the newest lot with all seven", () => {
    const certs = [cert("MOT-NEW", gold), cert("WOLV-OLDER", all)];
    expect(proofLot(lots as PublicLot[], certs)?.lot).toBe("WOLV-OLDER");
    expect(isNewestLot(lots[1] as PublicLot, lots as PublicLot[])).toBe(false);
    expect(passedAllSeven(lots[1] as PublicLot, certs)).toBe(true);
  });

  it("falls back to the newest lot when none has all seven, and without certs", () => {
    expect(proofLot(lots as PublicLot[], [cert("MOT-NEW", gold)])?.lot).toBe("MOT-NEW");
    expect(proofLot(lots as PublicLot[])?.lot).toBe("MOT-NEW");
  });
});
