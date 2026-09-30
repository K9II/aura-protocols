import type { Metadata } from "next";
import Link from "next/link";
import { requireOwner } from "@/lib/dal";
import { listOrdersForOwner } from "@/lib/orders";
import { ORDER_STATUSES, STATUS_LABEL, type OrderStatus } from "@/lib/order-status";
import { CARRIERS } from "@/lib/emails";
import { usd } from "@/lib/html";
import { markShippedAction } from "@/app/admin/orders/actions";

export const metadata: Metadata = { title: "Orders", robots: { index: false, follow: false } };

const TABS: Array<[OrderStatus | "all", string]> = [["paid", "Paid"], ["processing", "Processing"], ["shipped", "Shipped"], ["all", "All"]];
const td: React.CSSProperties = { padding: "14px 18px 14px 0", verticalAlign: "top" };

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireOwner();
  const { status: raw } = await searchParams;
  const status = (raw === "all" || (ORDER_STATUSES as readonly string[]).includes(raw ?? "") ? raw : "paid") as OrderStatus | "all";
  const orders = await listOrdersForOwner(status);

  return (
    <div className="pharmacopoeia">
      <div className="p-container py-16">
        <p className="s-micro text-[color:var(--specimen)] mb-2.5">Owner · visible only to your account</p>
        <h1 className="s-h1 mb-6" style={{ fontSize: 48 }}>Orders <em>to ship.</em></h1>
        <nav aria-label="Order status" style={{ display: "flex", gap: 8 }} className="mb-6">
          {TABS.map(([s, label]) => (
            <Link key={s} href={`/admin/orders?status=${s}`} aria-current={s === status ? "page" : undefined}
              style={s === status ? { background: "var(--ink)", color: "var(--paper)", border: "1px solid var(--ink)", padding: "7px 12px", fontSize: 12.5 } : { border: "1px solid var(--line)", padding: "7px 12px", fontSize: 12.5 }}>
              {label}
            </Link>
          ))}
        </nav>
        {orders.length === 0 ? <p className="text-[color:var(--ink-soft)]">Nothing here.</p> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr className="s-micro text-[color:var(--ink-soft)]">
              <th style={{ ...td, textAlign: "left", paddingBottom: 8 }}>Order</th><th style={{ ...td, textAlign: "left", paddingBottom: 8 }}>Customer</th>
              <th style={{ ...td, textAlign: "left", paddingBottom: 8 }}>Ship to</th><th style={{ ...td, textAlign: "right", paddingBottom: 8 }}>Total</th>
              <th style={{ ...td, textAlign: "left", paddingBottom: 8 }}>Status</th><th />
            </tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} style={{ borderTop: "1px solid var(--line)" }}>
                  <td style={td} className="p-serif text-[17px]">
                    <details><summary className="cursor-pointer">{o.order_number}</summary>
                      <ul className="text-[12.5px] mt-2">{(o.order_items ?? []).map((i) => <li key={`${i.compound_slug}-${i.strength}-${i.pack_qty}`}>{i.compound_name} {i.strength}{i.pack_qty > 1 ? ` ${i.pack_qty}-pack` : ""} ×{i.quantity} · lot {i.lot_number}</li>)}</ul>
                      <p className="text-[12px] text-[color:var(--ink-soft)] mt-1">Research use confirmed {new Date(o.ruo_confirmed_at).toLocaleString("en-US")}</p>
                    </details>
                  </td>
                  <td style={td} className="text-sm">{o.ship_name}<br /><span className="text-[color:var(--ink-soft)]">{o.email}</span></td>
                  <td style={td} className="text-sm">{o.ship_line1}{o.ship_line2 ? `, ${o.ship_line2}` : ""}<br />{o.ship_city}, {o.ship_state} {o.ship_zip}</td>
                  <td style={{ ...td, textAlign: "right" }} className="text-sm">{usd(o.total_cents)}</td>
                  <td style={td} className="s-micro">{STATUS_LABEL[o.status]}{o.tracking_number ? <><br />{o.carrier?.toUpperCase()} {o.tracking_number}</> : null}</td>
                  <td style={{ padding: "14px 0", textAlign: "right", verticalAlign: "top" }}>
                    {o.status === "paid" && (
                      <form action={markShippedAction} style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <input type="hidden" name="orderId" value={o.id} />
                        <select name="carrier" aria-label="Carrier" defaultValue="usps" style={{ border: "1px solid var(--ink)", background: "var(--paper)", padding: "8px", font: "13px Georgia,serif" }}>
                          {CARRIERS.map((c) => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                        </select>
                        <input name="tracking" required placeholder="Tracking number" aria-label="Tracking number" style={{ width: 190, border: "1px solid var(--ink)", background: "var(--paper)", padding: "8px 10px", font: "13px Georgia,serif" }} />
                        <button type="submit" className="p-btn-primary" style={{ padding: "8px 14px", font: "12px Georgia,serif", letterSpacing: ".06em", textTransform: "uppercase", border: 0 }}>Mark shipped</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="text-[12.5px] text-[color:var(--ink-soft)] mt-4">Refunds and disputes are handled in the Stripe dashboard; a full refund updates the order here automatically.</p>
      </div>
    </div>
  );
}
