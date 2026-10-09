import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/dal";
import { can } from "@/lib/staff/roles";
import { getOrderDetail } from "@/lib/orders/detail";
import { codeText, moneyLines, refundParts } from "@/lib/orders/money";
import { orderMarkers } from "@/lib/orders/tabs";
import { customersWithDisputes } from "@/lib/disputes/data";
import { lotsMatch, type LotQty } from "@/lib/catalog-ops/rules";
import { dateTime } from "@/lib/discounts/time";
import { usd } from "@/lib/html";
import { cancelNoChargeOrderAction } from "@/app/admin/orders/actions";
import { REASON_LABEL } from "@/lib/no-charge/rules";
import { refundOffer, REFUND_REASON_LABEL, splitRefund, type RefundReason, cardPayments } from "@/lib/refunds/rules";
import { paymentLabel } from "@/lib/refunds/stripe";
import { stripePaymentUrl } from "@/lib/stripe-dashboard";
import { Crumbs, Icon } from "@/components/admin/ui";
import ShipDialog from "@/components/admin/orders/ShipDialog";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { Markers, OrderStatusChip } from "@/components/admin/orders/bits";
import RefundDialog from "@/components/admin/orders/RefundDialog";
import OrderMore, { type MoreItem } from "@/components/admin/orders/OrderMore";

export const metadata: Metadata = { title: "Order", robots: { index: false, follow: false } };

const signed = (cents: number) => (cents < 0 ? `−${usd(-cents)}` : usd(cents));
const shortId = (id: string) => (id.length > 14 ? `${id.slice(0, 7)}…${id.slice(-3)}` : id);
function Lots({ allocated, shipped, returned }: { allocated: LotQty[]; shipped: LotQty[]; returned: LotQty[] }) {
  if (!allocated.length && !shipped.length && !returned.length) return null;
  return (
    <div className="lots">
      {returned.length > 0 && !allocated.length && !shipped.length && <>Returned {returned.map((l) => <span key={`r${l.lotNumber}`} className="a-lotpill">{l.qty} × {l.lotNumber}</span>)}</>}
      {allocated.length > 0 && <>{shipped.length ? "Held" : "Pick"} {allocated.map((l) => <span key={`a${l.lotNumber}`} className="a-lotpill">{l.qty} × {l.lotNumber}</span>)}</>}
      {shipped.length > 0 && <>Shipped {shipped.map((l) => <span key={`s${l.lotNumber}`} className="a-lotpill">{l.qty} × {l.lotNumber}</span>)}
        {lotsMatch(allocated, shipped) ? <span className="a-chip ver sm">Matches</span> : <span className="a-chip amber sm">Shipped a different lot</span>}</>}
    </div>
  );
}

