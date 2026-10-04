import { describe, it, expect } from "vitest";
import type { Compound } from "@/data/catalog";
import { unannouncedLots } from "@/lib/email/lots";

const c = (slug: string, lot: Compound["currentLot"]): Compound => ({
  slug, name: slug.toUpperCase(), chemicalClass: "Peptide Fragments", identity: {}, form: "", storage: "", vialMl: 3,
  variants: [{ id: "10mg", strength: "10 mg", priceUsd: 59, stock: "in" }, { id: "20mg", strength: "20 mg", priceUsd: 99, stock: "in" }],
  packDiscounts: [], currentLot: lot,
} as Compound);
const tested = (lot: string, coaFile = `/coa/${lot}.pdf`) => ({ lot, purityPct: 99.4, method: "HPLC+MS" as const, testedOn: "2026-11-28", coaFile });

describe("unannouncedLots", () => {
  it("lists tested lots with a certificate that haven't been announced", () => {
    const list = [c("bpc-157", tested("AP-2611")), c("tb-500", tested("AP-2612")), c("ghk-cu", { pending: true }), c("kpv", tested("AP-2613", ""))];
    expect(unannouncedLots(list, new Set(["AP-2612"]))).toEqual([
      { compoundName: "BPC-157", slug: "bpc-157", strengths: "10 mg, 20 mg", lot: "AP-2611", purityPct: 99.4, method: "HPLC+MS", testedOn: "2026-11-28", coaFile: "/coa/AP-2611.pdf" },
    ]);
  });
});
