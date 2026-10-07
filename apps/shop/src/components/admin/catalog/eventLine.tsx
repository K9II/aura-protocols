// One line of a product's Activity (Catalog product page and Admin → Activity).
import Link from "next/link";
import type { CatalogEvent } from "@/lib/catalog-ops/data";
import { COUNT_REASON_LABEL, type CountReason } from "@/lib/catalog-ops/rules";
import { usd } from "@/lib/html";

const MISMATCH_NOTE: Record<string, string> = { moved: "vials moved to the shipped lot", "not moved": "not moved — check stock" };

export function catalogEventLine(e: CatalogEvent, strengthOf: (variantId: string | null) => string): React.ReactNode {
  const who = e.actorName ?? (e.source === "3pl" ? "The 3PL" : "System");
  const lot = e.lotNumber ? <b>{e.lotNumber}</b> : null;
  const a = (e.after ?? {}) as Record<string, number | string>, b = (e.before ?? {}) as Record<string, number | string>;
  // Strength events carry the label, so a deleted strength still reads right.
  const st = <b>{String(a.strength ?? b.strength ?? strengthOf(e.variant_id))}</b>;
  switch (e.kind) {
    case "strength_added": return <>{who} added {st} · {usd(Number(a.price_cents))} · hidden</>;
    case "strength_shown": return <>{who} showed {st} on the store</>;
    case "strength_hidden": return <>{who} hid {st} from the store</>;
    case "strength_archived": return <>{who} archived {st}</>;
    case "strength_restored": return <>{who} restored {st} · hidden</>;
    case "strength_deleted": return <>{who} deleted {st}</>;
    case "lot_received": return <>{who} received {lot} · {a.counted} of {a.ordered}{Number(a.damaged) ? `, ${a.damaged} damaged` : ""}</>;
    case "lot_edited": return <>{who} edited draft {lot}</>;
    case "lot_live": return <>{who} put {lot} live</>;
    case "lot_retired": return <>{who} retired {lot}</>;
    case "count_corrected": return <>{who} corrected {lot} count {Number(a.sellable) - Number(b.sellable) > 0 ? "+" : ""}{Number(a.sellable) - Number(b.sellable)} · {COUNT_REASON_LABEL[e.reason as CountReason] ?? e.reason}</>;
    case "certificate_replaced": return <>{who} replaced the certificate for {lot}</>;
    case "price_changed": return <>{who} changed {strengthOf(e.variant_id)} price <b>{usd(Number(b.price_cents))} → {usd(Number(a.price_cents))}</b></>;
    case "low_at_changed": return <>{who} set {strengthOf(e.variant_id)} low level to {a.low_at}</>;
    case "threepl_sku_changed": return <>{who} set {strengthOf(e.variant_id)} 3PL SKU to <span className="a-nw">{a.threepl_sku ?? "none"}</span></>;
    case "shown": return <>{who} showed it on the store</>;
    case "hidden": return <>{who} hid it from the store</>;
    case "oversold": return <>Oversold on {e.note}: {a.need} ordered, {a.covered} held</>;
    case "lot_mismatch": return <>{who === "System" ? "Shipped" : `${who} shipped`} a different lot than allocated · {MISMATCH_NOTE[e.note ?? ""] ?? e.note}{a.order_number ? <> · <Link href={`/admin/orders/${a.order_number}`}>{a.order_number}</Link></> : null}</>;
    default: return e.kind;
  }
}
