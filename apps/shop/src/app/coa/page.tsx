import type { Metadata } from "next";
import type { PublicLot } from "@/data/catalog";
import CoaLookup, { type LotRow } from "@/components/store/CoaLookup";
import Unavailable from "@/components/store/Unavailable";
import { getLiveCatalogOrNull } from "@/lib/catalog-live";

export const metadata: Metadata = {
  title: "COA Lookup",
  description: "Enter the lot number from your vial to see that lot's certificate of analysis.",
  alternates: { canonical: "/coa" },
};

const STATUS: Record<PublicLot["status"], string> = { live: "Current", sold_out: "Sold out", retired: "Retired" };

// Every lot that was ever live, newest first.
function coaRows(lots: PublicLot[]): LotRow[] {
  return [...lots].sort((a, b) => b.liveAt.localeCompare(a.liveAt)).map((l) => ({
    lot: l.lot, name: l.compoundName, slug: l.slug, strength: l.strength, purityPct: l.purityPct,
    method: l.method, testedOn: l.testedOn, coaFile: l.coaFile, status: STATUS[l.status],
  }));
}

export default async function CoaPage() {
  const live = await getLiveCatalogOrNull();
  if (!live) return <Unavailable />;
  const rows = coaRows(live.lots);
  return (
    <div className="pharmacopoeia">
      <div className="p-container py-16">
        <p className="s-micro s-eyebrow">COA Lookup</p>
        <h1 className="s-h1 mb-5">Find it. <em>Verify it.</em></h1>
        <p className="text-[color:var(--ink-soft)] max-w-[52ch] mb-8">
          Every vial carries a lot number. Enter it to see that lot&apos;s certificate of analysis — identity, purity, and method from the independent lab.
        </p>
        <CoaLookup rows={rows} />
      </div>
    </div>
  );
}
