"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { Compound } from "@/data/catalog";
import { isPendingLot, packOptions, strengthInPriceUnit } from "@/lib/catalog";
import { FREE_SHIPPING_THRESHOLD_USD, linePriceUsd } from "@/lib/cart";
import { useCart } from "@/components/store/CartProvider";
import SpecBoxes from "@/components/store/SpecBoxes";
import TrustRow from "@/components/store/TrustRow";
import { chooseStrength, forgetStrength, useChosenStrength } from "@/lib/chosen-strength";

const MAX_PACKS = 20;
const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
// Same wording CompoundCard uses ("Low stock" / "Out of stock"); customers never see the count.
const STOCK_LABEL = { in: "In stock", low: "Low stock", out: "Out of stock" } as const;

// Pack list: every pack shows its price, the material it holds and $/mg ($/IU
// for an IU strength), so
// the total and the bulk saving are visible before anything is clicked. The
// lot boxes and certificate link follow the selected strength. Everything you
// choose sits on one raised panel (s-buy, class-colour top edge; 2026-10-10).
// `notes` (research-use line, disclaimer, Before ordering) render right after the buy box so
// the terms sit next to Add to cart at every width.
export default function VariantPicker({ compound: c, notes, certsHref }: { compound: Compound; notes?: ReactNode; certsHref?: string }) {
  const { add } = useCart();
  // the choice is shared: the turning vial and the placard's scan code follow it
  const chosenId = useChosenStrength(c.slug, c.variants[0].id);
  const variantId = c.variants.some((v) => v.id === chosenId) ? chosenId : c.variants[0].id;
  const setVariantId = (id: string) => chooseStrength(c.slug, id);
  useEffect(() => () => forgetStrength(c.slug), [c.slug]);
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

  // The buy box comes first: phones show it right under the name (mock Q1, 2026-10-14,
  // https://claude.ai/artifact/ADTaVMde9m6LCk7VDhHV4e). Above 900px CSS puts the proof
  // (specs, certificate link, trust row) back above it, the notes stay under it (.s-pick order).
  return (
    <div className="s-pick">
      <div className="s-buy">
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
        {/* Pending-lot strengths are always "out" but keep the existing COA-pending copy above — don't duplicate it here. */}
        {!pending && <p className={`s-stock s-stock--${variant.stock}`}>{STOCK_LABEL[variant.stock]}</p>}
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
        <div className="s-ship"><b>Ships from the US</b>Tracked shipping · free on orders of ${FREE_SHIPPING_THRESHOLD_USD} or more</div>
      </div>
      {notes && <div className="s-pick-notes">{notes}</div>}
      <SpecBoxes lot={lot} />
      {!pending && lot.coaFile ? (
        // One place opens certificates: the certificate cards/table lower down (Alvester,
        // 2026-10-14). This link jumps there; it only opens the PDF if the page has none to show.
        certsHref ? <a className="s-certlink" href={certsHref}>◇ See this lot&apos;s certificates ↓</a>
          : <a className="s-certlink" href={lot.coaFile} target="_blank" rel="noopener noreferrer">◇ View this lot&apos;s certificate</a>
      ) : (
        <p className="s-certlink" style={{ borderBottom: "none" }}>◇ Certificate posted when lab results return</p>
      )}
      <TrustRow className="s-trust--pdp" />
    </div>
  );
}

