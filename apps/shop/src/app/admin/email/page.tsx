import type { Metadata } from "next";
import Link from "next/link";
import { requireOwner } from "@/lib/dal";
import { emailOverview, sendStats, attribution, cartRecovery } from "@/lib/email/stats";
import { statKey, sumAttribution, sumKinds } from "@/lib/email/stat-keys";
import { getEmailSettings, listRuns, AUTOMATION_LABEL } from "@/lib/email/admin-data";
import { campaignCounts, listCampaigns, waitingLots, type CampaignTab } from "@/lib/email/campaigns/data";
import { AUDIENCE_LABEL, CAMPAIGN_STATUS_LABEL, currentMs, KIND_LABEL } from "@/lib/email/campaigns/rules";
import { CAMPAIGNS_PER_PAGE, STATS_DAYS } from "@/lib/email/constants";
import { WELCOME_DAYS, CART_HOURS } from "@/lib/email/schedule";
import { shortDate, dateTime } from "@/lib/discounts/time";
import { Crumbs, Icon, Tabs, money } from "@/components/admin/ui";
import AutomationSwitch from "@/components/admin/email/AutomationSwitch";
import { HealthStrip, RunLine } from "@/components/admin/email/HealthStrip";
import { announceAction } from "@/app/admin/email/actions";

export const metadata: Metadata = { title: "Email", robots: { index: false, follow: false } };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const TABS: Array<[CampaignTab, string]> = [["all", "All"], ["draft", "Drafts"], ["scheduled", "Scheduled"], ["sent", "Sent"]];
const STATUS_CHIP = { draft: "draft", scheduled: "sched", sending: "sending", sent: "sent", stopped: "stopped" } as const;
const WELCOME_SUBJECTS = ["You asked for the paperwork.", "Three ways a fake COA gives itself away", "What 99% looks like", "Who checks the lab?", "What's not on our label"];
const n = (x: number) => x.toLocaleString("en-US");

