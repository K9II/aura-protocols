import type { Metadata } from "next";
import Link from "next/link";
import EarningsCalculator from "@/components/partners/EarningsCalculator";

export const metadata: Metadata = {
  title: "Partner program",
  description: "Researchers, clinicians and publishers earn 10–20% commission sharing Aura Protocols; their audience saves 10%.",
  alternates: { canonical: "/affiliates" },
};

const box: React.CSSProperties = { border: "1px solid var(--line)", padding: "16px 18px" };
const th: React.CSSProperties = { textAlign: "left", padding: "0 18px 8px 0" };
const td: React.CSSProperties = { padding: "13px 18px 13px 0", verticalAlign: "top" };

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div style={box}>
      <p className="s-micro mb-1.5">{label}</p>
      <p className="p-serif text-[28px] leading-none">{value}</p>
      <div className="text-[12.5px] text-[color:var(--ink-soft)] mt-1">{note}</div>
    </div>
  );
}

export default function AffiliatesPage() {
  return (
    <div className="pharmacopoeia">
      <div className="p-container py-14">
        <p className="s-micro s-eyebrow">Partner program</p>
        <h1 className="s-h1 mb-5" style={{ fontSize: 48 }}>Partner with <em>Aura.</em></h1>
        <p className="text-[color:var(--ink-soft)] max-w-[60ch] mb-10">For researchers, clinicians and publishers who cover research compounds responsibly. Share your code, your audience saves 10%, and you earn on every order it brings in.</p>
        <div className="s-calc-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 48 }}>
          <Stat label="Your audience saves" value="10%" note="with your code, on every order" />
          <Stat label="You earn" value="10–20%" note="rising with lifetime sales, never drops" />
          <Stat label="Paid" value="Twice a month" note="cash, or store credit worth 1.3×" />
        </div>
        <EarningsCalculator />
        <div className="s-partner-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48 }}>
          <div>
            <p className="s-micro mb-3">Commission tiers</p>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr className="s-micro text-[color:var(--ink-soft)]"><th style={th}>Lifetime referred sales</th><th style={{ ...th, textAlign: "right" }}>Commission</th></tr></thead>
              <tbody>
                {[["From your first order", "10%"], ["$15,000", "15%"], ["$40,000", "20%"]].map(([from, pct]) => (
                  <tr key={pct} style={{ borderTop: "1px solid var(--line)" }}>
                    <td style={td} className="text-sm">{from}</td>
                    <td style={{ ...td, textAlign: "right" }} className="text-sm"><span className="p-serif text-[17px]">{pct}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[12.5px] text-[color:var(--ink-soft)] mt-3">Once you reach a tier you keep it. Commission is paid on what the customer paid for products, after discounts; shipping and tax don&apos;t count.</p>
            <p className="s-micro mt-8 mb-3">How it works</p>
            <ol className="text-[15px] leading-relaxed" style={{ paddingLeft: 18, listStyle: "decimal" }}>
              <li className="mb-2">Apply with your Aura account. We review every application.</li>
              <li className="mb-2">Upon approval, you receive a unique referral code and link. You may change your code at any time. Orders placed within 60 days of a visitor clicking your link are credited to you, and every order that uses your code is credited regardless of timing.</li>
              <li className="mb-2">Commission clears 15 days after an order ships and is paid on the 1st and 15th.</li>
            </ol>
          </div>
          <div>
            <p className="s-micro mb-3">Getting paid</p>
            <div style={{ ...box, marginBottom: 16 }}><p className="p-serif text-[17px] mb-1">Cash</p><p className="text-[14px] text-[color:var(--ink-soft)]">ACH or Zelle, from $100. A W-9 is required before your first cash payout.</p></div>
            <div style={{ ...box, marginBottom: 32, borderColor: "var(--ink)", background: "var(--paper-deep)" }}>
              <p className="p-serif text-[17px] mb-1">Store credit <em className="text-[color:var(--specimen)]">worth 1.3×</em></p>
              <p className="text-[14px] text-[color:var(--ink-soft)]">$100 of commission becomes $130 to spend on Aura. No minimum. Choose cash, credit, or a split.</p>
            </div>
            <p className="s-micro mb-3">Partner rules</p>
            <ol className="text-[14px] leading-relaxed" style={{ paddingLeft: 18, listStyle: "decimal" }}>
              <li className="mb-2"><b>Research use only.</b> Represent all products exclusively as materials for laboratory research. Partners may not suggest or imply human or animal use, provide preparation instructions, or share personal results or before-and-after imagery.</li>
              <li className="mb-2"><b>Disclosure.</b> Clearly identify your paid relationship with Aura Protocols in every post, video and link description, for example &quot;#ad&quot; or &quot;Paid partner of Aura Protocols.&quot;</li>
              <li className="mb-2"><b>Fair promotion.</b> Partners may not bid on &quot;Aura Protocols&quot; in paid search or social advertising, list their code on coupon or deal sites, or apply their own code to personal orders.</li>
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
