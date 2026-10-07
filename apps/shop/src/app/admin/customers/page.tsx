import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/dal";
import { customerStats, listCustomers, PAGE_SIZE, type CustomerListRow } from "@/lib/customers/data";
import { TABS, TAB_LABEL, cleanSearch, parseTab, type CustomerTab } from "@/lib/customers/rules";
import { customersWithDisputes } from "@/lib/disputes/data";
import { shortDate } from "@/lib/discounts/time";
import { usd } from "@/lib/html";
import { Crumbs, Icon, Kpis, Tabs, money } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Customers", robots: { index: false, follow: false } };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

// cb: a dispute on any of their orders (derived, Disputes module).
function Chips({ r, cb }: { r: CustomerListRow; cb: boolean }) {
  return (
    <span className="a-chips">
      {r.blocked ? <span className="a-chip blocked">Blocked</span> : r.verified ? <span className="a-chip ver">Verified</span> : <span className="a-chip unver">Unverified</span>}
      {r.isPartner && <span className="a-chip partner">Partner</span>}
      {r.isOwner && <span className="a-chip owner">Owner</span>}
      {cb && <span className="a-chip cb">Chargeback</span>}
    </span>
  );
}

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string | string[]; tab?: string | string[]; page?: string | string[] }> }) {
  await requirePermission("customers.view");
  const sp = await searchParams;
  const tab = parseTab(first(sp.tab));
  const qRaw = first(sp.q) ?? "";
  const q = cleanSearch(qRaw);
  const pageRaw = Number(first(sp.page));
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.trunc(pageRaw) : 1;
  const [{ rows, total }, s] = await Promise.all([listCustomers({ q, tab, page }), customerStats()]);
  const disputed = await customersWithDisputes(rows.map((r) => r.id));
  const counts: Record<CustomerTab, number> = { all: s.total, ordered: s.ordered, none: s.total - s.ordered, unverified: s.unverified, blocked: s.blocked };
  const trend = s.new_prior_30d ? Math.round(((s.new_30d - s.new_prior_30d) / s.new_prior_30d) * 100) : null;
  const href = (o: { tab?: CustomerTab; page?: number }) => {
    const p = new URLSearchParams();
    const t = o.tab ?? tab;
    if (t !== "all") p.set("tab", t);
    if (q) p.set("q", q);
    if (o.page && o.page > 1) p.set("page", String(o.page));
    const str = p.toString();
    return `/admin/customers${str ? `?${str}` : ""}`;
  };
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="a-page">
      <Crumbs items={[{ label: "Customers" }]} />
      <div className="a-ph"><div><h1>Customers</h1><p>Every account. Open one to see its orders, agreement record and store credit, or to block it.</p></div></div>

      <div className="a-only-desk">
        <Kpis items={[
          { label: "Customers", value: s.total.toLocaleString("en-US"), sub: "all accounts" },
          { label: "New · 30 days", value: s.new_30d.toLocaleString("en-US"), sub: trend == null ? "first 30 days" : <><span className={trend >= 0 ? "up" : "down"}>{trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}%</span> vs prior 30</> },
          { label: "Have ordered", value: s.ordered.toLocaleString("en-US"), sub: s.total ? `${Math.round((s.ordered / s.total) * 100)}% of accounts` : "—" },
          { label: "Repeat", value: s.repeat.toLocaleString("en-US"), sub: s.ordered ? `${Math.round((s.repeat / s.ordered) * 100)}% of buyers · 2+ paid orders` : "2+ paid orders" },
          { label: "Store credit outstanding", value: money(s.credit_cents), sub: `across ${s.credit_accounts} account${s.credit_accounts === 1 ? "" : "s"}` },
        ]} />
      </div>

      <div className="a-toolbar">
        <Tabs items={TABS.map((t) => ({ href: href({ tab: t, page: 1 }), label: TAB_LABEL[t], n: counts[t], on: t === tab }))} />
        <form className="a-search" action="/admin/customers" role="search" style={{ width: 300 }}>
          {tab !== "all" && <input type="hidden" name="tab" value={tab} />}
          <Icon name="search" /><input name="q" defaultValue={qRaw} placeholder="Name, email, organization or AP-1234" aria-label="Search customers" />
        </form>
      </div>

      {rows.length === 0 ? <div className="a-empty">{q ? "Nothing matches." : "No customers here yet."}</div> : (
        <>
          <table className="a-t a-only-desk">
            <thead><tr><th>Customer</th><th>Joined</th><th className="num">Orders</th><th className="num">Spent</th><th>Last order</th><th className="num">Credit</th><th>Status</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id}>
                <td className="a-cust"><b><Link href={`/admin/customers/${r.id}`}>{r.fullName}</Link></b><small title={r.email}>{r.email}{r.organization ? ` · ${r.organization}` : ""}</small></td>
                <td>{shortDate(r.createdAt)}</td>
                <td className={`num${r.paidOrders ? "" : " muted"}`}>{r.paidOrders}</td>
                <td className="num">{r.paidOrders ? usd(r.spentCents) : <span className="muted">—</span>}</td>
                <td>{r.lastOrderAt ? shortDate(r.lastOrderAt) : <span className="muted">—</span>}</td>
                <td className="num">{r.creditCents ? usd(r.creditCents) : <span className="muted">—</span>}</td>
                <td><Chips r={r} cb={disputed.has(r.id)} /></td>
              </tr>
            ))}</tbody>
          </table>
          <div className="a-plist a-only-phone">{rows.map((r) => (
            <Link key={r.id} href={`/admin/customers/${r.id}`} className="a-pcust">
              <b>{r.fullName}</b><Chips r={r} cb={disputed.has(r.id)} />
              <span className="em">{r.email}{r.organization ? ` · ${r.organization}` : ""}</span>
              <div className="meta"><span>Joined {shortDate(r.createdAt)}</span><span><b>{r.paidOrders}</b> order{r.paidOrders === 1 ? "" : "s"}</span>{r.paidOrders > 0 && <span><b>{usd(r.spentCents)}</b></span>}{r.creditCents > 0 && <span>credit <b>{usd(r.creditCents)}</b></span>}</div>
            </Link>
          ))}</div>
          <div className="a-tfoot">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString("en-US")} · newest first
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
