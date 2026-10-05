"use client";

import { useState } from "react";
import type { Compound } from "@/data/catalog";
import { isPendingLot, packOptions, strengthInPriceUnit } from "@/lib/catalog";
import { linePriceUsd } from "@/lib/cart";
import { useCart } from "@/components/store/CartProvider";
import SpecBoxes from "@/components/store/SpecBoxes";

const MAX_PACKS = 20;
const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Pack list: every pack shows its price, the material it holds and $/mg ($/IU
// for an IU strength), so
// the total and the bulk saving are visible before anything is clicked. The
// lot boxes and certificate link follow the selected strength.
export default function VariantPicker({ compound: c }: { compound: Compound }) {
  const { add } = useCart();
  const [variantId, setVariantId] = useState(c.variants[0].id);
  const [packQty, setPackQty] = useState(c.packDiscounts[0].qty);
  const [quantity, setQuantity] = useState(1);
  const variant = c.variants.find((v) => v.id === variantId)!;
  const packs = packOptions(c, variantId);
  const per = `/${strengthInPriceUnit(variant.strength).unit}`;
  const sel = packs.find((p) => p.qty === packQty)!;
  const line = { slug: c.slug, variantId, packQty, quantity };
  const total = linePriceUsd(line, [c]);
  const lot = variant.lot;
  const pending = isPendingLot(lot);
  const out = variant.stock === "out"; // a pending lot is always out

  return (
    <div>
      <SpecBoxes lot={lot} />
      {!pending && lot.coaFile ? (
        <a className="s-certlink" href={lot.coaFile} target="_blank" rel="noopener noreferrer">◇ View this lot&apos;s certificate</a>
      ) : (
        <p className="s-certlink" style={{ borderBottom: "none" }}>◇ Certificate posted when lab results return</p>
      )}
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
      <div className="s-optlabel s-micro s-optlabel--split"><span>Choose pack</span><span>Pack price</span></div>
      <div className="s-packs">
        {packs.map((p) => (
          <button key={p.qty} type="button" className="s-pack" aria-pressed={p.qty === packQty} onClick={() => setPackQty(p.qty)}>
            <span>
              <b>{p.qty} vials × {variant.strength}</b>
              <span className="s-pack-math">{p.totalLabel} total · {usd(p.perMgUsd)}{per}</span>
            </span>
            <span className="s-pack-price">
              <b>{usd(p.packUsd)}</b>
              {p.pct > 0 && <span className="s-micro">save {p.pct}%</span>}
            </span>
          </button>
        ))}
      </div>
      <div className="s-packsel" data-testid="selected-pack">
        <div>
          <div className="s-micro">Selected pack</div>
          <div className="s-packsel-name">{sel.totalLabel} pack</div>
          <span className="s-pack-math">{sel.qty} vials × {variant.strength} · {usd(sel.perVialUsd)}/vial · {usd(sel.perMgUsd)}{per}</span>
        </div>
        <div className="s-packsel-price">
          <div className="s-micro">Pack price</div>
          <b>{usd(sel.packUsd)}</b>
        </div>
      </div>
      <div className="s-optlabel s-micro">Quantity</div>
      <div className="s-buyrow">
        <div className="s-stepper" role="group" aria-label="Quantity">
          <button type="button" aria-label="Decrease quantity" disabled={quantity <= 1} onClick={() => setQuantity((q) => Math.max(1, q - 1))}>−</button>
          <span aria-live="polite">{quantity}</span>
          <button type="button" aria-label="Increase quantity" disabled={quantity >= MAX_PACKS} onClick={() => setQuantity((q) => Math.min(MAX_PACKS, q + 1))}>+</button>
        </div>
        <button type="button" className="s-atc" disabled={out} onClick={() => add(line)}>
          {pending ? "COA pending — available soon" : out ? "Out of stock" : <>Add to cart — <span className="whitespace-nowrap">${total.toFixed(2)} →</span></>}
        </button>
      </div>
    </div>
  );
}
