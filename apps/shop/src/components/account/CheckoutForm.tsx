"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/components/store/CartProvider";
import { priceOrder, type Rejection } from "@/lib/pricing";
import { applyCodeDiscount } from "@/lib/partners/discounts";
import { CODE_DISCOUNT_PCT } from "@/lib/partners/tiers";
import { discountPct, OFFER_PCT_TEXT, type FirstOrderOffer } from "@/lib/account/offer";
import { checkPartnerCodeAction, startCheckoutAction } from "@/app/checkout/actions";
import type { ShipAddress } from "@/lib/ship-address";
import { usd } from "@/lib/html";
import { FREE_SHIPPING_THRESHOLD_USD, formatUsd } from "@/lib/cart";

const field = "w-full border border-[color:var(--ink)] bg-[color:var(--paper)] px-3.5 py-3 text-sm mb-4";
const smallBtn: React.CSSProperties = { padding: "7px 13px", font: "12px Georgia,serif", letterSpacing: ".06em", textTransform: "uppercase", border: "1px solid var(--ink)", background: "transparent", color: "var(--ink)" };
const REASON: Record<Rejection["reason"], string> = {
  unknown: "no longer listed", pending_lot: "certificate pending", out_of_stock: "out of stock",
  bad_pack: "pack size unavailable", bad_quantity: "quantity not allowed",
};

