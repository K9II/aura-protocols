import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwner } from "@/lib/dal";
import { getOrderDetail } from "@/lib/orders/detail";
import { moneyLines } from "@/lib/orders/money";
import { orderMarkers } from "@/lib/orders/tabs";
import { lotsMatch, type LotQty } from "@/lib/catalog-ops/rules";
import { dateTime } from "@/lib/discounts/time";
import { usd } from "@/lib/html";
import { refundCreditOrderAction } from "@/app/admin/orders/actions";
import { Crumbs, Icon } from "@/components/admin/ui";
import ShipDialog from "@/components/admin/orders/ShipDialog";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { Markers, OrderStatusChip } from "@/components/admin/orders/bits";

export const metadata: Metadata = { title: "Order", robots: { index: false, follow: false } };

const signed = (cents: number) => (cents < 0 ? `−${usd(-cents)}` : usd(cents));
const codeText = (c: { kind: string; value: number; stack_on_top: boolean; free_shipping: boolean }) => {
  const what = c.kind === "order_pct" ? `${c.value}% order` : c.kind === "item_pct" ? `${c.value}% items` : c.kind === "order_amount" ? `${usd(c.value)} off` : "free shipping";
  return `${what}${c.stack_on_top ? ", on top" : ""}${c.free_shipping ? " + free shipping" : ""}`;
};
function Lots({ allocated, shipped }: { allocated: LotQty[]; shipped: LotQty[] }) {
  if (!allocated.length && !shipped.length) return null;
  return (
    <div className="lots">
      {allocated.length > 0 && <>{shipped.length ? "Held" : "Pick"} {allocated.map((l) => <span key={`a${l.lotNumber}`} className="a-lotpill">{l.qty} × {l.lotNumber}</span>)}</>}
      {shipped.length > 0 && <>Shipped {shipped.map((l) => <span key={`s${l.lotNumber}`} className="a-lotpill">{l.qty} × {l.lotNumber}</span>)}
        {lotsMatch(allocated, shipped) ? <span className="a-chip ver sm">Matches</span> : <span className="a-chip amber sm">Shipped a different lot</span>}</>}
    </div>
  );
}

