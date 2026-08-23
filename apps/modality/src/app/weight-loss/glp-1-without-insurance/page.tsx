import { Fragment } from "react";
import type { Metadata } from "next";
import { subForUtm } from "@/lib/telehealth/channels";
import { RATING, RIBBON_CLAIMS } from "@/lib/telehealth/trust";
import BiosignatureSphere from "@/components/BiosignatureSphere";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, faqSchema, medicalWebPageSchema, type QA } from "@/lib/schema";
import ProductCTA from "../ProductCTA";

const CANONICAL_PATH = "/weight-loss/glp-1-without-insurance";

// Single source for the visible FAQ list and the FAQPage JSON-LD.
const FAQ: QA[] = [
  {
    q: "I don't have insurance — can I still get GLP-1?",
    a: "Yes. Compounded Semaglutide and Tirzepatide here are cash-pay, so no insurance card is needed — a licensed clinician reviews your intake and prescribes only when appropriate.",
  },
  {
    q: "My plan denied GLP-1 for weight loss. What now?",
    a: "The cash-pay path sidesteps prior authorization and coverage denials entirely — you pay the monthly price shown, with no claim to appeal and no step-therapy hoops.",
  },
  {
    q: "Is compounded cheaper than paying out of pocket for the brand?",
    a: "Generally, yes — compounded formulations are prepared by a licensed pharmacy rather than sold under the brand-name label, which is why the monthly price is lower than brand-name list price.",
  },
  {
    q: "Are there membership or hidden fees?",
    a: "No membership or platform fee. The price shown is the protocol price; renewal and cancellation terms are set at checkout on our licensed partner's platform.",
  },
];

// Verified snapshot this page was built against (2026-08-20) — re-check
// before publishing if either price or the "no 3/6-month discount" state
// changes. Same two SKUs the semaglutide-vs-tirzepatide compare page routes
// to; generic entry defaults to the lower-cost Semaglutide.
const SEMA_ID = "c222dcfe-12ea-4ce0-ad72-ed6540e92684";
const SEMA_LABEL = "Injectable Semaglutide with additives";
const TIRZ_ID = "f11f887a-f9a2-4696-9cd8-735b26824b60";
const TIRZ_LABEL = "Injectable Tirzepatide with additives";

