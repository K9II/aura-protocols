import type { Metadata } from "next";
import Link from "next/link";
import { requireOwner } from "@/lib/dal";
import { catalogContent } from "@/data/catalog";
import { ACTIVITY_AREAS, AREA_LABEL, activityFeed, activityPeople, type ActivityArea } from "@/lib/audit/feed";
import { dateTime } from "@/lib/discounts/time";
import ActivityLine from "@/components/admin/activity/ActivityLine";
import { Crumbs, Icon, Tabs } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Activity", robots: { index: false, follow: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STAMP = /^\d{4}-\d{2}-\d{2}T[\d:.]+(Z|[+-]\d{2}:\d{2})$/;

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ area?: string; who?: string; before?: string }> }) {
  await requireOwner();
  const sp = await searchParams;
  const area = (ACTIVITY_AREAS as readonly string[]).includes(sp.area ?? "") ? (sp.area as ActivityArea) : undefined;
  const actor = sp.who && UUID.test(sp.who) ? sp.who : undefined;
  const before = sp.before && STAMP.test(sp.before) ? sp.before : undefined;
  const productName = (slug: string) => catalogContent.find((c) => c.slug === slug)?.name ?? slug;
  const [{ items, next }, people] = await Promise.all([activityFeed({ area, actor, before }, productName), activityPeople()]);
  const href = (o: { area?: ActivityArea | null; before?: string | null }) => {
    const p = new URLSearchParams();
    const a = o.area === undefined ? area : o.area;
    if (a) p.set("area", a);
    if (actor) p.set("who", actor);
    if (o.before) p.set("before", o.before);
    const s = p.toString();
    return `/admin/activity${s ? `?${s}` : ""}`;
  };

  return (
    <div className="a-page">
      <Crumbs items={[{ label: "Activity" }]} />
      <div className="a-ph"><div><h1>Activity</h1><p>Every action taken in the command center: who did it, what it was about, and when. Newest first. Automatic work (Stripe, the daily runs, the 3PL) shows on each module&apos;s own page.</p></div></div>

      <div className="a-toolbar a-act-bar">
        <Tabs items={[{ href: href({ area: null }), label: "All", on: !area }, ...ACTIVITY_AREAS.map((a) => ({ href: href({ area: a }), label: AREA_LABEL[a], on: a === area }))]} />
        <form className="a-act-who" action="/admin/activity">
          {area && <input type="hidden" name="area" value={area} />}
          <label htmlFor="act-who">Person</label>
          <select id="act-who" name="who" defaultValue={actor ?? ""}>
            <option value="">Everyone</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button type="submit" className="a-btn sm">Show</button>
        </form>
      </div>

      {items.length === 0 ? <div className="a-empty">{before ? "Nothing older." : "Nothing here yet."}</div> : (
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
            {before ? "Older actions" : "Latest actions"} · shop time (Mountain)
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
