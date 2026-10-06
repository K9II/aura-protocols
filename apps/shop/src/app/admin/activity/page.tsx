import type { Metadata } from "next";
import Link from "next/link";
import { requireOwner } from "@/lib/dal";
import { catalogContent } from "@/data/catalog";
import { ACTIVITY_AREAS, AREA_LABEL, activityFeed, activityPeople, type ActivityArea } from "@/lib/audit/feed";
import { dateTime, isoToZonedLocal } from "@/lib/discounts/time";
import { currentMs } from "@/lib/clock";
import { ACTIVITY_PERIODS, PERIOD_LABEL, periodRange, type ActivityPeriod } from "@/lib/audit/range";
import ActivityLine from "@/components/admin/activity/ActivityLine";
import { Crumbs, Icon, Tabs } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Activity", robots: { index: false, follow: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const dayLabel = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const STAMP = /^\d{4}-\d{2}-\d{2}T[\d:.]+(Z|[+-]\d{2}:\d{2})$/;

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ area?: string; who?: string; before?: string; p?: string; from?: string; to?: string }> }) {
  await requireOwner();
  const sp = await searchParams;
  const area = (ACTIVITY_AREAS as readonly string[]).includes(sp.area ?? "") ? (sp.area as ActivityArea) : undefined;
  const actor = sp.who && UUID.test(sp.who) ? sp.who : undefined;
  const before = sp.before && STAMP.test(sp.before) ? sp.before : undefined;
  const today = isoToZonedLocal(new Date(currentMs()).toISOString()).slice(0, 10);
  const { period, from, to, since, until } = periodRange(sp.p, today, sp.from, sp.to);
  const productName = (slug: string) => catalogContent.find((c) => c.slug === slug)?.name ?? slug;
  const [{ items, next }, people] = await Promise.all([activityFeed({ area, actor, before, since, until }, productName), activityPeople()]);
  const href = (o: { area?: ActivityArea | null; period?: ActivityPeriod | null; before?: string | null }) => {
    const p = new URLSearchParams();
    const a = o.area === undefined ? area : o.area;
    const per = o.period === undefined ? period : o.period;
    if (a) p.set("area", a);
    if (actor) p.set("who", actor);
    if (per) p.set("p", per);
    if (per === "dates" && o.period === undefined) { if (from) p.set("from", from); if (to) p.set("to", to); }
    if (o.before) p.set("before", o.before);
    const s = p.toString();
    return `/admin/activity${s ? `?${s}` : ""}`;
  };
  const filtered = !!(actor || period);

  return (
    <div className="a-page">
      <Crumbs items={[{ label: "Activity" }]} />
      <div className="a-ph"><div><h1>Activity</h1><p>Every action taken in the command center: who did it, what it was about, and when. Newest first. Automatic work (Stripe, the daily runs, the 3PL) shows on each module&apos;s own page.</p></div></div>

      <div className="a-toolbar a-act-bar">
        <Tabs items={[{ href: href({ area: null }), label: "All", on: !area }, ...ACTIVITY_AREAS.map((a) => ({ href: href({ area: a }), label: AREA_LABEL[a], on: a === area }))]} />
      </div>
      <div className="a-toolbar a-act-filters">
        <span className="a-seg2" role="group" aria-label="Period">
          <Link href={href({ period: null })} className={!period ? "on" : undefined}>All dates</Link>
          {ACTIVITY_PERIODS.map((x) => <Link key={x} href={href({ period: x })} className={period === x ? "on" : undefined}>{PERIOD_LABEL[x]}</Link>)}
        </span>
        <form className="a-act-who" action="/admin/activity">
          {area && <input type="hidden" name="area" value={area} />}
          {period && <input type="hidden" name="p" value={period} />}
          {period === "dates" && <>
            <label htmlFor="act-from">From</label>
            <input id="act-from" type="date" name="from" defaultValue={from ?? ""} max={today} />
            <label htmlFor="act-to">To</label>
            <input id="act-to" type="date" name="to" defaultValue={to ?? ""} max={today} />
          </>}
          <label htmlFor="act-who">Person</label>
          <select id="act-who" name="who" defaultValue={actor ?? ""}>
            <option value="">Everyone</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <span className="a-act-go">
            <button type="submit" className="a-btn sm">Show</button>
            {filtered && <Link className="a-act-clear" href={area ? `/admin/activity?area=${area}` : "/admin/activity"}>Clear</Link>}
          </span>
        </form>
      </div>

      {items.length === 0 ? <div className="a-empty">{before ? "Nothing older." : filtered ? "Nothing matches these filters." : "Nothing here yet."}</div> : (
        <>
          <table className="a-t a-act a-only-desk">
            <thead><tr><th>When</th><th>What</th><th>Area</th><th /></tr></thead>
            <tbody>{items.map((i) => (
              <tr key={i.key}>
                <td className="when">{dateTime(i.at)}</td>
                <td><ActivityLine i={i} /></td>
                <td><span className="a-reason">{AREA_LABEL[i.area]}</span></td>
                <td className="go">{i.href && <Link href={i.href}>Open<Icon name="arrow" /></Link>}</td>
              </tr>
            ))}</tbody>
          </table>
          <ul className="a-act-list a-only-phone">{items.map((i) => (
            <li key={i.key}>
              <div className="what"><ActivityLine i={i} /></div>
              <div className="meta"><span>{dateTime(i.at)}</span><span className="a-reason">{AREA_LABEL[i.area]}</span>{i.href && <Link href={i.href}>Open</Link>}</div>
            </li>
          ))}</ul>
          <div className="a-tfoot">
            {from || to ? (from === to ? dayLabel(from!) : `${from ? dayLabel(from) : "Start"} – ${to ? dayLabel(to) : "today"}`) : before ? "Older actions" : "Latest actions"} · shop time (Mountain)
            <div className="r">
              {before && <Link className="a-btn sm" href={href({})}>Newest</Link>}
              {next && <Link className="a-btn sm" href={href({ before: next })}>Older</Link>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
