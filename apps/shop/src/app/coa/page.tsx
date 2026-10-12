import type { Metadata } from "next";
import type { ChemicalClass, PublicLot } from "@/data/catalog";
import type { LiveCatalog } from "@/lib/catalog-merge";
import CoaLookup, { type LotHit } from "@/components/store/CoaLookup";
import CoaLibrary from "@/components/store/CoaLibrary";
import Unavailable from "@/components/store/Unavailable";
import { getLiveCatalogOrNull } from "@/lib/catalog-live";

export const metadata: Metadata = {
  title: "COA Lookup",
  description: "Enter the lot number from your vial to see that lot's certificates, or browse every certificate in the library.",
  alternates: { canonical: "/coa" },
};

const STATUS: Record<PublicLot["status"], string> = { live: "Current", sold_out: "Sold out", retired: "Retired" };

// Every lot that was ever live, newest first.
function coaLots(live: LiveCatalog<ChemicalClass>): LotHit[] {
  return [...live.lots].sort((a, b) => b.liveAt.localeCompare(a.liveAt)).map((l) => ({
    // A live lot whose strength isn't on the store (hidden/archived) isn't "Current" — it's not for sale.
    lot: l.lot, name: l.compoundName, slug: l.slug, strength: l.strength, status: l.status === "live" && !l.onStore ? "Not on sale" : STATUS[l.status],
    chemicalClass: live.all.find((c) => c.slug === l.slug)?.chemicalClass ?? "",
  }));
}

export default async function CoaPage() {
  const live = await getLiveCatalogOrNull();
  if (!live) return <Unavailable />;
  const lots = coaLots(live);
  return (
    <div className="pharmacopoeia">
      <div className="p-container py-16">
        <p className="s-micro s-eyebrow">COA Lookup</p>
        <h1 className="s-h1 mb-5">Find it. <em>Verify it.</em></h1>
        <p className="text-[color:var(--ink-soft)] max-w-[56ch] mb-8">
          Every vial carries a lot number. Enter it to see that lot&apos;s certificates, or browse every certificate below. Each one links to the lab&apos;s own copy, so you can check it at the source.
        </p>
        <CoaLookup lots={lots} certs={live.certificates} />
        {live.certificates.length > 0 && <CoaLibrary certs={live.certificates} />}
      </div>
    </div>
  );
}
