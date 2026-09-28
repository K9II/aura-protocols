import type { Metadata } from "next";
import { compounds } from "@/data/catalog";
import { isPendingLot } from "@/lib/catalog";
import CoaLookup, { type LotRow } from "@/components/store/CoaLookup";

export const metadata: Metadata = {
  title: "COA Lookup",
  description: "Enter the lot number from your vial to see that lot's certificate of analysis.",
  alternates: { canonical: "/coa" },
};

const rows: LotRow[] = compounds.flatMap((c) =>
  isPendingLot(c.currentLot) ? [] : [{
    lot: c.currentLot.lot, name: c.name, slug: c.slug, purityPct: c.currentLot.purityPct,
    method: c.currentLot.method, testedOn: c.currentLot.testedOn, coaFile: c.currentLot.coaFile,
  }],
);

export default function CoaPage() {
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
