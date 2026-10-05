import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireOwner } from "@/lib/dal";
import { getCustomerDetail, type CustomerDetail, type CustomerEvent, type LedgerRow } from "@/lib/customers/data";
import { CATEGORY_LABEL, fingerprint, offerState, summarizeUserAgent, type CreditCategory } from "@/lib/customers/rules";
import { dateTime, shortDate } from "@/lib/discounts/time";
import { usd } from "@/lib/html";
import { NEW_ACCOUNT_PCT } from "@/lib/account/offer";
import { unblockAction } from "@/app/admin/customers/actions";
import CreditDialog from "@/components/admin/customers/CreditDialog";
import BlockDialog from "@/components/admin/customers/BlockDialog";
import ResendVerify from "@/components/admin/customers/ResendVerify";
import ConfirmSubmit from "@/components/admin/ConfirmSubmit";
import { Crumbs, Icon, Kpis } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Customer", robots: { index: false, follow: false } };

const PAID = new Set(["paid", "shipped"]);
const STATUS_TEXT: Record<string, string> = { awaiting_payment: "Open checkout", processing: "Processing", paid: "Paid", shipped: "Shipped", cancelled: "Cancelled", refunded: "Refunded" };
const fullDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const utcStamp = (iso: string) => `${new Date(iso).toLocaleString("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })} UTC`;
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");

function ledgerText(l: LedgerRow, events: CustomerEvent[], orderNo: Map<string, string>): React.ReactNode {
  const ord = l.ref_id ? orderNo.get(l.ref_id) : undefined;
  if (l.reason === "owner_adjust") {
    const e = events.find((x) => x.id === l.ref_id);
    const who = e?.actorName ?? "the owner";
    const cat = e?.reason ? CATEGORY_LABEL[e.reason as CreditCategory] ?? e.reason : null;
    return <>{l.amount_cents > 0 ? "Added" : "Removed"} by {who}{cat && <> · <b>{cat}</b></>}{l.note && <small>&quot;{l.note}&quot;</small>}</>;
  }
  if (l.reason === "order_spend") return <>Spent on {ord ?? "an order"}</>;
  if (l.reason === "order_cancel") return <>Returned — {ord ?? "order"} cancelled</>;
  if (l.reason === "order_refund") return <>Refund to credit — {ord ?? "order"}</>;
  if (l.reason === "payout") return <>Partner payout</>;
  return l.reason;
}

function eventText(e: CustomerEvent): React.ReactNode {
  const who = e.actorName ?? "Owner";
  switch (e.kind) {
    case "blocked": return <>{who} <b>blocked</b> the account{e.note ? ` · ${e.note}` : ""}</>;
    case "unblocked": return <>{who} unblocked the account</>;
    case "credit_added": return <>{who} added <b>{usd(e.amount_cents ?? 0)}</b> store credit · {CATEGORY_LABEL[e.reason as CreditCategory] ?? e.reason}</>;
    case "credit_removed": return <>{who} removed <b>{usd(e.amount_cents ?? 0)}</b> store credit · {CATEGORY_LABEL[e.reason as CreditCategory] ?? e.reason}</>;
    case "verify_resent": return <>{who} resent the verification email</>;
  }
}

