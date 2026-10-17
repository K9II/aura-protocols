import Link from "next/link";
import { statusLabelFor } from "@/lib/order-status";
import { trackingUrl } from "@/lib/emails";
import { usd } from "@/lib/html";
import type { OrderRow } from "@/lib/orders";
import { compoundTitle } from "@/lib/catalog";
import { priceByLabel, quotePriceBy } from "@/lib/wholesale/quote";

const CARRIER_LABEL: Record<string, string> = { usps: "USPS", ups: "UPS", fedex: "FedEx", dhl: "DHL" };
const date = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

// A no-charge order (seeding, replacement, sample) shows "No charge" and is
// never "Paid" or "Refunded" to the customer. On My account (link) the order
// number opens the order page, and a wholesale balance due gets its button.
export default function OrderCard({ order, link = false }: { order: OrderRow; link?: boolean }) {
  const items = order.order_items ?? [];
  const noCharge = order.kind === "no_charge";
  const label = noCharge && order.status === "paid" ? "Preparing to ship" : statusLabelFor(order);
  // A volume-quote request has no prices yet: the amount says when they're coming.
  const requested = order.status === "quote_requested";
  return (
    // Desktop: number, date and lines on the left, amount and status on the right.
    // Phones: amount and status sit on one line under the number, so the lines get the full width.
    <div className="s-cart-line s-ordercard">
      <div className="oc-head">
        {link
          ? <Link href={`/order/${order.order_number}`} className="p-serif text-[17px] underline underline-offset-4">Order {order.order_number}</Link>
          : <span className="p-serif text-[17px]">Order {order.order_number}</span>}
        <div className="s-micro text-[color:var(--ink-soft)] mt-1">{date(order.created_at)}</div>
      </div>
      <div className="oc-lines">
        <ul className="text-[13px]">
          {items.map((i) => (
            <li key={`${i.compound_slug}-${i.strength}-${i.pack_qty}`}>
              {compoundTitle({ slug: i.compound_slug, name: i.compound_name })} · {i.strength} · {order.channel === "wholesale"
                ? <>kit × {i.quantity}{requested ? "" : ` · ${usd(i.line_total_cents)}`}{i.lot_number ? " · " : ""}</> : <>{i.pack_qty}-pack × {i.quantity} ·{" "}</>}
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
      <div className="oc-side">
        <div className={requested ? "text-[color:var(--ink-soft)]" : undefined}>{noCharge ? "No charge" : requested ? `Price by ${priceByLabel(quotePriceBy(order.created_at))}` : usd(order.total_cents)}</div>
        <div className={`s-micro mt-1 ${order.status === "shipped" || requested ? "text-[color:var(--specimen)]" : "text-[color:var(--ink-soft)]"}`}>{label}</div>
        {link && order.status === "balance_due" && (
          <Link href={`/order/${order.order_number}`} className="s-ws-btn" style={{ marginTop: 10, display: "inline-block" }}>Pay balance {usd(order.balance_cents ?? 0)} →</Link>
        )}
      </div>
    </div>
  );
}
