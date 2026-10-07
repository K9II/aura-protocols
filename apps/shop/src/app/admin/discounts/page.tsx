import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/dal";
import { codeStatsById, discountDashboard, getDiscountCap, listBatches, listCodes } from "@/lib/discounts/data";
import { buildListRows, type ListRow } from "@/lib/discounts/list";
import type { CodeStatus } from "@/lib/discounts/rules";
import { shortDate } from "@/lib/discounts/time";
import { Crumbs, Icon, Kpis, Meter, StatusChip, Tabs, money } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Discounts", robots: { index: false, follow: false } };

const FILTERS: Array<[CodeStatus | "all", string]> = [["all", "All"], ["active", "Active"], ["scheduled", "Scheduled"], ["paused", "Paused"], ["ended", "Ended"], ["used_up", "Used up"]];
const PAGE = 25;
// Text describeRule (lib/discounts/rules.ts) appends when a code also gives
// free shipping — split out so the desktop "Gives" column can mute the "+"
// the way the mock does, instead of showing it as plain joined text.
const PLUS_SHIP = " + free shipping";

const first = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v);

function maskEmail(e: string): string { const [u, d] = e.split("@"); return `${u.slice(0, 1)}••••@${d}`; }
function subLine(r: ListRow): React.ReactNode {
  if (r.lockedEmail) return <><Icon name="lock" /> Locked to {maskEmail(r.lockedEmail)}</>;
  if (r.status === "scheduled" && r.startsAt) return `Starts ${shortDate(r.startsAt)}`;
  return r.sub;
}
function GivesText({ text }: { text: string }) {
  const i = text.indexOf(PLUS_SHIP);
  if (i === -1) return <>{text}</>;
  return <>{text.slice(0, i)}<span className="plus">+</span>free shipping</>;
}
// Phone card's last meta line: a scheduled code shows its window ("Nov 27 –
// Dec 1"), everything else shows when it ends (or "no end").
function endLine(r: ListRow): string {
  if (r.status === "scheduled" && r.startsAt) return r.endsAt ? `${shortDate(r.startsAt)} – ${shortDate(r.endsAt)}` : `starts ${shortDate(r.startsAt)}`;
  return r.endsAt ? `ends ${shortDate(r.endsAt)}` : "no end";
}

