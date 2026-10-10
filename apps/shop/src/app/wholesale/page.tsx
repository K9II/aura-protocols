import type { Metadata } from "next";
import Link from "next/link";
import InquiryForm from "@/components/store/InquiryForm";
import RunStrip from "@/components/store/wholesale/RunStrip";
import TierTable from "@/components/store/wholesale/TierTable";
import KitCards from "@/components/store/wholesale/KitCards";
import TrustRow from "@/components/store/TrustRow";
import MinimumKits from "@/components/store/wholesale/MinimumKits";
import WholesaleOrderSheet from "@/components/store/wholesale/WholesaleOrderSheet";
import WholesaleTurnOn from "@/components/store/wholesale/WholesaleTurnOn";
import { getWholesaleSettings } from "@/lib/wholesale/data";
import { cutoffFor, estimatedDates, kitRows, type WholesaleSettings } from "@/lib/wholesale/rules";
import { withArt } from "@/lib/wholesale/art";
import { getAccountState } from "@/lib/dal";
import { getLiveCatalogOrNull } from "@/lib/catalog-live";
import { currentMs } from "@/lib/clock";
import { dateLabel, localDate } from "@/lib/today/time";

// Per request: whether wholesale is open, who is signed in and the current run
// all change without a deploy (a static build would freeze the closed page).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Wholesale",
  description: "Made-to-order 10-vial research kits from independently tested lots, for laboratories and research organizations.",
  alternates: { canonical: "/wholesale" },
};

function Inquiry() {
  return <InquiryForm topic="wholesale" orgLabel="Organization / institution" messageLabel="Compounds and quantities" />;
}

// Today's page: shown until wholesale opens, and whenever its settings can't be read.
function ClosedPage() {
  return (
    <div className="pharmacopoeia">
      <div className="p-container py-16 max-w-3xl">
        <p className="s-micro s-eyebrow">Wholesale</p>
        <h1 className="s-h1 mb-5">For heavier <em>research.</em></h1>
        <p className="text-[color:var(--ink-soft)] max-w-[56ch] mb-10">
          Volume pricing, lot reservation, and certificates for every lot you receive. Tell us which
          compounds and roughly what quantity you need, and we&apos;ll reply with pricing and lead times.
        </p>
        <Inquiry />
      </div>
    </div>
  );
}

// Everyone lands on the intro (tiers, how it works, featured kits) first;
// "Start an order" (or signing in) moves on to ?step=order.
const ORDER_HREF = "/wholesale?step=order";

export default async function WholesalePage({ searchParams }: { searchParams: Promise<{ step?: string | string[] }> }) {
  const ordering = (await searchParams).step === "order";
  let s: WholesaleSettings;
  try {
    s = await getWholesaleSettings();
  } catch (err) {
    console.error("wholesale settings read failed:", err);
    return <ClosedPage />;
  }
  if (!s.open) return <ClosedPage />;

  const today = localDate(currentMs());
  const cutoff = cutoffFor(today, { runDays: s.runDays, override: s.nextCutoffOverride });
  const dates = estimatedDates(cutoff, s.leadDays);
  const { customer } = await getAccountState();
  const live = await getLiveCatalogOrNull();
  const rows = live ? withArt(kitRows(live.shown)) : null;
  const pricing = { tiers: s.tiers, depositPct: s.depositPct, minKits: s.minKits };
  const rules = <MinimumKits minKits={s.minKits} />;

  let body: React.ReactNode;
  if (!customer || !ordering) {
    body = (
      <>
        <TierTable tiers={s.tiers} />
        {rules}
        <ol className="s-ws-how">
          <li>Choose compounds and kits; pay a {s.depositPct}% deposit.</li>
          <li>We make your kits with this production run and test the lot independently.</li>
          <li>Pay the balance when your lot passes.</li>
          <li>Your kits ship with the lot&apos;s certificate.</li>
        </ol>
        {rows && rows.length > 0 && <KitCards rows={rows} tiers={s.tiers} seeAllHref={customer ? ORDER_HREF : `/sign-in?next=${encodeURIComponent(ORDER_HREF)}`} />}
        <TrustRow className="s-ws-trust" />
        {customer
          ? <Link href={ORDER_HREF} className="s-ws-btn">Start an order →</Link>
          : <Link href={`/sign-in?next=${encodeURIComponent(ORDER_HREF)}`} className="s-ws-btn">Sign in to order →</Link>}
      </>
    );
  } else if (customer.wholesale?.disabledAt) {
    body = <><TierTable tiers={s.tiers} />{rules}<p className="text-[15px]">Wholesale ordering is switched off for your account. Send us an inquiry below and we&apos;ll get back to you.</p></>;
  } else if (!customer.wholesale?.enabledAt) {
    body = <><TierTable tiers={s.tiers} />{rules}<WholesaleTurnOn needsResearch={!customer.research} organization={customer.organization} /></>;
  } else if (!rows) {
    body = <><TierTable tiers={s.tiers} />{rules}<p role="alert" className="text-[15px]">Wholesale ordering is briefly unavailable — please try again shortly.</p></>;
  } else {
    body = <WholesaleOrderSheet rows={rows} pricing={pricing} cutoffLabel={dateLabel(cutoff)} ship={customer.ship} email={customer.email} />;
  }

  return (
    <div className="pharmacopoeia">
      <div className="p-container py-16">
        <p className="s-micro s-eyebrow">Wholesale · made to order</p>
        <h1 className="s-h1 mb-5">Research <em>kits.</em></h1>
        <p className="s-ws-lede">10 vials of one strength per kit. Each production run is made and tested as one lot, and you receive its certificate.</p>
        <RunStrip cutoff={cutoff} testedAbout={dates.testedAbout} shipsAbout={dates.shipsAbout} today={today} />
        {body}
        <div className="s-ws-inq">
          <h2 className="s-h2 mt-6 mb-3">Custom or larger <em>requests.</em></h2>
          <p className="s-ws-note mb-6">Need a compound that isn&apos;t listed, or more than 20 kits? Ask us.</p>
          <Inquiry />
        </div>
      </div>
    </div>
  );
}
