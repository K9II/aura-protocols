"use client";

import Link from "next/link";
import { useState } from "react";
import { compounds } from "@/data/catalog";
import { FREE_SHIPPING_THRESHOLD_USD, linePriceUsd } from "@/lib/cart";
import { getCommerceAdapter } from "@/lib/commerce";
import { useCart } from "@/components/store/CartProvider";

const usd = (n: number) => `$${n.toFixed(2)}`;

export default function CartView({ onNavigate }: { onNavigate?: () => void }) {
  const { lines, remove, setQty, totals } = useCart();
  const [notice, setNotice] = useState<string | null>(null);

  async function checkout() {
    const result = await getCommerceAdapter().createCheckout(lines);
    if (result.kind === "redirect") window.location.href = result.url;
    else setNotice(result.message);
  }

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
        const c = compounds.find((x) => x.slug === line.slug);
        const v = c?.variants.find((x) => x.id === line.variantId);
        if (!c || !v) return null;
        return (
          <div key={`${line.slug}-${line.variantId}-${line.packQty}`} className="s-cart-line">
            <div>
              <Link href={`/products/${c.slug}`} onClick={onNavigate} className="p-serif text-[17px]">{c.name}</Link>
              <div className="s-micro text-[color:var(--ink-soft)] mt-1">
                {v.strength}{line.packQty > 1 ? ` · ${line.packQty}-pack` : ""}
              </div>
            </div>
            <div className="text-right">{usd(linePriceUsd(line))}</div>
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
        <div className="flex justify-between text-[15px]"><span>Subtotal</span><b>{usd(totals.subtotalUsd)}</b></div>
        <div className="s-freeship" aria-hidden><i style={{ width: `${pct}%` }} /></div>
        <p className="s-micro text-[color:var(--ink-soft)]">
          {totals.freeShipping ? "Free shipping unlocked" : `${usd(totals.remainingForFreeShippingUsd)} from free shipping`}
        </p>
        <button type="button" className="s-atc" onClick={checkout}>Checkout →</button>
        {notice && <p role="status" className="mt-3 text-sm text-[color:var(--specimen)]">{notice}</p>}
        <p className="s-micro s-ruo">For research use only · Not for human consumption · 21+</p>
      </div>
    </div>
  );
}
