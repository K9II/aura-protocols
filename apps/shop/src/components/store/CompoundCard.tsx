import type { CSSProperties } from "react";
import Link from "next/link";
import type { Compound } from "@/data/catalog";
import { fromPackPriceUsd, isPendingLot, vialCap, vialLabel } from "@/lib/catalog";
import { CLASS_COLOR, classShortName } from "@/lib/class-colors";
import { formatUsd } from "@/lib/cart";
import Vial from "@/components/store/Vial";

// Monograph card (approved 2026-10-10): a placard with the compound's identity
// stands behind an upright vial on a raised tile; the text below sits on a
// joined base, so tile + base read as one object.
export default function CompoundCard({ compound: c, index = 0 }: { compound: Compound; index?: number }) {
  // Lot line from the first strength with a released lot.
  const lot = c.variants.find((v) => !isPendingLot(v.lot))?.lot ?? { pending: true as const };
  const pending = isPendingLot(lot);
  const allOut = c.variants.every((v) => v.stock === "out");
  const anyLow = c.variants.some((v) => v.stock === "low");
  const price = `from ${formatUsd(fromPackPriceUsd(c))}`;
  const color = CLASS_COLOR[c.chemicalClass];
  const idLine = c.identity.cas ? `CAS ${c.identity.cas}` : c.identity.formula;
  return (
    <Link href={`/products/${c.slug}`} className="s-card" style={{ "--cls": color } as CSSProperties}>
      <div className="s-card-ph">
        {!pending && <span className="s-coa-tag">◇ COA<span className="s-coa-more"> on file</span></span>}
        {allOut ? (
          <span className="s-flag s-flag--out s-micro">Out of stock</span>
        ) : anyLow ? (
          <span className="s-flag s-micro">Low stock</span>
        ) : null}
        <div className="s-placard" aria-hidden>
          <span className="s-placard-k">Monograph · {classShortName(c.chemicalClass)}</span>
          <span className="s-placard-n">{vialLabel(c)}</span>
          {idLine && <span className="s-placard-id">{idLine}</span>}
          <span className="s-placard-r">Research use only · Not for human use</span>
        </div>
        <div className="s-card-vial">
          <Vial id={`${c.slug}-${index}`} label={vialLabel(c)} cap={vialCap(c)} rule={color} strength={c.variants[0].strength} tilt={0} />
        </div>
      </div>
      <div className="s-card-info">
        <div className="s-cat s-micro"><i />{c.chemicalClass}</div>
        <h3 className="s-card-name">{c.name}</h3>
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
