import { Fragment } from "react";
import type { Metadata } from "next";
import { subForUtm } from "@/lib/telehealth/channels";
import { RATING, RIBBON_CLAIMS } from "@/lib/telehealth/trust";
import BiosignatureSphere from "@/components/BiosignatureSphere";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, faqSchema, medicalWebPageSchema, type QA } from "@/lib/schema";
import ProductCTA from "../ProductCTA";

const CANONICAL_PATH = "/weight-loss/semaglutide-vs-tirzepatide";

// Single source for the visible FAQ list and the FAQPage JSON-LD.
const FAQ: QA[] = [
  {
    q: "Which is more effective?",
    a: "Published trials generally show Tirzepatide producing greater average weight loss than Semaglutide, but averages aren't a guarantee for any one person — your clinician weighs your history and goals rather than picking by trial averages alone.",
  },
  {
    q: "Why does Tirzepatide cost more?",
    a: "It's the newer, dual-action (GIP + GLP-1) compound. The price difference reflects the compound itself, not a difference in how the pharmacy prepares it.",
  },
  {
    q: "Can I switch?",
    a: "Yes — your clinician can adjust your protocol, including switching compounds, at a check-in if a different option becomes more appropriate.",
  },
  {
    q: "Does insurance cover either?",
    a: "No — both are cash-pay compounded formulations. That's part of why neither requires a prior-authorization wait.",
  },
];

// Verified snapshot this page was built against (2026-08-20) — re-check
// before publishing if either price or the "no 3/6-month discount" state
// changes. See TirzepatideCTA.tsx for the single-SKU precedent this
// generalizes from.
const SEMA_ID = "c222dcfe-12ea-4ce0-ad72-ed6540e92684";
const SEMA_LABEL = "Injectable Semaglutide with additives";
const TIRZ_ID = "f11f887a-f9a2-4696-9cd8-735b26824b60";
const TIRZ_LABEL = "Injectable Tirzepatide with additives";

export const metadata: Metadata = {
  title: "Semaglutide vs. Tirzepatide: Cost & How They Compare | Modality",
  description:
    "Compounded Semaglutide is $349/mo, compounded Tirzepatide is $474/mo — no insurance required. See how they compare on mechanism and cost, then a licensed clinician helps you decide.",
  alternates: { canonical: CANONICAL_PATH },
  openGraph: {
    title: "Semaglutide vs. Tirzepatide: Cost & How They Compare",
    description:
      "Compounded Semaglutide ($349/mo) vs. compounded Tirzepatide ($474/mo) through Modality — mechanism, cost, and how a licensed clinician chooses.",
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
            { name: "Semaglutide vs Tirzepatide", path: CANONICAL_PATH },
          ]),
          faqSchema(FAQ),
          medicalWebPageSchema({
            name: "Semaglutide vs. Tirzepatide",
            description:
              "Compounded Semaglutide ($349/mo) vs. Tirzepatide ($474/mo) — how they compare on mechanism and cost, and how a clinician chooses.",
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
          {/* Generic entry point defaults to Semaglutide (the lower-cost, lower-commitment
              option — same "cheapest GLP-1 match" convention the homepage lane uses); the
              compare section below gives an explicit per-drug CTA. */}
          <ProductCTA className="btn btn-primary btn-sm" sub={sub} productId={SEMA_ID} label={SEMA_LABEL}>
            See if you qualify →
          </ProductCTA>
        </div>

        <div className="hero">
          <div>
            <p className="kicker">Weight Loss — GLP-1 Protocol Comparison</p>
            <h1 className="hero-title long">
              Semaglutide vs. Tirzepatide: what&apos;s actually <em>different</em>
            </h1>
            <p className="hero-sub">
              Both are compounded GLP-1 options with no insurance required — $349/month for Semaglutide,
              $474/month for Tirzepatide, billed monthly. The right one depends on your health history and
              goals, which is why a licensed clinician reviews your intake before either is prescribed.
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
          <p className="sec-k">Two compounded GLP-1 options, priced monthly</p>
          <h3 className="sec-h">Semaglutide vs. Tirzepatide, side by side</h3>
          <div className="compare">
            <div className="compare-card">
              <p className="cc-name">Compounded Semaglutide</p>
              <div className="cc-amt">
                $349<small>/month</small>
              </div>
              <p className="cc-note">
                A GLP-1 receptor agonist — the original compounded option, and generally the lower-cost
                entry point into the category.
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
                A dual GIP/GLP-1 receptor agonist — the newer, dual-action compound. In published trials it
                tends to produce greater <em>average</em>{" "}weight loss than Semaglutide, though individual
                results vary and it costs more per month.
              </p>
              <ProductCTA className="btn btn-primary btn-sm" sub={sub} productId={TIRZ_ID} label={TIRZ_LABEL}>
                See if Tirzepatide fits →
              </ProductCTA>
            </div>
          </div>
          <p className="hero-sub" style={{ marginTop: 14, fontSize: "0.85rem" }}>
            Both are billed monthly with no long-term contract, and neither has a 3- or 6-month prepay
            discount on this formulation right now — the number shown is what you pay each month.
          </p>
          <span className="source-flag">
            Reflects current LegUpRx partner pricing, verified August 20, 2026.
          </span>
        </div>

        <div className="section" id="chooses">
          <p className="sec-k">It&apos;s not a self-checkout choice</p>
          <h3 className="sec-h">How a clinician chooses between them</h3>
          <ul className="factors">
            <li>
              <strong>Goals &amp; health history</strong>
              Your clinician reviews your weight-loss goals, prior GLP-1 use, and relevant medical history
              before recommending either compound.
            </li>
            <li>
              <strong>GI tolerance</strong>
              Some patients tolerate one mechanism better than the other; a clinician can start conservatively
              and adjust based on how you respond.
            </li>
            <li>
              <strong>Other medications &amp; conditions</strong>
              Interactions and existing conditions can rule one option in or out — this is reviewed during
              intake, not decided by price alone.
            </li>
            <li>
              <strong>Response over time</strong>
              Dose, and sometimes the compound itself, can be adjusted at check-ins as your clinician sees how
              you&apos;re responding.
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
