import type { Metadata } from "next";
import Link from "next/link";
import PolicyPage from "@/components/store/PolicyPage";
import { GOVERNING_STATE, SUPPORT_EMAIL } from "@/lib/constants";

export const metadata: Metadata = { title: "Terms of Service", alternates: { canonical: "/terms" } };

// Requires legal review before launch.
export default function TermsPage() {
  const mail = <a className="p-link" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>;
  return (
    <PolicyPage
      policy="terms"
      title={<>Terms of <em>Service.</em></>}
      updated="October 2, 2026"
      summary={{
        headline: <>Research use only. Cancel any time before your order ships &mdash; once it ships, the sale is final.</>,
        detail: <>Lost or damaged in transit? Your shipping insurance covers a replacement. Report damage with photos within 48 hours of delivery.</>,
      }}
      sections={[
        { id: "research-use", heading: "Research use only", body: (<>
          <p>These Terms govern your use of auraprotocols.com (the &ldquo;Site&rdquo;) and every purchase from Aura Protocols LLC (&ldquo;Aura Protocols,&rdquo; &ldquo;we&rdquo;). Every product is sold solely for lawful in-vitro laboratory research. No product is a drug, dietary supplement, cosmetic, or food; none is approved by the FDA; and each is not intended to diagnose, treat, cure, or prevent any disease. No product may be used in or on humans or animals.</p>
          <p>You are responsible for assessing the handling hazards of what you buy and for confirming that your research is permitted under every law, regulation, and institutional rule that applies to you. See our <Link href="/ruo" className="p-link">Research Use Only policy</Link>.</p>
        </>) },
        { id: "eligibility", heading: "Eligibility and buyer representations", body: (<>
          <p>You must be at least 21 years old and legally able to enter a contract. By placing an order you represent that you are qualified research or laboratory personnel; that you understand the handling, storage, and exposure risks of the materials you purchase and the controls they require; and that your purchase supports legitimate research by a laboratory, institution, company, or other research setting.</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>We may ask you to verify your qualifications or intended use before an order ships.</li>
            <li>We may limit quantities, hold an order, or refuse a sale when a buyer&apos;s qualifications or purpose can&apos;t be confirmed.</li>
          </ul>
        </>) },
        { id: "accounts", heading: "Accounts", body: (
          <p>An account is required to check out. The agreements you accept when you create it are recorded on your account with the version of these Terms and the time you accepted. Keep your password private &mdash; you are responsible for orders placed from your account.</p>
        ) },
        { id: "orders", heading: "Orders, pricing, and payment", body: (
          <p>Prices are in US dollars and may change without notice. Payment is taken when you place an order, and the total &mdash; including shipping and shipping insurance &mdash; is shown before you pay. We may correct pricing or listing errors and cancel any affected order with a full refund.</p>
        ) },
        { id: "finality", heading: "Cancellations and order finality", body: (
          <p>You may cancel for a full refund at any time until your order ships. Once an order has shipped it cannot be cancelled, returned, or refunded. Loss or damage in transit is covered by shipping insurance, as set out in our <Link href="/refund-policy#transit-loss" className="p-link">Refund &amp; Dispute Policy</Link>.</p>
        ) },
        { id: "restrictions", heading: "Use restrictions", body: (
          <p>We do not provide instructions for use, preparation guidance, or any claim about effects in humans or animals, and we do not answer questions seeking them. If communications or conduct suggest a product is intended for any use other than laboratory research, we may refuse the sale, cancel open orders with a refund, and close the account.</p>
        ) },
        { id: "liability", heading: "Warranties, liability, and indemnity", body: (<>
          <p>Each product is supplied as described by its lot certificate. Beyond that, the Site and all products are provided &ldquo;as is,&rdquo; without warranties of any kind, express or implied, including merchantability and fitness for a particular purpose.</p>
          <p>To the fullest extent permitted by law, we are not liable for indirect, incidental, special, consequential, or punitive damages, and our total liability for any claim is limited to the amount you paid for the product at issue. You agree to indemnify Aura Protocols against claims arising from your handling, possession, or use of any product, or your breach of these Terms.</p>
        </>) },
        { id: "site-use", heading: "Site use and intellectual property", body: (
          <p>The Site&apos;s text, graphics, marks, and artwork belong to Aura Protocols LLC. You may not copy, mirror, republish, or redistribute them without our written consent. We may suspend or change access to the Site at any time.</p>
        ) },
        { id: "privacy", heading: "Privacy and communications", body: (
          <p>Order, shipping, and account emails are part of every purchase. Marketing email is sent only if you opt in, and every marketing email has an unsubscribe link. How we handle your information is described in our <Link href="/privacy" className="p-link">Privacy Policy</Link>.</p>
        ) },
        { id: "law", heading: "Governing law and disputes", body: (<>
          <p>If a dispute arises, you agree to contact us first at {mail} and to attempt in good faith to resolve it with us. These Terms are governed by the laws of the State of {GOVERNING_STATE ?? <mark className="s-pending">[State — pending]</mark>}, without regard to conflict-of-law rules, and any unresolved dispute will be heard in the courts of that state.</p>
          <p>You and Aura Protocols are independent parties; nothing in these Terms creates a partnership, agency, or employment relationship. If any provision is found unenforceable, the rest remain in effect. These Terms, with the policies they reference, are the entire agreement between us about the Site and your purchases. We may update them; material changes will ask you to confirm again when you next enter the Site.</p>
        </>) },
      ]}
      closing={<p>By using the Site or placing an order you confirm that you have read and accepted these Terms, together with our Shipping, Refund &amp; Dispute, Privacy, and Research Use Only policies.</p>}
    />
  );
}
