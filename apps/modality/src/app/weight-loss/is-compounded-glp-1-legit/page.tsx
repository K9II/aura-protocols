import { Fragment } from "react";
import type { Metadata } from "next";
import { subForUtm } from "@/lib/telehealth/channels";
import { RATING, RIBBON_CLAIMS } from "@/lib/telehealth/trust";
import BiosignatureSphere from "@/components/BiosignatureSphere";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, faqSchema, medicalWebPageSchema, type QA } from "@/lib/schema";
import ProductCTA from "../ProductCTA";

const CANONICAL_PATH = "/weight-loss/is-compounded-glp-1-legit";

// Single source for the visible FAQ list and the FAQPage JSON-LD. Compliance-
// vetted wording — keep verbatim if edited.
const FAQ: QA[] = [
  {
    q: "Is compounded semaglutide FDA-approved?",
    a: "Compounded medications aren't FDA-approved as finished products the way brand-name drugs are — they're prepared by a state-licensed pharmacy for an individual patient under a prescription. That's a normal, regulated practice, but it's different from brand-name approval, and a legitimate program is upfront about it.",
  },
  {
    q: "Is it the same as Ozempic, Wegovy, or Zepbound?",
    a: "It uses the same active ingredient — semaglutide, or tirzepatide for Zepbound and Mounjaro — but it isn't the branded product. It's a compounded formulation from a licensed pharmacy, which is part of why it costs less.",
  },
  {
    q: "How do I avoid a scam?",
    a: "Insist on a licensed clinician and a licensed pharmacy, avoid anything labeled “research only” or sold as raw powder, and be skeptical of prices far below legitimate cash-pay ranges.",
  },
  {
    q: "Is compounding legal?",
    a: "Pharmacy compounding is a long-established, regulated practice performed by licensed pharmacies. Rules and availability vary by state, which is why a legitimate program's clinician confirms what's appropriate where you live.",
  },
];

// Two flagship compounded SKUs; generic entry defaults to the lower-cost
// Semaglutide.
const SEMA_ID = "c222dcfe-12ea-4ce0-ad72-ed6540e92684";
const SEMA_LABEL = "Injectable Semaglutide with additives";
const TIRZ_ID = "f11f887a-f9a2-4696-9cd8-735b26824b60";
const TIRZ_LABEL = "Injectable Tirzepatide with additives";

