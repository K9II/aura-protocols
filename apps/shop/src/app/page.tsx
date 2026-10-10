import type { Metadata } from "next";
import Link from "next/link";
import ScrollReveal from "@/components/ScrollReveal";
import BiosignatureSphere from "@/components/BiosignatureSphere";
import CompoundCard from "@/components/store/CompoundCard";
import FromTheRecord from "@/components/store/FromTheRecord";
import TrustRow from "@/components/store/TrustRow";
import Unavailable from "@/components/store/Unavailable";
import { getLiveCatalogOrNull } from "@/lib/catalog-live";
import { FREE_SHIPPING_THRESHOLD_USD } from "@/lib/cart";
import { sphereNodes, spherePairs } from "@/lib/sphere-nodes";

export const metadata: Metadata = {
  title: "Aura Protocols — Research Peptides, Certificate per Lot",
  description: "Research compounds released only after independent lot testing, with the certificate for each lot published. For laboratory research use only.",
  alternates: { canonical: "/" },
};

const faq = [
  { q: "Are these for human use?", a: "No. Every compound is sold strictly for in-vitro laboratory research. Not for human or animal consumption, and not for medical, veterinary, or diagnostic use." },
  { q: "What's a COA, and where is it?", a: "A certificate of analysis is the independent lab report for a specific production lot — identity, purity, and method. Every product page links the certificate for the lot currently shipping, and you can look up any lot number on the COA Lookup page." },
  { q: "How fast do you ship?", a: `Orders ship from the US with tracking. Shipping is free on orders of $${FREE_SHIPPING_THRESHOLD_USD} or more.` },
  { q: "What if a product says “COA pending”?", a: "The lot is still at the lab. The certificate is posted the day results come back." },
];

export default async function HomePage() {
  const live = await getLiveCatalogOrNull();
  if (!live) return <Unavailable />;
  const featured = live.shown.filter((c) => c.featured);
  const sphere = sphereNodes(live.shown);
  const spherePairsActive = spherePairs(sphere);
  return (
    <div className="pharmacopoeia">
      <ScrollReveal />
      <div className="p-container">
        <section className="s-hero">
          <div>
            <p className="s-micro s-eyebrow load-in load-1">Research Peptides · Certified COA</p>
            <h1 className="s-h1 load-in load-2">Separated. Measured.<br /><em>Published.</em></h1>
            <p className="s-sub load-in load-3">Every lot is separated and measured by an independent third-party US lab before it goes on sale. The certificate is published under the lot number printed on your vial.</p>
            <div className="s-ctas load-in load-4">
              <Link href="/products" className="p-btn-primary">Shop the lineup →</Link>
              <Link href="/coa" className="p-btn-outline">See the COAs</Link>
            </div>
            <TrustRow className="load-in load-5" />
          </div>
          <div className="load-in load-5 s-hero-sphere">
            <BiosignatureSphere nodes={sphere} pairs={spherePairsActive} />
          </div>
        </section>

        <FromTheRecord />

        <section className="p-reveal py-14">
          <div className="s-lh">
            <h2 className="s-h2"><Link href="/products" className="s-h2-link">The <em>lineup</em></Link></h2>
            <p>No matching COA - No sale</p>
          </div>
          <div className="s-grid">
            {featured.map((c, i) => <CompoundCard key={c.slug} compound={c} index={i} />)}
          </div>
          <div className="mt-8">
            <Link href="/products" className="p-see-all s-micro">See all {live.shown.length} compounds →</Link>
          </div>
        </section>

        <section className="p-reveal py-14">
          <h2 className="s-h2 mb-6">Straight <em>answers</em></h2>
          <div>
            {faq.map(({ q, a }) => (
              <details key={q} className="border-t border-[color:var(--line)] py-4">
                <summary className="cursor-pointer text-[17px] flex justify-between">{q}<span className="text-[color:var(--specimen)]">+</span></summary>
                <p className="text-[16px] text-[color:var(--ink-soft)] mt-3 max-w-[70ch]">{a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
