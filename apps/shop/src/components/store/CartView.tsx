"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { FREE_SHIPPING_THRESHOLD_USD, linePriceUsd } from "@/lib/cart";
import { priceOrder } from "@/lib/pricing";
import { applyPartnerCode } from "@/lib/partners/discounts";
import { checkCodeAction } from "@/app/checkout/actions";
import { customerSummary } from "@/lib/discounts/rules";
import { useCart } from "@/components/store/CartProvider";

const codeBtn: React.CSSProperties = { padding: "7px 13px", font: "12px Georgia,serif", letterSpacing: ".06em", textTransform: "uppercase", border: "1px solid var(--ink)", background: "transparent", color: "var(--ink)", cursor: "pointer" };
type CodeStatus = { kind: "applied" | "saved" | "error"; text: string } | null;

const usd = (n: number) => `$${n.toFixed(2)}`;

export default function CartView({ onNavigate }: { onNavigate?: () => void }) {
  const { catalog, lines, remove, setQty, totals, code, setCode } = useCart();
  const [codeInput, setCodeInput] = useState("");
  const [verified, setVerified] = useState<string | null>(null);
  const [status, setStatus] = useState<CodeStatus>(null);
  const checked = useRef<string | null>(null);

  // Same rule as checkout: codes are checked only for signed-in, verified
  // accounts. Otherwise the code is kept and checkout applies it.
  async function check(value: string) {
    const r = await checkCodeAction(value);
    checked.current = r.ok ? r.code : value.trim().toUpperCase();
    if (r.ok && r.kind === "discount") {
      setCode(r.code); setVerified(null); setCodeInput(r.code);
      setStatus({ kind: "applied", text: `✓ ${r.code} · ${customerSummary(r.terms)} — applied at checkout` });
    } else if (r.ok) {
      setCode(r.code); setVerified(r.code); setCodeInput(r.code);
      setStatus({ kind: "applied", text: `✓ ${r.code} applied · 10% off items that don't already have a larger pack discount` });
    } else if (r.needsSignIn) {
      const v = value.trim().toUpperCase();
      setCode(v); setVerified(null); setCodeInput(v);
      setStatus({ kind: "saved", text: `${v} saved. It's checked and applied when you sign in at checkout.` });
    } else {
      setVerified(null); setStatus({ kind: "error", text: r.message });
    }
  }
  // A code saved earlier (this visit or a previous one) is re-checked when the cart shows.
  useEffect(() => {
    if (code && checked.current !== code) void check(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);
  function removeCode() { setCode(""); setVerified(null); setCodeInput(""); setStatus(null); checked.current = null; }

  const discountCents = useMemo(() => (verified ? applyPartnerCode(priceOrder(lines, catalog)).partnerDiscountCents : 0), [lines, catalog, verified]);

  if (lines.length === 0) {
    return (
      <div>
        <p className="text-[color:var(--ink-soft)] mb-6">Your cart is empty.</p>
        <Link href="/products" onClick={onNavigate} className="p-btn-primary inline-block px-5 py-3 text-sm uppercase tracking-[0.06em]">Shop the lineup →</Link>
      </div>
    );
  }

  const pct = Math.min(100, (totals.subtotalUsd / FREE_SHIPPING_THRESHOLD_USD) * 100);
  return (
    <div>
      {lines.map((line, i) => {
        const c = catalog.find((x) => x.slug === line.slug);
        const v = c?.variants.find((x) => x.id === line.variantId);
        if (!c || !v) return null;
        return (
          <div key={`${line.slug}-${line.variantId}-${line.packQty}`} className="s-cart-line">
            <div>
              <Link href={`/products/${c.slug}`} onClick={onNavigate} className="p-serif text-[17px]">{c.name}</Link>
              <div className="s-micro text-[color:var(--ink-soft)] mt-1">
                {v.strength} · {line.packQty}-pack
              </div>
            </div>
            <div className="text-right">{usd(linePriceUsd(line, catalog))}</div>
            <div className="s-qty" aria-label={`Quantity for ${c.name}`}>
              <button type="button" aria-label="Decrease" onClick={() => setQty(i, line.quantity - 1)}>−</button>
              <span>{line.quantity}</span>
              <button type="button" aria-label="Increase" onClick={() => setQty(i, line.quantity + 1)}>+</button>
            </div>
            <button type="button" onClick={() => remove(i)} className="text-right text-xs underline text-[color:var(--ink-soft)] bg-transparent border-0 cursor-pointer">Remove</button>
          </div>
        );
      })}
      <div className="border-t border-[color:var(--line)] pt-4 mt-2">
        <label htmlFor="cart-code" className="s-micro block mb-1.5">Discount code</label>
        <div className="flex gap-2 mb-1">
          <input id="cart-code" value={codeInput} maxLength={24} autoComplete="off"
            onChange={(e) => { setCodeInput(e.target.value); if (status?.kind === "error") setStatus(null); }}
            onKeyDown={(e) => { if (e.key === "Enter" && codeInput.trim() && !code) void check(codeInput); }}
            readOnly={!!code} className="flex-1 min-w-0 border border-[color:var(--ink)] bg-[color:var(--paper)] px-3 py-2 text-sm uppercase" />
          {code
            ? <button type="button" onClick={removeCode} style={codeBtn} aria-label="Remove code">Remove</button>
            : <button type="button" onClick={() => codeInput.trim() && void check(codeInput)} style={codeBtn}>Apply</button>}
        </div>
        {status && <p role="status" className="text-[12.5px] mb-3" style={{ color: status.kind === "error" ? "var(--specimen)" : status.kind === "applied" ? "#2F5D3A" : "var(--ink-soft)" }}>{status.text}</p>}
        <div className="flex justify-between text-[15px] mt-3"><span>Subtotal</span><b>{usd(totals.subtotalUsd)}</b></div>
        {discountCents > 0 && (
          <div className="flex justify-between text-[13px] mt-1 text-[color:var(--ink-soft)]"><span>Discount code {verified}</span><span>−{usd(discountCents / 100)}</span></div>
        )}
        <div className="s-freeship" aria-hidden><i style={{ width: `${pct}%` }} /></div>
        <p className="s-micro text-[color:var(--ink-soft)]">
          {totals.freeShipping ? "Free shipping unlocked" : `${usd(totals.remainingForFreeShippingUsd)} from free shipping`}
        </p>
        <Link href="/checkout" onClick={onNavigate} className="s-atc block text-center">Checkout →</Link>
        {/* Continue shopping (Alvester, 2026-10-10): a button, not a link, and it
            always goes to the shop page (from the drawer too, which then closes). */}
        <Link href="/products" onClick={onNavigate} className="s-cart-continue p-btn-outline">Continue shopping</Link>
        <p className="s-micro s-ruo">For research use only · Not for human consumption · 21+</p>
      </div>
    </div>
  );
}
