import type { Metadata } from "next";
import Link from "next/link";
import ProsePage from "@/components/store/ProsePage";
import { PARTNER_AGREEMENT_VERSION } from "@/lib/partners/codes";
import { SUPPORT_EMAIL } from "@/lib/constants";

export const metadata: Metadata = { title: "Partner Agreement", alternates: { canonical: "/partner-agreement" } };

// Requires legal review before launch. Bump PARTNER_AGREEMENT_VERSION when this text changes.
export default function PartnerAgreementPage() {
  return (
    <ProsePage
      eyebrow="Legal"
      title={<>Partner <em>Agreement.</em></>}
      updated="October 2, 2026"
      intro={<p>This agreement (version {PARTNER_AGREEMENT_VERSION}) governs the Aura Protocols partner program between you and Aura Protocols LLC. It sits alongside our <Link className="p-link" href="/terms">Terms of Service</Link>, which also apply to you.</p>}
      sections={[
        { heading: "Joining", body: <p>You apply with an Aura account. We review every application and may approve or decline it for any reason. We issue your code, and it works only once you are approved. You can change it from your dashboard; codes you used before keep crediting you.</p> },
        { heading: "Your code and link", body: <p>Customers who use your code save 10% on items that don&apos;t already carry a larger pack discount; only one discount applies to each item. A click on your link credits you for orders placed within 60 days. A code typed at checkout always takes priority over a link. You never earn on your own orders.</p> },
        { heading: "Commission", body: <p>You earn 10% of what referred customers pay for products after discounts, excluding shipping, shipping insurance and tax. Your rate rises to 15% once your lifetime referred sales reach $15,000 and to 20% at $40,000, and never drops. Commission becomes payable 15 days after an order ships. Refunded orders and chargebacks remove the commission, or are deducted from a later payout if it was already paid.</p> },
        { heading: "Payouts", body: <p>Payouts run on the 1st and 15th of each month. You choose cash, store credit or a split. Cash is paid by ACH or Zelle once at least $100 is due and we have checked your W-9. Store credit is issued at 1.3 times the commission value, has no minimum, applies automatically at your checkout, has no cash value and can&apos;t be transferred.</p> },
        { heading: "Content rules", body: (
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Present every product as a research compound for laboratory use only.</li>
            <li>No claims about effects in people or animals, no instructions for use, amounts, preparation or administration, and no personal-results or before-and-after content.</li>
            <li>Don&apos;t promote bacteriostatic water, syringes or supply bundles alongside our products.</li>
            <li>Disclose the paid relationship clearly in every post, video and link description, for example &quot;Paid partner of Aura Protocols&quot; or &quot;#ad&quot;. &quot;Affiliate link&quot; on its own is not enough.</li>
          </ul>
        ) },
        { heading: "Prohibited promotion", body: <p>No paid search or social ads on the Aura Protocols name, no coupon or deal sites, no spam, no misleading statements, and no presenting yourself as Aura Protocols or its staff.</p> },
        { heading: "Monitoring and enforcement", body: <p>We review partner content. If you break these rules we may suspend your code immediately, and unpaid commission is forfeited. Store credit already issued remains yours to spend.</p> },
        { heading: "Taxes and independence", body: <p>You are an independent contractor, not an employee or agent. US partners provide a W-9 before cash payouts; we issue tax forms where the law requires. You are responsible for your own taxes.</p> },
        { heading: "Changes and ending the partnership", body: <p>We may change this agreement or end the program with notice by email; continuing to promote after a change means you accept it. Either side may end the partnership at any time. Questions: {SUPPORT_EMAIL}.</p> },
      ]}
    />
  );
}