export default async function OrderPage({ params }: { params: Promise<{ number: string }> }) {
  await requireOwner();
  const { number } = await params;
  if (!/^AP-\d{1,10}$/.test(number)) notFound();
  const d = await getOrderDetail(number);
  if (!d) notFound();
  const { order: o, customer: c } = d;
  const items = o.order_items ?? [];
  const vials = items.reduce((s, i) => s + i.pack_qty * i.quantity, 0);
  const live = (process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_live");
  const stripeUrl = o.stripe_payment_intent ? `https://dashboard.stripe.com/${live ? "" : "test/"}payments/${o.stripe_payment_intent}` : null;
  const creditOnly = !o.stripe_session_id && o.store_credit_cents === o.total_cents && (o.status === "paid" || o.status === "shipped");
  const lines = moneyLines(o, { code: d.code?.code ?? null, partnerCode: d.partner?.code ?? null });
  const charged = o.total_cents - o.store_credit_cents;
  const summary = `${o.ship_name} · ${o.ship_city}, ${o.ship_state} · ${vials} vial${vials === 1 ? "" : "s"}`;

  return (
    <div className="a-page">
      <Crumbs items={[{ label: "Orders", href: "/admin/orders" }, { label: o.order_number }]} />
      <div className="a-dh">
        <h1 className="bigcode">{o.order_number}</h1>
        <OrderStatusChip status={o.status} /><Markers list={orderMarkers(o, d.flags)} />
        <div className="actions">
          {o.status === "paid" && <><Link className="a-btn" href={`/admin/orders/${o.order_number}/pick`}>Pick list</Link><ShipDialog orderId={o.id} orderNumber={o.order_number} summary={summary} /></>}
          {creditOnly && <ConfirmDialog label="Refund to store credit" title={`Refund ${o.order_number} to store credit?`} confirmLabel={`Refund ${usd(o.store_credit_cents)}`} tone="danger" action={refundCreditOrderAction} fields={{ orderId: o.id }}>
            {usd(o.store_credit_cents)} goes back to {c.fullName}&apos;s store credit. Any partner commission is reversed and the tax is undone. This order never went through Stripe, so it can only be refunded here.
          </ConfirmDialog>}
          {stripeUrl && <a className="a-btn" href={stripeUrl} target="_blank" rel="noopener noreferrer"><Icon name="ext" />Open in Stripe</a>}
        </div>
      </div>
      <div className="a-dsub">Placed {dateTime(o.created_at)}<span className="dot" />{c.fullName}<span className="dot" />{usd(charged)} charged</div>

      <div className="a-og">
        <div>
          <div className="a-card">
            <div className="a-card-h"><h3>Items</h3><span className="sub">{items.length} line{items.length === 1 ? "" : "s"} · {vials} vial{vials === 1 ? "" : "s"}</span></div>
            <table className="a-it">
              <thead><tr><th>Item</th><th className="num a-only-desk">Unit</th><th className="num a-only-desk">Qty</th><th className="num">Line</th></tr></thead>
              <tbody>{items.map((i) => {
                const l = d.lots.get(i.id);
                return (
                  <tr key={i.id}>
                    <td><b>{i.compound_name} · {i.strength}</b> <span className="muted">· {i.pack_qty === 1 ? "single vial" : `pack of ${i.pack_qty}`}</span>
                      <Lots allocated={l?.allocated ?? []} shipped={l?.shipped ?? []} />
                      {!l?.allocated.length && !l?.shipped.length && <div className="lots">Lot <span className="a-lotpill">{i.lot_number}</span></div>}</td>
                    <td className="num a-only-desk">{usd(i.unit_price_cents)}</td>
                    <td className="num a-only-desk">{i.quantity}</td>
                    <td className="num">{usd(i.line_total_cents)}</td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>

          <div className="a-card">
            <div className="a-card-h"><h3>Money</h3></div>
            <div className="a-money">{lines.map((l) => (
              <div key={l.label} className={`ml ${l.kind}`}><span>{l.label}{l.note && <small>{l.note}</small>}</span><span>{signed(l.cents)}</span></div>
            ))}</div>
          </div>

          <div className="a-card">
            <div className="a-card-h"><h3>Timeline</h3><span className="sub">newest first · shop time</span></div>
            <ul className="a-tl">{d.timeline.map((e) => (
              <li key={e.key} className={e.tone === "plain" ? undefined : e.tone}>
                <div><b>{e.title}</b>
                  {(e.detail || e.who || e.href) && <span className="s2">
                    {e.who && <>by {e.who}</>}{e.who && (e.detail || e.href) && " · "}
                    {e.detail}{e.detail && e.href && " · "}
                    {e.href && (e.href.startsWith("/") ? <Link className="a-ulink" href={e.href}>{e.hrefLabel ?? "Open"}</Link> : <a className="a-ulink" href={e.href} target="_blank" rel="noopener noreferrer">Track</a>)}
                  </span>}</div>
                <div className="when">{dateTime(e.at)}</div>
              </li>
            ))}</ul>
          </div>
        </div>

        <div>
          <div className="a-card">
            <div className="a-card-h"><h3>Customer</h3><div className="r"><Link href={`/admin/customers/${c.id}`}>Open <Icon name="arrow" /></Link></div></div>
            <div className="a-card-b">
              <b><Link href={`/admin/customers/${c.id}`} className="a-nolink">{c.fullName}</Link></b>
              <div className="muted" style={{ fontSize: 12.5 }}>{c.email}</div>
              <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center", fontSize: 12.5 }}>
                <span>{c.paidOrders} order{c.paidOrders === 1 ? "" : "s"} · {usd(c.spentCents)}</span>
                <span className="a-chips" style={{ marginLeft: "auto" }}>{c.blocked ? <span className="a-chip blocked">Blocked</span> : c.verified ? <span className="a-chip ver">Verified</span> : <span className="a-chip unver">Unverified</span>}{d.flags.dispute && <span className="a-chip cb">Chargeback</span>}</span>
              </div>
            </div>
          </div>
          <div className="a-card">
            <div className="a-card-h"><h3>Ship to</h3></div>
            <div className="a-card-b" style={{ fontSize: 12.5, lineHeight: 1.55 }}>
              {o.ship_name}<br />{o.ship_line1}{o.ship_line2 ? `, ${o.ship_line2}` : ""}<br />{o.ship_city}, {o.ship_state} {o.ship_zip}
              {o.tracking_number && <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--line)" }}>{(o.carrier ?? "").toUpperCase()} · <span className="a-mono">{o.tracking_number}</span></div>}
            </div>
          </div>
          {(d.code || d.partner || o.new_account_discount) && (
            <div className="a-card">
              <div className="a-card-h"><h3>Attribution</h3></div>
              <div className="a-card-b"><dl className="a-kv">
                {d.code && <><dt>Code</dt><dd><Link className="a-ord" href={`/admin/discounts/${d.code.id}`}>{d.code.code}</Link> · {codeText(d.code)}</dd></>}
                {d.partner && <><dt>Partner</dt><dd><Link className="a-ord" href={`/admin/partners/${d.partner.id}`}>{d.partner.code}</Link> · by {o.attributed_by ?? "code"}</dd></>}
                <dt>New account</dt><dd className={o.new_account_discount ? undefined : "muted"}>{o.new_account_discount ? "Offer applied" : "No"}</dd>
              </dl></div>
            </div>
          )}
          <div className="a-card"><div className="a-card-b muted" style={{ fontSize: 12.5, display: "flex", gap: 8 }}><Icon name="check" />Research use confirmed {dateTime(o.ruo_confirmed_at)}</div></div>
        </div>
      </div>
    </div>
  );
}