export default async function OrderPage({ params }: { params: Promise<{ number: string }> }) {
  const staff = await requirePermission("orders.view");
  const { number } = await params;
  if (!/^AP-\d{1,10}$/.test(number)) notFound();
  const d = await getOrderDetail(number);
  if (!d) notFound();
  const { order: o, customer: c } = d;
  const items = o.order_items ?? [];
  const vials = items.reduce((s, i) => s + i.pack_qty * i.quantity, 0);
  const stripeUrl = o.stripe_payment_intent ? stripePaymentUrl(o.stripe_payment_intent) : null;
  const nc = o.kind === "no_charge" ? d.noCharge : null;
  const charged = o.total_cents - o.store_credit_cents;
  const summary = `${o.ship_name} · ${o.ship_city}, ${o.ship_state} · ${vials} vial${vials === 1 ? "" : "s"}`;
  // Refunds (mock 2026-10-07-admin-refunds r1–r3, r5): owner only; orders
  // with an open chargeback or fraud warning are refunded from Disputes; a lost
  // chargeback is never refunded.
  const canRefund = can(staff, "orders.refund");
  const offer = nc ? { mode: null } : refundOffer(o, d.flags);
  const refundMode = canRefund ? offer.mode : null;
  // The card label for the dialog is read from Stripe only when a refund is
  // offered; a refund made here saved its label (r4), so no read after.
  const [disputedCustomers, dialogLabel] = await Promise.all([
    customersWithDisputes([c.id]),
    refundMode && cardPayments(o).length ? paymentLabel(cardPayments(o)[cardPayments(o).length - 1].pi) : Promise.resolve(null),
  ]);
  const label = o.status === "refunded" ? o.refund_payment_label : dialogLabel;
  const lines = moneyLines(o, { code: d.code, partnerCode: d.partner?.code ?? null, paymentLabel: label });
  const parts = o.status === "refunded" ? refundParts(o, label) : null;
  const refundUrl = o.stripe_refund_id ? stripeUrl : null;
  const backInStock = o.status === "refunded" && !o.shipped_at;
  const firstName = c.fullName.trim().split(/\s+/)[0] || c.fullName;
  const replaceHref = `/admin/orders/new?customer=${c.id}&reason=replacement&replaces=${o.order_number}`;
  const refundDialogId = `refund-${o.id}`;
  const commissionFact = d.commission && d.commission.state !== "void" && d.partner
    ? `The ${d.partner.code} commission (${usd(d.commission.amount_cents)}) is reversed.`
    : d.partner ? "No commission to reverse." : "No partner on this order.";
  const more: MoreItem[] = [];
  if (refundMode === "cancel") more.push({ kind: "dialog", label: "Cancel and refund", sub: "Before shipping · full refund", dialogId: refundDialogId, danger: true, phoneOnly: true });
  if (!nc && o.status === "shipped" && can(staff, "orders.no_charge")) more.push({ kind: "link", label: "Send a replacement", sub: `New no-charge order · Replacement for ${o.order_number}`, href: replaceHref });
  if (refundMode === "exception") more.push({ kind: "dialog", label: "Refund…", sub: "An exception to the refund policy", dialogId: refundDialogId, danger: true });
  if (stripeUrl) more.push({ kind: "link", label: "Open in Stripe", sub: "The payment in the Stripe dashboard", href: stripeUrl, external: true, phoneOnly: true });

  return (
    <div className="a-page">
      <Crumbs items={[{ label: "Orders", href: "/admin/orders" }, { label: o.order_number }]} />
      <div className="a-dh">
        <h1 className="bigcode">{o.order_number}</h1>
        <OrderStatusChip status={o.status} kind={o.kind} /><Markers list={orderMarkers(o, d.flags)} />
        <div className="actions">
          {nc && o.status === "paid" && can(staff, "orders.no_charge") && <ConfirmDialog label="Cancel order" title={`Cancel ${o.order_number}?`} confirmLabel="Cancel order" tone="danger" action={cancelNoChargeOrderAction} fields={{ orderId: o.id }}>
            The {vials} vial{vials === 1 ? "" : "s"} go{vials === 1 ? "es" : ""} back to stock. Nothing is emailed.
          </ConfirmDialog>}
          {refundMode && <RefundDialog dialogId={refundDialogId} orderId={o.id} orderNumber={o.order_number} mode={refundMode} firstName={firstName} vials={vials}
            commission={commissionFact} paymentLabel={label} replaceHref={replaceHref} button={refundMode === "cancel"}
            splits={{ card: splitRefund(o, "card"), store_credit: splitRefund(o, "store_credit") }} />}
          {o.status === "paid" && <><Link className="a-btn" href={`/admin/orders/${o.order_number}/pick`}>Pick list</Link>{can(staff, "orders.ship") && <ShipDialog orderId={o.id} orderNumber={o.order_number} summary={summary} />}</>}
          {stripeUrl && <a className="a-btn a-hide-640" href={stripeUrl} target="_blank" rel="noopener noreferrer"><Icon name="ext" />Open in Stripe</a>}
          <OrderMore items={more} orderNumber={o.order_number} />
        </div>
      </div>
      {nc
        ? <div className="a-dsub">Created {dateTime(o.created_at)}{nc.createdBy && <> by {nc.createdBy}</>}<span className="dot" />{c.fullName}<span className="dot" />
          {nc.replaces ? <span>Replacement for <Link className="a-ulink" href={`/admin/orders/${nc.replaces}`}>{nc.replaces}</Link></span> : REASON_LABEL[nc.reason]}</div>
        : <div className="a-dsub">Placed {dateTime(o.created_at)}<span className="dot" />{c.fullName}<span className="dot" />{usd(charged)} charged</div>}
      {canRefund && offer.blockedBy === "warning" && (
        <div className="a-callout warn a-refund-note"><Icon name="warn" /><div>Stripe flagged this card as possibly stolen. To cancel and refund, use <Link className="a-ulink" href="/admin/disputes">Disputes → warning on {o.order_number}</Link> — it refunds as fraud so Radar blocks the card.</div></div>
      )}
      {canRefund && offer.blockedBy === "dispute" && (
        <div className="a-callout info a-refund-note"><Icon name="info" /><div>A chargeback is open on this order — the bank already holds the money. Respond in <Link className="a-ulink" href={d.openDisputeId ? `/admin/disputes/${d.openDisputeId}` : "/admin/disputes"}>Disputes</Link>; a refund isn&apos;t possible while it&apos;s open.</div></div>
      )}
      {canRefund && offer.blockedBy === "dispute_lost" && (
        <div className="a-callout info a-refund-note"><Icon name="info" /><div>A chargeback on this order was lost — the bank already returned the money. No refund.</div></div>
      )}

      <div className="a-og">
        <div>
          <div className="a-card">
            <div className="a-card-h"><h3>Items</h3><span className="sub">{items.length} line{items.length === 1 ? "" : "s"} · {vials} vial{vials === 1 ? "" : "s"}{backInStock && " · back in stock"}</span></div>
            <table className="a-it">
              <thead><tr><th>Item</th><th className="num a-only-desk">{nc ? "Retail" : "Unit"}</th><th className="num a-only-desk">Qty</th><th className="num">{nc ? "Charged" : "Line"}</th></tr></thead>
              <tbody>{items.map((i) => {
                const l = d.lots.get(i.id);
                return (
                  <tr key={i.id}>
                    <td><b>{i.compound_name} · {i.strength}</b> <span className="muted">· {i.pack_qty === 1 ? "single vial" : `pack of ${i.pack_qty}`}</span>
                      <Lots allocated={l?.allocated ?? []} shipped={l?.shipped ?? []} returned={l?.returned ?? []} />
                      {!l?.allocated.length && !l?.shipped.length && !l?.returned?.length && <div className="lots">Lot <span className="a-lotpill">{i.lot_number}</span></div>}</td>
                    <td className="num a-only-desk">{usd(nc ? i.retail_unit_cents ?? 0 : i.unit_price_cents)}</td>
                    <td className="num a-only-desk">{i.quantity}</td>
                    <td className="num">{usd(i.line_total_cents)}</td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>

          <div className="a-card">
            <div className="a-card-h"><h3>Money</h3></div>
            {nc ? (
              <div className="a-money">
                <div className="ml"><span>Retail value<small>not a sale · kept for the record</small></span><span>{usd(o.retail_value_cents ?? 0)}</span></div>
                <div className="ml"><span>Shipping</span><span>{usd(o.shipping_cents)}</span></div>
                <div className="ml"><span>Tax</span><span>{usd(o.tax_cents)}</span></div>
                <div className="ml charged"><span>Charged</span><span>{usd(o.total_cents)}</span></div>
              </div>
            ) : (
              <div className="a-money">{lines.map((l) => (
                <div key={l.label} className={`ml ${l.kind}`}><span>{l.label}{l.note && <small>{l.note}</small>}</span><span>{signed(l.cents)}</span></div>
              ))}</div>
            )}
          </div>

          <div className="a-card">
            <div className="a-card-h"><h3>Timeline</h3><span className="sub">newest first · shop time</span></div>
            <ul className="a-tl">{d.timeline.map((e) => (
              <li key={e.key} className={e.tone === "plain" ? undefined : e.tone}>
                <div><b>{e.title}</b>{e.sub && <> · {e.sub}</>}
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
            <div className="a-card-h"><h3>Customer</h3><div className="r"><Link className="a-openlink" href={`/admin/customers/${c.id}`}>Open <Icon name="arrow" /></Link></div></div>
            <div className="a-card-b">
              <b><Link href={`/admin/customers/${c.id}`} className="a-plain">{c.fullName}</Link></b>
              <div className="muted" style={{ fontSize: 12.5 }}>{c.email}</div>
              <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center", fontSize: 12.5 }}>
                <span>{c.paidOrders} order{c.paidOrders === 1 ? "" : "s"} · {usd(c.spentCents)}{c.refundedOrders > 0 && ` · ${c.refundedOrders} refunded`}{c.noChargeOrders > 0 && ` · ${c.noChargeOrders} no-charge`}</span>
                <span className="a-chips" style={{ marginLeft: "auto" }}>{c.blocked ? <span className="a-chip blocked">Blocked</span> : c.verified ? <span className="a-chip ver">Verified</span> : <span className="a-chip unver">Unverified</span>}{disputedCustomers.has(c.id) && <span className="a-chip cb">Chargeback</span>}</span>
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
          {parts && o.refund_reason && (
            <div className="a-card">
              <div className="a-card-h"><h3>Refund</h3></div>
              <div className="a-card-b"><dl className="a-kv">
                <dt>Amount</dt><dd>{usd(o.total_cents)}</dd>
                <dt>To</dt><dd>{parts.map((p) => `${p.where} ${usd(p.cents)}`).join(" · ")}</dd>
                <dt>Reason</dt><dd>{REFUND_REASON_LABEL[o.refund_reason as RefundReason] ?? o.refund_reason}</dd>
                <dt>By</dt><dd>{d.refundedBy ?? "—"}{o.refunded_at && <> · {dateTime(o.refunded_at)}</>}</dd>
                {refundUrl && <><dt>Stripe</dt><dd><a className="a-ulink a-mono" href={refundUrl} target="_blank" rel="noopener noreferrer">{shortId(o.stripe_refund_id!)}</a></dd></>}
              </dl></div>
            </div>
          )}
          {nc && (
            <div className="a-card">
              <div className="a-card-h"><h3>No charge</h3></div>
              <div className="a-card-b"><dl className="a-kv">
                <dt>Reason</dt><dd>{REASON_LABEL[nc.reason]}</dd>
                {nc.replaces && <><dt>Original</dt><dd><Link className="a-ord" href={`/admin/orders/${nc.replaces}`}>{nc.replaces}</Link></dd></>}
                <dt>Created by</dt><dd>{nc.createdBy ?? "—"}</dd>
                <dt>Counts as</dt><dd className="muted">Not a sale · no commission · first-order offer untouched</dd>
              </dl></div>
            </div>
          )}
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
