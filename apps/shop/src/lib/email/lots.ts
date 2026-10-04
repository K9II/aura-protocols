// Lots ready to announce: tested, certificate file posted, not announced yet.
// Pure — the catalog and the set of announced lot numbers come in.
import type { Compound } from "@/data/catalog";
import { isPendingLot } from "@/lib/catalog";
import type { AlertLot } from "@/lib/emails-marketing";

export function unannouncedLots(list: Compound[], announced: Set<string>): AlertLot[] {
  const out: AlertLot[] = [];
  for (const c of list) {
    const l = c.currentLot;
    if (isPendingLot(l) || !l.coaFile || announced.has(l.lot)) continue;
    out.push({
      compoundName: c.name, slug: c.slug, strengths: c.variants.map((v) => v.strength).join(", "),
      lot: l.lot, purityPct: l.purityPct, method: l.method, testedOn: l.testedOn, coaFile: l.coaFile,
    });
  }
  return out;
}
