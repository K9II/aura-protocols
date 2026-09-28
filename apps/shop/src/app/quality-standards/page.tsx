import type { Metadata } from "next";
import Link from "next/link";
import ProsePage from "@/components/store/ProsePage";

export const metadata: Metadata = { title: "Quality Standards", description: "How every Aura Protocols lot is tested and documented.", alternates: { canonical: "/quality-standards" } };

export default function QualityStandardsPage() {
  return (
    <ProsePage
      eyebrow="Quality Standards"
      title={<>What every lot <em>must prove.</em></>}
      sections={[
        { heading: "Independent testing", body: <p>Every lot is tested by a third-party laboratory — never in-house — before it is listed as available.</p> },
        { heading: "What the certificate covers", body: (
          <ul className="list-disc pl-5 space-y-1.5">
            <li><b>Identity</b> — mass spectrometry confirms the molecule is what the label says.</li>
            <li><b>Purity</b> — HPLC quantifies the target compound against impurities. Our floor is 99%.</li>
            <li><b>Lot match</b> — the lot number on the certificate matches the lot number on your vial.</li>
          </ul>) },
        { heading: "Where to find it", body: <p>On every product page (&ldquo;View this lot&apos;s certificate&rdquo;) and on the <Link href="/coa" className="p-link">COA Lookup</Link> by lot number. A product marked &ldquo;COA pending&rdquo; cannot be purchased until its certificate is posted.</p> },
        { heading: "Storage and handling", body: <p>Compounds ship lyophilized. Each product page lists its recommended storage conditions.</p> },
      ]}
    />
  );
}
