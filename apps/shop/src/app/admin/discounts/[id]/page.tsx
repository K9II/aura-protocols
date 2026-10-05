import type { Metadata } from "next";
import { Fragment } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { requireOwner } from "@/lib/dal";
import { codeStatsById, discountDashboard, getCodeById, getDiscountCap, listEvents, listRedemptions, orderNumbersForRedemptions, REDEMPTIONS_LIMIT, type CodeEvent, type Redemption } from "@/lib/discounts/data";
import { codeStatus, describeRule, termsFromRow, type DiscountCodeRow, type StoredStatus } from "@/lib/discounts/rules";
import { dateTime, mountainDaysUntil, shortDate } from "@/lib/discounts/time";
import { usd } from "@/lib/html";
import { catalogContent } from "@/data/catalog";
import { setCodeStateAction, resetUseAction } from "@/app/admin/discounts/actions";
import ConfirmSubmit from "@/components/admin/ConfirmSubmit";
import CopyAll from "@/components/admin/discounts/CopyAll";
import { Chip, Crumbs, Icon, Kpis, StatusChip, money } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Discount code", robots: { index: false, follow: false } };

const EVENT_TEXT: Record<string, string> = { created: "Created", edited: "Rule edited", paused: "Paused", resumed: "Resumed", ended: "Ended", use_reset: "Use reset" };

// A reset event's detail is the redemption id; show the order it belonged to.
function eventText(e: CodeEvent, orderOf: Map<string, string>): string {
  if (e.kind === "use_reset") { const o = e.detail ? orderOf.get(e.detail) : undefined; return o ? `Use reset on ${o}` : "Use reset"; }
  const label = EVENT_TEXT[e.kind] ?? e.kind;
  return e.detail && e.detail !== label ? `${label} — ${e.detail}` : label;
}
const KIND_TEXT: Record<DiscountCodeRow["kind"], string> = { item_pct: "Item %", order_pct: "Order %", order_amount: "Order $", ship_only: "Free shipping" };
const TABS = ["all", "used", "held", "released"] as const;

function stateChip(r: Redemption) {
  if (r.state === "held") return <Chip tone="held">Held · checkout open</Chip>;
  if (r.state === "released") return <Chip tone="released">Released · checkout closed</Chip>;
  if (r.state === "reset") return <Chip tone="released">Use reset</Chip>;
  if (r.orders?.status === "refunded") return <Chip tone="refund">Refunded · use kept</Chip>;
  return <Chip tone="active">Used</Chip>;
}

// The reset action only accepts a used code on a refunded order — offer it for exactly that.
const canReset = (r: Redemption) => r.state === "used" && r.orders?.status === "refunded";
function ResetUse({ id, style }: { id: string; style?: React.CSSProperties }) {
  return (
    <form action={resetUseAction} style={style}>
      <input type="hidden" name="redemptionId" value={id} />
      <button className="a-btn sm" type="submit"><Icon name="reset" />Reset use</button>
    </form>
  );
}

function ruleFacts(c: DiscountCodeRow): Array<[string, string]> {
  const t = termsFromRow(c);
  const nameOf = (slug: string) => catalogContent.find((p) => p.slug === slug)?.name ?? slug;
  const only = [...c.include_classes, ...c.include_slugs.map(nameOf)];
  const except = [...c.exclude_classes, ...c.exclude_slugs.map(nameOf)];
  const scope = only.length ? `Only ${only.join(", ")}` : except.length ? `All except ${except.join(", ")}` : "All products";
  return [
    ["Kind", KIND_TEXT[c.kind] + (t.stackOnTop ? " · on top of item discounts" : "")],
    ["Value", describeRule(t)],
    ["Minimum", c.min_order_cents ? `${usd(c.min_order_cents)} goods` : "None"],
    ["Applies to", scope],
    ["Limits", `${c.max_uses == null ? "No total limit" : `${c.max_uses} total`}${c.once_per_customer ? " · once per customer" : ""}`],
    ["Who", c.locked_email ? `Only ${c.locked_email}` : "Confirmed accounts"],
  ];
}