function Agreements({ c }: { c: CustomerDetail }) {
  const a = c.agreements[0];
  const tick = (ok: boolean, label: string, sub: string) => <div className={ok ? undefined : "no"}><Icon name={ok ? "check" : "warn"} /><span>{label}<small>{sub}</small></span></div>;
  return (
    <div className="a-card">
      <div className="a-card-h"><h3>Agreement record</h3><span className="sub a-only-desk">what they agreed to at sign-up — use it for disputes</span></div>
      <div className="a-card-b">
        {!a ? <p className="muted">No agreement on file{c.attestations.length ? " — see earlier attestations below" : ""}.</p> : <>
          <dl className="a-facts2">
            <dt>Agreed</dt><dd><b>{utcStamp(a.agreed_at)}</b></dd>
            <dt>Terms version</dt><dd className="a-mono">{a.terms_version}</dd>
            <dt>Device</dt><dd>{summarizeUserAgent(a.user_agent)}</dd>
            <dt>IP fingerprint</dt><dd className="a-mono">{fingerprint(a.ip_hash)}</dd>
          </dl>
          <div className="a-agree">
            {tick(a.age_21, "21 or older", "age confirmed")}
            {tick(a.ruo, "Research use only", "not for human use")}
            {tick(a.dispute_policy, "Dispute policy", "contact us before a chargeback")}
          </div>
        </>}
        {c.attestations.length > 0 && (
          <details style={{ marginTop: 12 }}><summary className="muted">Earlier attestations ({c.attestations.length})</summary>
            <ul className="a-log" style={{ marginTop: 10 }}>{c.attestations.map((t) => <li key={t.id}><div>Terms {t.terms_version} · {summarizeUserAgent(t.user_agent)}<small>{utcStamp(t.attested_at)} · IP {fingerprint(t.ip_hash)}</small></div></li>)}</ul>
          </details>
        )}
      </div>
    </div>
  );
}

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireOwner();
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const c = await getCustomerDetail(id);
  if (!c) notFound();

  const paid = c.orders.filter((o) => PAID.has(o.status));
  const spent = paid.reduce((s, o) => s + o.total_cents - o.store_credit_cents, 0);
  const balance = c.ledger.reduce((s, l) => s + l.amount_cents, 0);
  const open = c.orders.filter((o) => o.status === "awaiting_payment");
  const cancelled = c.orders.filter((o) => o.status === "cancelled").length;
  const orderNo = new Map(c.orders.map((o) => [o.id, o.order_number]));
  const offer = offerState(c.createdAt, c.orders.find((o) => o.new_account_discount && PAID.has(o.status))?.order_number ?? null);
  // Running balance, newest first: the balance after each row = today's balance minus every newer change.
  const ledgerRows = c.ledger.map((l, i) => ({ l, after: balance - c.ledger.slice(0, i).reduce((sum, x) => sum + x.amount_cents, 0) }));

  return (
    <div className="a-page">
      <Crumbs items={[{ label: "Customers", href: "/admin/customers" }, { label: c.fullName }]} />
      {c.blockedAt && (
        <div className="a-banner" role="status">
          <Icon name="lock" /><span><b>Blocked {shortDate(c.blockedAt)}{c.blockedBy ? ` by ${c.blockedBy}` : ""}.</b> {c.blockedReason}</span>
          <form action={unblockAction}><input type="hidden" name="customerId" value={c.id} /><ConfirmSubmit className="a-btn sm" message="Unblock this account? They can sign in again. Cancelled checkouts stay cancelled.">Unblock</ConfirmSubmit></form>
        </div>
      )}
      <div className="a-idh">
        <div className="av" aria-hidden>{initials(c.fullName)}</div>
        <div>
          <h1>{c.fullName} {c.blockedAt ? <span className="a-chip blocked">Blocked</span> : c.verifiedAt ? <span className="a-chip ver">Verified</span> : <span className="a-chip unver">Unverified</span>}{c.isPartner && <span className="a-chip partner">Partner</span>}{c.isOwner && <span className="a-chip owner">Owner</span>}</h1>
          <div className="sub">{c.email}{c.organization && <><span className="dot" />{c.organization}</>}<span className="dot" />Joined {fullDate(c.createdAt)}</div>
        </div>
        <div className="actions">
          {!c.verifiedAt && !c.blockedAt && <ResendVerify customerId={c.id} />}
          <CreditDialog customerId={c.id} balanceCents={balance} />
          {!c.blockedAt && !c.isOwner && <BlockDialog customerId={c.id} name={c.fullName} openCheckouts={open.map((o) => ({ number: o.order_number, totalCents: o.total_cents }))} />}
        </div>
      </div>
      {!c.verifiedAt && !c.blockedAt && (
        <div className="a-callout warn" style={{ marginBottom: 16 }}><Icon name="mail" /><span>Hasn&apos;t confirmed their email.{c.verifySentAt ? ` Verification sent ${dateTime(c.verifySentAt)}.` : ""}</span></div>
      )}

      <Kpis items={[
        { label: "Paid orders", value: paid.length, sub: cancelled ? `${cancelled} cancelled checkout${cancelled === 1 ? "" : "s"}` : undefined },
        { label: "Spent", value: usd(spent), sub: "after store credit" },
        { label: "Average order", value: paid.length ? usd(Math.round(spent / paid.length)) : "—", sub: "per paid order" },
        { label: "Store credit", value: usd(balance), sub: c.blockedAt ? "kept while blocked" : "spendable now" },
      ]} />

      <div className="a-grid-d">
        <div className="a-stack">
          <div className="a-card">
            <div className="a-card-h"><h3>Orders</h3><span className="sub">{c.orders.length}</span></div>
            {c.orders.length === 0 ? <div className="a-card-b muted">No orders yet.</div> : (
              <table className="a-t" style={{ border: 0 }}>
                <thead><tr><th>Order</th><th>Date</th><th>Status</th><th className="num a-only-desk">Items</th><th className="num">Total</th><th className="num a-only-desk">Credit used</th></tr></thead>
                <tbody>{c.orders.map((o) => (
                  <tr key={o.id}>
                    <td><Link className="a-ord" href={`/admin/orders?status=${o.status}#${o.order_number}`}>{o.order_number}</Link></td>
                    <td>{shortDate(o.created_at)}</td>
                    <td><span className={`a-chip o-${o.status}`}>{STATUS_TEXT[o.status] ?? o.status}</span></td>
                    <td className="num a-only-desk">{o.order_items.reduce((s, i) => s + i.quantity, 0)}</td>
                    <td className={`num${PAID.has(o.status) ? "" : " muted"}`}>{usd(o.total_cents)}</td>
                    <td className="num a-only-desk">{o.store_credit_cents ? usd(o.store_credit_cents) : <span className="muted">—</span>}</td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </div>

          <div className="a-card">
            <div className="a-card-h"><h3>Store credit</h3><span className="sub">balance <b className="a-mono" style={{ color: "var(--ink)" }}>{usd(balance)}</b></span></div>
            {ledgerRows.length === 0 ? <div className="a-card-b muted">No store credit yet.</div> : (
              <table className="a-t a-ledger" style={{ border: 0 }}>
                <thead><tr><th>Date</th><th>What</th><th className="num">Change</th><th className="num a-only-desk">Balance</th></tr></thead>
                <tbody>{ledgerRows.map(({ l, after }) => (
                  <tr key={l.id}>
                    <td>{shortDate(l.created_at)}</td>
                    <td>{ledgerText(l, c.events, orderNo)}</td>
                    <td className={`num a-mono${l.amount_cents > 0 ? " plus" : ""}`}>{l.amount_cents > 0 ? "+" : "−"}{usd(Math.abs(l.amount_cents))}</td>
                    <td className="num a-mono a-only-desk">{usd(after)}</td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </div>

          <Agreements c={c} />
        </div>

        <div className="a-stack">
          <div className="a-card">
            <div className="a-card-h"><h3>Overview</h3></div>
            <div className="a-card-b" style={{ paddingTop: 6, paddingBottom: 6 }}>
              <dl className="a-facts2">
                <dt>New-account {NEW_ACCOUNT_PCT}%</dt>
                <dd>{offer.kind === "used" ? <>Used on {offer.order}</> : offer.kind === "open" ? <>Available until {dateTime(offer.until)}</> : "Expired unused"}</dd>
                <dt>Referred by</dt>
                <dd>{c.referrer ? <>{c.referrer.name} <span className="a-chip partner">Partner</span><small className="muted" style={{ display: "block" }}>via {c.referrer.via ?? "partner"} · {shortDate(c.referrer.at)}</small></> : <span className="muted">—</span>}</dd>
                <dt>Marketing email</dt><dd>{c.marketingOptIn ? "Opted in" : "Not opted in"}</dd>
                <dt>Email verified</dt><dd>{c.verifiedAt ? dateTime(c.verifiedAt) : <span className="muted">Not yet</span>}</dd>
              </dl>
            </div>
          </div>
          {c.ship && (
            <div className="a-card"><div className="a-card-h"><h3>Ships to</h3></div>
              <div className="a-card-b a-addr">{c.ship.name}<br />{c.ship.line1}{c.ship.line2 && <><br />{c.ship.line2}</>}<br />{c.ship.city}, {c.ship.state} {c.ship.zip}</div></div>
          )}
          <div className="a-card">
            <div className="a-card-h"><h3>Activity</h3></div>
            <div className="a-card-b">
              <ul className="a-log">
                {c.events.map((e) => <li key={e.id}><div>{eventText(e)}<small>{dateTime(e.created_at)}{e.kind === "blocked" && e.reason ? " · reason in the banner" : e.note && e.kind !== "blocked" ? ` · "${e.note}"` : ""}</small></div></li>)}
                {c.verifiedAt && <li><div>Email verified<small>{dateTime(c.verifiedAt)}</small></div></li>}
                <li><div>Account created{c.agreements[0] ? ` · agreed to terms ${c.agreements[0].terms_version}` : ""}<small>{dateTime(c.createdAt)}</small></div></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
