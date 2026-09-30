import Link from "next/link";
import { STATUS_LABEL } from "@/lib/order-status";
import { trackingUrl } from "@/lib/emails";
import { usd } from "@/lib/html";
import type { OrderRow } from "@/lib/orders";

const date = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export default function OrderCard({ order }: { order: OrderRow }) {
  const items = order.order_items ?? [];
  return (
    <div className="s-cart-line" style={{ gridTemplateColumns: "1fr auto" }}>
      <div>
        <span className="p-serif text-[17px]">Order {order.order_number}</span>
        <div className="s-micro text-[color:var(--ink-soft)] mt-1">{date(order.created_at)}</div>
        <ul className="text-[13px] mt-2">
          {items.map((i) => (
            <li key={`${i.compound_slug}-${i.strength}-${i.pack_qty}`}>
              {i.compound_name} · {i.strength}{i.pack_qty > 1 ? ` · ${i.pack_qty}-pack` : ""} × {i.quantity} ·{" "}
              <Link className="underline" href={`/coa?lot=${encodeURIComponent(i.lot_number)}`}>Lot {i.lot_number}</Link>
            </li>
          ))}
        </ul>
        {order.status === "shipped" && order.tracking_number && (
          <div className="text-[13px] mt-2">Tracking{" "}
            <a className="underline text-[color:var(--specimen)]" href={trackingUrl(order.carrier ?? "usps", order.tracking_number)} target="_blank" rel="noopener noreferrer">{order.tracking_number}</a>
          </div>
        )}
      </div>
      <div className="text-right">
        <div>{usd(order.total_cents)}</div>
        <div className={`s-micro mt-1 ${order.status === "shipped" ? "text-[color:var(--specimen)]" : "text-[color:var(--ink-soft)]"}`}>{STATUS_LABEL[order.status]}</div>
      </div>
    </div>
  );
}