export const metadata: Metadata = {
  title: "Is Compounded GLP-1 Legit? How to Spot a Real Program | Modality",
  description:
    "Compounded GLP-1 is real medication from licensed pharmacies — but the gray market is full of scams. Here's how to tell a legitimate, clinician-prescribed program from an unregulated one, and what honest cash-pay pricing looks like.",
  alternates: { canonical: CANONICAL_PATH },
  openGraph: {
    title: "Is Compounded GLP-1 Legit? How to Spot a Real Program",
    description:
      "How to tell a legitimate, clinician-prescribed compounded GLP-1 program from a gray-market scam — plus what honest cash-pay pricing looks like.",
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
            { name: "Is compounded GLP-1 legit?", path: CANONICAL_PATH },
          ]),
          faqSchema(FAQ),
          medicalWebPageSchema({
            name: "Is Compounded GLP-1 Legit?",
            description:
              "How to tell a legitimate, clinician-prescribed compounded GLP-1 program from a gray-market scam, and what honest cash-pay pricing looks like.",
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
          <ProductCTA className="btn btn-primary btn-sm" sub={sub} productId={SEMA_ID} label={SEMA_LABEL}>
            See if you qualify →
          </ProductCTA>
        </div>

        <div className="hero">
          <div>
            <p className="kicker">Weight Loss — Compounded GLP-1, Explained</p>
            <h1 className="hero-title long">
              Is compounded GLP-1 <em>legit</em> — or a scam?
            </h1>
            <p className="hero-sub">
              Short answer: compounded Semaglutide and Tirzepatide are real medications, prepared by
              licensed U.S. compounding pharmacies and dispensed only on a prescription from a licensed
              clinician. The scams are the gray-market sellers — raw &ldquo;research&rdquo; powder,
              &ldquo;not for human use&rdquo; vials, no prescription and no clinician. Here&apos;s how to
              tell them apart.
            </p>
            <div className="cta-row">
              <ProductCTA className="btn btn-primary" sub={sub} productId={SEMA_ID} label={SEMA_LABEL}>
                See if you qualify →
              </ProductCTA>
              <a className="btn btn-outline" href="#legit">What makes it legit ↓</a>
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

        <div className="section" id="legit">
          <p className="sec-k">Signs it&apos;s the real thing</p>
          <h3 className="sec-h">What makes a compounded GLP-1 program legitimate</h3>
          <ul className="factors">
            <li>
              <strong>A prescription is required</strong>
              A licensed clinician reviews your health history and prescribes only when it&apos;s
              appropriate — you can&apos;t just add it to a cart.
            </li>
            <li>
              <strong>A licensed compounding pharmacy</strong>
              The medication is prepared by a state-licensed U.S. compounding pharmacy, not shipped as
              raw powder from an unregulated seller.
            </li>
            <li>
              <strong>The same active ingredient</strong>
              Compounded Semaglutide and Tirzepatide use the same active GLP-1 as the brand-name drugs;
              the difference is the source and preparation, not the molecule.
            </li>
            <li>
              <strong>Ongoing clinician oversight</strong>
              A legitimate program includes follow-up and dose adjustments over time, not a one-time
              anonymous sale.
            </li>
          </ul>
        </div>

        <div className="section" id="scam">
          <p className="sec-k">Signs to walk away</p>
          <h3 className="sec-h">Red flags of a GLP-1 scam</h3>
          <ul className="factors">
            <li>
              <strong>No prescription, no clinician</strong>
              If you can buy it with no intake and no licensed clinician involved, it isn&apos;t a
              legitimate medical program.
            </li>
            <li>
              <strong>&ldquo;Research use only&rdquo; labeling</strong>
              &ldquo;For research purposes&rdquo; or &ldquo;not for human consumption&rdquo; vials are a
              way to sidestep regulation — not a medicine prepared for you.
            </li>
            <li>
              <strong>Raw powder or mystery vials</strong>
              Unlabeled powder sold on marketplaces or social media has no licensed pharmacy behind it
              and no quality controls you can verify.
            </li>
            <li>
              <strong>Prices that make no sense</strong>
              A price far below legitimate cash-pay ranges usually means there&apos;s no clinician, no
              licensed pharmacy, or no real oversight behind it.
            </li>
          </ul>
        </div>

        <div className="section" id="pricing">
          <p className="sec-k">What honest pricing looks like</p>
          <h3 className="sec-h">Legitimate cash-pay GLP-1, priced up front</h3>
          <div className="compare">
            <div className="compare-card">
              <p className="cc-name">Compounded Semaglutide</p>
              <div className="cc-amt">
                $349<small>/month</small>
              </div>
              <p className="cc-note">
                A GLP-1 receptor agonist from a licensed pharmacy — a transparent, clinician-prescribed
                price, not a too-good-to-be-true gray-market deal.
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
                A dual GIP/GLP-1 compound, also prepared by a licensed pharmacy and prescribed by a
                clinician — priced up front, billed monthly.
              </p>
              <ProductCTA className="btn btn-primary btn-sm" sub={sub} productId={TIRZ_ID} label={TIRZ_LABEL}>
                See if Tirzepatide fits →
              </ProductCTA>
            </div>
          </div>
          <p className="hero-sub" style={{ marginTop: 14, fontSize: "0.85rem" }}>
            Both are cash-pay, billed monthly with no long-term contract and no membership fee. A price
            dramatically lower than these usually isn&apos;t a bargain — it&apos;s a sign the clinician
            or the licensed pharmacy is missing.
          </p>
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