export default async function DiscountsPage({ searchParams }: { searchParams: Promise<{ status?: string | string[]; q?: string | string[]; page?: string | string[] }> }) {
  await requirePermission("discounts.view");
  const sp = await searchParams;
  const statusRaw = first(sp.status);
  const filter = (FILTERS.find(([k]) => k === statusRaw)?.[0] ?? "all") as CodeStatus | "all";
  const qRaw = first(sp.q) ?? "";
  const q = qRaw.trim().toUpperCase();
  const [codes, batches, stats, dash, cap] = await Promise.all([listCodes(), listBatches(), codeStatsById(), discountDashboard(), getDiscountCap()]);
  const all = buildListRows(codes, batches, stats);
  const count = (s: CodeStatus) => all.filter((r) => r.status === s).length;
  const shown = all.filter((r) => (filter === "all" || r.status === filter) && (!q || r.code.includes(q) || (r.sub ?? "").toUpperCase().includes(q)));
  const lastPage = Math.max(1, Math.ceil(shown.length / PAGE));
  const pageRaw = Number(first(sp.page));
  const page = Math.min(lastPage, Math.max(1, Number.isFinite(pageRaw) ? Math.trunc(pageRaw) : 1));
  const slice = shown.slice((page - 1) * PAGE, page * PAGE);
  const trend = dash.uses_prior_30d ? Math.round(((dash.uses_30d - dash.uses_prior_30d) / dash.uses_prior_30d) * 100) : null;
  const href = (o: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    const merged = { status: filter === "all" ? undefined : filter, q: qRaw, ...o };
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
          <Link className="a-btn a-only-desk" href="/admin/discounts/settings"><Icon name="gear" />Settings</Link>
          <Link className="a-btn a-only-desk" href="/admin/discounts/new?mode=batch"><Icon name="layers" />Generate batch</Link>
          <Link className="a-btn primary" href="/admin/discounts/new"><Icon name="plus" />Create code</Link>
        </div>
      </div>

      <div className="a-only-desk">
        <Kpis items={[
          { label: "Live codes", value: count("active"), sub: `${count("scheduled")} scheduled · ${count("paused")} paused` },
          { label: "Uses · 30 days", value: dash.uses_30d, sub: trend == null ? "first 30 days" : <><span className={trend >= 0 ? "up" : "down"}>{trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}%</span> vs prior 30</> },
          { label: "Revenue with a code", value: money(dash.revenue_30d), sub: dash.goods_revenue_30d ? `${Math.round((dash.revenue_30d / dash.goods_revenue_30d) * 100)}% of goods revenue` : "30 days" },
          { label: "Discount given", value: money(dash.discount_30d), sub: dash.uses_30d ? `avg ${money(dash.discount_30d / dash.uses_30d)} per use` : "30 days" },
          { label: "Store-wide cap", value: `${cap}%`, sub: `${dash.capped_30d} orders trimmed · 30 days` },
        ]} />
      </div>

      <div className="a-toolbar">
        <Tabs items={FILTERS.map(([k, label]) => ({ href: href({ status: k === "all" ? undefined : k, page: undefined }), label, n: k === "all" ? all.length : count(k), on: k === filter }))} />
        <form className="a-search" action="/admin/discounts" role="search">
          {filter !== "all" && <input type="hidden" name="status" value={filter} />}
          <Icon name="search" /><input name="q" defaultValue={qRaw} placeholder="Search code or note" aria-label="Search code or note" />
        </form>
      </div>

      {shown.length === 0 ? (
        <div className="a-empty">{all.length === 0 ? <>No codes yet. <Link href="/admin/discounts/new">Create the first one</Link>.</> : "Nothing matches."}</div>
      ) : (
        <>
          <table className="a-t a-only-desk">
            <thead><tr><th>Code</th><th>Gives</th><th>Status</th><th className="num">Uses</th><th className="num">Revenue</th><th className="num">Discount</th><th>Ends</th></tr></thead>
            <tbody>
              {slice.map((r) => {
                const endsMuted = !r.endsAt || r.status === "ended" || r.status === "used_up";
                return (
                  <tr key={r.id}>
                    <td className="a-code-cell"><Link href={r.href} className="a-code">{r.code}</Link><small>{subLine(r)}</small></td>
                    <td className="gives"><GivesText text={r.gives} /></td>
                    <td><StatusChip status={r.status} /></td>
                    <td className="num"><Meter used={r.uses + r.held} max={r.max} /></td>
                    <td className="num">{r.uses ? money(r.revenueCents) : <span className="muted">—</span>}</td>
                    <td className="num">{r.uses ? money(r.discountCents) : <span className="muted">—</span>}</td>
                    <td className={endsMuted ? "muted" : undefined}>{r.endsAt ? shortDate(r.endsAt) : "No end"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="a-plist a-only-phone">
            {slice.map((r) => (
              <Link key={r.id} href={r.href} className="a-pitem">
                <span className="a-code">{r.code}</span><StatusChip status={r.status} />
                <span className="gives">{r.batchId ? `Batch of ${r.max} · ${r.gives}` : r.gives}</span>
                <div className="meta"><span><b>{r.max == null ? r.uses + r.held : `${r.uses + r.held}/${r.max}`}</b> uses</span>{r.uses > 0 && <span><b>{money(r.revenueCents)}</b></span>}<span>{endLine(r)}</span></div>
              </Link>
            ))}
          </div>
          <div className="a-tfoot">
            Showing {(page - 1) * PAGE + 1}–{Math.min(page * PAGE, shown.length)} of {shown.length} · sorted by status, then end date
            <div className="r">
              {page > 1 && <Link className="a-btn sm" href={href({ page: page - 1 })}>Previous</Link>}
              {page < lastPage && <Link className="a-btn sm" href={href({ page: page + 1 })}>Next</Link>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
