import type { Metadata } from "next";
import Link from "next/link";
import PolicyPage from "@/components/store/PolicyPage";
import { DISPATCH_BUSINESS_DAYS } from "@/lib/constants";
import { FLAT_SHIPPING_USD, FREE_SHIPPING_THRESHOLD_USD, SHIPPING_INSURANCE_USD, formatUsd } from "@/lib/cart";

export const metadata: Metadata = { title: "Shipping Policy", alternates: { canonical: "/shipping" } };

// Requires legal review before launch.
export default function ShippingPage() {
  const flat = formatUsd(FLAT_SHIPPING_USD);
  const free = formatUsd(FREE_SHIPPING_THRESHOLD_USD);
  const insurance = formatUsd(SHIPPING_INSURANCE_USD);
  return (
    <PolicyPage
      policy="shipping"
      title={<>Shipping <em>Policy.</em></>}
      updated="October 2, 2026"
      summary={{
        headline: <>US only. {flat} flat, free on orders of {free} or more.</>,
        detail: <>Every order includes {insurance} shipping insurance, which covers a replacement if a package is lost or damaged in transit.</>,
      }}
      sections={[
        { id: "destinations", heading: "Where we ship", body: (
          <p>We ship within the United States only. We may decline an order to an address where a product is restricted.</p>
        ) },
        { id: "cost", heading: "Cost", body: (<>
          <p>Shipping is a flat {flat} per order, and free on orders of {free} or more.</p>
          <p>A {insurance} shipping-insurance charge applies to every order. It is itemized at checkout, before you pay.</p>
        </>) },
        { id: "dispatch", heading: "Processing and dispatch", body: (
          <p>{DISPATCH_BUSINESS_DAYS === null
            ? "Orders ship once payment has cleared; tracking follows by email."
            : `Orders typically ship within ${DISPATCH_BUSINESS_DAYS} business ${DISPATCH_BUSINESS_DAYS === 1 ? "day" : "days"} once payment has cleared.`}</p>
        ) },
        { id: "tracking", heading: "Tracking", body: (
          <p>Every order ships with tracking. We email the tracking number when your order ships, and it appears under My Orders in your account.</p>
        ) },
        { id: "insurance", heading: "Shipping insurance", body: (
          <p>If the carrier confirms a package is lost, or it arrives damaged or with the wrong item, we send one replacement at no charge. Damage and incorrect items must be reported with photos within 48 hours of delivery. The full claims process is in our <Link href="/refund-policy#transit-loss" className="p-link">Refund &amp; Dispute Policy</Link>.</p>
        ) },
        { id: "handling", heading: "Handling and storage on arrival", body: (
          <p>Products ship lyophilized in sealed vials. On arrival, store each vial as directed on its product page and label. Handling remains your responsibility under our <Link href="/ruo" className="p-link">Research Use Only policy</Link>.</p>
        ) },
      ]}
    />
  );
}
