"use client";

// Admin → Orders → New quote order (mocks 2026-10-17 "Quote Order Mocks", screen 2).
// The totals and the profit estimate update as the owner types; the server
// re-prices everything on Create.
import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { createQuoteOrderAction } from "@/app/admin/orders/quote/actions";
import { CARD_FIXED_CENTS, CARD_PCT, CHARGES_PER_ORDER } from "@/lib/wholesale/margins";
import { QUOTE_MAX_PCT, QUOTE_START_PCT, cardAllowed, estimateQuoteProfit, priceQuote, type KitCost, type QuoteLine } from "@/lib/wholesale/quote";
import { MAX_KITS_PER_LINE, kitTitle, type KitRow, type Tier } from "@/lib/wholesale/rules";
import { usd } from "@/lib/html";

type Line = { slug: string; variantId: string; kits: string; pct: string };
export type QuoteFormProps = {
  customer: { id: string; name: string; email: string; orders: number; verified: boolean };
  inquiry: { id: string; ref: number } | null;
  unmatched: string[];
  rows: KitRow[];
  initialLines: QuoteLine[];
  settings: { depositPct: number; tiers: Tier[]; balanceDays: number };
  runs: Array<{ cutoffOn: string; label: string }>;
  bankReady: boolean;
  costs: Record<string, KitCost | undefined>;
  validUntil: string;
};

const num = (s: string) => { const n = Number(s.trim()); return Number.isFinite(n) ? n : NaN; };
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";
const key = (l: { slug: string; variantId: string }) => `${l.slug}/${l.variantId}`;

