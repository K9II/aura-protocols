import Link from "next/link";
import type { Compound } from "@/data/catalog";
import { fromPriceUsd, isPendingLot, vialLabel } from "@/lib/catalog";
import Vial from "@/components/store/Vial";

const TILTS = [-14, -8, -12, -6];

export default function CompoundCard({ compound: c, index = 0 }: { compound: Compound; index?: number }) {
  const lot = c.currentLot;
  const pending = isPendingLot(lot);
  const allOut = c.variants.every((v) => v.stock === "out");
  const anyLow = c.variants.some((v) => v.stock === "low");
  const price = c.variants.length > 1 ? `from $${fromPriceUsd(c)}` : `$${fromPriceUsd(c)}`;
  return (
    <Link href={`/products/${c.slug}`} className="s-card block">
      <div className="s-card-ph">
        {!pending && <span className="s-coa-tag">◇ COA on file</span>}
        {allOut ? (
          <span className="s-flag s-flag--out s-micro">Out of stock</span>
        ) : anyLow ? (
          <span className="s-flag s-micro">Low stock</span>
        ) : null}
        <Vial id={`${c.slug}-${index}`} label={vialLabel(c)} strength={c.variants[0].strength} tilt={TILTS[index % TILTS.length]} />
      </div>
      <div className="s-cat s-micro"><i />{c.chemicalClass}</div>
      <h3 className="s-card-name">{c.name}</h3>
      <div className="s-card-price">{price}</div>
      {isPendingLot(lot) ? (
        <div className="s-pur s-pur--pending">COA pending</div>
      ) : (
        <div className="s-pur">{lot.purityPct}% · tested</div>
      )}
    </Link>
  );
}
