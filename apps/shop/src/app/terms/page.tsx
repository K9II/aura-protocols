import type { Metadata } from "next";
import Link from "next/link";
import ProsePage from "@/components/store/ProsePage";
import { SUPPORT_EMAIL } from "@/lib/constants";

export const metadata: Metadata = { title: "Terms of Service", alternates: { canonical: "/terms" } };

export default function TermsPage() {
  return (
    <ProsePage
      eyebrow="Legal"
      title="Terms of Service"
      updated="October 1, 2026"
      intro={<p>These Terms govern your use of auraprotocols.com (the &ldquo;Site&rdquo;) and any purchase from Aura Protocols LLC (&ldquo;Aura Protocols,&rdquo; &ldquo;we&rdquo;). By entering the Site or placing an order you agree to them.</p>}
      sections={[
        { heading: "Eligibility", body: <p>You must be at least 21 years old and legally able to enter a contract. By entering the Site you confirmed your age, that you are purchasing for research use only, and that you have read these Terms and our <Link href="/refund-policy" className="p-link">Refund &amp; Dispute Policy</Link>. We keep a record of that confirmation.</p> },
        { heading: "Research use only", body: <p>All products are sold solely for in-vitro laboratory research. They are not drugs, dietary supplements, cosmetics, or food, are not approved by the FDA, and must not be used in or on humans or animals. You are responsible for handling, storing, and disposing of products in compliance with all applicable laws. We may refuse or cancel any order we believe is intended for another purpose. See our <Link href="/ruo" className="p-link">Research Use Only policy</Link>.</p> },
        { heading: "Orders and pricing", body: <p>Prices are in US dollars and may change without notice. An order is accepted when it ships. We may limit quantities or cancel orders for suspected misuse, pricing errors, or fraud, with a full refund of any amount charged.</p> },
        { heading: "Shipping, returns and disputes", body: <p>Shipping is covered by our <Link href="/shipping" className="p-link">Shipping Policy</Link>; refunds, replacements, and payment disputes by our <Link href="/refund-policy" className="p-link">Refund &amp; Dispute Policy</Link>.</p> },
        { heading: "Disclaimer of warranties", body: <p>Products are provided for research as described by their lot certificate. Except as stated there, the Site and products are provided &ldquo;as is&rdquo; without warranties of any kind, express or implied, including merchantability and fitness for a particular purpose.</p> },
        { heading: "Limitation of liability", body: <p>To the fullest extent permitted by law, Aura Protocols is not liable for indirect, incidental, special, consequential, or punitive damages, and our total liability for any claim is limited to the amount you paid for the product at issue.</p> },
        { heading: "Indemnification", body: <p>You agree to indemnify Aura Protocols against claims arising from your misuse of any product or your breach of these Terms.</p> },
        { heading: "Changes and contact", body: <p>We may update these Terms; material changes will ask you to confirm again when you next enter the Site. Questions: <a className="p-link" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p> },
      ]}
    />
  );
}
