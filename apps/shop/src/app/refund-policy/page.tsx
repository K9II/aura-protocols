import type { Metadata } from "next";
import ProsePage from "@/components/store/ProsePage";
import { SUPPORT_EMAIL } from "@/lib/constants";

export const metadata: Metadata = { title: "Refund & Dispute Policy", alternates: { canonical: "/refund-policy" } };

export default function RefundPolicyPage() {
  return (
    <ProsePage
      eyebrow="Legal"
      title="Refund & Dispute Policy"
      updated="October 1, 2026"
      intro={<p>You agreed to this policy when you entered the Site. It exists so problems get fixed quickly — by us, directly.</p>}
      sections={[
        { heading: "Contact us first", body: <p>Before filing a dispute or chargeback with your bank or card issuer, email <a className="p-link" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> with your order number. We reply within two business days and resolve most issues with a replacement or refund.</p> },
        { heading: "What we replace or refund", body: (
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Damaged, missing, or incorrect items reported within 7 days of delivery.</li>
            <li>Packages lost in transit, once the carrier confirms loss.</li>
            <li>A product whose independent re-test does not match its lot certificate.</li>
          </ul>) },
        { heading: "What we can't accept back", body: <p>Opened or unsealed vials cannot be returned — we can&apos;t verify their handling. Unopened, sealed items may be returned within 14 days of delivery for a refund less original shipping.</p> },
        { heading: "Refund timing", body: <p>Approved refunds go back to the original payment method within 5 business days; your bank may take longer to post them.</p> },
        { heading: "Chargebacks", body: <p>If a dispute is filed without contacting us first, we will provide our records to the card issuer — including your order, delivery tracking, and your entry confirmation (age, research-use, and agreement to this policy).</p> },
      ]}
    />
  );
}
