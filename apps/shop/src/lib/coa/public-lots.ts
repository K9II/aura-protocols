import type { ChemicalClass, PublicLot } from "../../data/catalog";
import type { LiveCatalog } from "../catalog-merge";
import type { LotHit } from "../../components/store/CoaLookup";

const STATUS: Record<PublicLot["status"], string> = { live: "Current", sold_out: "Sold out", retired: "Retired" };

// Every lot that was ever live, newest first (COA lookup and the lot certificate page).
export function coaLots(live: LiveCatalog<ChemicalClass>): LotHit[] {
  return [...live.lots].sort((a, b) => b.liveAt.localeCompare(a.liveAt)).map((l) => ({
    // A live lot whose strength isn't on the store (hidden/archived) isn't "Current" — it's not for sale.
    lot: l.lot, name: l.compoundName, slug: l.slug, strength: l.strength, status: l.status === "live" && !l.onStore ? "Not on sale" : STATUS[l.status],
    chemicalClass: live.all.find((c) => c.slug === l.slug)?.chemicalClass ?? "",
  }));
}

// One lot's certificate, on its own page: where a vial's QR (/L/<lot>), an order's or a
// checkout line's lot link and a site-search lot result go.
export function lotCertificateHref(lot: string): string {
  return `/coa/${encodeURIComponent(lot)}`;
}
