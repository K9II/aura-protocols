import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { randomUUID } from "node:crypto";
import { requireOwner } from "@/lib/dal";
import { currentMs } from "@/lib/clock";
import { applyInquiryEvent, getThread, listSavedReplies, recordInquiryEvent, type ThreadMessage } from "@/lib/inquiries/data";
import { getCustomerDetail } from "@/lib/customers/data";
import { getOrderByNumber } from "@/lib/orders";
import { STATUS_CHIP, firstName, historyText, parseRef, refLabel } from "@/lib/inquiries/rules";
import { TOPICS, TOPIC_LABEL } from "@/lib/inquiries/topics";
import { REPLY_SIGNATURE } from "@/lib/inquiries/constants";
import { sameEmail } from "@/lib/inquiries/match";
import { SUPPORT_EMAIL } from "@/lib/constants";
import { STATUS_LABEL } from "@/lib/order-status";
import { shortDate } from "@/lib/discounts/time";
import { whenText } from "@/lib/today/time";
import { usd } from "@/lib/html";
import { Crumbs, Icon } from "@/components/admin/ui";
import { statusAction, topicAction, unlinkAction } from "@/app/admin/inquiries/actions";
import ReplyBox from "@/components/admin/inquiries/ReplyBox";
import LinkAccount from "@/components/admin/inquiries/LinkAccount";

export const metadata: Metadata = { title: "Inquiry", robots: { index: false, follow: false } };

const initials = (s: string) => s.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";
const isImage = (t: string) => t === "image/jpeg" || t === "image/png";
// Photos per the Guide's own grouping (JPEG, PNG, HEIC — distinct from PDFs);
// mixed kept files say "attachments", never "files".
const isPhoto = (t: string) => t === "image/jpeg" || t === "image/png" || t === "image/heic" || t === "image/heif";
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
const DELIVERY: Record<string, { cls: string; text: string; ok?: boolean }> = {
  sent: { cls: "", text: "Sent" }, delivered: { cls: "ok", text: "Delivered", ok: true },
  bounced: { cls: "bad", text: "Bounced" }, complained: { cls: "bad", text: "Marked as spam" },
};

function Message({ m, name, inquiryEmail, wholesale, nowMs }: { m: ThreadMessage; name: string; inquiryEmail: string; wholesale: boolean; nowMs: number }) {
  const out = m.direction === "out";
  const quiet = m.flags.includes("auto_reply") || m.flags.includes("spam");
  const who = out ? m.authorName ?? "Owner" : sameEmail(m.from_email, inquiryEmail) ? name : m.from_email;
  const where = out ? null : m.source === "form" ? (wholesale ? "Wholesale form" : "Contact form") : "Email reply";
  const dlv = out && m.delivery ? DELIVERY[m.delivery] : null;
  return (
    <div className={`a-msg ${out ? "out" : "in"}${quiet ? " quiet" : ""}`}>
      <div className="a-msg-h">
        <span className="av" aria-hidden>{initials(who)}</span><b>{who}</b>
        <span className="addr">{out ? `as ${SUPPORT_EMAIL}` : m.from_email}</span>
        <div className="r">
          {dlv && <span className={`a-dlv ${dlv.cls}`}>{dlv.ok && <Icon name="check" />}{dlv.text}</span>}
          <span>{where ? `${where} · ` : ""}{whenText(m.created_at, nowMs)}</span>
        </div>
      </div>
      <div className="a-msg-b">{m.body_text}</div>
      {m.files.length > 0 && (
        <div className="a-thumbs">{m.files.map((f) => f.url && isImage(f.content_type)
          ? <a key={f.id} className="a-thumb" href={f.url} target="_blank" rel="noopener noreferrer"><img src={f.url} alt={f.filename} /><span>{f.filename}</span></a>
          : <a key={f.id} className="a-thumb" href={f.url ?? undefined} target="_blank" rel="noopener noreferrer"><span className="tile">{f.filename.split(".").pop()}</span><span>{f.filename}</span></a>)}</div>
      )}
      {(m.flags.length > 0 || m.dropped_attachments.length > 0 || (m.full_text && m.full_text.trim() !== m.body_text.trim())) && (
        <div className="a-msg-f">
          {m.flags.includes("other_sender") && <span className="a-flag warn"><Icon name="warn" />Sent from a different address</span>}
          {m.flags.includes("auto_reply") && <span className="a-flag mut">Auto-reply · didn&apos;t re-open the conversation</span>}
          {m.flags.includes("spam") && <span className="a-flag mut">Marked as spam by Amazon</span>}
          {m.dropped_attachments.length > 0 && <span className="a-flag mut">{plural(m.dropped_attachments.length, "attachment")} not kept: {m.dropped_attachments.join(", ")}</span>}
          {m.full_text && m.full_text.trim() !== m.body_text.trim() && (
            <details className="a-full"><summary>Show full email</summary><pre>{m.full_text}</pre></details>
          )}
        </div>
      )}
    </div>
  );
}

