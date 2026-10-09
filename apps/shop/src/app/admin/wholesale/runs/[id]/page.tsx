import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/dal";
import { can } from "@/lib/staff/roles";
import { currentMs } from "@/lib/clock";
import { dateLabel, localDate } from "@/lib/today/time";
import { usd } from "@/lib/html";
import { catalogContent } from "@/data/catalog";
import { lotById } from "@/lib/catalog-ops/data";
import { getWholesaleSettings } from "@/lib/wholesale/data";
import { estimatedDates } from "@/lib/wholesale/rules";
import {
  kitsByStrength, lineStage, MAX_SUPPLIERS_PER_RUN, runStatus, supplierOptions, RUN_CHIP, RUN_STATUS_LABEL, STAGE_CHIP, strengthKey, strengthText, type RunLine,
} from "@/lib/wholesale/runs";
import { draftLotsFor, getRun, pastSuppliers, runEvents, supplierPricesFor, runLines, runOrders, type RunEvent } from "@/lib/wholesale/runs-data";
import { dateTime } from "@/lib/discounts/time";
import { Crumbs } from "@/components/admin/ui";
import { OrderStatusChip } from "@/components/admin/orders/bits";
import { CancelDepositDialog, LinkLotDialog, PassFailButtons, RecordOrderDialog, ResourceButton, RunNotes } from "@/components/admin/wholesale/RunDialogs";

export const metadata: Metadata = { title: "Wholesale run", robots: { index: false, follow: false } };

const LIVE = new Set(["deposit_paid", "balance_due", "paid", "shipped"]);
const EVENT: Record<RunEvent["kind"], string> = {
  line_ordered: "Recorded order", lot_linked: "Linked lot", line_passed: "Passed", line_failed: "Marked failed", line_resourced: "Re-sourcing",
  balance_due: "Asked for the balance", reminder_sent: "Sent the balance reminder", overdue_alerted: "Balance overdue", forfeited: "Cancelled — balance not paid",
  order_cancelled: "Cancelled", lot_failed_emailed: "Emailed the re-source notice", past_cutoff_alerted: "Alerted: not ordered after the cutoff", note: "Note",
};

