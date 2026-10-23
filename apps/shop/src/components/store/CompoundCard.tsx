import type { CSSProperties } from "react";
import Link from "next/link";
import type { Compound } from "@/data/catalog";
import { fromPackPriceUsd, isPendingLot, vialCap, vialName, vialParts } from "@/lib/catalog";
import { CLASS_COLOR } from "@/lib/class-colors";
import { formatUsd } from "@/lib/cart";
import Vial from "@/components/store/Vial";
import NameParts from "@/components/store/NameParts";


// Product card: the vial fills a raised tile and the hanging tag below carries the class,
// name, price and certificate (option C, Alvester 2026-10-23: the old placard repeated the
// tag's name and squeezed the vial; every pictured vial must be legible on desktop and phones).
// idScope keeps the vial's SVG ids unique when the same card is on the page twice (home: phone + desktop lineup).
export default function CompoundCard({ compound: c, index = 0, idScope = "" }: { compound: Compound; index?: number; idScope?: string }) {
  // Lot line from the first strength with a released lot.
  const lot = c.variants.find((v) => !isPendingLot(v.lot))?.lot ?? { pending: true as const };
  const pending = isPendingLot(lot);
  const allOut = c.variants.every((v) => v.stock === "out");
  const anyLow = c.variants.some((v) => v.stock === "low");
  const price = `from ${formatUsd(fromPackPriceUsd(c))}`;
  const color = CLASS_COLOR[c.chemicalClass];
  return (
    <Link href={`/products/${c.slug}`} className="s-card" style={{ "--cls": color } as CSSProperties}>
      <div className="s-card-ph">
        {!pending && <span className="s-coa-tag">◇ COA<span className="s-coa-more"> on file</span></span>}
        {allOut ? (
          <span className="s-flag s-flag--out s-micro">Out of stock</span>
        ) : anyLow ? (
          <span className="s-flag s-micro">Low stock</span>
        ) : null}
        <div className="s-card-vial">
          <Vial id={`${idScope}${c.slug}-${index}`} label={vialName(c)[0]} label2={vialName(c)[1]} cap={vialCap(c)} rule={color} parts={vialParts(c)} strength={c.variants[0].strength} tilt={0} />
        </div>
      </div>
      <div className="s-card-info">
        <div className="s-cat s-micro"><i />{c.chemicalClass}</div>
        <h3 className="s-card-name"><NameParts name={c.name} /></h3>
        <div className="s-card-meta">
          <span><small className="s-micro">Price</small><span className="s-card-price">{price}</span></span>
          <span>
            <small className="s-micro">Certificate</small>
            {pending ? <span className="s-pur s-pur--pending">COA pending</span> : <span className="s-pur">{lot.purityPct}% · tested</span>}
          </span>
        </div>
      </div>
    </Link>
  );
}
