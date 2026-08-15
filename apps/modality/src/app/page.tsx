import { Fragment } from "react";
import { getPartnerId, TELEHEALTH_CATEGORIES, categoryLabel } from "@/lib/telehealth/config";
import { fetchCatalog } from "@/lib/telehealth/catalog";
import { subForUtm } from "@/lib/telehealth/channels";
import type { CatalogProduct } from "@/lib/telehealth/types";
import { groupProducts } from "@/lib/telehealth/groups";
import { RATING, PROOF_STATS, TESTIMONIALS, RIBBON_CLAIMS } from "@/lib/telehealth/trust";
import BiosignatureSphere from "@/components/BiosignatureSphere";
import ProductPicker, { type Lane } from "./ProductPicker";
import LeadCapture from "./LeadCapture";

export const dynamic = "force-dynamic"; // catalog is no-store / live

// Wearable connect is Phase 2. Until it exists, keep the "matches your signal"
// flags hidden so we never imply functionality we don't yet have.
const SIGNAL_CONNECTED = false;
const SIGNAL_LANES = new Set(["weight-loss", "wellness"]);

// Wearable-connect (the "personalized biosphere engine") is not in production yet.
// Show the affordance as "under-development"; flip to "available" + set the href
// when the connect flow ships.
const WEARABLE_CONNECT: "under-development" | "available" = "under-development";

const CODE: Record<string, string> = {
  "weight-loss": "WL", "mens-health": "MH", "womens-health": "WH", "hair-loss": "HL", "wellness": "WN",
};

// Per-lane preferred hero product. Weight Loss should lead with GLP-1 (semaglutide/
// tirzepatide), not whichever product happens to be cheapest (e.g. a Lipo shot).
const PREFER: Record<string, RegExp> = {
  "weight-loss": /semaglutide|tirzepatide/i,
};

/** Collapse a category's products into a single browsable lane. A representative
 *  product carries the hand-off and sets the "from" price: the cheapest product
 *  matching the lane's PREFER pattern (e.g. GLP-1 for Weight Loss), else the
 *  cheapest purchasable product overall. Returns null for an empty category. */