export const metadata: Metadata = {
  title: "GLP-1 Without Insurance: How to Get It, Cash-Pay | Modality",
  description:
    "No insurance? You can still start GLP-1 weight-loss medication. Compounded Semaglutide from $349/mo and Tirzepatide $474/mo — cash-pay, no prior authorization. A licensed U.S. clinician reviews every request.",
  alternates: { canonical: CANONICAL_PATH },
  openGraph: {
    title: "GLP-1 Without Insurance: How to Get It, Cash-Pay",
    description:
      "Compounded GLP-1 through Modality without insurance — Semaglutide from $349/mo, Tirzepatide $474/mo, no prior-authorization wait.",
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
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Weight Loss", path: "/weight-loss" },
            { name: "GLP-1 without insurance", path: CANONICAL_PATH },
          ]),
          faqSchema(FAQ),
          medicalWebPageSchema({
            name: "GLP-1 Without Insurance",
            description:
              "How to start compounded GLP-1 weight-loss medication cash-pay, without insurance or prior authorization — Semaglutide $349/mo, Tirzepatide $474/mo.",
            path: CANONICAL_PATH,
          }),
        ]}
      />
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
          {/* Generic entry defaults to Semaglutide (lower-cost, lower-commitment) —
              same "cheapest GLP-1 match" convention the hub and compare page use. */}
          <ProductCTA className="btn btn-primary btn-sm" sub={sub} productId={SEMA_ID} label={SEMA_LABEL}>
            See if you qualify →
          </ProductCTA>
        </div>

        <div className="hero">
          <div>
            <p className="kicker">Weight Loss — GLP-1 Without Insurance</p>
            <h1 className="hero-title long">
              How to get GLP-1 medication <em>without insurance</em>
            </h1>
            <p className="hero-sub">
              You don&apos;t need insurance — or a prior authorization — to start a GLP-1 protocol.
              Compounded Semaglutide runs $349/month and compounded Tirzepatide $474/month, billed monthly
              and cash-pay. A licensed clinician reviews your intake and prescribes only when it&apos;s
              appropriate; the numbers below are the real price, not a &ldquo;starting at&rdquo; teaser.
            </p>
            <div className="cta-row">
              <ProductCTA className="btn btn-primary" sub={sub} productId={SEMA_ID} label={SEMA_LABEL}>
                See if you qualify →
              </ProductCTA>
              <a className="btn btn-outline" href="#pricing">See cash-pay pricing ↓</a>
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
          <p className="sec-k">Cash-pay, no insurance required</p>
          <h3 className="sec-h">What GLP-1 costs when you pay cash</h3>
          <div className="compare">
            <div className="compare-card">
              <p className="cc-name">Compounded Semaglutide</p>
              <div className="cc-amt">
                $349<small>/month</small>
              </div>
              <p className="cc-note">
                A GLP-1 receptor agonist and generally the lower-cost entry point — no insurance card, no
                prior authorization, no claim to file.
              </p>
              <ProductCTA className="btn btn-primary btn-sm" sub={sub} productId={SEMA_ID} label={SEMA_LABEL}>
                See if Semaglutide fits →
              </ProductCTA>
            </div>
            <div className="compare-card">
              <p className="cc-name">Compounded Tirzepatide</p>
              <div className="cc-amt">
                $474<small>/month</small>
              </div>
              <p className="cc-note">
                A dual GIP/GLP-1 receptor agonist — the newer, dual-action compound. Costs more per month,
                and it&apos;s cash-pay just the same, so there&apos;s no coverage denial to work around.
              </p>
              <ProductCTA className="btn btn-primary btn-sm" sub={sub} productId={TIRZ_ID} label={TIRZ_LABEL}>
                See if Tirzepatide fits →
              </ProductCTA>
            </div>
          </div>
          <p className="hero-sub" style={{ marginTop: 14, fontSize: "0.85rem" }}>
            Both are billed monthly with no long-term contract and no membership fee. There&apos;s no 3- or
            6-month prepay discount on these formulations right now — what you see is what you pay each month.
          </p>
          <span className="source-flag">
            Reflects current LegUpRx partner pricing, verified August 20, 2026.
          </span>
        </div>

        <div className="section" id="why">
          <p className="sec-k">Why go cash-pay</p>
          <h3 className="sec-h">Why insurance often won&apos;t cover GLP-1 anyway</h3>
          <ul className="factors">
            <li>
              <strong>Weight-loss use is often excluded</strong>
              Many plans cover GLP-1 drugs for type 2 diabetes but carve out coverage when they&apos;re
              prescribed for weight loss — leaving you paying out of pocket regardless.
            </li>
            <li>
              <strong>Prior authorization &amp; step therapy</strong>
              Even when a plan may cover it, approvals can require prior authorization, documented BMI
              thresholds, or trying other treatments first — weeks of paperwork before anything ships.
            </li>
            <li>
              <strong>Employer carve-outs</strong>
              A growing number of employer plans have dropped or capped GLP-1 coverage entirely, so
              &ldquo;having insurance&rdquo; doesn&apos;t always mean these drugs are covered.
            </li>
            <li>
              <strong>Cash-pay skips all of it</strong>
              Compounded Semaglutide and Tirzepatide here are cash-pay — no prior-authorization wait, no
              claim denial, and a transparent monthly price you can see up front.
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
            {FAQ.map(({ q, a }) => (
              <div key={q}>
                <div className="q">{q}</div>
                <div className="a">{a}</div>
              </div>
            ))}
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