// One conversation (mock screens 2, 3 and 8). Opening a new one moves it to
// Needs reply. Spec 2026-10-06-admin-inquiries-design.md.
export default async function InquiryPage({ params }: { params: Promise<{ ref: string }> }) {
  const owner = await requireOwner();
  const { ref: raw } = await params;
  const ref = parseRef(raw);
  if (!ref) notFound();
  const t = await getThread(ref);
  if (!t) notFound();
  const nowMs = currentMs();
  const i = t.inquiry;
  let status = i.status;
  const events = [...t.events];
  if (status === "new") {
    const moved = await applyInquiryEvent(i.id, "opened", { actorId: owner.id });
    if (moved) {
      status = moved.to;
      await recordInquiryEvent({ inquiryId: i.id, action: "opened", actorId: owner.id });
      events.unshift({ id: "opened-now", action: "opened", detail: null, at: new Date(nowMs).toISOString(), actorName: firstName(owner.fullName) });
    }
  }
  const [customer, saved, order] = await Promise.all([
    i.customer_id ? getCustomerDetail(i.customer_id) : null,
    listSavedReplies(),
    i.order_number ? getOrderByNumber(i.order_number) : null,
  ]);
  const chip = STATUS_CHIP[status];
  const wholesale = i.topic === "wholesale";
  const firstMsg = t.messages[0];
  const paid = customer ? customer.orders.filter((o) => o.status === "paid" || o.status === "shipped") : [];
  const balance = customer ? customer.ledger.reduce((s, l) => s + l.amount_cents, 0) : 0;
  const allFiles = t.messages.flatMap((m) => m.files);
  const files = allFiles.length;
  const filesWord = allFiles.every((f) => isPhoto(f.content_type)) ? "photo" : "attachment";

  return (
    <div className="a-page">
      <Crumbs items={[{ label: "Inquiries", href: "/admin/inquiries" }, { label: refLabel(i.ref) }]} />
      <div className="a-ph">
        <div>
          <h1>{i.subject} <span className={`a-chip ${chip.tone}`}>{chip.text}</span></h1>
          <p><span className="a-qref">{refLabel(i.ref)}</span> · {firstMsg?.source === "form" ? `from the ${wholesale ? "wholesale" : "contact"} form` : "by email"} {whenText(i.created_at, nowMs)} · {plural(t.messages.length, "message")}</p>
        </div>
        <div className="actions">
          <form action={statusAction}>
            <input type="hidden" name="id" value={i.id} />
            {status === "closed"
              ? <button type="submit" name="op" value="reopen" className="a-btn">Re-open</button>
              : <button type="submit" name="op" value="close" className="a-btn">Close</button>}
          </form>
        </div>
      </div>

      <div className="a-iq-grid">
        <div className="a-conv">
          {t.messages.map((m) => <Message key={m.id} m={m} name={wholesale && i.organization ? `${i.name} · ${i.organization}` : i.name} inquiryEmail={i.email} wholesale={wholesale} nowMs={nowMs} />)}
          <ReplyBox key={t.messages.length} inquiryId={i.id} clientKey={randomUUID()} to={i.email} from={SUPPORT_EMAIL}
            signature={REPLY_SIGNATURE} saved={saved.map((s) => ({ id: s.id, name: s.name, body: s.body }))} />
        </div>

        <div className="a-rail">
          <div className="a-card">
            <div className="a-card-h"><h3>Customer</h3>{customer && <div className="r"><Link className="a-toplink" href={`/admin/customers/${customer.id}`}>Open <Icon name="arrow" /></Link></div>}</div>
            <div className="a-card-b">
              {customer ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <div className="a-avatar" aria-hidden>{initials(customer.fullName)}</div>
                    <div><b style={{ fontWeight: 600 }}>{customer.fullName}</b>
                      <div className="muted" style={{ fontSize: 12 }}>customer since {shortDate(customer.createdAt)} · {plural(paid.length, "order")} · {usd(paid.reduce((s, o) => s + o.total_cents, 0))}</div></div>
                  </div>
                  <div className="a-chips" style={{ marginBottom: 12 }}>
                    {customer.blockedAt ? <span className="a-chip blocked">Blocked</span> : customer.verifiedAt ? <span className="a-chip ver">Verified</span> : <span className="a-chip unver">Unverified</span>}
                  </div>
                  {customer.orders.slice(0, 3).map((o) => (
                    <div key={o.id} className="a-row-o">
                      <Link className="a-mono" href={`/admin/orders/${o.order_number}`}>{o.order_number}</Link>
                      <span className="muted">{shortDate(o.created_at)} · {usd(o.total_cents)}</span>
                      <span className={`a-chip o-${o.status}`}>{STATUS_LABEL[o.status]}</span>
                    </div>
                  ))}
                  <dl className="a-facts2" style={{ marginTop: 8 }}><dt>Store credit</dt><dd>{usd(balance)}</dd></dl>
                  <form action={unlinkAction} style={{ marginTop: 8 }}><input type="hidden" name="id" value={i.id} /><button type="submit" className="a-btn sm ghost">Unlink account</button></form>
                </>
              ) : (
                <div className="a-nolink"><span>No account for this email.</span><LinkAccount inquiryId={i.id} /></div>
              )}
            </div>
          </div>

          <div className="a-card">
            <div className="a-card-h"><h3>Details</h3></div>
            <div className="a-card-b" style={{ display: "grid", gap: 12 }}>
              <form action={topicAction} className="a-iq-inline">
                <input type="hidden" name="id" value={i.id} />
                <select name="topic" defaultValue={i.topic} aria-label="Topic">{TOPICS.map((tp) => <option key={tp} value={tp}>{TOPIC_LABEL[tp]}</option>)}</select>
                <button type="submit" className="a-btn sm">Change</button>
              </form>
              <dl className="a-facts2">
                <dt>Order</dt><dd className="a-mono">{i.order_number ? (order ? <Link href={`/admin/orders/${i.order_number}`}>{i.order_number}</Link> : i.order_number) : "—"}</dd>
                <dt>Messages</dt><dd>{t.messages.length}{files ? ` · ${plural(files, filesWord)}` : ""}</dd>
                {wholesale && i.organization && <><dt>Organization</dt><dd>{i.organization}</dd></>}
              </dl>
            </div>
          </div>

          <div className="a-card">
            <div className="a-card-h"><h3>History</h3></div>
            <div className="a-card-b" style={{ paddingTop: 6, paddingBottom: 6 }}>
              <ul className="a-iq-hist">{events.map((e) => <li key={e.id}>{historyText(e)}<small>{whenText(e.at, nowMs)}</small></li>)}</ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
