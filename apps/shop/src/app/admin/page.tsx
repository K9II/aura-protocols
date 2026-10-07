import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/dal";
import { can } from "@/lib/staff/roles";
import { currentMs } from "@/lib/clock";
import { loadNumbers, loadTodos } from "@/lib/today/today";
import { parsePeriod } from "@/lib/today/periods";
import { headerDate } from "@/lib/today/time";
import { Crumbs } from "@/components/admin/ui";
import Todos from "@/components/admin/today/Todos";
import Numbers from "@/components/admin/today/Numbers";

export const metadata: Metadata = { title: "Today", robots: { index: false, follow: false } };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

// The command center's front door (spec 2026-10-05-admin-today-design.md):
// to-dos left, numbers right; on a phone, to-dos first.
export default async function TodayPage({ searchParams }: { searchParams: Promise<{ p?: string | string[] }> }) {
  const staff = await requirePermission("today.view");
  const period = parsePeriod(first((await searchParams).p));
  const [slots, numbers] = await Promise.all([loadTodos(), loadNumbers(period)]); // neither throws
  const reloadHref = period === "today" ? "/admin" : `/admin?p=${period}`;
  return (
    <div className="a-page">
      <Crumbs items={[{ label: "Today" }]} />
      <div className="a-ph"><div><h1>Today</h1><p>{headerDate(currentMs())}</p></div><div className="actions"><Link className="a-ulink" href="/admin/alerts">Past alerts</Link></div></div>
      <div className="a-today">
        <Todos slots={slots} reloadHref={reloadHref} can={{ resolve: can(staff, "alerts.resolve"), warnings: can(staff, "disputes.warnings"), announce: can(staff, "email.draft") }} />
        <Numbers period={period} view={numbers.ok ? numbers.view : null} reloadHref={reloadHref} />
      </div>
    </div>
  );
}
