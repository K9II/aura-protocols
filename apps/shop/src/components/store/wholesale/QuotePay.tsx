"use client";

// The customer's pay page for a wholesale quote order (mocks 2026-10-17, screens 4–5):
// ship to, research use, then bank transfer or card. Saving the address
// calculates sales tax; bank details show only after it's saved.
import { useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import TrustRow from "@/components/store/TrustRow";
import RunStrip from "@/components/store/wholesale/RunStrip";
import { markTransferSentAction, payQuoteDepositByCardAction, saveQuoteShipAction } from "@/app/order/quote-actions";
import { usd } from "@/lib/html";

export type QuotePayItem = { key: string; cls: string; color: string; title: string; parts: string | null; strength: string; kits: number; unitCents: number; lineCents: number };
export type QuotePayProps = {
  orderNumber: string; email: string; note: string | null; noteBy: string | null;
  items: QuotePayItem[];
  money: { goodsCents: number; savedCents: number; shippingCents: number; protectionCents: number; taxCents: number | null; depositCents: number; balanceCents: number; depositPct: number };
  run: { cutoffOn: string; testedAbout: string; shipsAbout: string; cutoffLabel: string } | null;
  validUntilLabel: string;
  ship: { name: string; line1: string; line2: string; city: string; state: string; zip: string };
  saved: boolean;                 // address + research use saved (tax calculated)
  pay: { bank: boolean; card: boolean };
  bank: { accountName: string; bankName: string; routing: string; account: string; note: string | null } | null;   // only once saved
  transferSent: boolean;
  confirming: boolean;            // back from the card page, payment seen
};

export default function QuotePay(p: QuotePayProps) {
  const router = useRouter();
  const [addr, setAddr] = useState(p.ship);
  const [ruo, setRuo] = useState(p.saved);
  const [way, setWay] = useState<"bank" | "card">(p.pay.bank ? "bank" : "card");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const dirty = !p.saved || JSON.stringify(addr) !== JSON.stringify(p.ship);
  const set = (k: keyof typeof addr) => (e: React.ChangeEvent<HTMLInputElement>) => setAddr({ ...addr, [k]: k === "state" ? e.target.value.toUpperCase() : e.target.value });
  const total = p.money.goodsCents + p.money.shippingCents + p.money.protectionCents + (p.money.taxCents ?? 0);

  const save = async (): Promise<boolean> => {
    if (!dirty) return true;
    const r = await saveQuoteShipAction(p.orderNumber, { ship: { ...addr, line2: addr.line2 }, ruoConfirmed: ruo });
    if (r.error) { setError(r.error); return false; }
    return true;
  };
  const go = async () => {
    setError(null); setBusy(true);
    try {
      if (!(await save())) return;
      if (way === "card") {
        const r = await payQuoteDepositByCardAction(p.orderNumber);
        if (r.url) { window.location.href = r.url; return; }
        setError(r.error ?? "We couldn't start payment — please try again.");
      } else if (p.saved && !dirty) {
        const r = await markTransferSentAction(p.orderNumber);
        if (r.error) setError(r.error); else router.refresh();
      } else {
        router.refresh();   // the bank details appear once the address is saved
      }
    } finally { setBusy(false); }
  };
  const copy = async (label: string, text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(label); setTimeout(() => setCopied(null), 1400); } catch { /* select the text instead */ }
  };

  const showBank = way === "bank" && p.saved && !dirty && !!p.bank;
  const label = busy ? "One moment…"
    : !ruo ? "Confirm research use first"
    : way === "card" ? `Pay deposit ${usd(p.money.depositCents)} by card →`
    : !p.saved || dirty ? "Save address and show bank details"
    : p.transferSent ? "Transfer on its way" : "I've sent the transfer";
  const disabled = busy || !ruo || (way === "bank" && p.saved && !dirty && p.transferSent);

  if (p.confirming) {
    return <p className="s-ws-lede">Payment received — confirming your order now. A confirmation email is on its way.</p>;
  }
  return (
    <form className="s-ws-grid s-wo-grid s-wo-co s-qp" onSubmit={(e) => { e.preventDefault(); void go(); }}>
      <div className="s-wo-list">
        {p.note && (
          <div className="s-co-panel">
            <p className="s-micro mb-3">A note from Aura Protocols</p>
            <p className="s-qp-note">{p.note}</p>
            {p.noteBy && <p className="s-micro s-qp-by">{p.noteBy}</p>}
          </div>
        )}
        <div className="s-co-panel">
          <p className="s-micro mb-3">Ship to</p>
          <label htmlFor="qp-name" className="s-micro block mb-1.5">Full name</label>
          <input id="qp-name" value={addr.name} onChange={set("name")} required autoComplete="shipping name" className="s-wo-in" />
          <label htmlFor="qp-line1" className="s-micro block mb-1.5">Street address</label>
          <input id="qp-line1" value={addr.line1} onChange={set("line1")} required autoComplete="shipping address-line1" className="s-wo-in" />
          <label htmlFor="qp-line2" className="s-micro block mb-1.5">Apt, suite (optional)</label>
          <input id="qp-line2" value={addr.line2} onChange={set("line2")} autoComplete="shipping address-line2" className="s-wo-in" />
          <div className="s-wo-csz">
            <div><label htmlFor="qp-city" className="s-micro block mb-1.5">City</label><input id="qp-city" value={addr.city} onChange={set("city")} required autoComplete="shipping address-level2" className="s-wo-in" /></div>
            <div><label htmlFor="qp-state" className="s-micro block mb-1.5">State</label><input id="qp-state" value={addr.state} onChange={set("state")} maxLength={2} required autoComplete="shipping address-level1" className="s-wo-in" /></div>
            <div><label htmlFor="qp-zip" className="s-micro block mb-1.5">ZIP</label><input id="qp-zip" value={addr.zip} onChange={set("zip")} required autoComplete="shipping postal-code" className="s-wo-in" /></div>
          </div>
          <p className="s-wo-sub">US addresses only. Signed in as {p.email}.</p>
        </div>
        <div className="s-co-panel">
          <p className="s-micro mb-3">Research use</p>
          <label className="s-chk s-wo-ruo"><input type="checkbox" checked={ruo} onChange={(e) => setRuo(e.target.checked)} /><span>I confirm these compounds are for <b>laboratory research use only</b> and not for human or animal consumption.</span></label>
        </div>
        <div className="s-co-panel">
          <p className="s-micro mb-3">How you&apos;d like to pay</p>
          {p.pay.bank && p.pay.card && (
            <div className="s-qp-ways" role="radiogroup" aria-label="Payment method">
              <label className={way === "bank" ? "on" : undefined}><input type="radio" name="way" value="bank" checked={way === "bank"} onChange={() => setWay("bank")} /><span><b>Bank transfer</b><small>ACH or wire. No card fee. Takes 1–3 business days to arrive.</small></span></label>
              <label className={way === "card" ? "on" : undefined}><input type="radio" name="way" value="card" checked={way === "card"} onChange={() => setWay("card")} /><span><b>Card</b><small>Pay now on a secure card page.</small></span></label>
            </div>
          )}
          {!(p.pay.bank && p.pay.card) && <p className="s-wo-sub" style={{ marginTop: 0 }}>{p.pay.bank ? "Pay by bank transfer (ACH or wire)." : "Pay by card on a secure card page."}</p>}
          {way === "bank" && !showBank && <p className="s-wo-note">Save your address and the bank details appear here, with your order number as the payment reference.</p>}
          {showBank && p.bank && (
            <>
              <dl className="s-qp-bank">
                <div><dt>Account name</dt><dd>{p.bank.accountName}</dd><span /></div>
                <div><dt>Bank</dt><dd>{p.bank.bankName}</dd><span /></div>
                <div><dt>Routing number</dt><dd>{p.bank.routing}</dd><button type="button" onClick={() => copy("routing", p.bank!.routing)}>{copied === "routing" ? "Copied" : "Copy"}</button></div>
                <div><dt>Account number</dt><dd>{p.bank.account}</dd><button type="button" onClick={() => copy("account", p.bank!.account)}>{copied === "account" ? "Copied" : "Copy"}</button></div>
                <div><dt>Amount</dt><dd>{usd(p.money.depositCents)}</dd><button type="button" onClick={() => copy("amount", (p.money.depositCents / 100).toFixed(2))}>{copied === "amount" ? "Copied" : "Copy"}</button></div>
                <div className="ref"><dt>Reference (required)</dt><dd>{p.orderNumber}</dd><button type="button" onClick={() => copy("ref", p.orderNumber)}>{copied === "ref" ? "Copied" : "Copy"}</button></div>
              </dl>
              {p.bank.note && <p className="s-wo-note">{p.bank.note}</p>}
              <p className="s-wo-note">Put <b>{p.orderNumber}</b> in the reference so we can match your payment. We email you as soon as it arrives.{p.run ? ` If it hasn't arrived by ${p.run.cutoffLabel}, your order joins the next run and we'll tell you its dates.` : ""}</p>
              {p.transferSent && <div className="s-qp-done"><b>Thanks — we&apos;re watching for your transfer.</b> When {usd(p.money.depositCents)} with reference {p.orderNumber} arrives, we&apos;ll email a receipt. Nothing more to do.</div>}
            </>
          )}
          {way === "card" && <p className="s-wo-note">You&apos;ll go to a secure card page for {usd(p.money.depositCents)}. The balance is charged separately when your lot passes testing.</p>}
          {error && <p role="alert" className="mt-3 text-sm text-[color:var(--specimen)]">{error}</p>}
          <button type="submit" className="s-ws-btn s-qp-btn" disabled={disabled}>{label}</button>
        </div>
      </div>

      <aside className="s-wo-side">
        <div className="s-wo-sum ok">
          <p className="s-micro">Your quote</p>
          {p.items.map((i) => (
            <div key={i.key} className="s-co-item" style={{ "--cls": i.color } as CSSProperties}>
              <span className="s-co-cls"><i />{i.cls}</span>
              <span className="s-co-name">{i.title}{i.parts && <small className="s-qp-parts">{i.parts}</small>}</span>
              <span>{usd(i.lineCents)}</span>
              <span className="s-micro text-[color:var(--ink-soft)]" style={{ gridColumn: "1 / -1" }}>{i.strength} · {i.kits} kit{i.kits === 1 ? "" : "s"} · {i.kits * 10} vials · {usd(i.unitCents)} each</span>
            </div>
          ))}
          <div className="s-co-totals">
            <div><span>{p.items.reduce((n, i) => n + i.kits, 0)} kits · volume price</span><span>{usd(p.money.goodsCents)}</span></div>
            {p.money.savedCents > 0 && <div className="s-qp-save"><span>Volume savings</span><span>{usd(p.money.savedCents)}</span></div>}
            <div><span>Shipping</span><span>{p.money.shippingCents ? usd(p.money.shippingCents) : "Free"}</span></div>
            <div><span>Shipping protection</span><span className="s-qp-incl">✓ {usd(p.money.protectionCents)}</span></div>
            <div><span>Sales tax</span><span>{p.money.taxCents == null ? "after your address" : usd(p.money.taxCents)}</span></div>
            <div className="s-co-total"><span className="s-micro">{p.money.taxCents == null ? "Total before tax" : "Total"}</span><b>{usd(total)}</b></div>
          </div>
          <div className="s-wo-dep">
            <div><b>Deposit · {p.money.depositPct}%</b><b>{usd(p.money.depositCents)}</b></div>
            {p.run && <div className="s"><span>Due by {p.run.cutoffLabel}</span><span /></div>}
            <div className="s"><span>Balance</span><span>{usd(p.money.balanceCents)}{p.money.taxCents == null ? " + tax" : ""}</span></div>
            <div className="s"><span>Due after your lot passes testing</span><span /></div>
          </div>
          {p.run && <RunStrip cutoff={p.run.cutoffOn} testedAbout={p.run.testedAbout} shipsAbout={p.run.shipsAbout} style={{ marginTop: 14 }} />}
          <p className="s-wo-note">This quote is good until {p.validUntilLabel}. Deposit refundable until the order-by date; after that it&apos;s kept unless your lot fails testing.</p>
          <p className="s-micro s-ruo">For research use only · Not for human consumption · 21+</p>
        </div>
        <TrustRow className="s-trust--co" only={["usa", "coa"]} />
      </aside>
      <div className="s-wo-mbar">
        <div><span className="s-micro">Deposit{p.run ? ` · due ${p.run.cutoffLabel}` : ""}</span><b>{usd(p.money.depositCents)}</b></div>
        <button type="submit" disabled={disabled}>{busy ? "…" : !ruo ? "Confirm research use" : way === "card" ? "Pay by card →" : !p.saved || dirty ? "Save address" : p.transferSent ? "On its way" : "I've sent it"}</button>
      </div>
    </form>
  );
}
