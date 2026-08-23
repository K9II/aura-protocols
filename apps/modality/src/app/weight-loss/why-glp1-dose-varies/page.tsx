import { Fragment } from "react";
import type { Metadata } from "next";
import { subForUtm } from "@/lib/telehealth/channels";
import { RATING, RIBBON_CLAIMS } from "@/lib/telehealth/trust";
import BiosignatureSphere from "@/components/BiosignatureSphere";
import ProductCTA from "../ProductCTA";

const CANONICAL_PATH = "/weight-loss/why-glp1-dose-varies";

// Verified snapshot this page was built against (2026-08-20) — same pricing
// state as the semaglutide-vs-tirzepatide compare page; re-check before
// publishing if either price changes. Retatrutide is referenced only as
// published trial evidence, NOT as an offered product — it is not in the
// Modality catalog, so there is intentionally no reta CTA/productId here.
const SEMA_ID = "c222dcfe-12ea-4ce0-ad72-ed6540e92684";
const SEMA_LABEL = "Injectable Semaglutide with additives";
const TIRZ_ID = "f11f887a-f9a2-4696-9cd8-735b26824b60";
const TIRZ_LABEL = "Injectable Tirzepatide with additives";

export const metadata: Metadata = {
  title: "Why the Same GLP-1 Dose Affects Everyone Differently | Modality",
  description:
    "One person responds to a low GLP-1 dose while another needs far more — and it's not body weight. What the research shows about exposure, genetics, and starting biology, and why a licensed clinician titrates the dose to you.",
  alternates: { canonical: CANONICAL_PATH },
  openGraph: {
    title: "Why the Same GLP-1 Dose Affects Everyone Differently",
    description:
      "Exposure, genetics, and starting biology all change GLP-1 response — which is exactly why a licensed clinician titrates your dose instead of a one-size-fits-all number.",
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
            <p className="kicker">Weight Loss — GLP-1 Dosing</p>
            <h1 className="hero-title long">
              Why the same GLP-1 dose affects everyone <em>differently</em>
            </h1>
            <p className="hero-sub">
              One person responds to a low dose while another needs several times more for the same effect —
              and it&apos;s usually not body weight. The dose you inject is only the start: how much drug your
              body is exposed to, how your receptors respond, and where your metabolism starts all move the
              result. It&apos;s the reason a licensed clinician titrates your dose to you rather than handing
              you a one-size-fits-all number.
            </p>
            <div className="cta-row">
              <a className="btn btn-primary" href="#science">See what the research shows ↓</a>
              <a className="btn btn-outline" href="#titrate">Why a clinician titrates ↓</a>
            </div>
            <div className="microtrust">
              <span>Licensed U.S. clinicians</span>
              <span className="dot" />
              <span>No insurance needed</span>
              <span className="dot" />
              <span>Dose tuned over time</span>
            </div>
          </div>

          <BiosignatureSphere />
        </div>

        <div className="section" id="science">
          <p className="sec-k">The number in the syringe is only the start</p>
          <h3 className="sec-h">Three things change how a GLP-1 dose lands</h3>
          <ul className="factors">
            <li>
              <strong>Exposure — same dose, different drug levels</strong>
              Injecting the same amount doesn&apos;t leave everyone with the same amount of drug circulating.
              Body weight nudges this for both Semaglutide and Tirzepatide — heavier people tend to sit at
              somewhat lower exposure — but the effect is modest. These aren&apos;t dosed by body weight, so
              being larger doesn&apos;t automatically mean you need more.
            </li>
            <li>
              <strong>Response — your receptors aren&apos;t identical</strong>
              Even at similar exposure, people respond differently. Genome-wide research has tied variants in
              the GLP-1 receptor gene (GLP1R) and its signaling partner (ARRB1) to how strongly people respond
              — and a 2026 study of 27,885 people linked a GLP1R variant to greater weight loss and certain
              variants to more nausea. It&apos;s real, but it&apos;s not a dosing formula.
            </li>
            <li>
              <strong>Starting biology — the baseline moves the curve</strong>
              Where your metabolism starts matters. In Semaglutide&apos;s own trials, people without diabetes
              lost about 14.9% of body weight on 2.4mg, while people with type 2 diabetes lost about 9.6% on
              the same dose. Same drug, same dose, different average result.
            </li>
          </ul>
        </div>

        <div className="section">
          <p className="sec-k">Dose still matters — on average</p>
          <h3 className="sec-h">More drug tends to mean more effect, but averages hide the spread</h3>
          <p className="lead">
            Higher doses do generally produce more weight loss across a group. In a published phase 2 trial,
            48-week average body-weight reductions climbed steadily with each step up in dose:
          </p>
          <ul className="factors">
            <li>
              <strong>1 mg dose</strong>
              About 8.7% average body-weight reduction at 48 weeks.
            </li>
            <li>
              <strong>4 mg dose</strong>
              About 17.1% average reduction.
            </li>
            <li>
              <strong>8 mg dose</strong>
              About 22.8% average reduction.
            </li>
            <li>
              <strong>12 mg dose</strong>
              About 24.2% average reduction.
            </li>
          </ul>
          <p className="lead">
            But those are group averages — people on the very same dose still responded very differently from
            one another. The average curve is real; where you land on it is your own. This phase 2 trial
            studied Retatrutide, an investigational triple-agonist that is not currently offered through
            Modality; it is cited only to illustrate the dose-response pattern.
          </p>
          <span className="source-flag">Trial figures are averages, not a guarantee for any individual.</span>
        </div>

        <div className="section" id="titrate">
          <p className="sec-k">It&apos;s not a self-checkout choice</p>
          <h3 className="sec-h">Why a licensed clinician titrates the dose to you</h3>
          <p className="lead">
            If exposure, receptor response, and starting biology all vary from person to person, then a single
            &ldquo;correct&rdquo; dose copied from someone else is a guess. Someone doing well on a low dose
            isn&apos;t proof everyone should stay low, and someone who needs more doesn&apos;t have
            &ldquo;bad receptors.&rdquo; That&apos;s the whole case for clinician-managed titration:
          </p>
          <ul className="factors">
            <li>
              <strong>Start conservatively</strong>
              Your clinician begins at a sensible dose for your history and goals, not a number from a forum.
            </li>
            <li>
              <strong>Adjust to your actual response</strong>
              Dose — and sometimes the compound itself — is tuned at check-ins based on how you tolerate and
              respond to it.
            </li>
            <li>
              <strong>Account for the rest of your picture</strong>
              Other medications, GI tolerance, and existing conditions are weighed during intake, not decided
              by price alone.
            </li>
          </ul>
          <div className="compare" style={{ marginTop: 18 }}>
            <div className="compare-card">
              <p className="cc-name">Compounded Semaglutide</p>
              <div className="cc-amt">
                $349<small>/month</small>
              </div>
              <p className="cc-note">
                A GLP-1 receptor agonist — generally the lower-cost entry point, and a common place a clinician
                starts titration.
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
                A dual GIP/GLP-1 agonist that tends to produce greater <em>average</em>{" "}weight loss in trials,
                at a higher monthly cost — your clinician weighs whether it fits you.
              </p>
              <ProductCTA className="btn btn-primary btn-sm" sub={sub} productId={TIRZ_ID} label={TIRZ_LABEL}>
                See if Tirzepatide fits →
              </ProductCTA>
            </div>
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
              <div className="q">Does my body weight decide my dose?</div>
              <div className="a">
                Not really. Heavier people tend to sit at somewhat lower drug exposure at a given dose, but the
                effect is modest — GLP-1 medications aren&apos;t dosed by body weight. Being larger
                doesn&apos;t automatically mean you need a higher dose.
              </div>
            </div>
            <div>
              <div className="q">Can a genetic test pick my ideal dose?</div>
              <div className="a">
                No. Variants in genes like GLP1R are associated with differences in response across large
                groups, but the research is nowhere near a genotype-to-dose formula for an individual. Your
                clinician titrates based on your actual response, not a gene test.
              </div>
            </div>
            <div>
              <div className="q">Why did I lose less than the averages I read about?</div>
              <div className="a">
                Averages hide a lot of individual spread, and your starting biology shifts the whole curve. In
                Semaglutide&apos;s own trials, people without diabetes lost about 14.9% while people with type 2
                diabetes lost about 9.6% on the same dose. Your result reflects your exposure, response, and
                baseline — not just the headline number.
              </div>
            </div>
            <div>
              <div className="q">Do you offer Retatrutide?</div>
              <div className="a">
                Not currently. Retatrutide is referenced on this page only as published trial evidence for the
                dose-response pattern. Modality&apos;s weight-loss lane offers compounded Semaglutide and
                Tirzepatide, matched by a licensed clinician.
              </div>
            </div>
            <div>
              <div className="q">Is this page medical advice?</div>
              <div className="a">
                No. It&apos;s general education. A licensed clinician reviews your intake and makes all
                treatment and dosing decisions, and prescribes only when it&apos;s clinically appropriate.
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

        <div className="section">
          <p className="sec-k">Sources</p>
          <h3 className="sec-h">The research behind this page</h3>
          <div className="guides">
            <a
              className="guide-card"
              href="https://pubmed.ncbi.nlm.nih.gov/36528349/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <h4 className="gc-h">GLP1R + ARRB1 pharmacogenomics</h4>
              <p className="gc-d">Dawed AY, et al. Lancet Diabetes &amp; Endocrinology, 2023.</p>
              <span className="gc-arw">View on PubMed →</span>
            </a>
            <a
              className="guide-card"
              href="https://pubmed.ncbi.nlm.nih.gov/40384505/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <h4 className="gc-h">GLP1R variant &amp; Semaglutide weight response</h4>
              <p className="gc-d">Phan A, et al. Obesity (Silver Spring), 2025.</p>
              <span className="gc-arw">View on PubMed →</span>
            </a>
            <a
              className="guide-card"
              href="https://pubmed.ncbi.nlm.nih.gov/41951734/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <h4 className="gc-h">Genetic predictors of GLP-1 response (27,885 people)</h4>
              <p className="gc-d">Su QJ, et al. Nature, 2026.</p>
              <span className="gc-arw">View on PubMed →</span>
            </a>
            <a
              className="guide-card"
              href="https://pubmed.ncbi.nlm.nih.gov/33567185/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <h4 className="gc-h">STEP 1 — Semaglutide 2.4mg (no diabetes)</h4>
              <p className="gc-d">Wilding JPH, et al. New England Journal of Medicine, 2021.</p>
              <span className="gc-arw">View on PubMed →</span>
            </a>
            <a
              className="guide-card"
              href="https://pubmed.ncbi.nlm.nih.gov/33667417/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <h4 className="gc-h">STEP 2 — Semaglutide 2.4mg (type 2 diabetes)</h4>
              <p className="gc-d">Davies M, et al. The Lancet, 2021.</p>
              <span className="gc-arw">View on PubMed →</span>
            </a>
            <a
              className="guide-card"
              href="https://pubmed.ncbi.nlm.nih.gov/37366315/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <h4 className="gc-h">Retatrutide dose-response (phase 2)</h4>
              <p className="gc-d">Jastreboff AM, et al. New England Journal of Medicine, 2023.</p>
              <span className="gc-arw">View on PubMed →</span>
            </a>
          </div>
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
