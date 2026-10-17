import type { CSSProperties } from "react";
import Link from "next/link";
import { CLASS_COLOR } from "@/lib/class-colors";
import type { ChemicalClass } from "@/data/catalog";
import { ORDERS_EMAIL } from "@/lib/constants";
import { KIT_VIALS, QUOTE_REPLY_HOURS } from "@/lib/wholesale/rules";
import QuoteRequestActions from "@/components/store/wholesale/QuoteRequestActions";

export type RequestedKit = { key: string; chemicalClass: string; title: string; scientific: string | null; strength: string; kits: number };

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
// Blend names ("BPC-157 / TB-500 / GHK-Cu") break only between components.
const parts = (s: string) => s.split(" / ").map((p, i) => <span key={i} className="s-qr-nw">{i ? ` / ${p}` : p}</span>);

// A volume-quote request on its own order page (mock "Quote on the Order", Alvester
// 2026-10-17): where it is, what happens next, how to change it, and the kits asked
// for. Once priced, the same order shows the pay page instead.
export default function QuoteRequestPage(p: {
  orderNumber: string; firstName: string; email: string; inquiryRef: string | null;
  requestedLabel: string; priceByLabel: string; late: boolean;
  cutoffLabel: string | null; nextCutoffLabel: string | null; shipsAboutLabel: string | null;
  depositPct: number; cardAllowed: boolean; items: RequestedKit[]; sheetPct: number; sheetMinKits: number;
}) {
  const kits = p.items.reduce((n, i) => n + i.kits, 0);
  const pay = p.cardAllowed ? "straight from your bank account or by card" : "straight from your bank account";
  return (
    <div className="s-qr" data-testid="quote-request">
      <p className="s-micro s-eyebrow">Order {p.orderNumber} · <span className="s-qr-nw">Volume quote</span></p>
      <h1 className="s-h1 mb-3">Quote <em>requested.</em></h1>
      <p className="s-ws-lede">Thanks{p.firstName ? `, ${p.firstName}` : ""}. We&apos;re pricing your kits now. Within {QUOTE_REPLY_HOURS} hours we&apos;ll
        email <b>{p.email}</b> and this page will show your price for each strength, the total and the deposit. Nothing is charged until you pay the deposit.</p>
      <div className="s-qr-grid">
        <div className="s-qr-col">
          <section className="s-co-panel">
            <p className="s-micro mb-4">Where your order is</p>
            <ol className="s-qr-track" aria-label="Order progress">
              <li className="done">Requested<small>{p.requestedLabel}</small></li>
              <li className={p.late ? "now late" : "now"}>Pricing<small>{p.late ? "Running late" : `By ${p.priceByLabel}`}</small></li>
              <li>Deposit<small>{p.cutoffLabel ? `By ${p.cutoffLabel}` : "After pricing"}</small></li>
              <li>Ships<small>{p.shipsAboutLabel ? `About ${p.shipsAboutLabel}` : "With its certificate"}</small></li>
            </ol>
          </section>
          <section className="s-co-panel">
            <p className="s-micro mb-4">What happens next</p>
            <ol className="s-qr-steps">
              <li className="now"><span className="n">1</span><b>We price your kits <span className="when">within {QUOTE_REPLY_HOURS} hours</span></b>
                <p>Your price for each strength, the total and the deposit appear on this page. We email you when they&apos;re ready.</p></li>
              <li><span className="n">2</span><b>You pay the deposit here</b>
                <p>Check the price, add the shipping address and pay the {p.depositPct}% deposit {pay}. Paying the deposit is how you accept the quote.</p></li>
              <li><span className="n">3</span><b>Balance when your lot passes</b>
                <p>Your kits are made and tested as one lot. Pay the balance when it passes; your kits ship with its certificate.</p></li>
            </ol>
            {p.cutoffLabel && (
              <p className="s-qr-note">Kits are made in runs. Your order joins the run that&apos;s open when your deposit arrives: today that&apos;s the run
                closing <b>{p.cutoffLabel}</b>{p.nextCutoffLabel ? <>; after that, the next one closes <b>{p.nextCutoffLabel}</b></> : null}.</p>
            )}
          </section>
          <section className="s-co-panel">
            <p className="s-micro mb-4">Need a change?</p>
            <dl className="s-qr-kv">
              <dt>Reply</dt>
              <dd>Answer our email, or write to <b>{ORDERS_EMAIL}</b> with <b className="s-qr-nw">{p.orderNumber}</b>. Change a strength or a kit count and we&apos;ll price the new request.</dd>
              {p.inquiryRef && <><dt>Reference</dt><dd className="s-qr-soft">Sent from the order sheet · {p.inquiryRef}</dd></>}
            </dl>
          </section>
        </div>
        <aside className="s-wo-sum ok">
          <p className="s-micro mb-4">Your request</p>
          {p.items.map((i) => (
            <div key={i.key} className="s-qr-item" style={{ "--cls": CLASS_COLOR[i.chemicalClass as ChemicalClass] ?? "var(--ink)" } as CSSProperties}>
              <span className="s-qr-cls"><i />{i.chemicalClass}</span>
              <span className="s-qr-t">{i.title}{i.scientific && <small>{parts(i.scientific)}</small>}</span>
              <span className="s-qr-k">{plural(i.kits, "kit")}</span>
              <span className="s-qr-m">{i.strength} · {i.kits * KIT_VIALS} vials</span>
            </div>
          ))}
          <div className="s-qr-tot"><span>Requested</span><b data-testid="quote-request-count">{plural(kits, "kit")} · {kits * KIT_VIALS} vials</b></div>
          <div className="s-qr-pending"><span>Your price</span><b>{p.late ? "Coming soon" : `Coming by ${p.priceByLabel}`}</b></div>
          <QuoteRequestActions orderNumber={p.orderNumber} sheetPct={p.sheetPct} sheetMinKits={p.sheetMinKits} />
          <p className="s-micro s-ruo">For research use only · Not for human consumption · 21+</p>
        </aside>
      </div>
      <div className="s-qr-actions">
        <Link href="/account" className="s-ws-btn s-qr-o">My orders →</Link>
        <Link href="/wholesale" className="s-ws-btn s-qr-o">Back to wholesale</Link>
      </div>
    </div>
  );
}
