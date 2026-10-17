import type { Metadata } from "next";
import Link from "next/link";
import ScrollReveal from "@/components/ScrollReveal";
import HeroLight from "@/components/store/HeroLight";
import BiosignatureSphere from "@/components/BiosignatureSphere";
import CompoundCard from "@/components/store/CompoundCard";
import FromTheRecord from "@/components/store/FromTheRecord";
import OrderPlate from "@/components/store/OrderPlate";
import AuraLetter from "@/components/store/AuraLetter";
import LotRecord from "@/components/store/LotRecord";
import TrustRow from "@/components/store/TrustRow";
import Unavailable from "@/components/store/Unavailable";
import type { Compound } from "@/data/catalog";
import { getLiveCatalogOrNull } from "@/lib/catalog-live";
import { currentMs } from "@/lib/clock";
import { homeRecord } from "@/lib/lot-record";
import { sphereNodes, spherePairs } from "@/lib/sphere-nodes";

export const metadata: Metadata = {
  title: "Aura Protocols — Research Peptides, Certificate per Lot",
  description: "Research compounds released only after independent lot testing, with the certificate for each lot published. For laboratory research use only.",
  alternates: { canonical: "/" },
};


export default async function HomePage() {
  const live = await getLiveCatalogOrNull();
  if (!live) return <Unavailable />;
  const featured = live.shown.filter((c) => c.featured);
  const phoneLineup = pickPhoneLineup(live.shown, featured);
  const sphere = sphereNodes(live.shown);
  const spherePairsActive = spherePairs(sphere);
  return (
    <div className="pharmacopoeia">
      <ScrollReveal />
      <div className="s-hero-band">
        <HeroLight />
        <div className="p-container">
        <section className="s-hero">
          <div>
            <p className="s-micro s-eyebrow load-in load-1">Research Peptides · Certified COA</p>
            <h1 className="s-h1 load-in load-2">1906 gave us the&nbsp;test.<br /><em>We added the receipt.</em></h1>
            <p className="s-sub load-in load-3">Every lot is separated and measured by an independent third-party US lab before it goes out for research. Its certificate is published under the lot number on your vial.</p>
            <div className="s-ctas load-in load-4">
              <Link href="/products" className="p-btn-primary">Shop the lineup →</Link>
              <Link href="/coa" className="p-btn-outline">See the COAs</Link>
            </div>
            <TrustRow className="load-in load-5" />
          </div>
          {/* Phones (under 900px): the lineup comes right after the headline block, before the
              sphere (mock P1, 2026-10-14, https://claude.ai/artifact/8V1LaYJ4UXD1SeGooF4WN8).
              Desktop shows the copy further down instead; CSS shows one of the two. */}
          <HomeLineup featured={phoneLineup} total={live.shown.length} where="phone" />
          <div className="load-in load-5 s-hero-sphere">
            <BiosignatureSphere nodes={sphere} pairs={spherePairsActive} />
          </div>
        </section>
        </div>
      </div>
      <div className="p-container">

        {/* last lot releases; hidden until the first lot is released */}
        <LotRecord lots={homeRecord(live.lots, new Set(featured.map((c) => c.slug)))} variant="home" nowMs={currentMs()} />

        <FromTheRecord />

        <HomeLineup featured={featured} total={live.shown.length} where="desk" />

        {/* how an order runs (2026-10-14) */}
        <OrderPlate />

        {/* The Aura letter; the FAQ moved to /faq (footer, Company) */}
        <AuraLetter />
      </div>
    </div>
  );
}

// Phones show their own four, in this order (2026-10-17); desktop keeps the featured ones.
// One that isn't shown is skipped and the gap filled from the featured list.
const PHONE_LINEUP = ["mots-c", "bpc-157-tb-500-blend", "ss-31", "bpc-157-tb-500-ghk-cu-kpv"];

function pickPhoneLineup(shown: Compound[], featured: Compound[]): Compound[] {
  const picked = PHONE_LINEUP.flatMap((slug) => shown.filter((c) => c.slug === slug));
  const fill = featured.filter((c) => !picked.includes(c));
  return [...picked, ...fill].slice(0, PHONE_LINEUP.length);
}

// The featured lineup. Rendered twice on the home page: inside the hero on phones,
// after the 1906 plate on desktop; CSS shows one (.s-lineup--phone / --desk).
function HomeLineup({ featured, total, where }: { featured: Compound[]; total: number; where: "phone" | "desk" }) {
  return (
    <section className={`p-reveal py-14 s-lineup s-lineup--${where}`}>
      <div className="s-lh">
        <h2 className="s-h2"><Link href="/products" className="s-h2-link">The <em>lineup</em></Link></h2>
        <p>No matching COA - No sale</p>
      </div>
      <div className="s-grid">
        {featured.map((c, i) => <CompoundCard key={c.slug} compound={c} index={i} idScope={where === "phone" ? "m-" : ""} />)}
      </div>
      <div className="mt-8">
        <Link href="/products" className="p-see-all s-micro">See all {total} compounds →</Link>
      </div>
    </section>
  );
}