export default async function EmailPage({ searchParams }: { searchParams: Promise<{ tab?: string | string[]; page?: string | string[] }> }) {
  await requireOwner();
  const sp = await searchParams;
  const tabRaw = first(sp.tab);
  const tab: CampaignTab = TABS.some(([t]) => t === tabRaw) ? (tabRaw as CampaignTab) : "all";
  const pageRaw = Number(first(sp.page));
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.trunc(pageRaw) : 1;
  const since = new Date(currentMs() - STATS_DAYS * 86_400_000).toISOString();

  let loaded;
  try {
    const [overview, stats30, attr30, cart, settings, runs, waiting, counts, list] = await Promise.all([
      emailOverview(), sendStats(since), attribution(since), cartRecovery(since), getEmailSettings(), listRuns(1), waitingLots(), campaignCounts(), listCampaigns(tab, page),
    ]);
    // Orders after each listed campaign: all time since the oldest one on this page started.
    const oldest = list.rows.reduce<string | null>((m, r) => (r.started_at && (!m || r.started_at < m) ? r.started_at : m), null);
    const campAttr = oldest ? await attribution(oldest) : new Map();
    loaded = { overview, stats30, attr30, cart, settings, runs, waiting, counts, list, campAttr };
  } catch (err) {
    console.error("email overview failed:", err);
    return (
      <div className="a-page">
        <Crumbs items={[{ label: "Email" }]} />
        <div className="a-ph"><div><h1>Email</h1></div></div>
        <div className="a-callout warn" role="alert"><Icon name="warn" /><span>Email numbers couldn&apos;t load. Reload the page; if it keeps happening, the owner alert email has the details.</span></div>
      </div>
    );
  }
  const { overview, stats30, attr30, cart, settings, runs, waiting, counts, list, campAttr } = loaded;
  const welcome = sumKinds(stats30, "welcome_"), carts = sumKinds(stats30, "cart_");
  const welcomeAttr = sumAttribution(attr30, "welcome_");
  const href = (o: { tab?: CampaignTab; page?: number }) => {
    const p = new URLSearchParams();
    const t = o.tab ?? tab;
    if (t !== "all") p.set("tab", t);
    if (o.page && o.page > 1) p.set("page", String(o.page));
    const s = p.toString();
    return `/admin/email${s ? `?${s}` : ""}`;
  };
  const lastPage = Math.max(1, Math.ceil(list.total / CAMPAIGNS_PER_PAGE));

  return (
    <div className="a-page">
      <Crumbs items={[{ label: "Email" }]} />
      <div className="a-ph">
        <div><h1>Email</h1><p>What&apos;s going out, how it&apos;s landing, and the orders that followed. Campaigns go to confirmed subscribers only.</p></div>
        <div className="actions"><Link className="a-btn primary" href="/admin/email/campaigns/new"><Icon name="plus" />New campaign</Link></div>
      </div>

      <HealthStrip o={overview} />
      <RunLine last={runs[0] ?? null} />

      {waiting.length > 0 && (
        <form action={announceAction} className="a-waiting">
          <Icon name="catalog" />
          <div><b>{waiting.length} lot{waiting.length === 1 ? "" : "s"} waiting to announce</b><div className="muted" style={{ fontSize: 12 }}>Certified, live and not emailed yet</div></div>
          <div className="lots">{waiting.map((l) => <span key={l.lot} className="a-lotpill">{l.compoundName} {l.strengths} · {l.lot}</span>)}</div>
          <button type="submit" className="a-btn"><Icon name="send" />Announce</button>
        </form>
      )}

      <div className="a-sec-h"><h3>Automations</h3><span>sent by the hourly run · numbers are {STATS_DAYS} days</span></div>
      <table className="a-t a-only-desk" style={{ marginBottom: 22 }}>
        <thead><tr><th>Automation</th><th>Status</th><th className="num">Sent</th><th className="num">Bounced</th><th className="num">Unsubscribed</th><th className="num">Orders after</th><th className="num">Revenue after</th></tr></thead>
        <tbody>
          <tr>
            <td className="a-auto-name"><b>{AUTOMATION_LABEL.welcome}</b><small>&quot;The Paperwork&quot; · {WELCOME_DAYS.length} files over {WELCOME_DAYS[WELCOME_DAYS.length - 1]} days</small></td>
            <td><AutomationSwitch automation="welcome" label={AUTOMATION_LABEL.welcome} paused={settings.welcomePaused} /></td>
            <td className="num">{n(welcome.sent)}</td><td className="num">{n(welcome.bounced)}</td><td className="num">{n(welcome.unsubscribed)}</td>
            <td className="num">{n(welcomeAttr.orders)}</td><td className="num">{money(welcomeAttr.revenueCents)}</td>
          </tr>
        </tbody>
        <tbody className="a-steprows">
          {WELCOME_DAYS.map((d, i) => {
            const s = stats30.get(`welcome_${i + 1}`), a = attr30.get(`welcome_${i + 1}`);
            return (
              <tr key={d}><td>File 0{i + 1} · day {d}<span className="subj">&quot;{WELCOME_SUBJECTS[i]}&quot;</span></td><td />
                <td className="num">{n(s?.sent ?? 0)}</td><td className="num">{n(s?.bounced ?? 0)}</td><td className="num">{n(s?.unsubscribed ?? 0)}</td>
                <td className="num">{n(a?.orders ?? 0)}</td><td className="num">{money(a?.revenueCents ?? 0)}</td></tr>
            );
          })}
        </tbody>
        <tbody>
          <tr>
            <td className="a-auto-name"><b>{AUTOMATION_LABEL.cart}</b><small>{CART_HOURS.length} reminders while the checkout is open ({CART_HOURS.join(", ")} h)</small></td>
            <td><AutomationSwitch automation="cart" label={AUTOMATION_LABEL.cart} paused={settings.cartPaused} /></td>
            <td className="num">{n(carts.sent)}</td><td className="num">{n(carts.bounced)}</td><td className="num">{n(carts.unsubscribed)}</td>
            <td className="num">{n(cart.recovered)} <span className="muted">recovered</span></td><td className="num">{money(cart.revenueCents)}</td>
          </tr>
        </tbody>
        <tbody className="a-steprows">
          {CART_HOURS.map((h, i) => {
            const s = stats30.get(`cart_${i + 1}`);
            return <tr key={h}><td>Reminder {i + 1} · {h} h</td><td /><td className="num">{n(s?.sent ?? 0)}</td><td className="num">{n(s?.bounced ?? 0)}</td><td className="num">{n(s?.unsubscribed ?? 0)}</td><td className="num muted">—</td><td className="num muted">—</td></tr>;
          })}
        </tbody>
      </table>
      <div className="a-plist a-only-phone" style={{ marginBottom: 12 }}>
        <div className="a-pauto"><b>{AUTOMATION_LABEL.welcome}</b><AutomationSwitch automation="welcome" label={AUTOMATION_LABEL.welcome} paused={settings.welcomePaused} /><div className="meta"><span><b>{n(welcome.sent)}</b> sent</span><span><b>{n(welcomeAttr.orders)}</b> orders</span><span><b>{money(welcomeAttr.revenueCents)}</b></span></div></div>
        <div className="a-pauto"><b>{AUTOMATION_LABEL.cart}</b><AutomationSwitch automation="cart" label={AUTOMATION_LABEL.cart} paused={settings.cartPaused} /><div className="meta"><span><b>{n(carts.sent)}</b> sent</span><span><b>{n(cart.recovered)}</b> recovered</span><span><b>{money(cart.revenueCents)}</b></span></div></div>
      </div>

      <div className="a-sec-h"><h3>Campaigns</h3><span>orders and revenue = paid within the 7 days after the email</span></div>
      <div className="a-toolbar"><Tabs items={TABS.map(([t, label]) => ({ href: href({ tab: t, page: 1 }), label, n: counts[t], on: t === tab }))} /></div>
      {list.rows.length === 0 ? <div className="a-empty">No campaigns here yet. Use New campaign, or Announce when a lot goes live.</div> : (
        <>
          <table className="a-t a-only-desk">
            <thead><tr><th>Campaign</th><th>Type</th><th>Status</th><th>Audience</th><th className="num">Recipients</th><th className="num">Orders</th><th className="num">Revenue</th><th>Date</th></tr></thead>
            <tbody>{list.rows.map((c) => {
              const started = c.status !== "draft" && c.status !== "scheduled";
              const a = campAttr.get(statKey("campaign", c.id));
              return (
                <tr key={c.id}>
                  <td className="a-camp"><b><Link href={`/admin/email/campaigns/${c.id}`}>{c.name}</Link></b><small>{c.subject}</small></td>
                  <td><span className="a-typetag">{KIND_LABEL[c.kind]}</span></td>
                  <td><span className={`a-chip ${STATUS_CHIP[c.status]}`}>{CAMPAIGN_STATUS_LABEL[c.status]}</span></td>
                  <td>{AUDIENCE_LABEL[c.audience]}</td>
                  <td className={`num${started ? "" : " muted"}`}>{started ? n(c.recipients) : "—"}</td>
                  <td className={`num${started ? "" : " muted"}`}>{started ? n(a?.orders ?? 0) : "—"}</td>
                  <td className={`num${started ? "" : " muted"}`}>{started ? money(a?.revenueCents ?? 0) : "—"}</td>
                  <td>{c.status === "scheduled" && c.scheduled_for ? dateTime(c.scheduled_for) : c.started_at ? shortDate(c.started_at) : <span className="muted">—</span>}</td>
                </tr>
              );
            })}</tbody>
          </table>
          <div className="a-plist a-only-phone">{list.rows.map((c) => (
            <Link key={c.id} href={`/admin/email/campaigns/${c.id}`} className="a-pitem">
              <b>{c.name}</b><span className={`a-chip ${STATUS_CHIP[c.status]}`}>{CAMPAIGN_STATUS_LABEL[c.status]}</span>
              <div className="meta"><span>{KIND_LABEL[c.kind]}</span><span>{AUDIENCE_LABEL[c.audience]}</span>{c.status === "scheduled" && c.scheduled_for && <span>{dateTime(c.scheduled_for)}</span>}</div>
            </Link>
          ))}</div>
          <div className="a-tfoot">
            Showing {(page - 1) * CAMPAIGNS_PER_PAGE + 1}–{Math.min(page * CAMPAIGNS_PER_PAGE, list.total)} of {n(list.total)} · newest first
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
