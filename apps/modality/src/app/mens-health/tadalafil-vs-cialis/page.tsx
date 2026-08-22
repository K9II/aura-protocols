import { Fragment } from "react";
import type { Metadata } from "next";
import { subForUtm } from "@/lib/telehealth/channels";
import { RATING, RIBBON_CLAIMS } from "@/lib/telehealth/trust";
import BiosignatureSphere from "@/components/BiosignatureSphere";
import ProductCTA from "../ProductCTA";

const CANONICAL_PATH = "/mens-health/tadalafil-vs-cialis";

// Verified against the live LegUpRx catalog 2026-08-21: Tadalafil $124/mo,
// Cialis $549/mo, both monthly-only (no 3/6-month tier). Generic entry defaults
// to the lower-cost Tadalafil. See ProductCTA.tsx for the hand-off contract.
const TADALAFIL_ID = "482fafa4-b821-43a3-b92d-2aaf457038e5";
const TADALAFIL_LABEL = "Tadalafil";
const CIALIS_ID = "c6016e64-2ef3-4dad-b999-be0efe6289fb";
const CIALIS_LABEL = "Cialis";

export const metadata: Metadata = {
  title: "Tadalafil vs. Cialis: Cost & How They Compare | Modality",
  description:
    "Generic Tadalafil is $124/mo, brand Cialis is $549/mo — the same active ingredient (tadalafil), no insurance required. See how they compare, then a licensed clinician helps you decide.",
  alternates: { canonical: CANONICAL_PATH },
  openGraph: {
    title: "Tadalafil vs. Cialis: Cost & How They Compare",
    description:
      "Generic Tadalafil ($124/mo) vs. brand Cialis ($549/mo) through Modality — same active ingredient, and how a licensed clinician chooses.",
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
            <p className="kicker">Men&apos;s Health — ED Protocol Comparison</p>
            <h1 className="hero-title long">
              Tadalafil vs. Cialis: what&apos;s actually <em>different</em>
            </h1>
            <p className="hero-sub">
              They share the same active ingredient — tadalafil. Generic Tadalafil is $124/month; brand-name
              Cialis is $549/month, billed monthly with no insurance required. For most men the practical
              difference is price, but a licensed clinician reviews your intake before either is prescribed.
            </p>
            <div className="cta-row">
              <a className="btn btn-primary" href="#compare">Compare pricing ↓</a>
              <a className="btn btn-outline" href="#chooses">How a clinician chooses ↓</a>
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

        <div className="section" id="compare">
          <p className="sec-k">Same molecule, two prices</p>
          <h3 className="sec-h">Tadalafil vs. Cialis, side by side</h3>
          <div className="compare">
            <div className="compare-card">
              <p className="cc-name">Generic Tadalafil</p>
              <div className="cc-amt">
                $124<small>/month</small>
              </div>
              <p className="cc-note">
                The generic form of tadalafil — the same active ingredient as Cialis, at a fraction of the
                brand-name price. The lower-cost, most common ED option.
              </p>
              <ProductCTA className="btn btn-primary btn-sm" sub={sub} productId={TADALAFIL_ID} label={TADALAFIL_LABEL}>
                See if Tadalafil fits →
              </ProductCTA>
            </div>
            <div className="compare-card">
              <p className="cc-name">Brand Cialis</p>
              <div className="cc-amt">
                $549<small>/month</small>
              </div>
              <p className="cc-note">
                The brand-name version of tadalafil. Same active ingredient as the generic — you&apos;re
                paying for the brand, which is why it costs more per month.
              </p>
              <ProductCTA className="btn btn-primary btn-sm" sub={sub} productId={CIALIS_ID} label={CIALIS_LABEL}>
                See if Cialis fits →
              </ProductCTA>
            </div>
          </div>
          <p className="hero-sub" style={{ marginTop: 14, fontSize: "0.85rem" }}>
            Both are billed monthly with no long-term contract and no membership fee — the number shown is
            what you pay each month.
          </p>
          <span className="source-flag">
            Reflects current LegUpRx partner pricing, verified August 21, 2026.
          </span>
        </div>

        <div className="section" id="chooses">
          <p className="sec-k">It&apos;s not a self-checkout choice</p>
          <h3 className="sec-h">How a clinician chooses between them</h3>
          <ul className="factors">
            <li>
              <strong>Same active ingredient</strong>
              Both are tadalafil, so they work the same way — the generic isn&apos;t a different or weaker
              drug, it&apos;s the same molecule without the brand name.
            </li>
            <li>
              <strong>Daily vs. as-needed</strong>
              Tadalafil can be dosed daily or as-needed; your clinician sets the dose and schedule that fits
              your goals during intake.
            </li>
            <li>
              <strong>Other medications &amp; conditions</strong>
              Nitrates and certain heart conditions can rule out this class of drug — this is reviewed during
              intake, not decided by price alone.
            </li>
            <li>
              <strong>Cost</strong>
              For most men the deciding factor is price: same result, and the generic is far less per month.
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
              <div className="q">Is generic Tadalafil as good as Cialis?</div>
              <div className="a">
                It&apos;s the same active ingredient at the same strengths, so it works the same way. The main
                difference is the brand name and the price.
              </div>
            </div>
            <div>
              <div className="q">Why is Cialis so much more expensive?</div>
              <div className="a">
                You&apos;re paying for the brand. Generic tadalafil delivers the same active ingredient without
                the brand-name markup, which is why it&apos;s far less per month.
              </div>
            </div>
            <div>
              <div className="q">Daily or as-needed?</div>
              <div className="a">
                Tadalafil can be taken daily at a lower dose or as-needed at a higher dose — your clinician
                recommends the approach that fits your goals and health history.
              </div>
            </div>
            <div>
              <div className="q">Does insurance cover either?</div>
              <div className="a">
                No — both are cash-pay here. That&apos;s part of why there&apos;s no prior-authorization wait.
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
