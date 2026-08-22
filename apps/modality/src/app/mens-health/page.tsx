import { Fragment } from "react";
import type { Metadata } from "next";
import { subForUtm } from "@/lib/telehealth/channels";
import { RATING, RIBBON_CLAIMS } from "@/lib/telehealth/trust";
import BiosignatureSphere from "@/components/BiosignatureSphere";
import ProductCTA from "./ProductCTA";

const CANONICAL_PATH = "/mens-health";

// Flagship men's-health entry — generic Tadalafil, the lower-cost, most common
// ED option and the SKU the ED leaf pages default to. See ProductCTA.tsx for the
// hand-off contract. Live catalog verified 2026-08-21 (all mens-health SKUs are
// monthly-only: price3Month/price6Month = $0).
const TADALAFIL_ID = "482fafa4-b821-43a3-b92d-2aaf457038e5";
const TADALAFIL_LABEL = "Tadalafil";

export const metadata: Metadata = {
  title: "Men's Health: ED Treatment & Testosterone Support | Modality",
  description:
    "Discreet men's health online — generic ED treatment from $124/month and testosterone support, no insurance and no in-person visit. Licensed U.S. clinicians review every request before a prescription is issued.",
  alternates: { canonical: CANONICAL_PATH },
  openGraph: {
    title: "Men's Health: ED Treatment & Testosterone Support",
    description:
      "ED treatment and testosterone support through Modality — no insurance, no in-person visit, discreetly delivered.",
    url: CANONICAL_PATH,
    type: "website",
  },
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ utm_source?: string }>;
}) {
  const { utm_source } = await searchParams;
  const sub = subForUtm(utm_source);

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
          <ProductCTA className="btn btn-primary btn-sm" sub={sub} productId={TADALAFIL_ID} label={TADALAFIL_LABEL}>
            See if you qualify →
          </ProductCTA>
        </div>

        <div className="hero">
          <div>
            <p className="kicker">Men&apos;s Health</p>
            <h1 className="hero-title long">
              Discreet men&apos;s health, prescribed <em>online</em>
            </h1>
            <p className="hero-sub">
              ED treatment and testosterone support, matched by a licensed clinician — no insurance required
              and no in-person visit. Generic ED protocols start from $124/month, reviewed by a U.S.-licensed
              clinician and discreetly delivered.
            </p>
            <div className="cta-row">
              <ProductCTA className="btn btn-primary" sub={sub} productId={TADALAFIL_ID} label={TADALAFIL_LABEL}>
                See if you qualify →
              </ProductCTA>
              <a className="btn btn-outline" href="#guides">Explore the guides ↓</a>
            </div>
            <div className="microtrust">
              <span>Licensed U.S. clinicians</span>
              <span className="dot" />
              <span>No insurance needed</span>
              <span className="dot" />
              <span>Cancel anytime</span>
            </div>
          </div>

          <BiosignatureSphere />
        </div>

        <div className="section" id="guides">
          <p className="sec-k">Go deeper</p>
          <h3 className="sec-h">Guides to the men&apos;s-health lane</h3>
          <div className="guides">
            <a className="guide-card" href="/mens-health/tadalafil-vs-cialis">
              <h4 className="gc-h">Tadalafil vs. Cialis</h4>
              <p className="gc-d">
                Generic Tadalafil ($124/mo) vs. brand Cialis ($549/mo) — same active ingredient, and why
                the generic costs far less.
              </p>
              <span className="gc-arw">Read →</span>
            </a>
            <a className="guide-card" href="/mens-health/sildenafil-vs-viagra">
              <h4 className="gc-h">Sildenafil vs. Viagra</h4>
              <p className="gc-d">
                Generic Sildenafil ($124/mo) vs. brand Viagra ($724/mo) — how they compare, and how a
                clinician chooses.
              </p>
              <span className="gc-arw">Read →</span>
            </a>
            <a className="guide-card" href="/mens-health/online-ed-prescription-no-doctor-visit">
              <h4 className="gc-h">ED prescription online, no visit</h4>
              <p className="gc-d">
                How to get an ED prescription online without an in-person doctor visit — what a clinician
                reviews, and what it costs.
              </p>
              <span className="gc-arw">Read →</span>
            </a>
            <a className="guide-card" href="/mens-health/enclomiphene-cost">
              <h4 className="gc-h">Enclomiphene cost</h4>
              <p className="gc-d">
                What Enclomiphene costs ($224/mo) and how it differs from TRT — a clinician-prescribed way
                to support your own testosterone.
              </p>
              <span className="gc-arw">Read →</span>
            </a>
          </div>
          <span className="source-flag">
            Reflects current LegUpRx partner pricing, verified August 21, 2026.
          </span>
        </div>

        <div className="section" id="how">
          <p className="sec-k">How it works</p>
          <h3 className="sec-h">From quiz to delivery in three steps</h3>
          <div className="steps">
            <div className="step">
              <div className="num">01</div>
              <h4>Share your goals</h4>
              <p>A short health quiz — no insurance card, no referral needed.</p>
            </div>
            <div className="step">
              <div className="num">02</div>
              <h4>A licensed clinician reviews</h4>
              <p>An independent U.S.-licensed clinician evaluates you and prescribes only when it&apos;s appropriate.</p>
            </div>
            <div className="step">
              <div className="num">03</div>
              <h4>Delivered &amp; tuned over time</h4>
              <p>Delivered to you; your clinician adjusts dose through regular check-ins.</p>
            </div>
          </div>
        </div>

        <div className="section">
          <p className="sec-k">Questions</p>
          <h3 className="sec-h">Good to know</h3>
          <div className="faq">
            <div>
              <div className="q">What do you treat?</div>
              <div className="a">
                Erectile dysfunction — generic Tadalafil and Sildenafil, plus brand Cialis and Viagra — and
                testosterone support with Enclomiphene. A licensed clinician reviews your intake and
                determines which, if any, is appropriate for you.
              </div>
            </div>
            <div>
              <div className="q">Do I need insurance?</div>
              <div className="a">
                No — these are cash-pay protocols, so there&apos;s no prior-authorization wait or claim
                denial to plan around.
              </div>
            </div>
            <div>
              <div className="q">Do I need an in-person visit?</div>
              <div className="a">
                No — you complete a short online intake that an independent U.S.-licensed clinician reviews.
                They may follow up if they need more information before prescribing.
              </div>
            </div>
            <div>
              <div className="q">Is it discreet?</div>
              <div className="a">
                Yes — the intake is online and orders ship in plain packaging from our licensed partner.
              </div>
            </div>
          </div>
        </div>

        <div className="capture">
          <div>
            <div className="ct">See your price after a 2-minute quiz</div>
            <p className="cs">No insurance card, no obligation — a clinician reviews before anything is prescribed.</p>
          </div>
          <ProductCTA className="btn btn-primary" sub={sub} productId={TADALAFIL_ID} label={TADALAFIL_LABEL}>
            Start the quiz →
          </ProductCTA>
        </div>

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