export default function CheckoutForm({ email, ship, initialCode, creditBalanceCents, newAccountOffer }: {
  email: string; ship: ShipAddress | null; initialCode: string; creditBalanceCents: number; newAccountOffer: FirstOrderOffer;
}) {
  const { lines, code: cartCode, setCode: setCartCode } = useCart();
  // A code typed in the cart wins over a referral link's code (same priority as the server).
  const startCode = cartCode || initialCode;
  const [addr, setAddr] = useState({
    name: ship?.name ?? "", line1: ship?.line1 ?? "", line2: ship?.line2 ?? "",
    city: ship?.city ?? "", state: ship?.state ?? "", zip: ship?.zip ?? "",
  });
  const [codeInput, setCodeInput] = useState(startCode);
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [codeMsg, setCodeMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [useCredit, setUseCredit] = useState(creditBalanceCents > 0);
  const [ruo, setRuo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejected, setRejected] = useState<Rejection[]>([]);
  const set = (k: keyof typeof addr) => (e: React.ChangeEvent<HTMLInputElement>) => setAddr({ ...addr, [k]: e.target.value });

  const base = useMemo(() => priceOrder(lines), [lines]);
  // The new-account percent (automatic) and a partner code's percent never
  // stack — discountPct picks the larger one. One discount per line. The
  // server re-prices every order.
  const discount = useMemo(() => discountPct(!!newAccountOffer, !!appliedCode), [newAccountOffer, appliedCode]);
  const priced = useMemo(() => (discount
    ? applyCodeDiscount(base, discount.pct)
    : { ...base, lineDiscounts: base.items.map((_, index) => ({ index, source: "none" as const, savingCents: 0 })) }),
  [base, discount]);

  async function applyCodeValue(code: string) {
    try {
      const r = await checkPartnerCodeAction(code);
      if (r.ok) {
        setAppliedCode(r.code); setCodeInput(r.code);
        const withCode = discountPct(!!newAccountOffer, true);
        setCodeMsg({ ok: true, text: withCode?.newAccount ? `✓ ${r.code} applied · your new-account ${OFFER_PCT_TEXT} is larger, so it's used instead (the order still credits that partner)` : `✓ ${r.code} applied · ${CODE_DISCOUNT_PCT}% off items that don't already have a larger pack discount` });
      }
      else { setAppliedCode(null); setCodeMsg({ ok: false, text: r.message }); }
    } catch {
      setAppliedCode(null); setCodeMsg({ ok: false, text: "Something went wrong — please try again." });
    }
  }

  // A referral link's code (initialCode, from the aura_ref cookie) is applied
  // automatically on arrival so the discount is visible before the customer
  // ever touches the field — they never have to know a code exists.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see comment above; the state update is inside an awaited server call, not synchronous
    if (startCode.trim()) void applyCodeValue(startCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function applyCode() {
    if (!codeInput.trim()) return;
    await applyCodeValue(codeInput);
  }
  function removeCode() { setAppliedCode(null); setCodeInput(""); setCodeMsg(null); setCartCode(""); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    let leaving = false;
    try {
      // A code typed but never explicitly applied is still sent — the server
      // either applies it or refuses it with a reason; it's never silently dropped.
      const r = await startCheckoutAction({ lines, ship: addr, ruoConfirmed: ruo, partnerCode: appliedCode ?? (codeInput.trim() || undefined), useCredit });
      if (r.url) { leaving = true; window.location.assign(r.url); return; }
      setError(r.error ?? "Something went wrong — please try again.");
      if (r.codeError) { setAppliedCode(null); setCodeMsg({ ok: false, text: r.codeError }); }
      setRejected(r.rejected ?? []);
    } catch {
      setError("Something went wrong — please try again.");
    } finally {
      // Stay busy while the browser navigates to Stripe, so it can't be clicked twice.
      if (!leaving) setBusy(false);
    }
  }

  if (lines.length === 0) return <p className="text-[color:var(--ink-soft)]">Your cart is empty.</p>;
  const allRejected = [...priced.rejected, ...rejected];
  return (
    <form onSubmit={submit} style={{ display: "grid", gridTemplateColumns: "minmax(0,1.1fr) minmax(0,1fr)", gap: 48 }} className="s-checkout">
      <div>
        <p className="s-micro mb-3">Ship to</p>
        <label htmlFor="co-name" className="s-micro block mb-1.5">Full name</label>
        <input id="co-name" value={addr.name} onChange={set("name")} autoComplete="shipping name" required className={field} />
        <label htmlFor="co-line1" className="s-micro block mb-1.5">Street address</label>
        <input id="co-line1" value={addr.line1} onChange={set("line1")} autoComplete="shipping address-line1" required className={field} />
        <label htmlFor="co-line2" className="s-micro block mb-1.5">Apt, suite (optional)</label>
        <input id="co-line2" value={addr.line2} onChange={set("line2")} autoComplete="shipping address-line2" className={field} />
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 12 }}>
          <div><label htmlFor="co-city" className="s-micro block mb-1.5">City</label><input id="co-city" value={addr.city} onChange={set("city")} autoComplete="shipping address-level2" required className={field} /></div>
          <div><label htmlFor="co-state" className="s-micro block mb-1.5">State</label><input id="co-state" value={addr.state} onChange={set("state")} autoComplete="shipping address-level1" maxLength={2} required className={field} /></div>
          <div><label htmlFor="co-zip" className="s-micro block mb-1.5">ZIP</label><input id="co-zip" value={addr.zip} onChange={set("zip")} autoComplete="shipping postal-code" required className={field} /></div>
        </div>
        {newAccountOffer && <p className="text-[13.5px] mt-2 mb-3" style={{ color: "#2F5D3A" }}>New account: {OFFER_PCT_TEXT} off this first order, applied automatically.</p>}
        <label htmlFor="co-code" className="s-micro block mb-1.5 mt-2">Discount code</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input id="co-code" value={codeInput} onChange={(e) => { setCodeInput(e.target.value); if (appliedCode) setAppliedCode(null); }} maxLength={20}
            className="w-full border border-[color:var(--ink)] bg-[color:var(--paper)] px-3.5 py-3 text-sm" />
          {appliedCode
            ? <button type="button" onClick={removeCode} style={smallBtn}>Remove</button>
            : <button type="button" onClick={applyCode} style={smallBtn}>Apply</button>}
        </div>
        {codeMsg && <p role="status" className="text-[12.5px] mt-2" style={{ color: codeMsg.ok ? "#2F5D3A" : "var(--specimen)" }}>{codeMsg.text}</p>}
        <p className="text-[12.5px] text-[color:var(--ink-soft)] mt-3 mb-6">US addresses only. Saved to your account for next time. Signed in as {email}.</p>
        <label className="s-chk"><input type="checkbox" checked={ruo} onChange={(e) => setRuo(e.target.checked)} /><span>I confirm the compounds in this order are for <b>laboratory research use only</b> and not for human or animal consumption.</span></label>
      </div>
      <div>
        <div className="flex justify-between items-baseline mb-1"><p className="s-micro">Order summary</p><Link href="/cart" className="p-link text-xs">Edit cart</Link></div>
        {priced.items.map((i, idx) => {
          const d = priced.lineDiscounts[idx];
          const pack = ` · ${i.packQty}-pack${i.packPct && d.source !== "code" ? ` −${i.packPct}%` : ""}`;
          const note = discount?.newAccount ? (d.source === "code" ? ` · new account −${OFFER_PCT_TEXT}` : d.source === "pack" ? " (pack price is lower)" : "") : appliedCode ? (d.source === "code" ? ` · code −${CODE_DISCOUNT_PCT}%` : d.source === "pack" ? " (code not added)" : "") : "";
          // Struck-through price is whatever this line would cost without its
          // applied discount: LIST when the code wins (pack % never applied),
          // the pack-discounted total when the pack wins.
          const struckCents = d.source === "code" ? i.listUnitCents * i.quantity : i.lineTotalCents;
          return (
            <div key={`${i.compoundSlug}-${i.variantId}-${i.packQty}`} className="s-cart-line">
              <div><span className="p-serif text-[17px]">{i.compoundName}</span>
                <div className="s-micro text-[color:var(--ink-soft)] mt-1">{i.strength}{pack}{note}{i.quantity > 1 ? ` × ${i.quantity}` : ""}</div></div>
              <div className="text-right">
                {d.savingCents > 0 && <span className="text-[color:var(--ink-soft)] line-through text-[13px] mr-1.5">{usd(struckCents)}</span>}
                {usd(i.lineTotalCents - d.savingCents)}
              </div>
            </div>
          );
        })}
        {allRejected.length > 0 && (
          <ul className="text-sm text-[color:var(--specimen)] my-3">
            {allRejected.map((r) => <li key={`${r.slug}-${r.variantId}`}>{r.slug} — {REASON[r.reason]}; remove it from your cart to continue.</li>)}
          </ul>
        )}
        <div className="border-t border-[color:var(--line)] pt-4 mt-2">
          <div className="flex justify-between text-[15px]"><span>Subtotal</span><span>{usd(priced.subtotalCents - priced.partnerDiscountCents)}</span></div>
          {priced.partnerDiscountCents > 0 && (
            <div className="flex justify-between text-[13px] mt-1 text-[color:var(--ink-soft)]"><span>Includes {discount?.newAccount ? `new-account ${OFFER_PCT_TEXT}` : `discount code ${appliedCode}`}</span><span>−{usd(priced.partnerDiscountCents)}</span></div>
          )}
          <div className="flex justify-between text-[15px] mt-1.5"><span>Shipping</span><span>{priced.shippingCents ? usd(priced.shippingCents) : <>Free <span className="text-[color:var(--ink-soft)] text-[12.5px]">({formatUsd(FREE_SHIPPING_THRESHOLD_USD)} or more)</span></>}</span></div>
          <div className="flex justify-between text-[15px] mt-1.5"><span>Shipping insurance</span><span>{usd(priced.insuranceCents)}</span></div>
          <div className="flex justify-between text-[15px] mt-1.5 text-[color:var(--ink-soft)]"><span>Sales tax</span><span>Calculated at payment</span></div>
          {creditBalanceCents > 0 && (
            <label className="s-chk mt-3"><input type="checkbox" checked={useCredit} onChange={(e) => setUseCredit(e.target.checked)} />
              <span>Apply store credit <span className="text-[color:var(--ink-soft)]">(balance {usd(creditBalanceCents)})</span> — held when you continue to payment, returned automatically if it isn&apos;t completed.</span></label>
          )}
        </div>
        {error && <p role="alert" className="mt-3 text-sm text-[color:var(--specimen)]">{error}</p>}
        <button type="submit" className="s-atc" disabled={!ruo || busy || priced.items.length === 0 || allRejected.length > 0}>
          {busy ? "Starting secure payment…" : "Continue to secure payment →"}
        </button>
        <p className="text-[12.5px] text-[color:var(--ink-soft)] mt-3">One discount per item: each item gets its pack price or the code, whichever is lower. Codes can&apos;t be combined with other offers.</p>
        <p className="s-micro s-ruo">For research use only · Not for human consumption · 21+</p>
      </div>
    </form>
  );
}
