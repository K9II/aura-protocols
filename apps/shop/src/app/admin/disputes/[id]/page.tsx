import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireOwner } from "@/lib/dal";
import { currentMs } from "@/lib/clock";
import { getDisputeCase } from "@/lib/disputes/data";
import { LETTER_FOR, buildEvidence, customerStrings, editable, evidenceSections, letterKind } from "@/lib/disputes/evidence";
import { evidenceViolations } from "@/lib/disputes/checks";
import { buildEvidencePdf } from "@/lib/disputes/pdf";
import { carrierName, longDate, plural } from "@/lib/disputes/format";
import { BANK_DECISION_DAYS, SHOP_LEGAL_NAME } from "@/lib/disputes/constants";
import { dueInfo, eventText, isClosed, needsResponse, reasonLabel, statusChip } from "@/lib/disputes/rules";
import { fingerprint, summarizeUserAgent } from "@/lib/customers/rules";
import { dateTime, shortDate } from "@/lib/discounts/time";
import { timeOfDay } from "@/lib/today/time";
import { usd } from "@/lib/html";
import { Crumbs, Icon } from "@/components/admin/ui";
import BlockDialog from "@/components/admin/customers/BlockDialog";
import EvidenceForm from "@/components/admin/disputes/EvidenceForm";

export const metadata: Metadata = { title: "Chargeback", robots: { index: false, follow: false } };

const stamp = (iso: string) => `${longDate(iso)}, ${timeOfDay(iso)} MT`;
type Tile = { l: string; v: string; d?: string; cls?: string; phone?: boolean };

