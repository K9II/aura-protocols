import { Fragment } from "react";
import type { Metadata } from "next";
import { subForUtm } from "@/lib/telehealth/channels";
import { RATING, RIBBON_CLAIMS } from "@/lib/telehealth/trust";
import BiosignatureSphere from "@/components/BiosignatureSphere";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, faqSchema, medicalWebPageSchema, type QA } from "@/lib/schema";
import ProductCTA from "../ProductCTA";

const CANONICAL_PATH = "/mens-health/enclomiphene-cost";

// Single source for the visible FAQ list and the FAQPage JSON-LD.
const FAQ: QA[] = [
  {
    q: "Is Enclomiphene the same as TRT?",
    a: "No. TRT replaces testosterone from an outside source; Enclomiphene is taken to support your body's own production. They're different approaches, and a clinician decides which, if either, fits you.",
  },
  {
    q: "Do I need bloodwork?",
    a: "Often, yes — a clinician typically reviews lab work to evaluate testosterone-related concerns before and during treatment. Your clinician determines what's needed for you.",
  },
  {
    q: "Who is it for?",
    a: "It's considered for men with low testosterone, and sometimes when fertility is a priority. Whether it's appropriate is determined by a licensed clinician from your intake and labs.",
  },
  {
    q: "Does insurance cover it?",
    a: "No — Enclomiphene here is cash-pay at $224/month. Any lab work your clinician orders may be billed separately by the lab.",
  },
];

// Verified against the live LegUpRx catalog 2026-08-21: Enclomiphene $224/mo,
// monthly-only (no 3/6-month tier). Single-SKU page. Note: this is NOT TRT —
// TRT is a gated LegUpRx add-on not currently in our catalog feed (see the
// leguprx-trt-launch memory). See ProductCTA.tsx for the hand-off contract.
const ENCLOMIPHENE_ID = "694759f6-2b17-4128-ba8c-2dfa274fb87e";
const ENCLOMIPHENE_LABEL = "Enclomiphene";

export const metadata: Metadata = {
  title: "Enclomiphene Cost: $224/Month, No Insurance | Modality",
  description:
    "Enclomiphene is $224/month, cash-pay, no insurance required — a clinician-prescribed option that supports your body's own testosterone, and how it differs from TRT. A licensed U.S. clinician reviews every request.",
  alternates: { canonical: CANONICAL_PATH },
  openGraph: {
    title: "Enclomiphene Cost: $224/Month, No Insurance",
    description:
      "What Enclomiphene costs through Modality — $224/month, cash-pay — and how it differs from TRT.",
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
            { name: "Men's Health", path: "/mens-health" },
            { name: "Enclomiphene cost", path: CANONICAL_PATH },
          ]),
          faqSchema(FAQ),
          medicalWebPageSchema({
            name: "Enclomiphene Cost",
            description:
              "What Enclomiphene costs through Modality — $224/mo, cash-pay, no insurance — and how it differs from TRT.",
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
          <ProductCTA className="btn btn-primary btn-sm" sub={sub} productId={ENCLOMIPHENE_ID} label={ENCLOMIPHENE_LABEL}>
            See if you qualify →
          </ProductCTA>
        </div>

        <div className="hero">
          <div>
            <p className="kicker">Men&apos;s Health — Testosterone Support</p>
            <h1 className="hero-title long">
              What Enclomiphene actually <em>costs</em>
            </h1>
            <p className="hero-sub">
              Enclomiphene is $224/month, cash-pay, with no insurance required. It&apos;s a
              clinician-prescribed oral medication that supports your body&apos;s own testosterone production —
              a different approach from TRT. A licensed clinician reviews your intake, and often lab work,
              before it&apos;s prescribed; the number below is the real monthly price.
            </p>
            <div className="cta-row">
              <ProductCTA className="btn btn-primary" sub={sub} productId={ENCLOMIPHENE_ID} label={ENCLOMIPHENE_LABEL}>
                See if you qualify →
              </ProductCTA>
              <a className="btn btn-outline" href="#vs-trt">How it differs from TRT ↓</a>
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
          <p className="sec-k">Enclomiphene, priced monthly</p>
          <h3 className="sec-h">One number, no fine print</h3>
          <div className="priceblock">
            <div className="pb-amt">
              $224<small>/month</small>
            </div>
            <div className="pb-meta">
              <p className="pb-term">Billed monthly · no long-term contract</p>
              <p className="pb-note">
                This is the real monthly price for Enclomiphene — not a &ldquo;starting at&rdquo; figure.
                It&apos;s cash-pay, so there&apos;s no insurance or prior-authorization involved. Lab work, if
                your clinician orders it, may be billed separately by the lab.
              </p>
              <div className="cta-row" style={{ marginTop: 14 }}>
                <ProductCTA className="btn btn-primary btn-sm" sub={sub} productId={ENCLOMIPHENE_ID} label={ENCLOMIPHENE_LABEL}>
                  Start your visit →
                </ProductCTA>
              </div>
            </div>
          </div>
          <span className="source-flag">
            Reflects current LegUpRx partner pricing, verified August 21, 2026.
          </span>
        </div>

        <div className="section" id="vs-trt">
          <p className="sec-k">Enclomiphene vs. TRT</p>
          <h3 className="sec-h">How it differs from testosterone replacement</h3>
          <ul className="factors">
            <li>
              <strong>Supports your own production</strong>
              Enclomiphene is taken to encourage your body to produce more of its own testosterone, rather
              than replacing it from an outside source the way TRT does.
            </li>
            <li>
              <strong>Oral, not an injection</strong>
              It&apos;s an oral medication, so there are no injections or topical gels involved.
            </li>
            <li>
              <strong>Fertility consideration</strong>
              Because it works on your own production, some men and their clinicians consider it when
              preserving fertility is a priority — a discussion to have during intake.
            </li>
            <li>
              <strong>A clinical decision</strong>
              Whether Enclomiphene, TRT, or neither is right for you is a clinical call your clinician makes
              from your intake and lab work — not a self-checkout choice.
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
          <ProductCTA className="btn btn-primary" sub={sub} productId={ENCLOMIPHENE_ID} label={ENCLOMIPHENE_LABEL}>
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