// Pause / Resume / End — only the moves the action allows from the stored status.
function Move({ id, from, to }: { id: string; from: StoredStatus; to: StoredStatus }) {
  const hidden = <><input type="hidden" name="codeId" value={id} /><input type="hidden" name="from" value={from} /><input type="hidden" name="to" value={to} /></>;
  if (to === "ended") {
    return <form action={setCodeStateAction}>{hidden}<ConfirmSubmit className="a-btn danger" message="End this code now? This can't be undone."><Icon name="stop" />End now</ConfirmSubmit></form>;
  }
  return <form action={setCodeStateAction}>{hidden}<button className="a-btn" type="submit"><Icon name={to === "paused" ? "pause" : "play"} />{to === "paused" ? "Pause" : "Resume"}</button></form>;
}

export default async function CodePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  await requireOwner();
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const code = await getCodeById(id);
  if (!code) notFound();
  if (code.batch_id) redirect(`/admin/discounts/batch/${code.batch_id}`);
  const [stats, redemptions, events, dash, capPct] = await Promise.all([codeStatsById(), listRedemptions([id]), listEvents({ codeId: id }), discountDashboard(), getDiscountCap()]);
  const orderOf = await orderNumbersForRedemptions(events.filter((e) => e.kind === "use_reset" && e.detail).map((e) => e.detail!));
  const s = stats.get(id) ?? { uses: 0, held: 0, revenueCents: 0, discountCents: 0, cappedOrders: 0 };
  const status = codeStatus(code, s.uses + s.held);
  const tabRaw = (await searchParams).tab;
  const tab = TABS.find((t) => t === tabRaw) ?? "all";
  const shown = redemptions.filter((r) => tab === "all" || r.state === tab);
  // The list stops at the latest REDEMPTIONS_LIMIT; used/held counts come from the stats view.
  const capped = redemptions.length >= REDEMPTIONS_LIMIT;
  const released = redemptions.filter((r) => r.state === "released").length;
  const counts = { all: capped ? `${REDEMPTIONS_LIMIT}+` : String(redemptions.length), used: String(s.uses), held: String(s.held), released: capped ? `${released}+` : String(released) };
  const daysLeft = code.ends_at ? mountainDaysUntil(code.ends_at) : null;
  const storeAvg = dash.orders_30d ? dash.goods_revenue_30d / dash.orders_30d : 0;
  const stored = code.status;

  return (
    <div className="a-page">
      <Crumbs items={[{ label: "Discounts", href: "/admin/discounts" }, { label: code.code }]} />
      <div className="a-dh">
        <span className="bigcode">{code.code}</span><StatusChip status={status} />
        <div className="actions">
          <CopyAll codes={[code.code]} label="Copy" className="a-btn" />
          <Link className="a-btn" href={`/admin/discounts/${id}/edit`}><Icon name="edit" />Edit</Link>
          {/* Offer only moves that change something the owner can see. */}
          {stored === "active" && (status === "active" || status === "scheduled") && <Move id={id} from={stored} to="paused" />}
          {stored === "paused" && status === "paused" && <Move id={id} from={stored} to="active" />}
          {stored !== "ended" && status !== "ended" && <Move id={id} from={stored} to="ended" />}
        </div>
      </div>
      <div className="a-dsub">
        {describeRule(termsFromRow(code))}
        {code.note && <><span className="dot" />{code.note}</>}
        <span className="dot" />{shortDate(code.starts_at ?? code.created_at)} – {code.ends_at ? shortDate(code.ends_at) : "no end"}{daysLeft != null && status === "active" ? ` · ${daysLeft} days left` : ""}
      </div>

      <Kpis items={[
        { label: "Uses", value: <>{s.uses}{code.max_uses != null && <span className="of"> / {code.max_uses}</span>}</>, sub: code.max_uses != null ? <span className="a-big-meter"><i style={{ width: `${Math.min(100, (s.uses / code.max_uses) * 100)}%` }} /></span> : "no limit" },
        { label: "Revenue", value: money(s.revenueCents), sub: "goods paid, after discounts" },
        { label: "Discount given", value: money(s.discountCents), sub: s.uses ? `code share only · avg ${money(s.discountCents / s.uses)}` : "code share only" },
        { label: "Avg order", value: s.uses ? money(s.revenueCents / s.uses) : "—", sub: storeAvg ? `store avg ${money(storeAvg)}` : undefined },
        { label: `Capped at ${capPct}%`, value: s.cappedOrders, sub: "orders trimmed" },
      ]} />

      <div className="a-grid-d">
        <div>
          <div className="a-toolbar">
            <div className="a-tabs">
              {([["all", "Redemptions", counts.all], ["used", "Used", counts.used], ["held", "Held", counts.held], ["released", "Released", counts.released]] as const).map(([k, l, c]) => (
                <Link key={k} href={`/admin/discounts/${id}${k === "all" ? "" : `?tab=${k}`}`} className={tab === k ? "on" : undefined} aria-current={tab === k ? "page" : undefined}>{l} <span className="n">{c}</span></Link>
              ))}
            </div>
          </div>
          {shown.length === 0 ? <div className="a-empty">No uses yet.</div> : (
            <>
              <table className="a-t a-only-desk">
                <thead><tr><th>Order</th><th>Customer</th><th>When</th><th className="num">Goods</th><th className="num">Code took</th><th>State</th><th /></tr></thead>
                <tbody>{shown.map((r) => (
                  <tr key={r.id}>
                    <td className="a-code">{r.orders?.order_number ?? "—"}</td>
                    <td><span className="a-email" title={r.orders?.email}>{r.orders?.email ?? "—"}</span></td>
                    <td className="muted">{dateTime(r.created_at)}</td>
                    <td className="num">{r.orders ? usd(r.orders.subtotal_cents - r.orders.partner_discount_cents) : "—"}</td>
                    <td className="num">−{usd(r.discount_cents)}{r.capped_cents > 0 && <> <span className="a-chip refund nodot sm">capped</span></>}</td>
                    <td>{stateChip(r)}</td>
                    <td className="num">{canReset(r) && <ResetUse id={r.id} />}</td>
                  </tr>
                ))}</tbody>
              </table>
              {capped && <div className="a-tfoot a-only-desk">Showing the latest {REDEMPTIONS_LIMIT}</div>}
              <div className="a-plist a-only-phone">{shown.map((r) => (
                <div key={r.id} className="a-pitem">
                  <span className="a-code">{r.orders?.order_number ?? "—"}</span>{stateChip(r)}
                  <span className="gives">{r.orders?.email ?? "—"} · −{usd(r.discount_cents)}{r.capped_cents > 0 ? " · capped" : ""}</span>
                  <div className="meta">{dateTime(r.created_at)}{canReset(r) && <ResetUse id={r.id} style={{ marginLeft: "auto" }} />}</div>
                </div>
              ))}</div>
              {capped && <div className="a-tfoot a-only-phone">Showing the latest {REDEMPTIONS_LIMIT}</div>}
            </>
          )}
        </div>
        <aside style={{ display: "grid", gap: 12 }}>
          <div className="a-card">
            <div className="a-card-h"><h3>Rule</h3><span className="r"><Link href={`/admin/discounts/${id}/edit`}>Edit</Link></span></div>
            <div className="a-card-b"><dl className="a-facts flat">{ruleFacts(code).map(([k, v]) => <Fragment key={k}><dt>{k}</dt><dd>{v}</dd></Fragment>)}</dl></div>
          </div>
          <div className="a-card">
            <div className="a-card-h"><h3>Activity</h3></div>
            <div className="a-card-b">
              {events.length === 0 ? <p className="muted">Nothing yet.</p> : (
                <ul className="a-log">{events.map((e) => <li key={e.id}><div>{eventText(e, orderOf)}<small>{dateTime(e.at)}</small></div></li>)}</ul>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
