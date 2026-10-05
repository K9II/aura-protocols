import { describe, it, expect } from "vitest";
import type { PublicLot } from "@/data/catalog";
import { unannouncedLots } from "@/lib/email/lots";

const lot = (slug: string, no: string, over: Partial<PublicLot> = {}): PublicLot => ({
  lot: no, purityPct: 99.4, method: "HPLC+MS", testedOn: "2026-11-28", coaFile: `/coa/${no}.pdf`,
  slug, compoundName: slug.toUpperCase(), variantId: "10mg", strength: "10 mg", status: "live", liveAt: "2026-11-29T00:00:00Z", onStore: true,
  ...over,
});

describe("unannouncedLots", () => {
  it("lists live lots with a certificate, of strengths on the store, that haven't been announced", () => {
    const lots = [
      lot("bpc-157", "AP-2611"),
      lot("tb-500", "AP-2612"),
      lot("kpv", "AP-2613", { coaFile: "" }),
      lot("ghk-cu", "AP-2614", { status: "sold_out" }),
      lot("dsip", "AP-2615", { status: "retired" }),
      lot("ss-31", "AP-2616", { variantId: "50mg", strength: "50 mg", onStore: false }),   // hidden or archived strength
    ];
    expect(unannouncedLots(lots, new Set(["AP-2612"]))).toEqual([
      { compoundName: "BPC-157", slug: "bpc-157", strengths: "10 mg", lot: "AP-2611", purityPct: 99.4, method: "HPLC+MS", testedOn: "2026-11-28", coaFile: "/coa/AP-2611.pdf" },
    ]);
  });
});
