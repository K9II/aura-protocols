import { describe, it, expect } from "vitest";
import type { PublicLot } from "@/data/catalog";
import { HOME_REC_MAX_H, HOME_REC_MAX_H_NARROW, PULSE_OFF_QUERY, REC_TOP_PAD, fitRecordHeight, pulseRuns, homeRecord, newSince, newsLine, productRecord, recordGeo, runY, shortDate } from "@/lib/lot-record";

const lot = (over: Partial<PublicLot>): PublicLot => ({
  lot: "BP10-2609-01", purityPct: 99.4, method: "HPLC+MS", testedOn: "2026-09-10", coaFile: "https://x/coa.pdf",
  slug: "bpc-157", compoundName: "BPC-157", variantId: "10mg", strength: "10 mg", status: "live",
  liveAt: "2026-09-11T15:00:00Z", onStore: true, ...over,
});

describe("lot record", () => {
  it("home: newest first, last 8, strengths on the store only, retired lots left out", () => {
    const lots = [
      ...Array.from({ length: 10 }, (_, i) => lot({ lot: `L${i}`, liveAt: `2026-09-${String(10 + i).padStart(2, "0")}T12:00:00Z` })),
      lot({ lot: "HIDDEN", liveAt: "2026-10-01T00:00:00Z", onStore: false }),
      lot({ lot: "RETIRED", liveAt: "2026-10-02T00:00:00Z", status: "retired" }),
    ];
    const rec = homeRecord(lots);
    expect(rec.map((l) => l.lot)).toEqual(["L9", "L8", "L7", "L6", "L5", "L4", "L3", "L2"]);
  });

  it("launch day: lots released the same day as the newest put featured products first", () => {
    const day = (slug: string, t: string, lotNo: string) => lot({ lot: lotNo, slug, liveAt: `2026-12-01T${t}:00Z` });
    const lots = [
      day("tb-500", "20:00", "TB"), day("ss-31", "19:00", "SS"), day("bpc-157", "18:00", "BP"), day("mots-c", "17:00", "MC"),
      lot({ lot: "OLD", slug: "kpv", liveAt: "2026-11-20T12:00:00Z" }),
    ];
    expect(homeRecord(lots, new Set(["bpc-157", "mots-c"])).map((l) => l.lot)).toEqual(["BP", "MC", "TB", "SS", "OLD"]);
    expect(homeRecord(lots).map((l) => l.lot)).toEqual(["TB", "SS", "BP", "MC", "OLD"]);
  });

  it("product: all of this compound's released lots, sold-out ones included", () => {
    const rec = productRecord([
      lot({ lot: "A", liveAt: "2026-06-01T00:00:00Z", status: "sold_out" }),
      lot({ lot: "B", liveAt: "2026-09-01T00:00:00Z" }),
      lot({ lot: "OTHER", slug: "tb-500" }),
    ], "bpc-157");
    expect(rec.map((l) => [l.lot, l.status])).toEqual([["B", "live"], ["A", "sold_out"]]);
  });

  it("product: strengths on the store only — a hidden or archived strength's lots stay off the chart", () => {
    const rec = productRecord([
      lot({ lot: "ON", liveAt: "2026-09-01T00:00:00Z" }),
      lot({ lot: "HIDDEN", variantId: "99mg", strength: "99 mg", liveAt: "2026-10-01T00:00:00Z", onStore: false }),
    ], "bpc-157");
    expect(rec.map((l) => l.lot)).toEqual(["ON"]);
  });

  it("never sends stock counts or flags to the browser", () => {
    const [r] = homeRecord([lot({})]);
    expect(Object.keys(r).sort()).toEqual(["coaFile", "compound", "liveAt", "lot", "method", "purityPct", "slug", "status", "strength", "testedOn"]);
  });

  it("new since last visit: none on a first visit, only later releases otherwise", () => {
    const rec = homeRecord([lot({ lot: "OLD", liveAt: "2026-09-01T00:00:00Z" }), lot({ lot: "NEW", liveAt: "2026-10-05T00:00:00Z" })]);
    expect(newSince(rec, null).size).toBe(0);
    expect(newSince(rec, "garbage").size).toBe(0);
    expect([...newSince(rec, "2026-09-15T00:00:00Z")]).toEqual(["NEW"]);
  });

  it("top-bar line names up to three new lots", () => {
    const rec = homeRecord([
      lot({ lot: "A", compoundName: "Semax", liveAt: "2026-10-08T00:00:00Z" }),
      lot({ lot: "B", compoundName: "MOTS-c", liveAt: "2026-10-04T00:00:00Z" }),
    ]);
    expect(newsLine(rec, new Set())).toBeNull();
    expect(newsLine(rec, new Set(["A", "B"]))).toBe("2 new lots since your last visit · Semax 10 mg · MOTS-c 10 mg");
    expect(newsLine(rec, new Set(["A"]))).toBe("1 new lot since your last visit · Semax 10 mg");
  });

  it("dates: day + month this year, with the year otherwise", () => {
    const now = Date.parse("2026-10-10T12:00:00Z");
    expect(shortDate("2026-09-10", now)).toBe("10 Sep");
    expect(shortDate("2025-12-01", now)).toBe("1 Dec 2025");
  });

  it("one lot: no depth step (no divide by zero), the run sits mid-height", () => {
    const g = recordGeo(600, 300, 1);
    expect(g.dy).toBe(0);
    expect(g.dx).toBe(0);
    expect(Number.isFinite(g.y0)).toBe(true);
    const g8 = recordGeo(600, 300, 8);
    expect(g8.dy).toBeGreaterThan(0);
    expect(g8.y0).toBe(274);
  });

  it("runs are deterministic, peak higher for purer lots", () => {
    const peak = (p: number) => Math.min(...Array.from({ length: 400 }, (_, k) => runY("X1", p, k / 400, 100)));
    expect(runY("X1", 99.4, 0.3, 100)).toBe(runY("X1", 99.4, 0.3, 100));
    expect(peak(99.8)).toBeLessThan(peak(99.0));
  });
});

