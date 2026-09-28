import type { Metadata } from "next";
import ProsePage from "@/components/store/ProsePage";
import { SUPPORT_EMAIL } from "@/lib/constants";
import { FREE_SHIPPING_THRESHOLD_USD } from "@/lib/cart";

export const metadata: Metadata = { title: "Shipping Policy", alternates: { canonical: "/shipping" } };

export default function ShippingPage() {
  return (
    <ProsePage
      eyebrow="Legal"
      title="Shipping Policy"
      updated="October 1, 2026"
      sections={[
        { heading: "Where we ship", body: <p>We ship within the United States only.</p> },
        { heading: "Cost", body: <p>Shipping is free on orders over ${FREE_SHIPPING_THRESHOLD_USD}. Below that, the shipping cost is shown at checkout before you pay.</p> },
        { heading: "Tracking", body: <p>Every order ships with tracking. You&apos;ll receive the tracking number by email when your order leaves us.</p> },
        { heading: "Lost or damaged packages", body: <p>If a package shows delivered but didn&apos;t arrive, or arrives damaged, email <a className="p-link" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> within 7 days of the delivery date with your order number and photos of any damage.</p> },
      ]}
    />
  );
}
