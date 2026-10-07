import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireOwner } from "@/lib/dal";
import { getPartnerDetail, PARTNER_LINES_PAGE, type PartnerLine } from "@/lib/partners/detail";
import { getPayoutDetails } from "@/lib/partners/data";
import { AUDIENCE_SIZES, PARTNER_TYPES, PUBLISH_CHANNELS } from "@/lib/partners/codes";
import { nextTier } from "@/lib/partners/tiers";
import { formatRunDate } from "@/lib/partners/ledger";
import { shortDate } from "@/lib/discounts/time";
import { currentMs } from "@/lib/clock";
import { usd } from "@/lib/html";
import { setPartnerStatusAction } from "@/app/admin/partners/actions";
import { markW9CheckedAction, openW9Action } from "@/app/admin/payouts/actions";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { ApproveDecline, PartnerStatusChip, PayoutPref, W9Chip } from "@/components/admin/partners/bits";
import { Crumbs, Kpis } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Partner", robots: { index: false, follow: false } };

const STATE = { pending: "Pending", clearing: "Clearing", payable: "Payable", paid: "Paid", void: "Void" } as const;
const PAYOUT = { queued: "To send", paid: "Paid", credited: "Credited" } as const;
const signed = (c: number) => (c < 0 ? `−${usd(-c)}` : usd(c));

function LineState({ l }: { l: PartnerLine }) {
  if (l.kind === "adjustment") return <span className="a-chip k-adj">Adjustment</span>;
  return <>{<span className={`a-chip k-${l.state}`}>{STATE[l.state]}</span>}
    {l.state === "clearing" && l.clearsAt && <span className="sub">clears {shortDate(l.clearsAt)}</span>}
    {l.state === "pending" && <span className="sub">clears after shipping</span>}</>;
}

