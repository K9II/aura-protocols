import type { Lot, PendingLot } from "@/data/catalog";
import { isPendingLot } from "@/lib/catalog";

export default function SpecBoxes({ lot }: { lot: Lot | PendingLot }) {
  const pending = isPendingLot(lot);
  return (
    <div className="s-specs">
      <div><small className="s-micro">Purity</small><b>{pending ? "Pending" : `${lot.purityPct}%`}</b></div>
      <div><small className="s-micro">Method</small><b>{pending ? "Pending" : lot.method}</b></div>
      <div><small className="s-micro">Lot</small><b className="s-mono">{pending ? "Pending" : lot.lot}</b></div>
    </div>
  );
}
