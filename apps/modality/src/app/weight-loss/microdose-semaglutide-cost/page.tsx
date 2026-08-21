import { Fragment } from "react";
import type { Metadata } from "next";
import { subForUtm } from "@/lib/telehealth/channels";
import { RATING, RIBBON_CLAIMS } from "@/lib/telehealth/trust";
import BiosignatureSphere from "@/components/BiosignatureSphere";
import ProductCTA from "../ProductCTA";

const CANONICAL_PATH = "/weight-loss/microdose-semaglutide-cost";

// Verified against the live LegUpRx catalog on 2026-08-21 (weight-loss →
// "Microdose Semaglutide + B12"): 1-month $199, 3-month prepay $299 (~$100/mo),
// 6-month not offered. Unlike the flagship Semaglutide/Tirzepatide SKUs this
// one DOES have a multi-month tier — re-check both figures before publishing if
// pricing moves. Generic entry uses the lane-level ProductCTA (single SKU).
const MICRO_ID = "199c5197-2214-48fb-9fcb-acf200e58071";
const MICRO_LABEL = "Microdose Semaglutide + B12";

export const metadata: Metadata = {
  title: "Microdose Semaglutide Cost: $199/Month, No Insurance | Modality",
  description:
    "Microdose Semaglutide + B12 is $199/month — or about $100/month on the 3-month plan. Cash-pay, no insurance, no prior authorization. A licensed U.S. clinician sets your dose before anything is prescribed.",
  alternates: { canonical: CANONICAL_PATH },
  openGraph: {
    title: "Microdose Semaglutide Cost: $199/Month, No Insurance",
    description:
      "The lowest-cost way into a compounded GLP-1 protocol through Modality — Microdose Semaglutide + B12 from $199/month, cash-pay.",
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
          <ProductCTA className="btn btn-primary btn-sm" sub={sub} productId={MICRO_ID} label={MICRO_LABEL}>
            See if you qualify →
          </ProductCTA>
        </div>

        <div className="hero">
          <div>
            <p className="kicker">Weight Loss — Microdose GLP-1</p>
            <h1 className="hero-title long">
              What microdose Semaglutide actually <em>costs</em>
            </h1>
            <p className="hero-sub">
              Microdose Semaglutide pairs a lower dose of the GLP-1 with added B12 — $199/month, cash-pay,
              no insurance required. It&apos;s the lowest-cost way into a compounded GLP-1 protocol; a
              licensed clinician sets your dose after a short intake, and the number below is the real price,
              not a &ldquo;starting at&rdquo; teaser.
            </p>
            <div className="cta-row">
              <ProductCTA className="btn btn-primary" sub={sub} productId={MICRO_ID} label={MICRO_LABEL}>
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
          <p className="sec-k">Microdose Semaglutide, priced two ways</p>
          <h3 className="sec-h">$199/month — or about $100 on the 3-month plan</h3>
          <div className="compare">
            <div className="compare-card">
              <p className="cc-name">Month-to-month</p>
              <div className="cc-amt">
                $199<small>/month</small>
              </div>
              <p className="cc-note">
                Billed monthly with no long-term contract — the flexible way to start, and the lowest-cost
                compounded GLP-1 entry point Modality offers.
              </p>
              <ProductCTA className="btn btn-primary btn-sm" sub={sub} productId={MICRO_ID} label={MICRO_LABEL}>
                Start month-to-month →
              </ProductCTA>
            </div>
            <div className="compare-card">
              <p className="cc-name">3-month supply</p>
              <div className="cc-amt">
                $299<small>&nbsp;for 3 months</small>
              </div>
              <p className="cc-note">
                About $100/month — less than half the month-to-month rate. Billed once up front, cash-pay,
                with no membership fee.
              </p>
              <ProductCTA className="btn btn-primary btn-sm" sub={sub} productId={MICRO_ID} label={MICRO_LABEL}>
                Start the 3-month plan →
              </ProductCTA>
            </div>
          </div>
          <p className="hero-sub" style={{ marginTop: 14, fontSize: "0.85rem" }}>
            Both are cash-pay — no insurance and no prior authorization. There&apos;s no 6-month tier on this
            formulation right now; the exact term you choose is confirmed at checkout on our licensed
            partner&apos;s platform.
          </p>
          <span className="source-flag">
            Reflects current LegUpRx partner pricing, verified August 21, 2026.
          </span>
        </div>

        <div className="section" id="microdose">
          <p className="sec-k">What you&apos;re actually getting</p>
          <h3 className="sec-h">What &ldquo;microdose&rdquo; means here</h3>
          <ul className="factors">
            <li>
              <strong>A lower dose, clinician-set</strong>
              Microdosing uses smaller amounts of Semaglutide than a standard protocol — your clinician sets
              the starting dose during intake and adjusts it at check-ins.
            </li>
            <li>
              <strong>Semaglutide + B12</strong>
              It&apos;s the same active GLP-1 as standard compounded Semaglutide, at a lower dose, paired with
              vitamin B12 in one formulation.
            </li>
            <li>
              <strong>Why it costs less</strong>
              The lower dose is the main reason the monthly price ($199) sits below standard compounded
              Semaglutide ($349/mo).
            </li>
            <li>
              <strong>A gentler on-ramp</strong>
              Lower doses are often used to ease into a GLP-1 protocol or for maintenance — whether that fits
              your goals is a clinical decision, not a self-checkout one.
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
              <div className="q">Is microdose Semaglutide as effective as a full dose?</div>
              <div className="a">
                It&apos;s a lower dose, so it&apos;s typically used as a gentler entry point or for
                maintenance rather than the maximum-dose approach — your clinician decides what&apos;s
                appropriate for you and can adjust the dose over time.
              </div>
            </div>
            <div>
              <div className="q">Why is it cheaper than standard Semaglutide?</div>
              <div className="a">
                Mainly the lower dose — $199/month here versus $349/month for standard compounded
                Semaglutide. It&apos;s the same active GLP-1, just less of it per dose.
              </div>
            </div>
            <div>
              <div className="q">What&apos;s the B12 for?</div>
              <div className="a">
                This formulation includes vitamin B12 alongside the GLP-1. Your clinician can explain its role
                in your specific protocol during intake.
              </div>
            </div>
            <div>
              <div className="q">Can I move up to a standard dose later?</div>
              <div className="a">
                Yes — dose, and sometimes the formulation itself, can be adjusted at a check-in as your
                clinician sees how you&apos;re responding.
              </div>
            </div>
          </div>
        </div>

        <div className="capture">
          <div>
            <div className="ct">See your price after a 2-minute quiz</div>
            <p className="cs">No insurance card, no obligation — a clinician reviews before anything is prescribed.</p>
          </div>
          <ProductCTA className="btn btn-primary" sub={sub} productId={MICRO_ID} label={MICRO_LABEL}>
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
