import type { Metadata } from "next";
import Link from "next/link";
import EarningsCalculator from "@/components/partners/EarningsCalculator";
import { CASH_MIN_CENTS, CLEARING_DAYS, CODE_DISCOUNT_PCT, CREDIT_MULTIPLIER, REF_WINDOW_DAYS, TIERS } from "@/lib/partners/tiers";

export const metadata: Metadata = {
  title: "Partner program",
  description: "Researchers, clinicians and publishers earn 10–20% commission sharing Aura Protocols; their audience saves 10%.",
  alternates: { canonical: "/affiliates" },
};

const usd = (cents: number) => `$${(cents / 100).toLocaleString("en-US")}`;
const minPct = TIERS[0].pct;
const maxPct = TIERS[TIERS.length - 1].pct;
const creditExample = Math.round(CASH_MIN_CENTS * CREDIT_MULTIPLIER);

// Option B "Partner placard" (approved 2026-10-10, options page RPuHJX4ETSpeyaVFA7kVzz):
// the hero mirrors the product-page image — a Monograph-style placard of the partner
// terms with a hanging code tag in front — and the rest uses the product page's
// raised panels and hanging tags. Every figure comes from lib/partners/tiers.ts.
export default function AffiliatesPage() {
  return (
    <div className="pharmacopoeia">
      <div className="p-container py-14">
        <section className="s-pp-hero">
          <div>
            <p className="s-micro s-eyebrow">Partner program</p>
            <h1 className="s-h1 mb-5" style={{ fontSize: 52 }}>Partner with <em>Aura.</em></h1>
            <p className="s-pp-lede">For researchers, clinicians and publishers who cover research compounds responsibly. Share your code, your audience saves {CODE_DISCOUNT_PCT}%, and you earn on every order it brings in.</p>
            <dl className="s-pp-facts">
              <div><dt className="s-micro">Commission clears</dt><dd>{CLEARING_DAYS} days after shipping</dd></div>
              <div><dt className="s-micro">Paid on</dt><dd>the 1st and 15th</dd></div>
              <div><dt className="s-micro">Link credit</dt><dd>{REF_WINDOW_DAYS} days after a click</dd></div>
            </dl>
            <Link href="/partners/apply" className="s-atc s-pp-apply">Apply to partner →</Link>
          </div>
          <div className="s-pp-tile" aria-hidden>
            <div className="s-pp-placard">
              <span className="s-pp-k">Partner terms · Aura Protocols</span>
              <span className="s-pp-n">Your code</span>
              <dl>
                <dt>Audience</dt><dd>saves {CODE_DISCOUNT_PCT}%</dd>
                <dt>You earn</dt><dd>{minPct}–{maxPct}%</dd>
                <dt className="s-pp-x">Tiers</dt><dd className="s-pp-x">never drop</dd>
                <dt className="s-pp-x">Paid</dt><dd className="s-pp-x">cash or credit {CREDIT_MULTIPLIER}×</dd>
              </dl>
              <span className="s-placard-r">Research use only · Not for human use</span>
            </div>
            <div className="s-pp-code s-pp-tag"><span>Your code</span><b>YOURLAB</b><i>{CODE_DISCOUNT_PCT}% off</i></div>
          </div>
        </section>

        <EarningsCalculator />

        <div className="s-pp-two">
          <div>
            <div className="s-pp-panel">
              <table className="s-pp-tiers">
                <thead><tr><th>Lifetime referred sales</th><th>Commission</th></tr></thead>
                <tbody>
                  {TIERS.map((t) => (
                    <tr key={t.pct}><td>{t.fromCents === 0 ? "From your first order" : usd(t.fromCents)}</td><td className="p-serif">{t.pct}%</td></tr>
                  ))}
                </tbody>
              </table>
              {/* rising step bar: one step per tier, heights by commission */}
              <div className="s-pp-steps" aria-hidden>
                {TIERS.map((t) => <i key={t.pct} style={{ height: `${(t.pct / maxPct) * 100}%`, opacity: 0.45 + 0.4 * (t.pct / maxPct) }} />)}
              </div>
            </div>
            <p className="s-pp-note">Once you reach a tier you keep it. Commission is paid on what the customer paid for products, after discounts; shipping and tax don&apos;t count.</p>
            <p className="s-micro" style={{ margin: "30px 0 10px" }}>How it works</p>
            <ol className="s-pp-list">
              <li>Apply with your Aura account. We review every application.</li>
              <li>Upon approval, you receive a unique referral code and link. You may change your code at any time. Orders placed within {REF_WINDOW_DAYS} days of a visitor clicking your link are credited to you, and every order that uses your code is credited regardless of timing.</li>
              <li>Commission clears {CLEARING_DAYS} days after an order ships and is paid on the 1st and 15th.</li>
            </ol>
          </div>
          <div>
            <p className="s-micro" style={{ margin: "0 0 10px" }}>Getting paid</p>
            <div className="s-pp-pay">
              <div className="s-pp-tag" style={{ "--edge": "var(--ink)" } as React.CSSProperties}>
                <p className="p-serif s-pp-h">Cash</p>
                <p>ACH or Zelle, from {usd(CASH_MIN_CENTS)}. A W-9 is required before your first cash payout.</p>
              </div>
              <div className="s-pp-tag">
                <p className="p-serif s-pp-h">Store credit <em>worth {CREDIT_MULTIPLIER}×</em></p>
                <p>{usd(CASH_MIN_CENTS)} of commission becomes {usd(creditExample)} to spend on Aura. No minimum. Choose cash, credit, or a split.</p>
              </div>
            </div>
            <p className="s-micro" style={{ margin: "0 0 10px" }}>Partner rules</p>
            <ol className="s-pp-list s-pp-rules">
              <li><b>Research use only.</b> Represent all products exclusively as materials for laboratory research. Partners may not suggest or imply human or animal use, provide preparation instructions, or share personal results or before-and-after imagery.</li>
              <li><b>Disclosure.</b> Clearly identify your paid relationship with Aura Protocols in every post, video and link description, for example &quot;#ad&quot; or &quot;Paid partner of Aura Protocols.&quot;</li>
              <li><b>Fair promotion.</b> Partners may not bid on &quot;Aura Protocols&quot; in paid search or social advertising, list their code on coupon or deal sites, or apply their own code to personal orders.</li>
              <li><b>Enforcement.</b> Any breach of these rules may result in termination of the partnership, and any commission not yet paid will be forfeited.</li>
            </ol>
            <Link href="/partners/apply" className="s-atc block text-center" style={{ marginTop: 24 }}>Apply to partner →</Link>
            <p className="text-[12.5px] text-[color:var(--ink-soft)] mt-2">You&apos;ll be asked to sign in or create an account first. Full terms: <Link className="p-link" href="/partner-agreement">Partner Agreement</Link>.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