// One production run (mock a2/a3): strengths with their supplier order, lot
// and result; the run's orders; notes; activity. Owner-only controls.
export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requirePermission("wholesale.view");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const run = await getRun(id);
  if (!run) notFound();
  const manage = can(staff, "wholesale.manage");
  const today = localDate(currentMs());
  const [s, lines, orders, events] = await Promise.all([getWholesaleSettings(), runLines(run.id), runOrders([run.cutoff_on]), runEvents(run.id)]);
  const live = orders.filter((o) => LIVE.has(o.status));
  const needed = kitsByStrength(live);
  const status = runStatus(run.cutoff_on, today, lines, orders);
  const dates = estimatedDates(run.cutoff_on, s.leadDays);
  const suppliers = [...new Set(lines.map((l) => l.supplier).filter((x): x is string => !!x))];
  const choices = supplierOptions(suppliers, manage ? await pastSuppliers() : []);
  // Box prices for the strengths still to order (owner only; a failed read just
  // leaves the total for the owner to type).
  let prices: Record<string, Record<string, number>> = {};
  if (manage) {
    try { prices = await supplierPricesFor([...new Set([...needed.keys(), ...lines.map((l) => strengthKey(l.slug, l.variant_id))])]); }
    catch (err) { console.error("supplier prices read failed:", err); }
  }

  // Every strength the run's orders need, plus any line already recorded.
  const keys = [...new Set([...needed.keys(), ...lines.map((l) => strengthKey(l.slug, l.variant_id))])];
  const rows = await Promise.all(keys.map(async (k) => {
    const [slug, variantId] = k.split("/");
    const line: RunLine | undefined = lines.find((l) => strengthKey(l.slug, l.variant_id) === k);
    const c = catalogContent.find((x) => x.slug === slug);
    const stage = line ? lineStage(line) : "to_order";
    const lot = line?.lot_id ? await lotById(line.lot_id) : null;
    const drafts = manage && stage === "ordered" ? await draftLotsFor(slug, variantId) : [];
    const buyers = live.filter((o) => o.status === "deposit_paid" && o.items.some((i) => i.compound_slug === slug && i.variant_id === variantId)).length;
    return { k, slug, variantId, line, stage, lot, drafts, buyers, // A re-sourced line is back at to_order: show what the run needs now.
      kits: (stage === "to_order" ? undefined : line?.kits_ordered) ?? needed.get(k) ?? 0,
      title: c?.designation ?? c?.name ?? slug, sci: c?.designation ? c.name : null, strength: strengthText(variantId) };
  }));
  const cutoffLabel = dateLabel(run.cutoff_on);
  const lineLabel = new Map(rows.filter((r) => r.line).map((r) => [r.line!.id, `${r.title} ${r.strength}`]));

  return (
    <div className="a-page">
      <Crumbs items={[{ label: "Wholesale", href: "/admin/wholesale" }, { label: run.number }]} />
      <div className="a-vh"><div><h1>Run {run.number} <span className={`a-chip ${RUN_CHIP[status]}`}>{RUN_STATUS_LABEL[status]}</span></h1>
        <div className="sub">Order by {cutoffLabel}<span className="dot" />lot tested ≈ {dateLabel(dates.testedAbout)}<span className="dot" />ships about {dateLabel(dates.shipsAbout)}<span className="dot" />{live.length} orders · {[...needed.values()].reduce((a, b) => a + b, 0)} kits</div></div>
        <div className="actions"><span className="a-mk sl">{suppliers.length} of {MAX_SUPPLIERS_PER_RUN} suppliers{suppliers.length ? ` · ${suppliers.join(", ")}` : ""}</span></div></div>

      <div className="a-card">
        <div className="a-card-h"><h3>Strengths</h3><span className="sub">one supplier order and one lot test per strength</span></div>
        {rows.length === 0 ? <div className="a-empty">No orders in this run yet.</div> : (
          <div className="a-scrollx"><table className="a-t" style={{ border: 0 }}>
            <thead><tr><th>Strength</th><th className="num">Kits</th><th className="num">Extra boxes</th><th>Supplier</th><th className="num">Cost</th><th>Ref</th><th>Lot</th><th>Stage</th><th /></tr></thead>
            <tbody>{rows.map((r) => {
              const label = `${r.title} ${r.strength}`;
              return (
                <tr key={r.k} className={r.stage === "failed" ? "a-ws-failed" : undefined}>
                  <td><b>{r.title}</b><span className="sub">{r.sci ? `${r.sci} · ` : ""}{r.strength}</span>{r.stage === "failed" && r.line?.fail_note && <span className="a-ws-fail-note">{r.line.fail_note}</span>}</td>
                  <td className="num">{r.kits}</td>
                  <td className="num">{r.line?.extra_boxes || "—"}</td>
                  <td>{r.line?.supplier ?? "—"}</td>
                  <td className="num">{r.line?.cost_cents != null ? usd(r.line.cost_cents) : "—"}</td>
                  <td className="a-mono a-nw">{r.line?.supplier_ref ?? "—"}</td>
                  <td>{r.lot ? <>
                    <Link className="a-ord" href={`/admin/catalog/${r.slug}`} style={r.stage === "failed" ? { textDecoration: "line-through" } : undefined}>{r.lot.lot_number}</Link>
                    <span className="muted"> · {r.stage === "passed" ? `held ${r.lot.held} vials` : r.stage === "failed" ? "never sold" : r.lot.coa_path ? "COA ✓" : "no certificate yet"}</span></> : "—"}</td>
                  <td><span className={`a-chip ${STAGE_CHIP[r.stage].cls}`}>{STAGE_CHIP[r.stage].text}</span></td>
                  <td className="r a-nw">{manage && (
                    r.stage === "to_order" ? <RecordOrderDialog runId={run.id} runNumber={run.number} cutoffLabel={cutoffLabel} slug={r.slug} variantId={r.variantId} label={label} kits={needed.get(r.k) ?? 0} suppliers={suppliers} choices={choices} prices={prices[r.k] ?? {}} primary />
                    : r.stage === "ordered" ? <LinkLotDialog lineId={r.line!.id} label={label} lots={r.drafts} />
                    : r.stage === "received" ? <PassFailButtons lineId={r.line!.id} label={label} buyers={r.buyers} />
                    : r.stage === "failed" ? <ResourceButton lineId={r.line!.id} />
                    : null)}</td>
                </tr>
              );
            })}</tbody>
          </table></div>
        )}
      </div>

      <div className="a-card" style={{ marginTop: 18 }}>
        <div className="a-card-h"><h3>Orders</h3><span className="sub">{orders.length}</span></div>
        {orders.length === 0 ? <div className="a-empty">No orders.</div> : <>
          <table className="a-t a-only-desk" style={{ border: 0 }}>
            <thead><tr><th>Order</th><th>Buyer</th><th>Kits</th><th>Status</th><th className="num">Deposit</th><th className="num">Balance</th><th /></tr></thead>
            <tbody>{orders.map((o) => {
              const kits = o.items.reduce((a, i) => a + i.quantity, 0);
              return (
                <tr key={o.id}>
                  <td className="a-nw"><Link className="a-ord" href={`/admin/orders/${o.order_number}`}>{o.order_number}</Link></td>
                  <td>{o.ship_name}<span className="sub">{o.email}</span></td>
                  <td className="a-nw">{kits} kits<span className="sub">{o.items.map((i) => `${catalogContent.find((c) => c.slug === i.compound_slug)?.designation ?? catalogContent.find((c) => c.slug === i.compound_slug)?.name ?? i.compound_slug} ×${i.quantity}`).join(" · ")}</span></td>
                  <td><OrderStatusChip status={o.status} /></td>
                  <td className="num">{usd(o.deposit_cents)}</td>
                  <td className="num">{usd(o.balance_cents)}</td>
                  <td className="r">{manage && o.status === "deposit_paid" && <CancelDepositDialog orderId={o.id} orderNumber={o.order_number} depositCents={o.deposit_cents} />}</td>
                </tr>
              );
            })}</tbody>
          </table>
          <div className="a-plist a-only-phone">{orders.map((o) => (
            <Link key={o.id} className="a-pitem" href={`/admin/orders/${o.order_number}`}>
              <span className="a-ord">{o.order_number}</span><OrderStatusChip status={o.status} />
              <span className="gives">{o.ship_name} · {o.items.reduce((a, i) => a + i.quantity, 0)} kits</span>
              <span className="meta">deposit <b>{usd(o.deposit_cents)}</b> · balance <b>{usd(o.balance_cents)}</b></span>
            </Link>
          ))}</div>
        </>}
      </div>

      <div className="a-grid2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginTop: 18 }}>
        <div className="a-card"><div className="a-card-h"><h3>Notes</h3><span className="sub">factory claims, supplier contacts</span></div>
          <RunNotes runId={run.id} notes={run.notes} canEdit={manage} /></div>
        <div className="a-card"><div className="a-card-h"><h3>Activity</h3></div>
          <div className="a-card-b">{events.length === 0 ? <p className="muted">Nothing yet.</p> : (
            <ul className="a-log">{events.map((e) => (
              <li key={e.id}><div>{EVENT[e.kind]}{e.line_id && lineLabel.get(e.line_id) ? <> <b>{lineLabel.get(e.line_id)}</b></> : null}{e.detail ? <> · {e.detail}</> : null}<small>{dateTime(e.created_at)}</small></div></li>
            ))}</ul>)}</div></div>
      </div>
    </div>
  );
}
