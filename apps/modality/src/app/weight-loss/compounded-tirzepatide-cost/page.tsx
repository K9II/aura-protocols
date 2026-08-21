import { Fragment } from "react";
import type { Metadata } from "next";
import { subForUtm } from "@/lib/telehealth/channels";
import { RATING, RIBBON_CLAIMS } from "@/lib/telehealth/trust";
import BiosignatureSphere from "@/components/BiosignatureSphere";
import TirzepatideCTA from "./TirzepatideCTA";

const CANONICAL_PATH = "/weight-loss/compounded-tirzepatide-cost";

export const metadata: Metadata = {
  title: "Compounded Tirzepatide Cost: $474/Month, No Insurance | Modality",
  description:
    "See the real monthly cost of compounded tirzepatide — $474/mo, no insurance required. Licensed U.S. clinicians review every request before a prescription is issued.",
  alternates: { canonical: CANONICAL_PATH },
  openGraph: {
    title: "Compounded Tirzepatide Cost: $474/Month, No Insurance",
    description:
      "The real monthly price for compounded tirzepatide through Modality — no insurance required, no hidden fees.",
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
          <TirzepatideCTA className="btn btn-primary btn-sm" sub={sub}>
            See if you qualify →
          </TirzepatideCTA>
        </div>

        <div className="hero">
          <div>
            <p className="kicker">Weight Loss — GLP-1 Protocol</p>
            <h1 className="hero-title long">
              What compounded tirzepatide actually <em>costs</em>
            </h1>
            <p className="hero-sub">
              No insurance required, no membership fee — you pay $474/month, billed monthly. A licensed
              clinician sets your dose after a short intake; the number below is the real price, not a
              &ldquo;starting at&rdquo; teaser.
            </p>
            <div className="cta-row">
              <TirzepatideCTA className="btn btn-primary" sub={sub}>
                See if you qualify →
              </TirzepatideCTA>
              <a className="btn btn-outline" href="#factors">What affects the price ↓</a>
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

        <div className="section" id="protocols">
          <p className="sec-k">Compounded tirzepatide, priced monthly</p>
          <h3 className="sec-h">One number, no fine print</h3>
          <div className="priceblock">
            <div className="pb-amt">
              $474<small>/month</small>
            </div>
            <div className="pb-meta">
              <p className="pb-term">Billed monthly · no long-term contract</p>
              <p className="pb-note">
                This is the real price for compounded injectable tirzepatide with additives — not a
                &ldquo;starting at&rdquo; figure. There&apos;s no 3- or 6-month prepay discount on this
                formulation right now, so what you see is what you pay each month.
              </p>
              <div className="cta-row" style={{ marginTop: 14 }}>
                <TirzepatideCTA className="btn btn-primary btn-sm" sub={sub}>
                  Start your visit →
                </TirzepatideCTA>
              </div>
            </div>
          </div>
          <span className="source-flag">
            Reflects current LegUpRx partner pricing, verified August 20, 2026.
          </span>
        </div>

        <div className="section" id="factors">
          <p className="sec-k">Why the price moves</p>
          <h3 className="sec-h">What actually affects what you pay</h3>
          <ul className="factors">
            <li>
              <strong>Compounded vs. brand-name</strong>
              Compounded tirzepatide is prepared by a licensed pharmacy rather than sold under the
              Zepbound label — that&apos;s the main reason it costs less than the brand-name version.
            </li>
            <li>
              <strong>Which GLP-1</strong>
              Compounded semaglutide runs lower ($349/mo) than tirzepatide ($474/mo) — tirzepatide
              costs more because it&apos;s the newer, dual-action compound.
            </li>
            <li>
              <strong>Dose, not plan tier</strong>
              Your clinician sets the dose during intake; there&apos;s no membership tier to upgrade or
              &ldquo;unlock&rdquo; a lower price.
            </li>
            <li>
              <strong>Insurance</strong>
              Not required and not billed — this is a cash-pay price, so there&apos;s no
              prior-authorization wait or claim denial to plan around.
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
              <div className="q">Does insurance cover this?</div>
              <div className="a">
                No — compounded tirzepatide here is cash-pay. That&apos;s part of why it&apos;s priced
                lower than the brand-name drug, and why there&apos;s no prior-authorization wait.
              </div>
            </div>
            <div>
              <div className="q">Why is compounded cheaper than Zepbound?</div>
              <div className="a">
                You&apos;re paying for the compounding pharmacy&apos;s preparation, not the brand-name
                manufacturer&apos;s price — same active ingredient, different source.
              </div>
            </div>
            <div>
              <div className="q">Are there hidden fees?</div>
              <div className="a">
                No membership or platform fee. The price shown is the protocol price; renewal terms are
                set at checkout on our licensed partner&apos;s platform.
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
          <TirzepatideCTA className="btn btn-primary" sub={sub}>
            Start the quiz →
          </TirzepatideCTA>
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
