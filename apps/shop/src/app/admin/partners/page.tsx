import type { Metadata } from "next";
import Link from "next/link";
import { requireOwner } from "@/lib/dal";
import { countPartners, listPartners, type PartnerRow, type PartnerStatus } from "@/lib/partners/data";
import { payableByPartner } from "@/lib/partners/ledger";
import { AUDIENCE_SIZES, PARTNER_TYPES, PUBLISH_CHANNELS } from "@/lib/partners/codes";
import { shortDate } from "@/lib/discounts/time";
import { usd } from "@/lib/html";
import { Crumbs, Tabs } from "@/components/admin/ui";
import { ApproveDecline, PayoutPref, W9Chip } from "@/components/admin/partners/bits";

export const metadata: Metadata = { title: "Partners", robots: { index: false, follow: false } };

const TABS: Array<[PartnerStatus, string]> = [["applied", "Applications"], ["approved", "Active"], ["suspended", "Suspended"], ["declined", "Declined"]];
const typeLabel = (id: string) => PARTNER_TYPES.find((t) => t.id === id)?.label ?? id;
const sizeLabel = (id: string) => AUDIENCE_SIZES.find((a) => a.id === id)?.label ?? id;
const name = (p: PartnerRow) => p.customers?.full_name ?? p.code;
const channels = (p: PartnerRow) => [
  ...PUBLISH_CHANNELS.filter((c) => p.application.channels?.[c.id]).map((c) => `${c.label}: ${p.application.channels[c.id]}`),
  ...(p.application.other ? [`Other: ${p.application.other}`] : []),
];

export default async function PartnersPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireOwner();
  const { tab: raw } = await searchParams;
  const tab = (TABS.find(([s]) => s === raw)?.[0] ?? "applied") as PartnerStatus;
  const [counts, partners, payable] = await Promise.all([countPartners(), listPartners(tab), tab === "approved" ? payableByPartner() : Promise.resolve({} as Record<string, number>)]);

  return (
    <div className="a-page">
      <Crumbs items={[{ label: "Partners" }]} />
      <div className="a-ph"><div><h1>Partners</h1><p>Affiliates who earn commission on orders placed with their code or link. Approve applications, and open a partner to see their sales, commission and payouts.</p></div></div>
      <div className="a-toolbar"><Tabs items={TABS.map(([s, label]) => ({ href: s === "applied" ? "/admin/partners" : `/admin/partners?tab=${s}`, label, n: counts[s], on: s === tab }))} /></div>

      {partners.length === 0 ? <div className="a-empty">{tab === "applied" ? "No applications waiting." : "Nobody here."}</div> : tab === "applied" ? (
        <>
          <table className="a-t a-only-desk">
            <thead><tr><th>Applicant</th><th>Type</th><th>Publishes at</th><th>Audience</th><th>Code</th><th /></tr></thead>
            <tbody>{partners.map((p) => (
              <tr key={p.id}>
                <td className="a-cust"><b><Link href={`/admin/partners/${p.id}`}>{name(p)}</Link></b><small>applied {shortDate(p.created_at)}{p.customers?.organization ? ` · ${p.customers.organization}` : ""}</small></td>
                <td>{typeLabel(p.partner_type)}</td>
                <td style={{ overflowWrap: "anywhere" }}>{channels(p).map((l) => <span key={l} style={{ display: "block" }}>{l}</span>)}</td>
                <td>{sizeLabel(p.application.audienceSize)}</td>
                <td className="a-mono">{p.code}</td>
                <td><ApproveDecline p={p} small /></td>
              </tr>
            ))}</tbody>
          </table>
          <div className="a-plist a-only-phone">{partners.map((p) => (
            <div key={p.id} className="a-pord">
              <Link className="a-plain" href={`/admin/partners/${p.id}`}><b>{name(p)}</b></Link><span className="a-mono">{p.code}</span>
              <span className="nm">{typeLabel(p.partner_type)} · {sizeLabel(p.application.audienceSize)}</span>
              <div className="row2"><ApproveDecline p={p} small /></div>
            </div>
          ))}</div>
        </>
      ) : (
        <>
          <table className="a-t a-only-desk">
            <thead><tr><th>Partner</th><th>Type</th><th className="num">Tier</th><th className="num">Lifetime sales</th><th className="num">Payable</th><th>Paid as</th><th>W-9</th></tr></thead>
            <tbody>{partners.map((p) => (
              <tr key={p.id}>
                <td className="a-cust"><b><Link href={`/admin/partners/${p.id}`}>{name(p)}</Link></b><small className="a-mono">{p.code}</small></td>
                <td>{typeLabel(p.partner_type)}</td>
                <td className="num">{p.tier_pct}%</td>
                <td className="num">{usd(p.lifetime_cents)}</td>
                <td className="num">{tab === "approved" ? usd(payable[p.id] ?? 0) : <span className="muted">—</span>}</td>
                <td><PayoutPref p={p} /></td>
                <td><W9Chip p={p} /></td>
              </tr>
            ))}</tbody>
          </table>
          <div className="a-plist a-only-phone">{partners.map((p) => (
            <Link key={p.id} href={`/admin/partners/${p.id}`} className="a-pord">
              <b>{name(p)}</b><span className="tot">{p.tier_pct}%</span>
              <span className="nm a-mono">{p.code}</span>
              <div className="row2"><W9Chip p={p} />{tab === "approved" && <span>payable <b>{usd(payable[p.id] ?? 0)}</b></span>}</div>
            </Link>
          ))}</div>
          <div className="a-tfoot">{partners.length} {TABS.find(([s]) => s === tab)![1].toLowerCase()}<div className="r muted">Suspend and reinstate are on each partner&apos;s page</div></div>
        </>
      )}
    </div>
  );
}