describe("home record height (fitRecordHeight)", () => {
  // the highest point any run reaches: its baseline plus the tallest peak runY can draw
  const top = (narrow: boolean, H: number, n: number) => {
    const W = narrow ? 300 : 900, g = recordGeo(W, H, n);
    let min = Infinity;
    for (let i = 0; i < n; i++) for (let k = 0; k <= 400; k++) min = Math.min(min, g.y0 - i * g.dy + runY(`LOT-${i}`, 100, k / 400, g.amp));
    return min;
  };

  it("a few lots get a shorter band than the old fixed height, with every peak inside it", () => {
    for (const narrow of [true, false]) {
      const H = fitRecordHeight(narrow, 3);
      expect(H).toBeLessThan(narrow ? HOME_REC_MAX_H_NARROW : HOME_REC_MAX_H);
      expect(top(narrow, H, 3)).toBeGreaterThanOrEqual(REC_TOP_PAD - 2);
      expect(top(narrow, H, 3)).toBeLessThan(REC_TOP_PAD + 12); // and no big empty band above
    }
  });

  it("grows with each lot and stops at the old fixed height", () => {
    for (const narrow of [true, false]) {
      const hs = [2, 3, 4, 5, 6, 7, 8].map((n) => fitRecordHeight(narrow, n));
      for (let i = 1; i < hs.length; i++) expect(hs[i]).toBeGreaterThanOrEqual(hs[i - 1]);
      expect(hs[hs.length - 1]).toBeLessThanOrEqual(narrow ? HOME_REC_MAX_H_NARROW : HOME_REC_MAX_H);
      expect(fitRecordHeight(narrow, 20)).toBe(narrow ? HOME_REC_MAX_H_NARROW : HOME_REC_MAX_H);
    }
  });

  it("a single lot keeps room around its centred run", () => {
    expect(fitRecordHeight(false, 1)).toBeGreaterThanOrEqual(170);
    expect(top(false, fitRecordHeight(false, 1), 1)).toBeGreaterThan(0);
  });
});

describe("live pulse (pulseRuns)", () => {
  const on = { reduce: false, narrow: false, live: true, index: 0 };
  it("runs on wide screens while on screen, for the live run", () => {
    expect(pulseRuns(on)).toBe(true);
  });
  it("never on phones and small tablets (under 900px), with reduced motion, off screen, or without a live run", () => {
    expect(PULSE_OFF_QUERY).toBe("(max-width: 900px)");
    expect(pulseRuns({ ...on, narrow: true })).toBe(false);
    expect(pulseRuns({ ...on, reduce: true })).toBe(false);
    expect(pulseRuns({ ...on, live: false })).toBe(false);
    expect(pulseRuns({ ...on, index: -1 })).toBe(false);
  });
});

