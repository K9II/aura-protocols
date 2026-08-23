import { Fragment } from "react";
import type { Metadata } from "next";
import { subForUtm } from "@/lib/telehealth/channels";
import { RATING, RIBBON_CLAIMS } from "@/lib/telehealth/trust";
import BiosignatureSphere from "@/components/BiosignatureSphere";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, faqSchema, medicalWebPageSchema, type QA } from "@/lib/schema";
import ProductCTA from "../ProductCTA";

const CANONICAL_PATH = "/mens-health/sildenafil-vs-viagra";

// Single source for the visible FAQ list and the FAQPage JSON-LD.
const FAQ: QA[] = [
  {
    q: "Is generic Sildenafil as good as Viagra?",
    a: "It's the same active ingredient at the same strengths, so it works the same way. The main difference is the brand name and the price.",
  },
  {
    q: "Why is Viagra so much more expensive?",
    a: "You're paying for the brand. Generic sildenafil delivers the same active ingredient without the brand-name markup, which is why it's far less per month.",
  },
  {
    q: "Sildenafil or tadalafil?",
    a: "Sildenafil works over a shorter window; tadalafil lasts longer and can be dosed daily. Your clinician can help you choose based on how you want it to work.",
  },
  {
    q: "Does insurance cover either?",
    a: "No — both are cash-pay here. That's part of why there's no prior-authorization wait.",
  },
];

// Verified against the live LegUpRx catalog 2026-08-21: Sildenafil $124/mo,
// Viagra $724/mo, both monthly-only (no 3/6-month tier). Generic entry defaults
// to the lower-cost Sildenafil. See ProductCTA.tsx for the hand-off contract.
const SILDENAFIL_ID = "57f28a77-b16c-4da5-8214-8dda1ff5fab1";
const SILDENAFIL_LABEL = "Sildenafil";
const VIAGRA_ID = "8e0e0d83-991e-470a-a3a2-f590536499eb";
const VIAGRA_LABEL = "Viagra";

export const metadata: Metadata = {
  title: "Sildenafil vs. Viagra: Cost & How They Compare | Modality",
  description:
    "Generic Sildenafil is $124/mo, brand Viagra is $724/mo — the same active ingredient (sildenafil), no insurance required. See how they compare, then a licensed clinician helps you decide.",
  alternates: { canonical: CANONICAL_PATH },
  openGraph: {
    title: "Sildenafil vs. Viagra: Cost & How They Compare",
    description:
      "Generic Sildenafil ($124/mo) vs. brand Viagra ($724/mo) through Modality — same active ingredient, and how a licensed clinician chooses.",
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
            { name: "Sildenafil vs Viagra", path: CANONICAL_PATH },
          ]),
          faqSchema(FAQ),
          medicalWebPageSchema({
            name: "Sildenafil vs. Viagra",
            description:
              "Generic Sildenafil ($124/mo) vs. brand Viagra ($724/mo) — same active ingredient, how they compare, and how a clinician chooses.",
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
          <ProductCTA className="btn btn-primary btn-sm" sub={sub} productId={SILDENAFIL_ID} label={SILDENAFIL_LABEL}>
            See if you qualify →
          </ProductCTA>
        </div>

        <div className="hero">
          <div>
            <p className="kicker">Men&apos;s Health — ED Protocol Comparison</p>
            <h1 className="hero-title long">
              Sildenafil vs. Viagra: what&apos;s actually <em>different</em>
            </h1>
            <p className="hero-sub">
              They share the same active ingredient — sildenafil. Generic Sildenafil is $124/month; brand-name
              Viagra is $724/month, billed monthly with no insurance required. For most men the practical
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
          <h3 className="sec-h">Sildenafil vs. Viagra, side by side</h3>
          <div className="compare">
            <div className="compare-card">
              <p className="cc-name">Generic Sildenafil</p>
              <div className="cc-amt">
                $124<small>/month</small>
              </div>
              <p className="cc-note">
                The generic form of sildenafil — the same active ingredient as Viagra, at a fraction of the
                brand-name price. The lower-cost, most common ED option.
              </p>
              <ProductCTA className="btn btn-primary btn-sm" sub={sub} productId={SILDENAFIL_ID} label={SILDENAFIL_LABEL}>
                See if Sildenafil fits →
              </ProductCTA>
            </div>
            <div className="compare-card">
              <p className="cc-name">Brand Viagra</p>
              <div className="cc-amt">
                $724<small>/month</small>
              </div>
              <p className="cc-note">
                The brand-name version of sildenafil. Same active ingredient as the generic — you&apos;re
                paying for the brand, which is why it costs more per month.
              </p>
              <ProductCTA className="btn btn-primary btn-sm" sub={sub} productId={VIAGRA_ID} label={VIAGRA_LABEL}>
                See if Viagra fits →
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
              Both are sildenafil, so they work the same way — the generic isn&apos;t a different or weaker
              drug, it&apos;s the same molecule without the brand name.
            </li>
            <li>
              <strong>Sildenafil vs. tadalafil</strong>
              Sildenafil acts over a shorter window than tadalafil; if you&apos;re weighing the two classes,
              a clinician can help you pick based on how and when you want it to work.
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
          <ProductCTA className="btn btn-primary" sub={sub} productId={SILDENAFIL_ID} label={SILDENAFIL_LABEL}>
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
