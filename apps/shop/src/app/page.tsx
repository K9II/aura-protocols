import type { Metadata } from "next";
import Link from "next/link";
import ScrollReveal from "@/components/ScrollReveal";
import HeroLight, { PageLight } from "@/components/store/HeroLight";
import BiosignatureSphere from "@/components/BiosignatureSphere";
import CompoundCard from "@/components/store/CompoundCard";
import OrderPlate from "@/components/store/OrderPlate";
import AuraLetter from "@/components/store/AuraLetter";
import LotNews from "@/components/store/LotNews";
import LotProof from "@/components/store/LotProof";
import ScanStrip from "@/components/store/ScanStrip";
import TrustRow from "@/components/store/TrustRow";
import { DictionaryEntry, HeroAura } from "@/components/store/HeroAura";
import Unavailable from "@/components/store/Unavailable";
import type { Compound } from "@/data/catalog";
import { getLiveCatalogOrNull } from "@/lib/catalog-live";
import { SEVEN_TEST_PANEL } from "@/lib/constants";
import { auraRings } from "@/lib/hero-aura";
import { isNewestLot, proofLot } from "@/lib/lot-proof";
import { homeRecord } from "@/lib/lot-record";
import { sphereNodes, spherePairs } from "@/lib/sphere-nodes";
import { isPrelaunch } from "@/lib/prelaunch";
import { showComingSoon } from "@/lib/early/access";
import { siteUrl } from "@/lib/supabase/env";
import ComingSoon from "@/components/store/coming-soon/ComingSoon";
import { OFFER_PCT_TEXT } from "@/lib/account/offer";

const STORE_METADATA: Metadata = {
  title: "Aura Protocols — Research Peptides",
  description: "Research compounds released only after independent lot testing, with the certificate for each lot published. For laboratory research use only.",
  alternates: { canonical: "/" },
};

const PRELAUNCH_METADATA: Metadata = {
  title: "Aura Protocols — Research Peptides",
  description: `Research peptides tested by an ISO/IEC 17025-accredited US lab. Join the waitlist for early access and ${OFFER_PCT_TEXT} off your first order. For laboratory research use only.`,
  alternates: { canonical: "/" },
};

export function generateMetadata(): Metadata {
  return isPrelaunch() ? PRELAUNCH_METADATA : STORE_METADATA;
}


export default async function HomePage({ searchParams = Promise.resolve({}) }: { searchParams?: Promise<{ early?: string }> } = {}) {
  // Before launch "/" is the coming-soon page and its waitlist (lib/prelaunch.ts), except
  // for a browser with early access. /early sends a bad or closed link here with ?early=closed.
  if (await showComingSoon()) {
    const notice = (await searchParams).early === "closed" ? "Early access isn't open right now." : undefined;
    return <ComingSoon live={await getLiveCatalogOrNull()} site={siteUrl()} notice={notice} />;
  }
  const live = await getLiveCatalogOrNull();
  if (!live) return <Unavailable />;
  const featured = live.shown.filter((c) => c.featured);
  const phoneLineup = pickPhoneLineup(live.shown, featured);
  const sphere = sphereNodes(live.shown);
  const spherePairsActive = spherePairs(sphere);
  // the newest lot that passed all seven tests (Tier 1), else the newest lot
  const newest = proofLot(live.lots, live.certificates);
  const isNewest = newest ? isNewestLot(newest, live.lots) : true;
  const newestCompound = newest ? live.shown.find((c) => c.slug === newest.slug) : undefined;
  return (
    <div className="pharmacopoeia s-home-lit">
      {/* the hero's north light carried down the whole page (Alvester, 2026-10-19) */}
      <PageLight />
      <ScrollReveal />
      <div className="s-hero-band">
        <HeroLight />
        <div className="p-container">
        <section className="s-hero">
          <div>
            <DictionaryEntry className="load-in load-1" />
            <h1 className="s-h1 load-in load-2">Our compounds come surrounded by&nbsp;<em>proof.</em></h1>
            {/* phones: the newest lot's vial and the certificate its QR code opens (option C,
                2026-10-17); desktop shows the scan strip under the hero instead (2026-10-18).
                Both hidden until the first lot is released. */}
            {newest && newestCompound && (
              <div className="load-in load-3 s-proof-phone-only"><LotProof lot={newest} compound={newestCompound} certs={live.certificates} newest={isNewest} /></div>
            )}
            <div className="s-ctas load-in load-4">
              <Link href="/products" className="p-btn-primary">Shop the lineup →</Link>
              <Link href="/coa" className="p-btn-outline">See the COAs</Link>
            </div>
            <TrustRow className="load-in load-5" />
          </div>
          <div className="load-in load-5 s-hero-sphere">
            <HeroLight where="sphere" />
            <HeroAura rings={auraRings(live.lots)}>
              <BiosignatureSphere nodes={sphere} pairs={spherePairsActive} sidePull={0.88} />
            </HeroAura>
          </div>
          {/* Phones (under 900px): the lineup comes after the sphere, which sits under the lot
              card (2026-10-17; before that the lineup came first, mock P1 2026-10-14).
              Desktop shows the copy further down instead; CSS shows one of the two. */}
          <HomeLineup featured={phoneLineup} where="phone" />
        </section>
        </div>
      </div>
      <div className="p-container">

        {/* lots released since the last visit: announced in the top bar */}
        <LotNews lots={homeRecord(live.lots, new Set(featured.map((c) => c.slug)))} />

        {/* desktop: how a vial's QR code proves its lot (option A "Scan strip", Layout 1, 2026-10-18) */}
        {newest && newestCompound && <ScanStrip lot={newest} compound={newestCompound} certs={live.certificates} sevenTests={SEVEN_TEST_PANEL} newest={isNewest} />}

        <HomeLineup featured={featured} where="desk" />

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
// after the last lot releases on desktop; CSS shows one (.s-lineup--phone / --desk).
function HomeLineup({ featured, where }: { featured: Compound[]; where: "phone" | "desk" }) {
  return (
    <section className={`p-reveal py-14 s-lineup s-lineup--${where}`}>
      <div className="s-lh">
        {/* phones: the hero's buttons are left out; this one leads the cards instead, on its own (2026-10-17) */}
        {where === "phone"
          ? <Link href="/products" className="p-btn-primary s-lineup-btn">Shop the lineup →</Link>
          : <>
              <h2 className="s-h2"><Link href="/products" className="s-h2-link">The <em>lineup</em></Link></h2>
              <p>No matching COA - No sale</p>
            </>}
      </div>
      <div className="s-grid">
        {featured.map((c, i) => <CompoundCard key={c.slug} compound={c} index={i} idScope={where === "phone" ? "m-" : ""} />)}
      </div>
    </section>
  );
}
