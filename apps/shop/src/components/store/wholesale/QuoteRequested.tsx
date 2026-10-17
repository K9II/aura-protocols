import type { CSSProperties } from "react";
import Link from "next/link";
import { CLASS_COLOR } from "@/lib/class-colors";
import type { ChemicalClass } from "@/data/catalog";
import { KIT_VIALS, QUOTE_REPLY_BUSINESS_DAYS, type Tier } from "@/lib/wholesale/rules";
import { cardAllowed } from "@/lib/wholesale/quote";

export type RequestedKit = { key: string; chemicalClass: string; title: string; scientific: string | null; strength: string; kits: number };

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
// Blend names ("BPC-157 / TB-500 / GHK-Cu") break only between components.
const parts = (s: string) => s.split(" / ").map((p, i) => <span key={i} className="s-qr-nw">{i ? ` / ${p}` : p}</span>);

// After "Ask for a volume quote" → Send, this replaces the order sheet (mock "Quote Requested
// Mock", Alvester 2026-10-17): what happens next, the run the order joins, and what was asked for.
// The sheet is cleared so nothing is charged by mistake; "Order now" puts the kits back.
export default function QuoteRequested({ inquiryRef, firstName, email, items, tier, depositPct, cutoffLabel, nextCutoffLabel, onOrderNow }: {
  inquiryRef: string | null; firstName: string; email: string; items: RequestedKit[]; tier: Tier;
  depositPct: number; cutoffLabel: string; nextCutoffLabel: string; onOrderNow: () => void;
}) {
  const kits = items.reduce((n, i) => n + i.kits, 0);
  const pay = cardAllowed(items) ? "by bank transfer or card" : "by bank transfer";
  return (
    <div className="s-qr" data-testid="ws-quote-requested">
      <Link href="/wholesale" className="s-wo-back">← Back to wholesale</Link>
      <p className="s-micro s-eyebrow">Wholesale · volume quote{inquiryRef ? ` · ${inquiryRef}` : ""}</p>
      <h1 className="s-h1 mb-3">Quote <em>requested.</em></h1>
      <p className="s-ws-lede">Thanks{firstName ? `, ${firstName}` : ""}. {inquiryRef ? <>Your request is <b>{inquiryRef}</b> and a</> : "A"} copy
        is in your inbox at <b>{email}</b>. You don&apos;t need to rebuild your order — we&apos;ll set it up for you.</p>
      <div className="s-qr-grid">
        <section className="s-co-panel">
          <p className="s-micro mb-4">What happens next</p>
          <ol className="s-qr-steps">
            <li className="now"><span className="n">1</span><b>We price your kits <span className="when">within {QUOTE_REPLY_BUSINESS_DAYS} business days</span></b>
              <p>You get an email with your volume price for each strength, the total and the deposit.</p></li>
            <li><span className="n">2</span><b>You reply yes</b>
              <p>Just answer the email. Change a strength or a kit count in your reply if you need to, and we&apos;ll update the price.</p></li>
            <li><span className="n">3</span><b>You pay the deposit</b>
              <p>We email you a link to your order. Add the shipping address and pay the {depositPct}% deposit {pay}. The balance is due when your lot passes testing.</p></li>
          </ol>
          <p className="s-qr-note">Kits are made in runs. Your order joins the run that&apos;s open when your deposit arrives: today that&apos;s the run
            closing <b>{cutoffLabel}</b>; after that, the next one closes <b>{nextCutoffLabel}</b>. Your quote email says which run you&apos;re in.</p>
          <div className="s-qr-actions">
            <Link href="/wholesale" className="s-ws-btn">Back to wholesale</Link>
            <Link href="/products" className="s-ws-btn s-qr-o">Shop single vials</Link>
          </div>
        </section>
        <aside className="s-wo-sum ok">
          <p className="s-micro mb-4">Your request</p>
          {items.map((i) => (
            <div key={i.key} className="s-qr-item" style={{ "--cls": CLASS_COLOR[i.chemicalClass as ChemicalClass] ?? "var(--ink)" } as CSSProperties}>
              <span className="s-qr-cls"><i />{i.chemicalClass}</span>
              <span className="s-qr-t">{i.title}{i.scientific && <small>{parts(i.scientific)}</small>}</span>
              <span className="s-qr-k">{plural(i.kits, "kit")}</span>
              <span className="s-qr-m">{i.strength} · {i.kits * KIT_VIALS} vials</span>
            </div>
          ))}
          <div className="s-qr-tot"><span>Requested</span><b data-testid="ws-quote-requested-count">{plural(kits, "kit")} · {kits * KIT_VIALS} vials</b></div>
          <p className="s-wo-note">Prices come in our reply. Your order sheet was cleared so nothing is charged by mistake.</p>
          <div className="s-qr-alt">
            <p>Rather not wait? Order these kits now at the listed price: {tier.pct}% off for {tier.minKits}+ kits.</p>
            <button type="button" onClick={onOrderNow}>Order now at the listed price&nbsp;→</button>
          </div>
          <p className="s-micro s-ruo">For research use only · Not for human consumption · 21+</p>
        </aside>
      </div>
    </div>
  );
}
