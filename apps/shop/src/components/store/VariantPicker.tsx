"use client";

import { useState } from "react";
import type { Compound } from "@/data/catalog";
import { isPendingLot, perVialUsd } from "@/lib/catalog";
import { linePriceUsd } from "@/lib/cart";
import { useCart } from "@/components/store/CartProvider";

const MAX_PACKS = 20;

export default function VariantPicker({ compound: c }: { compound: Compound }) {
  const { add } = useCart();
  const [variantId, setVariantId] = useState(c.variants[0].id);
  const [packQty, setPackQty] = useState(c.packDiscounts[0].qty);
  const [quantity, setQuantity] = useState(1);
  const variant = c.variants.find((v) => v.id === variantId)!;
  const line = { slug: c.slug, variantId, packQty, quantity };
  const total = linePriceUsd(line, [c]);
  const pending = isPendingLot(c.currentLot);
  const out = variant.stock === "out";

  return (
    <div>
      <div className="s-pprice">${perVialUsd(variant.priceUsd, packQty, c).toFixed(2)} <span>/ vial · {variant.strength}</span></div>
      {c.variants.length > 1 && (
        <>
          <div className="s-optlabel s-micro">Size</div>
          <div className="s-seg">
            {c.variants.map((v) => (
              <button key={v.id} type="button" aria-pressed={v.id === variantId} onClick={() => setVariantId(v.id)}>{v.strength}</button>
            ))}
          </div>
        </>
      )}
      <div className="s-optlabel s-micro">Pack</div>
      <div className="s-seg">
        {c.packDiscounts.map((p) => (
          <button key={p.qty} type="button" aria-pressed={p.qty === packQty} onClick={() => setPackQty(p.qty)}>
            {`${p.qty}-pack`}{p.pct > 0 && <>{" "}<em>−{p.pct}%</em></>}
          </button>
        ))}
      </div>
      <div className="s-optlabel s-micro">Quantity</div>
      <div className="s-buyrow">
        <div className="s-qty" role="group" aria-label="Quantity">
          <button type="button" aria-label="Decrease quantity" disabled={quantity <= 1} onClick={() => setQuantity((q) => Math.max(1, q - 1))}>−</button>
          <span aria-live="polite">{quantity}</span>
          <button type="button" aria-label="Increase quantity" disabled={quantity >= MAX_PACKS} onClick={() => setQuantity((q) => Math.min(MAX_PACKS, q + 1))}>+</button>
        </div>
        <button type="button" className="s-atc" disabled={out || pending} onClick={() => add(line)}>
          {out ? "Out of stock" : pending ? "COA pending — available soon" : `Add to cart — $${total.toFixed(2)} →`}
        </button>
      </div>
    </div>
  );
}
