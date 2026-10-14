import type { Metadata } from "next";
import Link from "next/link";
import ProsePage from "@/components/store/ProsePage";
import { FREE_SHIPPING_THRESHOLD_USD } from "@/lib/cart";

// Moved off the home page ("Straight answers") on 2026-10-14; linked from the footer's Legal column.
export const metadata: Metadata = {
  title: "FAQ",
  description: "Straight answers about Aura Protocols research compounds: research use, certificates of analysis, shipping and lot testing.",
  alternates: { canonical: "/faq" },
};

export default function FaqPage() {
  return (
    <ProsePage
      eyebrow="FAQ"
      title={<>Straight <em>answers.</em></>}
      sections={[
        { heading: "Are these for human use?", body: <p>No. Every compound is sold strictly for in-vitro laboratory research. Not for human or animal consumption, and not for medical, veterinary, or diagnostic use. See our <Link href="/ruo" className="p-link">Research Use Only policy</Link>.</p> },
        { heading: "What's a COA, and where is it?", body: <p>A certificate of analysis is the independent lab report for a specific production lot — identity, purity, and method. Every product page links the certificate for the lot currently shipping, and you can look up any lot number on the <Link href="/coa" className="p-link">COA Lookup</Link> page.</p> },
        { heading: "How fast do you ship?", body: <p>Orders ship from the US with tracking. Shipping is free on orders of ${FREE_SHIPPING_THRESHOLD_USD} or more. See <Link href="/shipping" className="p-link">Shipping</Link>.</p> },
      ]}
    />
  );
}
