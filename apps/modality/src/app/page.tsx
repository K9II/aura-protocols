import { getPartnerId, TELEHEALTH_CATEGORIES, categoryLabel } from "@/lib/telehealth/config";
import { fetchCatalog } from "@/lib/telehealth/catalog";
import { subForUtm } from "@/lib/telehealth/channels";
import type { CatalogProduct } from "@/lib/telehealth/types";
import BiosignatureSphere from "@/components/BiosignatureSphere";
import StartVisit from "./StartVisit";

export const dynamic = "force-dynamic"; // catalog is no-store / live

// Wearable connect is Phase 2. Until it exists, keep the "matches your signal"
// flags hidden so we never imply functionality we don't yet have.
const SIGNAL_CONNECTED = false;
const SIGNAL_LANES = new Set(["weight-loss", "wellness"]);

const CODE: Record<string, string> = {
  "weight-loss": "WL", "mens-health": "MH", "womens-health": "WH", "hair-loss": "HL", "wellness": "WN",
};

type Lane = {
  category: string;
  code: string;
  label: string;
  desc: string;
  fromAmount: number | null;
  productId: string;
};

/** Collapse a category's products into a single browsable lane: a representative
 *  (cheapest purchasable) product carries the hand-off, and the "from" price is
 *  that product's cheapest term. Returns null for an empty category. */
function buildLane(category: string, products: CatalogProduct[]): Lane | null {
  if (products.length === 0) return null;
  const priced = products.filter((p) => p.fromPrice);
  const rep = priced.length
    ? priced.reduce((lo, p) => (p.fromPrice!.amount < lo.fromPrice!.amount ? p : lo))
    : products[0];
  return {
    category,
    code: CODE[category] ?? category.slice(0, 2).toUpperCase(),
    label: categoryLabel(category),
    desc: products.slice(0, 3).map((p) => p.name).join(" · "),
    fromAmount: rep.fromPrice?.amount ?? null,
    productId: rep.id,
  };
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ utm_source?: string }>;
}) {
  const { utm_source } = await searchParams;
  const sub = subForUtm(utm_source);
  const partnerId = getPartnerId();

  const lanes = (
    await Promise.all(
      TELEHEALTH_CATEGORIES.map(async (category) => {
        const res = await fetchCatalog(category, partnerId);
        return buildLane(category, res.ok ? res.products : []);
      }),
    )
  ).filter((l): l is Lane => l !== null);

  return (
    <div className="page">
      <div className="wordmark"><span className="glyph" aria-hidden="true" /><b>Modality</b></div>

      <div className="hero">
        <div>
          <p className="kicker">Signal to script</p>
          <h1 className="hero-title">Your <em>biology</em>, translated into a protocol.</h1>
          <p className="hero-sub">
            Browse clinician-led protocols and start a visit in a tap — or connect a wearable and let your
            recovery, glucose and sleep point the way. A licensed clinician reviews and prescribes when it&apos;s right.
          </p>
          <div className="doors">
            <a className="door primary" href="#protocols">
              <div>
                <div className="dn">Browse protocols <span className="tagpill now">No device needed</span></div>
                <div className="dd">Pick a protocol and start your visit now.</div>
              </div>
              <span className="arw" aria-hidden="true">→</span>
            </a>
            <a className="door" href="#protocols">
              <div>
                <div className="dn">Personalize with my data <span className="tagpill opt">Optional</span></div>
                <div className="dd">Connect a wearable — your protocols re-rank to your biosignal.</div>
              </div>
              <span className="arw" aria-hidden="true">→</span>
            </a>
          </div>
        </div>

        <BiosignatureSphere />
      </div>

      <div className="protocols-head" id="protocols">
        <h2>Protocols</h2>
        {SIGNAL_CONNECTED && <span className="note">★ = matches your signal</span>}
      </div>

      {lanes.length === 0 ? (
        <p className="hero-sub" style={{ marginTop: 16 }}>
          Protocols are momentarily unavailable — please check back shortly.
        </p>
      ) : (
        <div className="idx">
          {lanes.map((l) => (
            <StartVisit key={l.category} category={l.category} productId={l.productId} label={l.label} sub={sub} className="irow">
              <span className="code">{l.code}</span>
              <span className="nm">{l.label}{l.desc && <small>{l.desc}</small>}</span>
              {SIGNAL_CONNECTED && SIGNAL_LANES.has(l.category)
                ? <span className="flag">★ Matches your signal</span>
                : <span aria-hidden="true" />}
              <span className="px">
                {l.fromAmount != null
                  ? <><small>from</small> ${l.fromAmount}<small>/mo</small></>
                  : <small>See options</small>}
              </span>
            </StartVisit>
          ))}
        </div>
      )}

      <div className="disclaimer">
        <p>
          <strong>Modality is not a medical provider and does not prescribe, dispense, or provide medical advice.</strong>{" "}
          Telehealth programs are offered through our licensed partner, Leg Up Recovery, and its affiliated
          medical group; independent licensed clinicians make all treatment decisions, and prescriptions are
          issued only when clinically appropriate. Programs, pricing, and availability are set by the partner
          and vary by state. This page is not a substitute for professional medical care — for emergencies,
          call 911. Modality may receive compensation when you use these services.{" "}
          <a href="/disclosures">Full telehealth disclosures →</a>
        </p>
      </div>
    </div>
  );
}
