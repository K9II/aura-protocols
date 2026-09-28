import type { Metadata } from "next";
import Link from "next/link";
import ProsePage from "@/components/store/ProsePage";

export const metadata: Metadata = { title: "About", description: "Aura Protocols supplies research peptides released only after independent lot testing, with each lot's certificate published.", alternates: { canonical: "/about" } };

export default function AboutPage() {
  return (
    <ProsePage
      eyebrow="About"
      title={<>Receipts, not <em>promises.</em></>}
      intro={<p>Aura Protocols supplies research-grade peptides to laboratories and independent researchers. We started from one observation: the research-peptide market asks buyers to trust a label. We&apos;d rather show the paperwork.</p>}
      sections={[
        { heading: "Every lot, on the record", body: <p>Each production lot is tested by an independent laboratory before it ships. The certificate for the lot in your vial is linked on its product page, and you can look up any lot number on our <Link href="/coa" className="p-link">COA Lookup</Link>.</p> },
        { heading: "Scientific names only", body: <p>Compounds are listed by their scientific or composition names and grouped by chemical class. No coded names, no nicknames.</p> },
        { heading: "Research use only", body: <p>Everything we sell is for in-vitro laboratory research. We don&apos;t provide instructions for use, and we don&apos;t sell to anyone under 21. See our <Link href="/ruo" className="p-link">Research Use Only policy</Link>.</p> },
      ]}
    />
  );
}
