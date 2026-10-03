import type { Metadata } from "next";
import Link from "next/link";
import ScrollReveal from "@/components/ScrollReveal";
import BiosignatureSphere from "@/components/BiosignatureSphere";
import CompoundCard from "@/components/store/CompoundCard";
import { compounds } from "@/data/catalog";
import { FREE_SHIPPING_THRESHOLD_USD } from "@/lib/cart";
import { sphereNodes, spherePairs } from "@/lib/sphere-nodes";

const SPHERE_NODES = sphereNodes();
const SPHERE_PAIRS_ACTIVE = spherePairs(SPHERE_NODES);

export const metadata: Metadata = {
  title: "Aura Protocols — Research Peptides, Certificate per Lot",
  description: "Research compounds released only after independent lot testing, with the certificate for each lot published. For laboratory research use only.",
  alternates: { canonical: "/" },
};

const featured = compounds.filter((c) => c.featured);

const faq = [
  { q: "Are these for human use?", a: "No. Every compound is sold strictly for in-vitro laboratory research. Not for human or animal consumption, and not for medical, veterinary, or diagnostic use." },
  { q: "What's a COA, and where is it?", a: "A certificate of analysis is the independent lab report for a specific production lot — identity, purity, and method. Every product page links the certificate for the lot currently shipping, and you can look up any lot number on the COA Lookup page." },
  { q: "How fast do you ship?", a: `Orders ship from the US with tracking. Shipping is free on orders of $${FREE_SHIPPING_THRESHOLD_USD} or more.` },
  { q: "What if a product says “COA pending”?", a: "The lot is still at the lab. The certificate is posted the day results come back." },
];

export default function HomePage() {
  return (
    <div className="pharmacopoeia">
      <ScrollReveal />
      <div className="p-container">
        <section className="s-hero">
          <div>
            <p className="s-micro s-eyebrow load-in load-1">Research peptides · COA before sale</p>
            <h1 className="s-h1 load-in load-2">Receipts,<br />not <em>promises.</em></h1>
            <p className="s-sub load-in load-3">Research compounds released only after an independent lab tests the lot. The certificate for the exact lot in your vial is published on its page.</p>
            <div className="s-ctas load-in load-4">
              <Link href="/products" className="p-btn-primary">Shop the lineup →</Link>
              <Link href="/coa" className="p-btn-outline">See the COAs</Link>
            </div>
            <div className="s-proof s-micro load-in load-5">
              <span>99% purity floor</span><span>Lot-matched COAs</span><span>Free at ${FREE_SHIPPING_THRESHOLD_USD}+</span>
            </div>
          </div>
          <div className="load-in load-5 s-hero-sphere">
            <BiosignatureSphere nodes={SPHERE_NODES} pairs={SPHERE_PAIRS_ACTIVE} />
          </div>
        </section>

        <section className="p-reveal py-14">
          <div className="s-lh">
            <h2 className="s-h2">The <em>lineup</em></h2>
            <p>No lot is sold until its certificate is on the page.</p>
          </div>
          <div className="s-grid">
            {featured.map((c, i) => <CompoundCard key={c.slug} compound={c} index={i} />)}
          </div>
          <div className="mt-8">
            <Link href="/products" className="p-see-all s-micro">See all {compounds.length} compounds →</Link>
          </div>
        </section>

        <section className="p-reveal py-14">
          <h2 className="s-h2 mb-6">Straight <em>answers</em></h2>
          <div>
            {faq.map(({ q, a }) => (
              <details key={q} className="border-t border-[color:var(--line)] py-4">
                <summary className="cursor-pointer text-[15px] flex justify-between">{q}<span className="text-[color:var(--specimen)]">+</span></summary>
                <p className="text-sm text-[color:var(--ink-soft)] mt-3 max-w-[70ch]">{a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
