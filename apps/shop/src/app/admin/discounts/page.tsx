import type { Metadata } from "next";
import Link from "next/link";
import { requireOwner } from "@/lib/dal";
import { codeStatsById, discountDashboard, getDiscountCap, listBatches, listCodes } from "@/lib/discounts/data";
import { buildListRows, type ListRow } from "@/lib/discounts/list";
import type { CodeStatus } from "@/lib/discounts/rules";
import { shortDate } from "@/lib/discounts/time";
import { Crumbs, Icon, Kpis, Meter, StatusChip, Tabs, money } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Discounts", robots: { index: false, follow: false } };

const FILTERS: Array<[CodeStatus | "all", string]> = [["all", "All"], ["active", "Active"], ["scheduled", "Scheduled"], ["paused", "Paused"], ["ended", "Ended"], ["used_up", "Used up"]];
const PAGE = 25;

function maskEmail(e: string): string { const [u, d] = e.split("@"); return `${u.slice(0, 1)}••••@${d}`; }
function subLine(r: ListRow): React.ReactNode {
  if (r.lockedEmail) return <><Icon name="lock" /> Locked to {maskEmail(r.lockedEmail)}</>;
  if (r.status === "scheduled" && r.startsAt) return `Starts ${shortDate(r.startsAt)}`;
  return r.sub;
}

export default async function DiscountsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; page?: string }> }) {
  await requireOwner();
  const sp = await searchParams;
  const filter = (FILTERS.find(([k]) => k === sp.status)?.[0] ?? "all") as CodeStatus | "all";
  const q = (sp.q ?? "").trim().toUpperCase();
  const [codes, batches, stats, dash, cap] = await Promise.all([listCodes(), listBatches(), codeStatsById(), discountDashboard(), getDiscountCap()]);
  const all = buildListRows(codes, batches, stats);
  const count = (s: CodeStatus) => all.filter((r) => r.status === s).length;
  const shown = all.filter((r) => (filter === "all" || r.status === filter) && (!q || r.code.includes(q) || (r.sub ?? "").toUpperCase().includes(q)));
  const page = Math.max(1, Number(sp.page) || 1);
  const slice = shown.slice((page - 1) * PAGE, page * PAGE);
  const trend = dash.uses_prior_30d ? Math.round(((dash.uses_30d - dash.uses_prior_30d) / dash.uses_prior_30d) * 100) : null;
  const href = (o: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    const merged = { status: filter === "all" ? undefined : filter, q: sp.q, ...o };
    for (const [k, v] of Object.entries(merged)) if (v != null && v !== "") p.set(k, String(v));
    const s = p.toString();
    return `/admin/discounts${s ? `?${s}` : ""}`;
  };

  return (
    <div className="a-page">
      <Crumbs items={[{ label: "Discounts" }]} />
      <div className="a-ph">
        <div><h1>Discounts</h1><p>Codes customers type at checkout. Pack, new-account and partner discounts apply automatically and aren&apos;t listed here.</p></div>
        <div className="actions">
          <Link className="a-btn" href="/admin/discounts/settings"><Icon name="gear" />Settings</Link>
          <Link className="a-btn" href="/admin/discounts/new?mode=batch"><Icon name="layers" />Generate batch</Link>
          <Link className="a-btn primary" href="/admin/discounts/new"><Icon name="plus" />Create code</Link>
        </div>
      </div>

      <Kpis items={[
        { label: "Live codes", value: count("active"), sub: `${count("scheduled")} scheduled · ${count("paused")} paused` },
        { label: "Uses · 30 days", value: dash.uses_30d, sub: trend == null ? "first 30 days" : <><span className={trend >= 0 ? "up" : "down"}>{trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}%</span> vs prior 30</> },
        { label: "Revenue with a code", value: money(dash.revenue_30d), sub: dash.goods_revenue_30d ? `${Math.round((dash.revenue_30d / dash.goods_revenue_30d) * 100)}% of goods revenue` : "30 days" },
        { label: "Discount given", value: money(dash.discount_30d), sub: dash.uses_30d ? `avg ${money(dash.discount_30d / dash.uses_30d)} per use` : "30 days" },
        { label: "Store-wide cap", value: `${cap}%`, sub: `${dash.capped_30d} orders trimmed · 30 days` },
      ]} />

      <div className="a-toolbar">
        <Tabs items={FILTERS.map(([k, label]) => ({ href: href({ status: k === "all" ? undefined : k, page: undefined }), label, n: k === "all" ? all.length : count(k), on: k === filter }))} />
        <form className="a-search" action="/admin/discounts" role="search">
          {filter !== "all" && <input type="hidden" name="status" value={filter} />}
          <Icon name="search" /><input name="q" defaultValue={sp.q ?? ""} placeholder="Search code or note" aria-label="Search code or note" />
        </form>
      </div>

      {shown.length === 0 ? (
        <div className="a-empty">{all.length === 0 ? <>No codes yet. <Link href="/admin/discounts/new">Create the first one</Link>.</> : "Nothing matches."}</div>
      ) : (
        <>
          <table className="a-t a-only-desk">
            <thead><tr><th>Code</th><th>Gives</th><th>Status</th><th className="num">Uses</th><th className="num">Revenue</th><th className="num">Discount</th><th>Ends</th></tr></thead>
            <tbody>
              {slice.map((r) => (
                <tr key={r.id}>
                  <td className="a-code-cell"><Link href={r.href} className="a-code">{r.code}</Link><small>{subLine(r)}</small></td>
                  <td>{r.gives}</td>
                  <td><StatusChip status={r.status} /></td>
                  <td className="num"><Meter used={r.uses} max={r.max} /></td>
                  <td className="num">{r.uses ? money(r.revenueCents) : <span className="muted">—</span>}</td>
                  <td className="num">{r.uses ? money(r.discountCents) : <span className="muted">—</span>}</td>
                  <td>{r.endsAt ? shortDate(r.endsAt) : <span className="muted">No end</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="a-plist a-only-phone">
            {slice.map((r) => (
              <Link key={r.id} href={r.href} className="a-pitem">
                <span className="a-code">{r.code}</span><StatusChip status={r.status} />
                <span className="gives">{r.batchId ? `${r.sub} · ${r.gives}` : r.gives}</span>
                <div className="meta"><span><b>{r.max == null ? r.uses : `${r.uses}/${r.max}`}</b> uses</span>{r.uses > 0 && <span><b>{money(r.revenueCents)}</b></span>}<span>{r.endsAt ? `ends ${shortDate(r.endsAt)}` : "no end"}</span></div>
              </Link>
            ))}
          </div>
          <div className="a-tfoot">
            Showing {(page - 1) * PAGE + 1}–{Math.min(page * PAGE, shown.length)} of {shown.length} · sorted by status, then end date
            <div className="r">
              {page > 1 && <Link className="a-btn sm" href={href({ page: page - 1 })}>Previous</Link>}
              {page * PAGE < shown.length && <Link className="a-btn sm" href={href({ page: page + 1 })}>Next</Link>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