// Respond to a chargeback (mock screen 2), or read it once submitted or
// decided (screen 4). Spec 2026-10-05-admin-disputes-design.md.
export default async function DisputePage({ params }: { params: Promise<{ id: string }> }) {
  await requireOwner();
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const c = await getDisputeCase(id);
  if (!c) notFound();
  const nowMs = currentMs();
  const d = c.dispute, f = c.facts, o = f.order;
  const built = buildEvidence(f);
  const values = d.draft ?? editable(built);
  const scanOk = Object.keys(evidenceViolations({ ...built, ...values }, customerStrings(f))).length === 0;
  const pdf = await buildEvidencePdf(f);
  const sections = evidenceSections(f);
  const due = dueInfo(d.evidence_due_by, nowMs);
  const chip = statusChip(d);
  const respond = needsResponse(d);
  const closed = isClosed(d);
  const pdfHref = `/admin/disputes/${d.id}/evidence.pdf`;
  const submittedBy = c.events.find((e) => e.action === "submitted")?.actorName ?? null;
  const vials = f.items.reduce((s, i) => s + i.vials, 0);
  const a = f.agreement;

  const agreement: Array<[string, string]> = [
    ["Account created", stamp(f.customer.createdAt)],
    ["Agreed", a ? `${stamp(a.agreedAt)} · terms v${a.termsVersion}` : "No agreement on file"],
    ...(a ? [
      ["Confirmed", [a.age21 && "21 or older", a.ruo && "research use only", a.disputePolicy && "Refund & Dispute Policy"].filter(Boolean).join(" · ")],
      ["IP (hashed)", fingerprint(a.ipHash)],
      ["Browser", summarizeUserAgent(a.userAgent)],
    ] as Array<[string, string]> : []),
    ["Orders before this", f.priorOrders.length ? f.priorOrders.map((p) => `${p.number} (${shortDate(p.paidAt)}${p.disputed ? ", disputed" : ""})`).join(", ") : "None"],
  ];

  const sub = respond
    ? `Opened ${shortDate(d.opened_at)} by the card issuer · ${d.draft_saved_at ? `draft saved to Stripe ${dateTime(d.draft_saved_at)}` : "no draft saved yet"} · nothing is final until you submit.`
    : [
      `Opened ${shortDate(d.opened_at)}`,
      d.submitted_at ? `evidence submitted ${shortDate(d.submitted_at)}${submittedBy ? ` by ${submittedBy}` : ""}` : "no evidence submitted",
      closed && d.closed_at ? `decided ${shortDate(d.closed_at)}` : "waiting for the bank",
    ].join(" · ");

  const tiles: Tile[] = [
    { l: "Reason", v: reasonLabel(d.reason), d: d.reason },
    {
      l: "Amount", v: usd(d.amount_cents), phone: false,
      d: d.funds_reinstated_at ? `returned ${shortDate(d.funds_reinstated_at)}` : d.funds_withdrawn_at ? `withdrawn ${shortDate(d.funds_withdrawn_at)} + ${usd(d.fee_cents)} fee` : undefined,
    },
    respond
      ? { l: "Respond by", v: due?.date ?? "—", cls: due?.red ? "red" : undefined, d: due && d.evidence_due_by ? `${due.left} · ${timeOfDay(d.evidence_due_by)} MT` : undefined }
      : closed
        ? { l: "Fee", v: usd(d.fee_cents), d: "Stripe's dispute fee" }
        : { l: "Submitted", v: d.submitted_at ? shortDate(d.submitted_at) : "—", d: "waiting for the bank" },
    closed
      ? { l: "Outcome", v: chip.text, cls: d.status === "won" ? "won" : d.status === "lost" ? "red" : undefined, d: d.closed_at ? shortDate(d.closed_at) : undefined, phone: false }
      : { l: "Tracking", v: o.shippedAt ? "Shipped" : "Not shipped", d: o.shippedAt ? `${carrierName(o.carrier)} · ${shortDate(o.shippedAt)}` : undefined, phone: false },
  ];

  const outcome = d.status === "won"
    ? <div className="a-callout ok"><Icon name="check" /><span>The bank decided for you. {usd(d.amount_cents)} was returned to your balance{d.funds_reinstated_at ? ` on ${shortDate(d.funds_reinstated_at)}` : ""}.</span></div>
    : d.status === "lost"
      ? <div className="a-callout warn"><Icon name="warn" /><span>The bank decided for the cardholder. The {usd(d.amount_cents)} and Stripe&apos;s fee stay withdrawn.</span></div>
      : closed
        ? <div className="a-callout info"><Icon name="info" /><span>Closed: {chip.text.toLowerCase()}.</span></div>
        : <div className="a-callout info"><Icon name="info" /><span>Submitted. The bank usually decides within {BANK_DECISION_DAYS[0]}–{BANK_DECISION_DAYS[1]} days; you&apos;ll get an alert when it does.</span></div>;

  return (
    <div className="a-page">
      <Crumbs items={[{ label: "Disputes", href: "/admin/disputes" }, { label: o.number }]} />
      <div className="a-ph">
        <div><h1>Chargeback on {o.number} <span className={`a-chip ${chip.tone}`}>{chip.text}</span></h1><p>{sub}</p></div>
        <div className="actions">
          {!respond && <a className="a-btn" href={pdfHref}><Icon name="download" />Download PDF</a>}
          {!c.customer.blockedAt && !c.customer.isOwner && (
            <BlockDialog customerId={c.customer.id} name={c.customer.name} openCheckouts={c.customer.openCheckouts} label="Block customer…"
              defaultReason={`Chargeback on ${o.number} without contacting us first.`} note="Blocking doesn't change the chargeback response." />
          )}
        </div>
      </div>

      <div className="a-dhead">
        {tiles.map((t) => (
          <div key={t.l} className={t.phone === false ? "a-hide-phone" : undefined}>
            <div className="l">{t.l}</div><div className={`v${t.cls ? ` ${t.cls}` : ""}`}>{t.v}</div>{t.d && <div className="d">{t.d}</div>}
          </div>
        ))}
      </div>

      <div className="a-dgrid2">
        {respond ? (
          <EvidenceForm
            id={d.id} initial={values} letterFor={LETTER_FOR[letterKind(d.reason)]} scanOk={scanOk} agreement={agreement} policy={built.refund_policy_disclosure}
            savedText={`${d.draft_saved_at ? `Draft saved to Stripe ${dateTime(d.draft_saved_at)}` : "Not saved yet"} · the bank sees nothing until you submit`}
            summary={{ chargeback: `${o.number} · ${reasonLabel(d.reason).toLowerCase()} · ${usd(d.amount_cents)}`, shipping: o.shippedAt ? `${carrierName(o.carrier)} · shipped ${shortDate(o.shippedAt)}` : "Not shipped", pdfPages: pdf.pages }}
            pdfHref={pdfHref}
          />
        ) : (
          <div className="a-ev">
            <div style={{ marginBottom: 12 }}>{outcome}</div>
            <div className="a-fsec">
              <div className="a-fsec-h"><h3>Cover letter</h3><span>{d.evidence_submitted ? (d.submitted_at ? "as submitted" : "submitted outside the admin") : "not submitted"}</span></div>
              <div className="a-fsec-b"><div className="a-ta ro">{values.uncategorized_text}</div></div>
            </div>
          </div>
        )}

        <div className="a-rail">
          {respond && (
            <div className="a-pdf">
              <div className="a-pdf-h"><Icon name="layers" /><h3>Evidence PDF</h3><span className="r">attached when you save</span></div>
              <div className="a-pdf-page">
                <h4>{SHOP_LEGAL_NAME} — Dispute evidence</h4>
                <div className="m">Order {o.number} · Stripe dispute {d.stripe_dispute_id}</div>
                {sections.map((s, i) => (
                  <div key={s.title}><div className="k">{i + 1} · {s.title}</div><div>{s.lines[0]}{s.lines.length > 1 ? " …" : ""}</div></div>
                ))}
              </div>
              <div className="a-pdf-pages">{plural(pdf.pages, "page")} · {Math.max(1, Math.round(pdf.bytes.length / 1024))} KB<a className="a-ulink" href={pdfHref}>Download</a></div>
            </div>
          )}
          <div className="a-card">
            <div className="a-card-h"><h3>Order</h3><span className="r"><Link href={`/admin/orders?status=${o.status}#${o.number}`}>Open order</Link></span></div>
            <div className="a-card-b">
              <div className="a-sumrow"><span className="k">Order</span><span className="a-mono">{o.number}</span></div>
              <div className="a-sumrow"><span className="k">Paid</span><span>{o.paidAt ? shortDate(o.paidAt) : "—"}{f.cardLast4 ? ` · card ·· ${f.cardLast4}` : ""}</span></div>
              <div className="a-sumrow"><span className="k">Items</span><span>{plural(vials, "vial")} · {usd(o.totalCents)}</span></div>
              <div className="a-sumrow"><span className="k">Customer</span><span>
                <Link href={`/admin/customers/${c.customer.id}`}>{c.customer.name}</Link> · {plural(c.customer.paidOrders, "order")}<br />
                <span className="a-chip cb">Chargeback</span>{c.customer.blockedAt && <span className="a-chip blocked">Blocked</span>}
              </span></div>
            </div>
          </div>
          <div className="a-card">
            <div className="a-card-h"><h3>Activity</h3></div>
            <div className="a-card-b">
              <ul className="a-log">{c.events.map((e) => {
                const t = eventText(e);
                return <li key={e.id}><span>{t.text}<small>{dateTime(e.at)}{t.sub ? ` · ${t.sub}` : ""}</small></span></li>;
              })}</ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
