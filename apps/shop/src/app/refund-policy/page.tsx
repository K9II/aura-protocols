import type { Metadata } from "next";
import PolicyPage from "@/components/store/PolicyPage";
import { SUPPORT_EMAIL } from "@/lib/constants";
import { SHIPPING_INSURANCE_USD, formatUsd } from "@/lib/cart";

export const metadata: Metadata = { title: "Refund & Dispute Policy", alternates: { canonical: "/refund-policy" } };

// Requires legal review before launch. The entry gate links here by name.
export default function RefundPolicyPage() {
  const mail = <a className="p-link" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>;
  return (
    <PolicyPage
      policy="refund-policy"
      title={<>Refund &amp; <em>Dispute</em> Policy</>}
      updated="October 2, 2026"
      summary={{
        headline: <>Cancel for a full refund until your order ships. After that, the sale is final.</>,
        detail: <>Lost or damaged in transit? Shipping insurance covers a free replacement &mdash; report it within 48 hours of delivery.</>,
      }}
      sections={[
        { id: "cancellations", heading: "Cancellations", body: (
          <p>You may cancel any order for a full refund until it ships. Email {mail} with your order number; the refund goes back to your original payment method, usually within 5–10 business days depending on your bank.</p>
        ) },
        { id: "finality", heading: "Order finality", body: (
          <p>Once an order has shipped it cannot be cancelled, returned, or refunded. Research materials that have left our control can&apos;t be restocked or recertified, so we don&apos;t accept them back. You confirmed the items, quantities, and shipping address in your cart before paying.</p>
        ) },
        { id: "transit-loss", heading: "Transit loss and damage (shipping insurance)", body: (<>
          <p>Every order includes {formatUsd(SHIPPING_INSURANCE_USD)} shipping insurance. It covers:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><b>Lost packages</b> &mdash; once the carrier confirms the package is lost.</li>
            <li><b>Damaged or incorrect items</b> &mdash; photograph the outer packaging, the inner packaging, and the vial labels, and email the photos with your order number to {mail} within 48 hours of the carrier&apos;s delivery time.</li>
          </ul>
          <p>Approved claims receive one replacement or reshipment of the affected items. Claims are settled by replacement only &mdash; no cash refunds.</p>
        </>) },
        { id: "chargebacks", heading: "Chargebacks", body: (
          <p>You agreed at entry to contact us before filing a payment dispute &mdash; most problems are fixed within two business days. If a dispute is filed without contacting us first, we will send the card issuer our records: your order, the delivery tracking, this policy, and your timestamped entry and account agreements.</p>
        ) },
        { id: "questions", heading: "Questions before you order", body: (
          <p>If anything about a product, quantity, shipping, or this policy is unclear, email {mail} before you place your order.</p>
        ) },
      ]}
    />
  );
}
