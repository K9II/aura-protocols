import { catalogContent, type Compound } from "../../src/data/catalog";
import type { Lot } from "../../src/data/catalog-types";
import { SEED_STRENGTHS, strengthId } from "./seed-strengths";

export const LOT: Lot = { lot: "BPC-2609-01", purityPct: 99.4, method: "HPLC+MS", testedOn: "2026-09-18", coaFile: "https://x/coa/BPC-2609-01/1.pdf" };

// Every content product with its seeded strengths; every strength $79, shown,
// in stock, LOT — unless overridden by "slug:variant".
export function liveFixture(over: Record<string, Partial<Compound["variants"][number]>> = {}): Compound[] {
  return catalogContent.map((c) => ({
    ...c,
    variants: SEED_STRENGTHS[c.slug].map((strength) => {
      const id = strengthId(strength);
      return { id, strength, shown: true, priceUsd: 79, stock: "in" as const, lot: LOT, ...over[`${c.slug}:${id}`] };
    }),
  })) as Compound[];
}
