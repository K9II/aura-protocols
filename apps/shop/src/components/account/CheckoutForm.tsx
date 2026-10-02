"use client";

import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/components/store/CartProvider";
import { priceOrder, type Rejection } from "@/lib/pricing";
import { applyPartnerCode } from "@/lib/partners/discounts";
import { checkPartnerCodeAction, startCheckoutAction } from "@/app/checkout/actions";
import type { ShipAddress } from "@/lib/ship-address";
import { usd } from "@/lib/html";

const field = "w-full border border-[color:var(--ink)] bg-[color:var(--paper)] px-3.5 py-3 text-sm mb-4";
const smallBtn: React.CSSProperties = { padding: "7px 13px", font: "12px Georgia,serif", letterSpacing: ".06em", textTransform: "uppercase", border: "1px solid var(--ink)", background: "transparent", color: "var(--ink)" };
const REASON: Record<Rejection["reason"], string> = {
  unknown: "no longer listed", pending_lot: "certificate pending", out_of_stock: "out of stock",
  bad_pack: "pack size unavailable", bad_quantity: "quantity not allowed",
};

export default function CheckoutForm({ email, ship, initialCode, creditBalanceCents }: {
  email: string; ship: ShipAddress | null; initialCode: string; creditBalanceCents: number;
}) {
  const { lines } = useCart();
  const [addr, setAddr] = useState({
    name: ship?.name ?? "", line1: ship?.line1 ?? "", line2: ship?.line2 ?? "",
    city: ship?.city ?? "", state: ship?.state ?? "", zip: ship?.zip ?? "",
  });
  const [codeInput, setCodeInput] = useState(initialCode);
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [codeMsg, setCodeMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [useCredit, setUseCredit] = useState(creditBalanceCents > 0);
  const [ruo, setRuo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejected, setRejected] = useState<Rejection[]>([]);
  const set = (k: keyof typeof addr) => (e: React.ChangeEvent<HTMLInputElement>) => setAddr({ ...addr, [k]: e.target.value });

  const base = useMemo(() => priceOrder(lines), [lines]);
  const priced = useMemo(() => (appliedCode ? applyPartnerCode(base) : { ...base, lineDiscounts: base.items.map((_, index) => ({ index, source: "none" as const, savingCents: 0 })) }), [base, appliedCode]);

  async function applyCodeValue(code: string) {
    const r = await checkPartnerCodeAction(code);
    if (r.ok) { setAppliedCode(r.code); setCodeInput(r.code); setCodeMsg({ ok: true, text: `✓ ${r.code} applied · 10% off items that don't already have a larger pack discount` }); }
    else { setAppliedCode(null); setCodeMsg({ ok: false, text: r.message }); }
  }

  // A referral link's code (initialCode, from the aura_ref cookie) is applied
  // automatically on arrival so the discount is visible before the customer
  // ever touches the field — they never have to know a code exists.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see comment above; the state update is inside an awaited server call, not synchronous
    if (initialCode.trim()) void applyCodeValue(initialCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function applyCode() {
    if (!codeInput.trim()) return;
    await applyCodeValue(codeInput);
  }
  function removeCode() { setAppliedCode(null); setCodeInput(""); setCodeMsg(null); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    // A code typed but never explicitly applied is still sent — the server
    // either applies it or refuses it with a reason; it's never silently dropped.
    const r = await startCheckoutAction({ lines, ship: addr, ruoConfirmed: ruo, partnerCode: appliedCode ?? (codeInput.trim() || undefined), useCredit });
    if (r.url) { window.location.assign(r.url); return; }
    setError(r.error ?? "Something went wrong — please try again.");
    if (r.codeError) { setAppliedCode(null); setCodeMsg({ ok: false, text: r.codeError }); }
    setRejected(r.rejected ?? []);
    setBusy(false);
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
        <label htmlFor="co-code" className="s-micro block mb-1.5 mt-2">Partner code</label>
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
        <p className="s-micro mb-1">Order summary</p>
        {priced.items.map((i, idx) => {
          const d = priced.lineDiscounts[idx];
          const pack = i.packQty > 1 ? ` · ${i.packQty}-pack${i.packPct ? ` −${i.packPct}%` : ""}` : " · single";
          const note = appliedCode ? (d.source === "code" ? " · code −10%" : d.source === "pack" ? " (code not added)" : "") : "";
          return (
            <div key={`${i.compoundSlug}-${i.variantId}-${i.packQty}`} className="s-cart-line">
              <div><span className="p-serif text-[17px]">{i.compoundName}</span>
                <div className="s-micro text-[color:var(--ink-soft)] mt-1">{i.strength}{pack}{note}{i.quantity > 1 ? ` × ${i.quantity}` : ""}</div></div>
              <div className="text-right">
                {d.savingCents > 0 && <span className="text-[color:var(--ink-soft)] line-through text-[13px] mr-1.5">{usd(i.lineTotalCents)}</span>}
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
            <div className="flex justify-between text-[13px] mt-1 text-[color:var(--ink-soft)]"><span>Includes partner code {appliedCode}</span><span>−{usd(priced.partnerDiscountCents)}</span></div>
          )}
          <div className="flex justify-between text-[15px] mt-1.5"><span>Shipping</span><span>{priced.shippingCents ? usd(priced.shippingCents) : <>Free <span className="text-[color:var(--ink-soft)] text-[12.5px]">($250 or more)</span></>}</span></div>
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