export default function QuoteOrderForm(p: QuoteFormProps) {
  const [state, action, pending] = useActionState(createQuoteOrderAction, null);
  const [lines, setLines] = useState<Line[]>(p.initialLines.map((l) => ({ slug: l.slug, variantId: l.variantId, kits: String(l.kits), pct: String(l.pct) })));
  const [allPct, setAllPct] = useState(String(QUOTE_START_PCT));
  const [adding, setAdding] = useState("");
  const [depositPct, setDepositPct] = useState(String(p.settings.depositPct));
  const [payBank, setPayBank] = useState(p.bankReady);
  const [payCard, setPayCard] = useState(true);
  const fe = state?.fieldErrors ?? {};
  const err = (k: string) => (fe[k] ? <div className="a-err" role="alert">{fe[k]}</div> : null);
  const row = (l: { slug: string; variantId: string }) => p.rows.find((r) => r.slug === l.slug && r.variantId === l.variantId);

  const valid: QuoteLine[] = lines.flatMap((l) => {
    const kits = num(l.kits), pct = num(l.pct);
    return Number.isInteger(kits) && kits >= 1 && kits <= MAX_KITS_PER_LINE && pct > 0 && pct <= QUOTE_MAX_PCT ? [{ slug: l.slug, variantId: l.variantId, kits, pct }] : [];
  });
  const dep = Number.isInteger(num(depositPct)) ? num(depositPct) : p.settings.depositPct;
  const q = useMemo(() => priceQuote(valid, p.rows, { depositPct: dep, tiers: p.settings.tiers }), [JSON.stringify(valid), dep]); // eslint-disable-line react-hooks/exhaustive-deps
  const canCard = cardAllowed(q.items);
  const card = payCard && canCard;
  const est = estimateQuoteProfit(q.items, p.costs, q.totalBeforeTaxCents, { card, cardPct: CARD_PCT, cardFixedCents: CARD_FIXED_CENTS, charges: CHARGES_PER_ORDER });
  const setAt = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const addable = p.rows.filter((r) => !lines.some((l) => key(l) === key({ slug: r.slug, variantId: r.variantId })));

  return (
    <form action={action}>
      <input type="hidden" name="customerId" value={p.customer.id} />
      {p.inquiry && <input type="hidden" name="inquiryId" value={p.inquiry.id} />}
      <input type="hidden" name="lineCount" value={lines.length} />
      {lines.map((l, i) => <span key={`h${i}`}><input type="hidden" name={`slug${i}`} value={l.slug} /><input type="hidden" name={`variant${i}`} value={l.variantId} /></span>)}
      {state?.error && <div className="a-err-banner" role="alert" style={{ marginBottom: 14 }}>{state.error}</div>}
      <div className="a-qo-grid">
        <div className="a-qo-main">
          <section className="a-card">
            <div className="a-card-h"><span className="a-qo-step">1</span><h3>Customer</h3>{p.inquiry && <span className="sub">from inquiry <Link className="a-ulink" href={`/admin/inquiries/Q-${p.inquiry.ref}`}>Q-{p.inquiry.ref}</Link></span>}</div>
            <div className="a-card-b" style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
              <div className="a-avatar">{initials(p.customer.name)}</div>
              <div style={{ flex: "1 1 260px" }}><b>{p.customer.name}</b>
                <div className="muted">{p.customer.email} · {p.customer.orders} order{p.customer.orders === 1 ? "" : "s"} · {p.customer.verified ? <span className="a-chip ver sm">Verified</span> : <span className="a-chip unver sm">Unverified</span>} <span className="a-chip sched sm">Wholesale on</span></div></div>
              {!p.inquiry && <Link className="a-ulink" href="/admin/orders/new-quote">Change</Link>}
            </div>
            {err("customer")}
          </section>

          <section className="a-card">
            <div className="a-card-h"><span className="a-qo-step">2</span><h3>Kits and quoted prices</h3></div>
            {p.unmatched.length > 0 && <div style={{ padding: "12px 16px 0" }}><div className="a-callout warn"><span>Not found on the store, so not copied: <b>{p.unmatched.join(", ")}</b>. Add them below if they have another name or strength.</span></div></div>}
            <div style={{ overflowX: "auto" }}>
              <table className="a-qo-t">
                <thead><tr><th>Strength</th><th className="num">Kits</th><th className="num">Order sheet<small>per kit · {q.sheetPct}% off</small></th><th className="num">Quote<small>% off retail</small></th><th className="num">Quote<small>per kit</small></th><th className="num">Line</th><th aria-label="Remove" /></tr></thead>
                <tbody>
                  {lines.map((l, i) => {
                    const r = row(l);
                    const list = r ? Math.round(r.priceUsd * 100 * 10) : 0;
                    const pct = num(l.pct), kits = num(l.kits);
                    const ok = Number.isFinite(pct) && pct > 0 && pct <= QUOTE_MAX_PCT;
                    const unit = ok ? Math.round(list * (1 - pct / 100)) : null;
                    const title = r ? `${kitTitle(r).title} ${r.strength}` : `${l.slug} ${l.variantId}`;
                    return (
                      <tr key={key(l)}>
                        <td><b>{r ? `${r.designation ?? r.name} · ${r.strength}` : title}</b>{r?.designation && <span className="sub">{r.name}</span>}{r && <span className="sub">retail {usd(r.priceUsd * 100)} / vial</span>}{!r && <span className="sub" style={{ color: "var(--specimen)" }}>not on the store</span>}</td>
                        <td className="num" data-l="Kits"><span className={`a-input${fe[`kits${i}`] ? " err" : ""}`}><input className="kits" name={`kits${i}`} value={l.kits} inputMode="numeric" aria-label={`Kits, ${title}`} onChange={(e) => setAt(i, { kits: e.target.value })} /></span>{err(`kits${i}`)}</td>
                        <td className="num strike" data-l="Order sheet / kit">{usd(Math.round(list * (1 - q.sheetPct / 100)))}</td>
                        <td className="num" data-l="Quote % off retail"><span className={`a-input${fe[`pct${i}`] ? " err" : ""}`}><input className="pct" name={`pct${i}`} value={l.pct} inputMode="decimal" aria-label={`Percent off retail, ${title}`} onChange={(e) => setAt(i, { pct: e.target.value })} /><span className="affix">%</span></span>{err(`pct${i}`)}</td>
                        <td className="num" data-l="Quote / kit">{unit == null ? "—" : usd(unit)}</td>
                        <td className="num" data-l="Line">{unit == null || !Number.isInteger(kits) ? "—" : usd(unit * kits)}</td>
                        <td><button type="button" className="rm" aria-label={`Remove ${title}`} onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}>×</button></td>
                      </tr>
                    );
                  })}
                  {lines.length === 0 && <tr><td colSpan={7} className="muted">No strengths yet. Add one below.</td></tr>}
                </tbody>
              </table>
            </div>
            {err("lines")}
            <div className="a-qo-bar">
              <label className="sr-only" htmlFor="qo-add">Strength to add</label>
              <select id="qo-add" value={adding} onChange={(e) => setAdding(e.target.value)}>
                <option value="">Add a strength…</option>
                {addable.map((r) => <option key={key(r)} value={key(r)}>{r.designation ? `${r.designation} (${r.name})` : r.name} · {r.strength}</option>)}
              </select>
              <button type="button" className="a-btn" disabled={!adding} onClick={() => { const [slug, variantId] = adding.split("/"); setLines((ls) => [...ls, { slug, variantId, kits: "1", pct: allPct }]); setAdding(""); }}>+ Add</button>
              <span className="muted" style={{ marginLeft: "auto" }}>Set every line to</span>
              <span className="a-input"><input value={allPct} onChange={(e) => setAllPct(e.target.value)} inputMode="decimal" aria-label="Percent off retail for every line" style={{ width: 48, textAlign: "right", font: "500 13px var(--mono)" }} /><span className="affix">% off retail</span></span>
              <button type="button" className="a-btn" onClick={() => setLines((ls) => ls.map((l) => ({ ...l, pct: allPct })))}>Apply</button>
            </div>
            <div style={{ padding: "0 16px 16px" }}><div className="a-callout info"><span>The order sheet tops out at {p.settings.tiers.at(-1)?.pct}% off. Type the percent off retail you quoted (AIOS → Kits → Volume quote). The customer sees only the quoted price and what they save.</span></div></div>
          </section>

          <section className="a-card">
            <div className="a-card-h"><span className="a-qo-step">3</span><h3>Run and terms</h3></div>
            <div className="a-card-b a-qo-grid2">
              <div className="a-fld full"><label htmlFor="qo-run">Run</label>
                <select id="qo-run" name="cutoffOn" className="a-qo-in" defaultValue={p.runs[0]?.cutoffOn}>{p.runs.map((r) => <option key={r.cutoffOn} value={r.cutoffOn}>{r.label}</option>)}</select>
                <div className="a-qo-help">If the deposit arrives after the order-by date, the order joins the run open that day and the customer is emailed its dates.</div>{err("cutoffOn")}</div>
              <div className="a-fld"><label htmlFor="qo-dep">Deposit</label>
                <span className={`a-input${fe.depositPct ? " err" : ""}`}><input id="qo-dep" name="depositPct" value={depositPct} onChange={(e) => setDepositPct(e.target.value)} inputMode="numeric" style={{ font: "500 13px var(--mono)" }} /><span className="affix">% of the kits</span></span>
                <div className="a-qo-help">From Wholesale → Settings ({p.settings.depositPct}%). Change it for this order only.</div>{err("depositPct")}</div>
              <div className="a-fld"><label htmlFor="qo-valid">Quote valid until</label>
                <input id="qo-valid" name="validUntil" type="date" className="a-qo-in" defaultValue={p.validUntil} />
                <div className="a-qo-help">After this date the pay link stops working and the order is cancelled.</div>{err("validUntil")}</div>
              <div className="full" style={{ color: "var(--ink-soft)" }}>Balance: due within <b>{p.settings.balanceDays} days</b> after the lot passes testing (Wholesale → Settings). Same reminders and forfeit rule as every wholesale order.</div>
            </div>
          </section>

          <section className="a-card">
            <div className="a-card-h"><span className="a-qo-step">4</span><h3>How they can pay</h3><span className="sub">deposit and balance</span></div>
            <div className="a-card-b" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <label className={`a-qo-opt${payBank ? " on" : ""}${p.bankReady ? "" : " dis"}`}>
                <input type="checkbox" name="payBank" checked={payBank} disabled={!p.bankReady} onChange={(e) => setPayBank(e.target.checked)} />
                <span><b>Bank transfer (ACH or wire)</b><small>Their order page shows your bank details, with the order number as the payment reference. You click Record bank transfer when the money lands. No card fee.</small></span>
              </label>
              <label className={`a-qo-opt${card ? " on" : ""}${canCard ? "" : " dis"}`}>
                <input type="checkbox" name="payCard" checked={card} disabled={!canCard} onChange={(e) => setPayCard(e.target.checked)} />
                <span><b>Card</b><small>{canCard ? "Secure card page. The order updates by itself when it's paid." : "Not offered: this order has an incretin or amylin analog."}</small></span>
              </label>
              {!p.bankReady && <div className="a-callout warn"><span>Bank details aren&apos;t set up yet. Add them in <Link className="a-ulink" href="/admin/wholesale/settings">Wholesale → Settings</Link> to offer bank transfer.</span></div>}
              {err("pay")}
            </div>
          </section>

          <section className="a-card">
            <div className="a-card-h"><span className="a-qo-step">5</span><h3>Note to the customer</h3><span className="sub">optional · shown on their order page and in the email</span></div>
            <div className="a-card-b">
              <label className="sr-only" htmlFor="qo-note">Note to the customer</label>
              <textarea id="qo-note" name="note" rows={3} className="a-qo-in" defaultValue="Thanks for the order. This is the volume price we discussed." maxLength={600} />
              <div className="a-qo-help">Checked for compliance when you create the order.</div>{err("note")}
            </div>
          </section>
        </div>

        <aside className="a-qo-side">
          <section className="a-card">
            <div className="a-card-h"><h3>Quote</h3><span className="sub">{q.kits} kits · {q.kits * 10} vials</span></div>
            <div className="a-qo-rows">
              <div className="row muted"><span>Order-sheet price · {q.sheetPct}% tier</span><span style={{ textDecoration: "line-through" }}>{usd(q.sheetSubtotalCents)}</span></div>
              <div className="row"><span>Quoted kits</span><span>{usd(q.subtotalCents)}</span></div>
              <div className="row save"><span>Below the order sheet</span><span>−{usd(Math.max(0, q.sheetSubtotalCents - q.subtotalCents))}</span></div>
              <div className="row"><span>Shipping</span><span>{q.shippingCents ? usd(q.shippingCents) : "Free"}</span></div>
              <div className="row"><span>Shipping protection</span><span>{usd(q.insuranceCents)}</span></div>
              <div className="row tot"><span>Total before tax</span><span>{usd(q.totalBeforeTaxCents)}</span></div>
            </div>
            <div className="a-qo-dep">
              <div className="row"><b>Deposit {dep}%</b><b>{usd(q.depositCents)}</b></div>
              <div className="row" style={{ color: "var(--ink-soft)" }}><span>Balance after testing</span><span>{usd(q.balanceBeforeTaxCents)} + tax</span></div>
            </div>
          </section>
          <section className="a-card">
            <div className="a-card-h"><h3>Estimated profit</h3><span className="sub">only you see this</span></div>
            <div className="a-qo-rows">
              <div className="row"><span>Quoted kits</span><span>{usd(est.goodsCents)}</span></div>
              <div className="row" style={{ color: "var(--ink-soft)" }}><span>Product cost</span><span>−{usd(est.productCents)}</span></div>
              <div className="row" style={{ color: "var(--ink-soft)" }}><span>Lab testing</span><span>−{usd(est.labCents)}</span></div>
              <div className="row" style={{ color: "var(--ink-soft)" }}><span>Card fees <span className="muted">{card ? "· if by card" : "· none by bank"}</span></span><span>−{usd(est.feeCents)}</span></div>
              <div className="row tot"><span>Profit</span><span>{usd(est.profitCents)}{est.marginPct != null ? ` · ${est.marginPct}%` : ""}</span></div>
              {est.missing.length > 0 && <div className="a-qo-help" style={{ margin: 0, color: "var(--ochre)" }}>No supplier price for {est.missing.join(", ")} — not counted.</div>}
              <div className="a-qo-help" style={{ margin: 0 }}>Cheapest supplier box, inbound, labels, kit box, and each strength&apos;s full lab test. Shipping labels and 3PL fees aren&apos;t included.</div>
            </div>
          </section>
          <button type="submit" className="a-btn primary" disabled={pending || valid.length === 0} style={{ height: 40, justifyContent: "center" }}>{pending ? "Creating…" : "Create order and email the customer"}</button>
          <p className="muted" style={{ margin: 0, fontSize: 12, textAlign: "center" }}>Nothing is charged. The order waits as <b style={{ fontWeight: 500, color: "var(--ink-soft)" }}>Awaiting deposit</b>{p.inquiry ? ", and the inquiry links to it" : ""}.</p>
        </aside>
      </div>
    </form>
  );
}
