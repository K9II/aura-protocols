// Lots ready to announce: live, certificate file posted, not announced yet.
// Pure — the live catalog's lots and the set of announced lot numbers come in.
import type { PublicLot } from "@/data/catalog";
import type { AlertLot } from "@/lib/emails-marketing";

export function unannouncedLots(lots: PublicLot[], announced: Set<string>): AlertLot[] {
  return lots
    .filter((l) => l.status === "live" && l.coaFile && !announced.has(l.lot))
    .map((l) => ({
      compoundName: l.compoundName, slug: l.slug, strengths: l.strength,
      lot: l.lot, purityPct: l.purityPct, method: l.method, testedOn: l.testedOn, coaFile: l.coaFile,
    }));
}