function buildLane(category: string, products: CatalogProduct[]): Lane | null {
  if (products.length === 0) return null;
  const priceOf = (p: CatalogProduct) => p.fromPrice?.amount ?? Infinity;
  const purchasable = products.filter((p) => p.fromPrice);
  const pool = purchasable.length ? purchasable : products;

  const prefRe = PREFER[category];
  const preferred = prefRe ? pool.filter((p) => prefRe.test(p.name)) : [];
  const candidates = preferred.length ? preferred : pool;
  const rep = candidates.reduce((lo, p) => (priceOf(p) < priceOf(lo) ? p : lo));

  return {
    category,
    code: CODE[category] ?? category.slice(0, 2).toUpperCase(),
    label: categoryLabel(category),
    fromAmount: rep.fromPrice?.amount ?? null,
    productId: rep.id,
    groups: groupProducts(products),
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

  const ratingChip = RATING
    ? `${RATING.value.toFixed(1)}★ from ${RATING.count.toLocaleString()}+ visits`
    : null;

  return (
    <>
      <div className="ribbon">
        {RIBBON_CLAIMS.map((claim, i) => (
          <Fragment key={claim}>
            {i > 0 && <span className="dot">•</span>}
            <span>{claim}</span>
          </Fragment>
        ))}
        {ratingChip && (
          <>
            <span className="dot">•</span>
            <span>{ratingChip}</span>
          </>
        )}
      </div>

      <div className="page">
        <div className="topbar">
          <div className="wordmark">
            <svg className="glyph" viewBox="2 2 36 52" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
              <path d="M 10 8 Q 12 18 10 32" fill="none" stroke="#000" strokeWidth="2.4" strokeLinecap="round" />
              <path d="M 20 5 L 20 50" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round" />
              <path d="M 30 8 Q 28 18 30 32" fill="none" stroke="#000" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
            <b><span className="cap">M</span><span className="tail">odality</span></b>
          </div>
          <a className="btn btn-primary btn-sm" href="#protocols">Browse protocols →</a>
        </div>

        <div className="hero">
          <div>
            <p className="kicker">Medically-supervised GLP-1</p>
            <h1 className="hero-title long">
              Your biology isn&apos;t <em>generic</em>. Your protocol shouldn&apos;t be either.
            </h1>
            <p className="hero-sub">
              Compounded GLP-1, matched by a licensed clinician — patients average 15–20% weight loss.
              Optionally connect a wearable and your protocol personalizes further to your recovery, glucose,
              and sleep.
            </p>
            <div className="cta-row">
              <a className="btn btn-primary" href="#protocols">See if you qualify →</a>
              <a className="btn btn-outline" href="#how">How it works</a>
            </div>
            <div className="microtrust">
              {RATING && (
                <>
                  <span className="stars">★★★★★</span>
                  <span>{RATING.value.toFixed(1)} / 5</span>
                  <span className="dot" />
                </>
              )}
              <span>Licensed U.S. clinicians</span>
              <span className="dot" />
              <span>Wearable optional</span>
            </div>
          </div>

          <BiosignatureSphere />
        </div>

        <div className="personalize">
          <span className="pz-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 12h6" />
              <path d="M8.5 8H8a4 4 0 000 8h.5" />
              <path d="M15.5 8h.5a4 4 0 010 8h-.5" />
            </svg>
          </span>
          <div className="pz-body">
            <div className="pz-h">
              Personalize with your wearable
              {WEARABLE_CONNECT === "under-development" && <span className="pz-tag">Under development</span>}
            </div>
            <p className="pz-p">
              Connect Whoop, Oura, Apple Watch and more — your recovery, glucose, and sleep help tune your
              protocol to your biology. Optional, never required.
            </p>
          </div>
          <div className="pz-cta">
            {WEARABLE_CONNECT === "under-development" ? (
              <button type="button" className="btn btn-primary" disabled aria-disabled="true" title="Wearable connect is under development">
                Connect a wearable
              </button>
            ) : (
              <a className="btn btn-primary" href="#connect">Connect a wearable →</a>
            )}
          </div>
        </div>

        {PROOF_STATS.length > 0 && (
          <div className="section">
            <div className="proofbar">
              {PROOF_STATS.map((s) => (
                <div className="stat" key={s.label}>
                  <div className="n">{s.n}</div>
                  <div className="l">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="section" id="how">
          <p className="sec-k">How it works</p>
          <h3 className="sec-h">From quiz to delivery in three steps</h3>
          <div className="steps">
            <div className="step">
              <div className="num">01</div>
              <h4>Pick a protocol &amp; share your goals</h4>
              <p>Browse the catalog, choose a lane, and complete a short health quiz. Optionally connect a wearable.</p>
            </div>
            <div className="step">
              <div className="num">02</div>
              <h4>A licensed clinician reviews</h4>
              <p>Independent U.S.-licensed clinicians evaluate you and prescribe only when it&apos;s appropriate.</p>
            </div>
            <div className="step">
              <div className="num">03</div>
              <h4>Delivered &amp; tuned over time</h4>
              <p>Delivered to you; your clinician adjusts it through regular check-ins — and it personalizes further as you connect your data.</p>
            </div>
          </div>
        </div>

        <div className="section" id="protocols">
          <p className="sec-k">Your whole protocol, one front door</p>
          <h3 className="sec-h">Browse every clinician-led protocol in one place</h3>
          <p className="lead">
            No membership or platform fee. Each protocol is priced on its own and prescribed only when a
            clinician says it&apos;s right — you just manage them all under one Modality front door.
          </p>
          {SIGNAL_CONNECTED && <p className="sec-k" style={{ marginTop: 12 }}>★ = matches your signal</p>}

          {lanes.length === 0 ? (
            <p className="hero-sub" style={{ marginTop: 16 }}>
              Protocols are momentarily unavailable — please check back shortly.
            </p>
          ) : (
            <div className="idx" style={{ marginTop: 14 }}>
              {lanes.map((l) => (
                <ProductPicker
                  key={l.category}
                  lane={l}
                  sub={sub}
                  signalMatch={SIGNAL_CONNECTED && SIGNAL_LANES.has(l.category)}
                />
              ))}
            </div>
          )}

          <p className="price-note">
            Each protocol offers 1 / 3 / 6-month supply pricing (a longer supply lowers the per-month price).
            Pricing and renewal terms are set at checkout on our licensed partner&apos;s platform.
          </p>
        </div>

        {TESTIMONIALS.length > 0 && (
          <div className="section">
            <p className="sec-k">Members</p>
            <h3 className="sec-h">Why they stay</h3>
            <div className="tgrid">
              {TESTIMONIALS.map((t) => (
                <div className="tcard" key={t.who}>
                  {RATING && <span className="stars">★★★★★</span>}
                  <p>&ldquo;{t.quote}&rdquo;</p>
                  <div className="who">— {t.who}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="section">
          <p className="sec-k">Questions</p>
          <h3 className="sec-h">Good to know</h3>
          <div className="faq">
            <div>
              <div className="q">Is there a membership fee?</div>
              <div className="a">No. There&apos;s no membership or platform fee. You pay per protocol, on its own 1/3/6-month supply pricing, and only when a clinician prescribes.</div>
            </div>
            <div>
              <div className="q">How do renewals work?</div>
              <div className="a">You pick a 1, 3, or 6-month supply and it renews at that cadence. Renewal and cancellation terms are set at checkout on our licensed partner&apos;s platform.</div>
            </div>
            <div>
              <div className="q">Who prescribes?</div>
              <div className="a">Independent U.S.-licensed clinicians via our partner medical group — only when clinically appropriate.</div>
            </div>
            <div>
              <div className="q">Is my data private?</div>
              <div className="a">The clinical intake and checkout run on a HIPAA-secure partner platform.</div>
            </div>
          </div>
        </div>

        <LeadCapture />

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
    </>
  );
}
