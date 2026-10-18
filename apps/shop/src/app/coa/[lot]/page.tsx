import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LotResult } from "@/components/store/CoaLookup";
import Unavailable from "@/components/store/Unavailable";
import { getLiveCatalogOrNull } from "@/lib/catalog-live";
import { coaLots } from "@/lib/coa/public-lots";

// One lot's certificate, on its own (mock 2026-10-17, https://claude.ai/artifact/X6PGkF9LcuBpmof1ZssMUw):
// where a vial's QR code (/L/<lot>), an order's or a checkout line's lot link and a site-search
// lot result go. An unknown lot goes back to the lookup, which says so.
type Params = { params: Promise<{ lot: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lot } = await params;
  const name = decodeURIComponent(lot).toUpperCase();
  return {
    title: `Lot ${name} certificate`,
    description: `The certificate of analysis for lot ${name}, with a link to the lab's own copy.`,
    robots: { index: false },
  };
}

export default async function LotCertificatePage({ params }: Params) {
  const { lot } = await params;
  const wanted = decodeURIComponent(lot).trim();
  const live = await getLiveCatalogOrNull();
  if (!live) return <Unavailable />;
  const hit = coaLots(live).find((l) => l.lot.toUpperCase() === wanted.toUpperCase());
  if (!hit) redirect(`/coa?lot=${encodeURIComponent(wanted)}`);
  return (
    <div className="pharmacopoeia">
      <div className="p-container py-16">
        <p className="s-micro s-eyebrow">Certificate of analysis</p>
        <h1 className="s-h1 mb-5">Your lot&apos;s <em>certificate.</em></h1>
        <p className="text-[color:var(--ink-soft)] max-w-[56ch] mb-8">
          This is the certificate for the lot printed on your vial. It links to the lab&apos;s own copy, so you can check it at the source.
        </p>
        <LotResult hit={hit} certs={live.certificates} />
        <p className="s-micro s-lotpage-links">
          <Link href="/coa">Look up another lot</Link>
          <Link href="/coa#library">See every certificate →</Link>
        </p>
      </div>
    </div>
  );
}
