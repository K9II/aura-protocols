import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/dal";
import { currentMs } from "@/lib/clock";
import { dateLabel, daysBetween, localDate } from "@/lib/today/time";
import { usd } from "@/lib/html";
import { catalogContent } from "@/data/catalog";
import { compoundTitle } from "@/lib/catalog";
import { getWholesaleSettings } from "@/lib/wholesale/data";
import { cutoffFor, estimatedDates } from "@/lib/wholesale/rules";
import { kitsByStrength, lineStage, runStatus, RUN_CHIP, RUN_STATUS_LABEL, strengthText, type RunLine, type RunStatus } from "@/lib/wholesale/runs";
import { listRuns, runLines, runOrders, type RunOrderRow } from "@/lib/wholesale/runs-data";
import { Crumbs } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Wholesale", robots: { index: false, follow: false } };

const LIVE = new Set(["deposit_paid", "balance_due", "paid", "shipped"]);
const nameOf = (slug: string) => { const c = catalogContent.find((x) => x.slug === slug); return c ? compoundTitle(c) : slug; };
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

function nextStep(status: RunStatus, lines: RunLine[], orders: RunOrderRow[], needed: Map<string, number>): string {
  if (status === "collecting") return "Collecting until the order-by date";
  if (status === "done") return orders.some((o) => o.status === "shipped") ? "All shipped" : "Nothing left to make";
  if (status === "to_order") {
    const n = [...needed.keys()].filter((k) => !lines.some((l) => `${l.slug}/${l.variant_id}` === k && (l.ordered_at || l.result === "passed"))).length;
    return `Record the supplier order for ${plural(n, "strength")}`;
  }
  const failed = lines.find((l) => l.result === "failed");
  if (failed) return `Lot failed: ${nameOf(failed.slug)} ${strengthText(failed.variant_id)} — re-source`;
  if (status === "ready_to_ship") {
    const due = orders.filter((o) => o.status === "balance_due").length, ship = orders.filter((o) => o.status === "paid").length;
    return [due && `${plural(due, "balance")} due`, ship && `${ship} to ship`].filter(Boolean).join(" · ") || "Waiting on balances";
  }
  const received = lines.filter((l) => lineStage(l) === "received").length;
  return received ? `Pass or fail ${plural(received, "lot")}` : `Waiting on ${plural(lines.filter((l) => lineStage(l) === "ordered").length, "delivery")}`;
}

