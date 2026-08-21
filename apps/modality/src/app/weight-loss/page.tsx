import { Fragment } from "react";
import type { Metadata } from "next";
import { subForUtm } from "@/lib/telehealth/channels";
import { RATING, RIBBON_CLAIMS } from "@/lib/telehealth/trust";
import BiosignatureSphere from "@/components/BiosignatureSphere";
import ProductCTA from "./ProductCTA";

const CANONICAL_PATH = "/weight-loss";

// Flagship compounded GLP-1 entry — same SKU the topbar/hero CTA on the
// semaglutide-vs-tirzepatide compare page defaults to (the lower-cost,
// lower-commitment option). See ProductCTA.tsx for the hand-off contract.
const SEMA_ID = "c222dcfe-12ea-4ce0-ad72-ed6540e92684";
const SEMA_LABEL = "Injectable Semaglutide with additives";

export const metadata: Metadata = {
  title: "Weight Loss: Compounded GLP-1 Protocols | Modality",
  description:
    "Medically-supervised compounded GLP-1 weight loss — semaglutide and tirzepatide, no insurance required. Licensed U.S. clinicians review every request before a prescription is issued.",
  alternates: { canonical: CANONICAL_PATH },
  openGraph: {
    title: "Weight Loss: Compounded GLP-1 Protocols",
    description:
      "Medically-supervised compounded GLP-1 weight loss through Modality — no insurance required, no hidden fees.",
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
          <ProductCTA className="btn btn-primary btn-sm" sub={sub} productId={SEMA_ID} label={SEMA_LABEL}>
            See if you qualify →
          </ProductCTA>
        </div>

        <div className="hero">
          <div>
            <p className="kicker">Weight Loss</p>
            <h1 className="hero-title long">
              Medically-supervised, compounded GLP-1 <em>weight loss</em>
            </h1>
            <p className="hero-sub">
              Compounded semaglutide and tirzepatide, matched by a licensed clinician — patients average
              15–20% weight loss. No insurance required, and GLP-1 protocols start from $199/month.
            </p>
            <div className="cta-row">
              <ProductCTA className="btn btn-primary" sub={sub} productId={SEMA_ID} label={SEMA_LABEL}>
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
          <h3 className="sec-h">Guides to the weight-loss lane</h3>
          <div className="guides">
            <a className="guide-card" href="/weight-loss/compounded-tirzepatide-cost">
              <h4 className="gc-h">What compounded tirzepatide costs</h4>
              <p className="gc-d">
                The real monthly price for compounded tirzepatide — no insurance required, no
                &ldquo;starting at&rdquo; teaser.
              </p>
              <span className="gc-arw">Read →</span>
            </a>
            <a className="guide-card" href="/weight-loss/semaglutide-vs-tirzepatide">
              <h4 className="gc-h">Semaglutide vs. tirzepatide</h4>
              <p className="gc-d">
                How the two compounded GLP-1 options compare on mechanism and cost, and how a clinician
                chooses between them.
              </p>
              <span className="gc-arw">Read →</span>
            </a>
          </div>
          <span className="source-flag">
            Reflects current LegUpRx partner pricing, verified August 20, 2026.
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
              <div className="q">What weight-loss options do you offer?</div>
              <div className="a">
                Compounded semaglutide and tirzepatide, plus microdose GLP-1 and Lipo injection options —
                a licensed clinician reviews your intake and determines which, if any, is appropriate for
                you.
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
              <div className="q">How fast will I see results?</div>
              <div className="a">
                It varies by person and protocol — your clinician manages dose and pace over regular
                check-ins. Patients average 15–20% weight loss, but that&apos;s an average, not a
                guarantee for any individual.
              </div>
            </div>
            <div>
              <div className="q">Can I cancel anytime?</div>
              <div className="a">
                Yes — cancellation terms are set at checkout on our licensed partner&apos;s platform, and
                there&apos;s no long-term contract.
              </div>
            </div>
          </div>
        </div>

        <div className="capture">
          <div>
            <div className="ct">See your price after a 2-minute quiz</div>
            <p className="cs">No insurance card, no obligation — a clinician reviews before anything is prescribed.</p>
          </div>
          <ProductCTA className="btn btn-primary" sub={sub} productId={SEMA_ID} label={SEMA_LABEL}>
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
