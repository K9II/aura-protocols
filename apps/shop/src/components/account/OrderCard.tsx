import Link from "next/link";
import { statusLabelFor } from "@/lib/order-status";
import { trackingUrl } from "@/lib/emails";
import { usd } from "@/lib/html";
import type { OrderRow } from "@/lib/orders";
import { compoundTitle } from "@/lib/catalog";

const CARRIER_LABEL: Record<string, string> = { usps: "USPS", ups: "UPS", fedex: "FedEx", dhl: "DHL" };
const date = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

// A no-charge order (seeding, replacement, sample) shows "No charge" and is
// never "Paid" or "Refunded" to the customer. On My account (link) the order
// number opens the order page, and a wholesale balance due gets its button.
export default function OrderCard({ order, link = false }: { order: OrderRow; link?: boolean }) {
  const items = order.order_items ?? [];
  const noCharge = order.kind === "no_charge";
  const label = noCharge && order.status === "paid" ? "Preparing to ship" : statusLabelFor(order);
  return (
    <div className="s-cart-line" style={{ gridTemplateColumns: "1fr auto" }}>
      <div>
        {link
          ? <Link href={`/order/${order.order_number}`} className="p-serif text-[17px] underline underline-offset-4">Order {order.order_number}</Link>
          : <span className="p-serif text-[17px]">Order {order.order_number}</span>}
        <div className="s-micro text-[color:var(--ink-soft)] mt-1">{date(order.created_at)}</div>
        <ul className="text-[13px] mt-2">
          {items.map((i) => (
            <li key={`${i.compound_slug}-${i.strength}-${i.pack_qty}`}>
              {compoundTitle({ slug: i.compound_slug, name: i.compound_name })} · {i.strength} · {order.channel === "wholesale"
                ? <>kit × {i.quantity} · {usd(i.line_total_cents)}{i.lot_number ? " · " : ""}</> : <>{i.pack_qty}-pack × {i.quantity} ·{" "}</>}
              {i.lot_number.split(", ").filter(Boolean).map((lot, n) => (
                <span key={lot}>{n > 0 && ", "}<Link className="underline" href={`/coa?lot=${encodeURIComponent(lot)}`}>Lot {lot}</Link></span>
              ))}
            </li>
          ))}
        </ul>
        {order.status === "shipped" && order.tracking_number && (
          <div className="text-[13px] mt-2">{CARRIER_LABEL[order.carrier ?? "usps"] ?? "Carrier"} tracking{" "}
            <a className="underline text-[color:var(--specimen)]" href={trackingUrl(order.carrier ?? "usps", order.tracking_number)} target="_blank" rel="noopener noreferrer">{order.tracking_number.replace(/(.{4})(?=.)/g, "$1 ")}</a>
          </div>
        )}
      </div>
      <div className="text-right">
        <div>{noCharge ? "No charge" : usd(order.total_cents)}</div>
        <div className={`s-micro mt-1 ${order.status === "shipped" ? "text-[color:var(--specimen)]" : "text-[color:var(--ink-soft)]"}`}>{label}</div>
        {link && order.status === "balance_due" && (
          <Link href={`/order/${order.order_number}`} className="s-ws-btn" style={{ marginTop: 10, display: "inline-block" }}>Pay balance {usd(order.balance_cents ?? 0)} →</Link>
        )}
      </div>
    </div>
  );
}