// Runs: the collecting one on top with kits per strength, then every run with
// its derived status and next step (mock a1).
export default async function WholesalePage() {
  await requirePermission("wholesale.view");
  const nowMs = currentMs(), today = localDate(nowMs);
  const [s, runs] = await Promise.all([getWholesaleSettings(), listRuns()]);
  const cutoff = cutoffFor(today, { runDays: s.runDays, override: s.nextCutoffOverride });
  const orders = await runOrders([...new Set([cutoff, ...runs.map((r) => r.cutoff_on)])]);
  const linesByRun = new Map(await Promise.all(runs.map(async (r) => [r.id, await runLines(r.id)] as const)));
  const ofRun = (c: string) => orders.filter((o) => o.wholesale_cutoff_on === c);

  const collectingOrders = ofRun(cutoff).filter((o) => LIVE.has(o.status));
  const collectingKits = kitsByStrength(collectingOrders);
  const collectingRun = runs.find((r) => r.cutoff_on === cutoff);
  const ships = estimatedDates(cutoff, s.leadDays).shipsAbout;
  const kitsTotal = [...collectingKits.values()].reduce((a, b) => a + b, 0);
  const daysLeft = daysBetween(today, cutoff);

  return (
    <div className="a-page">
      <Crumbs items={[{ label: "Wholesale" }]} />
      <div className="a-ph"><div><h1>Wholesale</h1><p>Made-to-order research kits. Orders collect until each run&apos;s order-by date; then you order from the supplier, test the lot and release the balances.</p></div>
        <div className="actions"><Link className="a-btn" href="/admin/wholesale/settings">Settings</Link></div></div>
      {!s.open && <div className="a-callout info" style={{ marginBottom: 14 }}><span>Wholesale ordering is <b>off</b> — /wholesale shows the inquiry form. Turn it on in Settings when you&apos;re ready.</span></div>}

      <div className="a-card">
        <div className="a-card-h"><h3>Collecting{collectingRun ? ` · ${collectingRun.number}` : ""}</h3><span className="a-chip sched">Collecting</span>
          <span className="sub">order by <b>{dateLabel(cutoff)}</b> · {daysLeft === 0 ? "today" : `in ${plural(daysLeft, "day")}`}</span></div>
        <div className="a-kpis" style={{ gridTemplateColumns: "repeat(4, 1fr)", border: 0, borderBottom: "1px solid var(--line)" }}>
          <div className="a-kpi"><div className="l">Orders</div><div className="v">{collectingOrders.length}</div><div className="d">deposits paid</div></div>
          <div className="a-kpi"><div className="l">Kits</div><div className="v">{kitsTotal}</div><div className="d">{kitsTotal * 10} vials</div></div>
          <div className="a-kpi"><div className="l">Deposits</div><div className="v">{usd(collectingOrders.reduce((a, o) => a + (o.deposit_cents ?? 0), 0))}</div><div className="d">{s.depositPct}% of kits</div></div>
          <div className="a-kpi"><div className="l">Ships about</div><div className="v">{dateLabel(ships)}</div><div className="d">order-by + {s.leadDays} days</div></div>
        </div>
        {collectingKits.size === 0 ? <div className="a-empty">No orders in this run yet.</div> : (
          <table className="a-t" style={{ border: 0 }}>
            <thead><tr><th>Strength</th><th className="num">Kits</th><th className="num">Vials</th><th className="num">Orders</th></tr></thead>
            <tbody>{[...collectingKits.entries()].sort((a, b) => b[1] - a[1]).map(([k, kits]) => {
              const [slug, v] = k.split("/");
              const n = collectingOrders.filter((o) => o.items.some((i) => i.compound_slug === slug && i.variant_id === v)).length;
              return <tr key={k}><td>{nameOf(slug)} <span className="muted">{strengthText(v)}</span></td><td className="num">{kits}</td><td className="num">{kits * 10}</td><td className="num">{n}</td></tr>;
            })}</tbody>
          </table>
        )}
      </div>

      <div className="a-card" style={{ marginTop: 18 }}>
        <div className="a-card-h"><h3>Runs</h3><span className="sub">{runs.length}</span></div>
        {runs.length === 0 ? <div className="a-empty">No runs yet — the first deposit creates one.</div> : <>
          <table className="a-t a-only-desk" style={{ border: 0 }}>
            <thead><tr><th>Run</th><th>Order by</th><th>Status</th><th className="num">Orders</th><th className="num">Kits</th><th>Next step</th></tr></thead>
            <tbody>{runs.map((r) => {
              const mine = ofRun(r.cutoff_on), live = mine.filter((o) => LIVE.has(o.status)), lines = linesByRun.get(r.id) ?? [];
              const needed = kitsByStrength(live), status = runStatus(r.cutoff_on, today, lines, mine);
              return (
                <tr key={r.id}>
                  <td><Link className="a-ord" href={`/admin/wholesale/runs/${r.id}`}>{r.number}</Link></td>
                  <td>{dateLabel(r.cutoff_on)}</td>
                  <td><span className={`a-chip ${RUN_CHIP[status]}`}>{RUN_STATUS_LABEL[status]}</span></td>
                  <td className="num">{live.length}</td>
                  <td className="num">{[...needed.values()].reduce((a, b) => a + b, 0)}</td>
                  <td className={status === "collecting" || status === "done" ? "muted" : undefined}>{nextStep(status, lines, mine, needed)}</td>
                </tr>
              );
            })}</tbody>
          </table>
          <div className="a-plist a-only-phone">{runs.map((r) => {
            const mine = ofRun(r.cutoff_on), lines = linesByRun.get(r.id) ?? [], live = mine.filter((o) => LIVE.has(o.status));
            const needed = kitsByStrength(live), status = runStatus(r.cutoff_on, today, lines, mine);
            return (
              <Link key={r.id} className="a-pitem" href={`/admin/wholesale/runs/${r.id}`}>
                <span className="a-ord">{r.number}</span><span className={`a-chip ${RUN_CHIP[status]}`}>{RUN_STATUS_LABEL[status]}</span>
                <span className="gives">{nextStep(status, lines, mine, needed)}</span>
                <span className="meta">order by <b>{dateLabel(r.cutoff_on)}</b> · <b>{live.length}</b> orders · <b>{[...needed.values()].reduce((a, b) => a + b, 0)}</b> kits</span>
              </Link>
            );
          })}</div>
        </>}
      </div>
    </div>
  );
}
