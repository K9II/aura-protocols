import type { Metadata } from "next";
import Link from "next/link";
import { requireOwner } from "@/lib/dal";
import { countOrderTabs, listOrdersForOwner, type OrderRow } from "@/lib/orders";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/order-status";
import { CARRIERS } from "@/lib/emails";
import { usd } from "@/lib/html";
import { markShippedAction, refundCreditOrderAction } from "@/app/admin/orders/actions";
import { orderItemLots } from "@/lib/catalog-ops/data";
import { lotsMatch, type LotQty } from "@/lib/catalog-ops/rules";

export const metadata: Metadata = { title: "Orders", robots: { index: false, follow: false } };

const TABS: Array<["paid" | "processing" | "shipped" | "all", string]> = [["paid", "Paid"], ["processing", "Processing"], ["shipped", "Shipped"], ["all", "All"]];
const td: React.CSSProperties = { padding: "14px 18px 14px 0", verticalAlign: "top" };
const nowrap: React.CSSProperties = { ...td, whiteSpace: "nowrap" };
const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
// Owner shorthand, e.g. "Paid · Oct 15" (the customer-facing labels are longer).
function statusLine(o: OrderRow): string {
  const at = o.status === "shipped" ? o.shipped_at : o.status === "paid" ? o.paid_at : o.status === "refunded" ? o.refunded_at : o.status === "cancelled" ? o.cancelled_at : null;
  const word = o.status.charAt(0).toUpperCase() + o.status.slice(1);
  return `${word} · ${day(at ?? o.created_at)}`;
}

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireOwner();
  const { status: raw } = await searchParams;
  const status = (raw === "all" || (ORDER_STATUSES as readonly string[]).includes(raw ?? "") ? raw : "paid") as OrderStatus | "all";
  // TEMPORARY (Batch A / Task 2): countOrdersForOwner was removed; this page is
  // rewritten in Task 8 (Batch C). Map the new tab counts back onto the old shape.
  const [orders, tabCounts] = await Promise.all([listOrdersForOwner(status), countOrderTabs()]);
  const counts = { paid: tabCounts.to_ship, processing: tabCounts.processing, shipped: tabCounts.shipped, all: tabCounts.all };
  const lots = await orderItemLots(orders.flatMap((o) => (o.order_items ?? []).map((i) => i.id)));
  const fmt = (xs: LotQty[]) => xs.map((x) => `${x.qty} × ${x.lotNumber}`).join(", ");

  return (
    <div className="pharmacopoeia">
      <div className="p-container py-16">
        <p className="s-micro text-[color:var(--specimen)] mb-2.5">Owner · visible only to your account</p>
        <h1 className="s-h1 mb-6" style={{ fontSize: 48 }}>Orders <em>to ship.</em></h1>
        <nav aria-label="Order status" style={{ display: "flex", gap: 8 }} className="mb-6">
          {TABS.map(([s, label]) => (
            <Link key={s} href={`/admin/orders?status=${s}`} aria-current={s === status ? "page" : undefined}
              style={s === status ? { background: "var(--ink)", color: "var(--paper)", border: "1px solid var(--ink)", padding: "7px 12px", fontSize: 12.5 } : { border: "1px solid var(--line)", padding: "7px 12px", fontSize: 12.5 }}>
              {label} · {counts[s]}
            </Link>
          ))}
        </nav>
        {orders.length === 0 ? <p className="text-[color:var(--ink-soft)]">Nothing here.</p> : (
          <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr className="s-micro text-[color:var(--ink-soft)]">
              <th style={{ ...td, textAlign: "left", paddingBottom: 8 }}>Order</th><th style={{ ...td, textAlign: "left", paddingBottom: 8 }}>Customer</th>
              <th style={{ ...td, textAlign: "left", paddingBottom: 8 }}>Ship to</th><th style={{ ...td, textAlign: "right", paddingBottom: 8 }}>Total</th>
              <th style={{ ...td, textAlign: "left", paddingBottom: 8 }}>Status</th><th />
            </tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} id={o.order_number} style={{ borderTop: "1px solid var(--line)" }}>
                  <td style={nowrap} className="p-serif text-[17px]">
                    <details><summary className="cursor-pointer">{o.order_number}</summary>
                      <p className="text-[12.5px] mt-2" style={{ whiteSpace: "normal" }}>{o.ship_name}<br />{o.ship_line1}{o.ship_line2 ? `, ${o.ship_line2}` : ""}<br />{o.ship_city}, {o.ship_state} {o.ship_zip}</p>
                      <ul className="text-[12.5px] mt-2">{(o.order_items ?? []).map((i) => {
                        const il = lots.get(i.id);
                        return (
                          <li key={i.id}>
                            {i.compound_name} {i.strength} {i.pack_qty}-pack ×{i.quantity}
                            {" · pick "}{fmt(il?.allocated ?? []) || i.lot_number}
                            {(il?.shipped.length ?? 0) > 0 && (
                              lotsMatch(il!.allocated, il!.shipped)
                                ? <span className="a-chip c-in nodot" style={{ marginLeft: 6 }}>Matches</span>
                                : <span className="a-chip c-low nodot" style={{ marginLeft: 6 }}>Shipped {fmt(il!.shipped)}</span>
                            )}
                          </li>
                        );
                      })}</ul>
                      <p className="text-[12px] text-[color:var(--ink-soft)] mt-1">Research use confirmed {new Date(o.ruo_confirmed_at).toLocaleString("en-US")}</p>
                      {!o.stripe_session_id && o.store_credit_cents === o.total_cents && (o.status === "paid" || o.status === "shipped") && (
                        <form action={refundCreditOrderAction} className="mt-2" style={{ whiteSpace: "normal" }}>
                          <input type="hidden" name="orderId" value={o.id} />
                          <p className="text-[12px] text-[color:var(--ink-soft)] mb-1">Paid in store credit only — refund it here, not in Stripe.</p>
                          <button type="submit" className="s-micro underline bg-transparent border-0 cursor-pointer text-[color:var(--specimen)]">Refund to store credit</button>
                        </form>
                      )}
                    </details>
                  </td>
                  <td style={td} className="text-sm">{o.ship_name} · {o.email}</td>
                  <td style={nowrap} className="text-sm">{o.ship_city}, {o.ship_state}</td>
                  <td style={{ ...nowrap, textAlign: "right" }} className="text-sm">{usd(o.total_cents)}</td>
                  <td style={nowrap} className="s-micro">{statusLine(o)}{o.tracking_number ? <><br />{o.carrier?.toUpperCase()} {o.tracking_number}</> : null}</td>
                  <td style={{ padding: "14px 0", textAlign: "right", verticalAlign: "top" }}>
                    {o.status === "paid" && (
                      <>
                        <p style={{ marginBottom: 6 }}><Link href={`/admin/orders/${o.order_number}/pick`} className="p-link text-xs">Pick list</Link></p>
                        <form action={markShippedAction} style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" }}>
                          <input type="hidden" name="orderId" value={o.id} />
                          <select name="carrier" aria-label="Carrier" defaultValue="usps" style={{ border: "1px solid var(--ink)", background: "var(--paper)", padding: "8px", font: "13px Georgia,serif" }}>
                            {CARRIERS.map((c) => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                          </select>
                          <input name="tracking" required placeholder="Tracking number" aria-label="Tracking number" style={{ width: 170, border: "1px solid var(--ink)", background: "var(--paper)", padding: "8px 10px", font: "13px Georgia,serif" }} />
                          <button type="submit" className="p-btn-primary" style={{ padding: "8px 14px", font: "12px Georgia,serif", letterSpacing: ".06em", textTransform: "uppercase", border: 0, whiteSpace: "nowrap" }}>Mark shipped</button>
                        </form>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
        <p className="text-[12.5px] text-[color:var(--ink-soft)] mt-4">Refunds are made in the Stripe dashboard; a full refund updates the order here automatically. Chargebacks and early fraud warnings are handled in <Link href="/admin/disputes" className="p-link">Disputes</Link>. Orders paid only in store credit are refunded from their details here.</p>
      </div>
    </div>
  );
}
