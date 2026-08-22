import { Fragment } from "react";
import type { Metadata } from "next";
import { subForUtm } from "@/lib/telehealth/channels";
import { RATING, RIBBON_CLAIMS } from "@/lib/telehealth/trust";
import BiosignatureSphere from "@/components/BiosignatureSphere";
import ProductCTA from "../ProductCTA";

const CANONICAL_PATH = "/mens-health/online-ed-prescription-no-doctor-visit";

// Verified against the live LegUpRx catalog 2026-08-21: generic Tadalafil and
// Sildenafil both $124/mo, monthly-only. Generic entry defaults to Tadalafil.
const TADALAFIL_ID = "482fafa4-b821-43a3-b92d-2aaf457038e5";
const TADALAFIL_LABEL = "Tadalafil";
const SILDENAFIL_ID = "57f28a77-b16c-4da5-8214-8dda1ff5fab1";
const SILDENAFIL_LABEL = "Sildenafil";

export const metadata: Metadata = {
  title: "ED Prescription Online, No Doctor Visit | Modality",
  description:
    "Get an ED prescription online without an in-person doctor visit — generic Tadalafil or Sildenafil from $124/month, cash-pay, discreetly delivered. A licensed U.S. clinician reviews your intake before anything is prescribed.",
  alternates: { canonical: CANONICAL_PATH },
  openGraph: {
    title: "ED Prescription Online, No Doctor Visit",
    description:
      "How to get ED medication online through Modality without an in-person visit — generic Tadalafil or Sildenafil from $124/month, clinician-reviewed.",
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
            <p className="kicker">Men&apos;s Health — ED, Prescribed Online</p>
            <h1 className="hero-title long">
              An ED prescription online, <em>no in-person visit</em>
            </h1>
            <p className="hero-sub">
              You don&apos;t need to sit in a waiting room to be treated for ED. You complete a short online
              intake, an independent U.S.-licensed clinician reviews it, and — when it&apos;s appropriate —
              generic Tadalafil or Sildenafil is prescribed and shipped discreetly, from $124/month, no
              insurance required.
            </p>
            <div className="cta-row">
              <ProductCTA className="btn btn-primary" sub={sub} productId={TADALAFIL_ID} label={TADALAFIL_LABEL}>
                See if you qualify →
              </ProductCTA>
              <a className="btn btn-outline" href="#pricing">See the pricing ↓</a>
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

        <div className="section" id="pricing">
          <p className="sec-k">Two generic ED options, priced monthly</p>
          <h3 className="sec-h">Both $124/month, cash-pay</h3>
          <div className="compare">
            <div className="compare-card">
              <p className="cc-name">Generic Tadalafil</p>
              <div className="cc-amt">
                $124<small>/month</small>
              </div>
              <p className="cc-note">
                The same active ingredient as Cialis; can be dosed daily or as-needed. Longer-acting of the
                two.
              </p>
              <ProductCTA className="btn btn-primary btn-sm" sub={sub} productId={TADALAFIL_ID} label={TADALAFIL_LABEL}>
                See if Tadalafil fits →
              </ProductCTA>
            </div>
            <div className="compare-card">
              <p className="cc-name">Generic Sildenafil</p>
              <div className="cc-amt">
                $124<small>/month</small>
              </div>
              <p className="cc-note">
                The same active ingredient as Viagra; taken as-needed and acts over a shorter window.
              </p>
              <ProductCTA className="btn btn-primary btn-sm" sub={sub} productId={SILDENAFIL_ID} label={SILDENAFIL_LABEL}>
                See if Sildenafil fits →
              </ProductCTA>
            </div>
          </div>
          <p className="hero-sub" style={{ marginTop: 14, fontSize: "0.85rem" }}>
            Both are cash-pay, billed monthly with no long-term contract and no membership fee. Brand-name
            Cialis and Viagra are also available if you prefer them.
          </p>
          <span className="source-flag">
            Reflects current LegUpRx partner pricing, verified August 21, 2026.
          </span>
        </div>

        <div className="section" id="how-no-visit">
          <p className="sec-k">How it works without a visit</p>
          <h3 className="sec-h">What replaces the in-person appointment</h3>
          <ul className="factors">
            <li>
              <strong>An online intake, not a waiting room</strong>
              You answer a short set of health questions online — no appointment, no travel, and no waiting
              room.
            </li>
            <li>
              <strong>A licensed clinician reviews it</strong>
              An independent U.S.-licensed clinician reviews your intake and your history, and may message you
              for more detail before making a decision.
            </li>
            <li>
              <strong>Safety is still screened</strong>
              The intake screens for things that matter with ED medication — like nitrate use and certain
              heart conditions — so a prescription is only issued when it&apos;s appropriate.
            </li>
            <li>
              <strong>Discreet delivery</strong>
              If prescribed, your medication ships in plain packaging, and your clinician adjusts it over time
              through check-ins.
            </li>
          </ul>
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
              <div className="q">Do I really not need an in-person visit?</div>
              <div className="a">
                Correct — the evaluation is done through an online intake reviewed by a licensed clinician.
                They may follow up with questions, but there&apos;s no in-person exam required.
              </div>
            </div>
            <div>
              <div className="q">Is getting ED medication online safe?</div>
              <div className="a">
                A prescription is only issued after a licensed clinician reviews your intake, including a
                screen for nitrate use and heart conditions that matter with this class of drug. It&apos;s not
                sold without that review.
              </div>
            </div>
            <div>
              <div className="q">Do I need insurance?</div>
              <div className="a">
                No — this is cash-pay, from $124/month, so there&apos;s no prior-authorization wait or claim
                denial to plan around.
              </div>
            </div>
            <div>
              <div className="q">How fast is it?</div>
              <div className="a">
                Timing depends on the clinician&apos;s review and your state, but there&apos;s no appointment
                to schedule — you start the intake whenever you want.
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