export default async function PartnerPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ page?: string }> }) {
  await requireOwner();
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const pageRaw = Number((await searchParams).page);
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.trunc(pageRaw) : 1;
  const d = await getPartnerDetail(id, page, currentMs());
  if (!d) notFound();
  const p = d.partner;
  const name = p.customers?.full_name ?? p.code;
  const details = p.payout_method ? await getPayoutDetails(p.id) : null;
  const next = nextTier(p.lifetime_cents);
  const lastPage = Math.max(1, Math.ceil(d.totalLines / PARTNER_LINES_PAGE));
  const typeLabel = PARTNER_TYPES.find((t) => t.id === p.partner_type)?.label ?? p.partner_type;
  const sizeLabel = AUDIENCE_SIZES.find((a) => a.id === p.application.audienceSize)?.label ?? p.application.audienceSize;
  const pageHref = (n: number) => `/admin/partners/${p.id}${n > 1 ? `?page=${n}` : ""}`;

  return (
    <div className="a-page">
      <Crumbs items={[{ label: "Partners", href: "/admin/partners" }, { label: p.code }]} />
      <div className="a-dh">
        <h1 style={{ font: "400 28px/1.1 var(--serif)", margin: 0 }}>{name}</h1><PartnerStatusChip status={p.status} />
        <div className="actions">
          {p.status === "applied" && <ApproveDecline p={p} />}
          {p.status === "approved" && <ConfirmDialog label="Suspend" title={`Suspend ${p.code}?`} confirmLabel="Suspend" tone="danger" action={setPartnerStatusAction} fields={{ partnerId: p.id, to: "suspended" }}>
            Code and link stop working now. {usd(d.unpaidCents)} unpaid commission is forfeited. Store credit already issued stays spendable.
          </ConfirmDialog>}
          {p.status === "suspended" && <ConfirmDialog label="Reinstate" title={`Reinstate ${p.code}?`} confirmLabel="Reinstate" action={setPartnerStatusAction} fields={{ partnerId: p.id, to: "approved" }}>
            Code and link start working again. Commission forfeited at suspension does not come back.
          </ConfirmDialog>}
        </div>
      </div>
      <div className="a-dsub"><span className="a-mono">{p.code}</span><span className="dot" />{typeLabel}<span className="dot" />{p.approved_at ? `Partner since ${shortDate(p.approved_at)}` : `Applied ${shortDate(p.created_at)}`}</div>

      <Kpis items={[
        { label: "Clicks · 30 days", value: d.clicks30.toLocaleString("en-US"), sub: "link visits" },
        { label: "Orders", value: d.orders.toLocaleString("en-US"), sub: "with commission" },
        { label: "Lifetime sales", value: usd(p.lifetime_cents), sub: "goods paid" },
        { label: "Tier", value: `${p.tier_pct}%`, sub: next ? `${usd(next.remainingCents)} to ${next.pct}%` : "top tier" },
        { label: "Payable", value: usd(d.payableCents), sub: "paid on the next run" },
        { label: "Credit issued", value: usd(d.creditIssuedCents), sub: "lifetime" },
      ]} />

      <div className="a-og">
        <div>
          <div>
            <div className="a-sec-h"><h3>Commissions</h3><span>newest first</span></div>
            {d.lines.length === 0 ? <div className="a-empty">No commission yet.</div> : <>
              <table className="a-t">
                <thead><tr><th>Order</th><th className="a-only-desk">Date</th><th className="num a-only-desk">Base</th><th className="num a-only-desk">Rate</th><th className="num">Amount</th><th>State</th></tr></thead>
                <tbody>{d.lines.map((l) => (
                  <tr key={l.id}>
                    <td>{l.orderNumber === "—" ? l.orderNumber : <Link className="a-ord" href={`/admin/orders/${l.orderNumber}`}>{l.orderNumber}</Link>}{l.kind === "adjustment" && <span className="muted"> · {l.reason}</span>}</td>
                    <td className="a-only-desk">{shortDate(l.at)}</td>
                    <td className="num a-only-desk">{l.kind === "commission" ? usd(l.baseCents) : ""}</td>
                    <td className="num a-only-desk">{l.kind === "commission" ? `${l.ratePct}%` : ""}</td>
                    <td className={`num${l.amountCents < 0 ? " a-neg" : ""}`}>{signed(l.amountCents)}</td>
                    <td><LineState l={l} /></td>
                  </tr>
                ))}</tbody>
              </table>
              <div className="a-tfoot">{`${(page - 1) * PARTNER_LINES_PAGE + 1}–${Math.min(page * PARTNER_LINES_PAGE, d.totalLines)} of ${d.totalLines}`}{d.capped && " · newest 1,000 commissions"}
                <div className="r">{page > 1 && <Link className="a-btn sm" href={pageHref(page - 1)}>Previous</Link>}{page < lastPage && <Link className="a-btn sm" href={pageHref(page + 1)}>Next</Link>}</div></div>
            </>}
          </div>
          <div>
            <div className="a-sec-h"><h3>Payouts</h3></div>
            {d.payouts.length === 0 ? <div className="a-empty">No payout runs yet.</div> : (
              <table className="a-t">
                <thead><tr><th>Run</th><th className="num">Cash</th><th className="num">Store credit</th><th>Status</th><th className="a-only-desk">Reference</th><th className="a-only-desk">Paid</th></tr></thead>
                <tbody>{d.payouts.map((y) => (
                  <tr key={y.id}>
                    <td>{formatRunDate(y.run_date)}</td><td className="num">{usd(y.cash_cents)}</td><td className="num">{usd(y.credit_cents)}</td>
                    <td><span className={`a-chip y-${y.status}`}>{PAYOUT[y.status]}</span></td>
                    <td className="a-only-desk a-mono">{y.reference ?? <span className="muted">—</span>}</td>
                    <td className="a-only-desk">{y.paid_at ? shortDate(y.paid_at) : <span className="muted">—</span>}</td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </div>
        </div>
        <div>
          <div className="a-card">
            <div className="a-card-h"><h3>Payout</h3></div>
            <div className="a-card-b"><dl className="a-kv">
              <dt>Preference</dt><dd><PayoutPref p={p} /></dd>
              <dt>Method</dt><dd>{p.payout_details_hint ?? <span className="muted">None on file</span>}</dd>
              <dt>Carried</dt><dd>{usd(p.cash_carry_cents)}</dd>
            </dl>
            {details && <details style={{ marginTop: 8, fontSize: 12.5 }}><summary className="a-ulink">Show full details</summary>
              <p style={{ marginTop: 6 }}>{details.kind === "ach" ? `Routing ${details.routing} · Account ${details.account} · ${details.bank}` : `Zelle ${details.handle}`}</p></details>}</div>
          </div>
          <div className="a-card">
            <div className="a-card-h"><h3>W-9</h3><div className="r"><W9Chip p={p} /></div></div>
            <div className="a-card-b" style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12.5, flexWrap: "wrap" }}>
              <span className="muted">{p.w9_uploaded_at ? `Uploaded ${shortDate(p.w9_uploaded_at)}` : "Not uploaded"}{p.w9_checked_at ? ` · checked ${shortDate(p.w9_checked_at)}` : ""}</span>
              {p.w9_path && <span className="a-acts" style={{ marginLeft: "auto" }}>
                <form action={openW9Action}><input type="hidden" name="partnerId" value={p.id} /><button type="submit" className="a-btn sm">Open W-9</button></form>
                {!p.w9_checked_at && <form action={markW9CheckedAction}><input type="hidden" name="partnerId" value={p.id} /><button type="submit" className="a-btn sm primary">Mark checked</button></form>}
              </span>}
            </div>
          </div>
          <div className="a-card">
            <div className="a-card-h"><h3>Application</h3><span className="sub">{shortDate(p.created_at)}</span></div>
            <div className="a-card-b"><dl className="a-kv">
              <dt>Publishes at</dt><dd style={{ overflowWrap: "anywhere" }}>{[
                ...PUBLISH_CHANNELS.filter((c) => p.application.channels?.[c.id]).map((c) => `${c.label}: ${p.application.channels[c.id]}`),
                ...(p.application.other ? [`Other: ${p.application.other}`] : []),
              ].map((l) => <span key={l} style={{ display: "block" }}>{l}</span>)}</dd>
              <dt>Audience</dt><dd>{sizeLabel}</dd>
            </dl>
            {p.application.promotion && <div className="a-pitch" style={{ whiteSpace: "pre-wrap" }}>{p.application.promotion}</div>}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
