import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/dal";
import { can } from "@/lib/staff/roles";
import { countOrderTabs, searchOrdersForOwner, type OrderRow } from "@/lib/orders";
import { ORDER_PAGE_SIZE, ORDER_TABS, ORDER_TAB_LABEL, cleanOrderSearch, itemsSummary, orderMarkers, parseOrderTab, type OrderTab } from "@/lib/orders/tabs";
import { orderFlags } from "@/lib/disputes/data";
import { businessDaysSince, paidText, shipAge } from "@/lib/today/time";
import { shortDate } from "@/lib/discounts/time";
import { currentMs } from "@/lib/clock";
import { usd } from "@/lib/html";
import { Crumbs, Icon, Tabs } from "@/components/admin/ui";
import ShipDialog from "@/components/admin/orders/ShipDialog";
import { Markers, OrderStatusChip } from "@/components/admin/orders/bits";

export const metadata: Metadata = { title: "Orders", robots: { index: false, follow: false } };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const vials = (o: OrderRow) => (o.order_items ?? []).reduce((s, i) => s + i.pack_qty * i.quantity, 0);
const EMPTY: Record<OrderTab, string> = { to_ship: "Nothing to ship.", processing: "No payments clearing.", shipped: "Nothing shipped yet.", closed: "No refunded or cancelled orders.", all: "No orders yet." };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ tab?: string | string[]; status?: string | string[]; q?: string | string[]; page?: string | string[] }> }) {
  const staff = await requirePermission("orders.view");
  const sp = await searchParams;
  const tab = parseOrderTab(first(sp.tab), first(sp.status));
  const qRaw = first(sp.q) ?? "";
  const q = cleanOrderSearch(qRaw);
  const pageRaw = Number(first(sp.page));
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.trunc(pageRaw) : 1;
  const [{ rows, total }, counts] = await Promise.all([searchOrdersForOwner({ tab, q, page }), countOrderTabs()]);
  const flags = await orderFlags(rows.map((r) => r.id));
  const now = currentMs();
  const shipping = tab === "to_ship" && !q;
  const href = (o: { tab?: OrderTab; page?: number; q?: string }) => {
    const p = new URLSearchParams();
    const t = o.tab ?? tab;
    if (t !== "to_ship") p.set("tab", t);
    const qq = o.q ?? q;
    if (qq) p.set("q", qq);
    if (o.page && o.page > 1) p.set("page", String(o.page));
    const s = p.toString();
    return `/admin/orders${s ? `?${s}` : ""}`;
  };
  const lastPage = Math.max(1, Math.ceil(total / ORDER_PAGE_SIZE));
  const marks = (o: OrderRow) => orderMarkers(o, { dispute: flags.disputes.has(o.id), warning: flags.warnings.has(o.id) });
  const summary = (o: OrderRow) => `${o.ship_name} · ${o.ship_city}, ${o.ship_state} · ${vials(o)} vial${vials(o) === 1 ? "" : "s"}`;
  const oldestAge = shipping && rows[0]?.paid_at ? businessDaysSince(rows[0].paid_at, now) : null;

  return (
    <div className="a-page">
      <Crumbs items={[{ label: "Orders" }]} />
      <div className="a-ph"><div><h1>Orders</h1><p>Every paid order. Ship from here or from the order&apos;s page — the customer gets the tracking email automatically.</p></div>
        {can(staff, "orders.no_charge") && <div className="actions"><Link className="a-btn" href="/admin/orders/new"><Icon name="plus" />New no-charge order</Link></div>}</div>

      <div className="a-toolbar a-ord-bar">
        <Tabs items={ORDER_TABS.map((t) => ({ href: href({ tab: t, page: 1, q: "" }), label: ORDER_TAB_LABEL[t], n: counts[t], on: t === tab && !q }))} />
        <form className="a-search" action="/admin/orders" role="search" style={{ width: 280 }}>
          {tab !== "to_ship" && <input type="hidden" name="tab" value={tab} />}
          <Icon name="search" /><input name="q" defaultValue={qRaw} placeholder="Order, email, name, tracking…" aria-label="Search orders" />
        </form>
      </div>
      {q && <div className="a-searchnote">{total} result{total === 1 ? "" : "s"} for <b>&ldquo;{q}&rdquo;</b> across all orders<Link className="a-ulink" href={href({ q: "", page: 1 })}>Clear</Link></div>}

      {rows.length === 0 ? (
        <div className="a-empty">{total > 0
          ? <>No rows on this page. <Link className="a-ulink" href={href({ page: 1 })}>Back to page 1</Link></>
          : q ? "Nothing matches." : EMPTY[tab]}</div>
      ) : (
        <>
          <table className="a-t a-only-desk">
            <thead><tr><th>Order</th><th>{shipping ? "Waiting" : "Placed"}</th><th>Customer</th><th>Ship to</th><th>Items</th><th className="num">Total</th><th>Status</th><th /></tr></thead>
            <tbody>{rows.map((o) => {
              const age = o.paid_at ? shipAge(o.paid_at, now) : null;
              return (
                <tr key={o.id}>
                  <td className="a-nw"><Link className="a-ord" href={`/admin/orders/${o.order_number}`}>{o.order_number}</Link><Markers list={marks(o)} /></td>
                  <td>{shipping && age && o.paid_at
                    ? <span className={`a-wait${age.late ? " red" : ""}`}>{age.text}<small>{paidText(o.paid_at, now)}</small></span>
                    : shortDate(o.created_at)}</td>
                  <td>{o.ship_name}<span className="sub">{o.email}</span></td>
                  <td>{o.ship_city}, {o.ship_state}</td>
                  <td>{itemsSummary(o.order_items ?? [])}</td>
                  <td className="num">{usd(o.total_cents)}</td>
                  <td><OrderStatusChip status={o.status} kind={o.kind} /></td>
                  <td>{o.status === "paid" && <div className="a-acts">
                    <Link className="a-ulink" href={`/admin/orders/${o.order_number}/pick`}>Pick list</Link>
                    {can(staff, "orders.ship") && <ShipDialog orderId={o.id} orderNumber={o.order_number} summary={summary(o)} small />}
                  </div>}</td>
                </tr>
              );
            })}</tbody>
          </table>
          <div className="a-plist a-only-phone">{rows.map((o) => {
            const age = o.paid_at ? shipAge(o.paid_at, now) : null;
            return (
              <div key={o.id} className="a-pord">
                <span><Link className="a-ord" href={`/admin/orders/${o.order_number}`}>{o.order_number}</Link><Markers list={marks(o)} /></span>
                <span className="tot">{usd(o.total_cents)}</span>
                <span className="nm">{o.ship_name} · {o.ship_city}, {o.ship_state}</span>
                <div className="row2">
                  {shipping && age ? <span className={`a-wait${age.late ? " red" : ""}`}>{age.text}</span> : <OrderStatusChip status={o.status} kind={o.kind} />}
                  <span>{vials(o)} vial{vials(o) === 1 ? "" : "s"}</span>
                  {o.status === "paid" && can(staff, "orders.ship") && <ShipDialog orderId={o.id} orderNumber={o.order_number} summary={summary(o)} small />}
                </div>
              </div>
            );
          })}</div>
          <div className="a-tfoot a-ord-foot">
            {shipping
              ? <>{total} to ship{oldestAge !== null && ` · oldest waiting ${oldestAge} business day${oldestAge === 1 ? "" : "s"}`}</>
              : <>{`${(page - 1) * ORDER_PAGE_SIZE + 1}–${Math.min(page * ORDER_PAGE_SIZE, total)} of ${total.toLocaleString("en-US")}`} · newest first · Refunds are made in Stripe and update here automatically · chargebacks are in <Link className="a-ulink" href="/admin/disputes">Disputes</Link></>}
            <div className="r">
              {shipping && <span className="muted">Refunds are made in Stripe and update here automatically · chargebacks are in <Link className="a-ulink" href="/admin/disputes">Disputes</Link></span>}
              {page > 1 && <Link className="a-btn sm" href={href({ page: page - 1 })}>Previous</Link>}
              {page < lastPage && <Link className="a-btn sm" href={href({ page: page + 1 })}>Next</Link>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
