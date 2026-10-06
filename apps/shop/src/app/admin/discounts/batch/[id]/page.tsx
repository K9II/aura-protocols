import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireOwner } from "@/lib/dal";
import { getBatch, getCodeById, listBatchCodes, listEvents } from "@/lib/discounts/data";
import { describeRule, termsFromRow } from "@/lib/discounts/rules";
import { batchStatus } from "@/lib/discounts/list";
import { shortDate } from "@/lib/discounts/time";
import { setCodeStateAction } from "@/app/admin/discounts/actions";
import ConfirmSubmit from "@/components/admin/ConfirmSubmit";
import CopyAll from "@/components/admin/discounts/CopyAll";
import ActivityCard from "@/components/admin/discounts/ActivityCard";
import { Crumbs, Icon, StatusChip } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Batch", robots: { index: false, follow: false } };

const PAGE = 40;

export default async function BatchPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string; show?: string; all?: string }> }) {
  await requireOwner();
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const sp = await searchParams;
  const [batch, codes, events] = await Promise.all([getBatch(id), listBatchCodes(id), listEvents({ batchId: id })]);
  if (!batch || codes.length === 0) notFound();
  // Every code in a batch shares one rule and one stored status (edits and
  // pause/resume/end move them together) — read the rule from the first.
  const first = await getCodeById(codes[0].id);
  if (!first) notFound();
  const used = codes.filter((c) => c.redemption?.state === "used").length;
  const held = codes.filter((c) => c.redemption?.state === "held").length;
  // Batch codes share the rule's dates; each carries its own stored status.
  const status = batchStatus(codes.map((c) => ({ row: { ...first, status: c.status }, uses: c.redemption ? 1 : 0 })), batch.size);
  const showKey = sp.show === "unused" || sp.show === "used" ? sp.show : undefined;
  const show = showKey === "unused" ? codes.filter((c) => !c.redemption) : showKey === "used" ? codes.filter((c) => c.redemption) : codes;
  const visible = sp.all ? show : show.slice(0, PAGE);
  const base = `/admin/discounts/batch/${id}`;
  const name = batch.prefix.replace(/-$/, "");
  const stored = first.status;
  const hidden = (to: string) => <><input type="hidden" name="batchId" value={id} /><input type="hidden" name="from" value={stored} /><input type="hidden" name="to" value={to} /></>;

  return (
    <div className="a-page">
      <Crumbs items={[{ label: "Discounts", href: "/admin/discounts" }, { label: `${name} batch` }]} />
      {sp.created && <div className="a-callout ok" role="status" style={{ marginBottom: 14 }}><Icon name="check" /><div><b>{batch.size} codes created.</b> Download the list now or any time from this page. The batch counts as one row in Discounts.</div></div>}
      <div className="a-dh">
        <span className="bigcode">{batch.prefix}·····</span><StatusChip status={status} />
        <div className="actions">
          <Link className="a-btn" href={`/admin/discounts/${first.id}/edit`}><Icon name="edit" />Edit rule</Link>
          {stored === "active" && (status === "active" || status === "scheduled") && <form action={setCodeStateAction}>{hidden("paused")}<button className="a-btn" type="submit"><Icon name="pause" />Pause all</button></form>}
          {stored === "paused" && status === "paused" && <form action={setCodeStateAction}>{hidden("active")}<button className="a-btn" type="submit"><Icon name="play" />Resume all</button></form>}
          {stored !== "ended" && status !== "ended" && (
            <form action={setCodeStateAction}>{hidden("ended")}<ConfirmSubmit className="a-btn danger" message="End every code in this batch? This can't be undone."><Icon name="stop" />End all</ConfirmSubmit></form>
          )}
        </div>
      </div>
      <div className="a-dsub">{describeRule(termsFromRow(first))}{batch.note && <><span className="dot" />{batch.note}</>}<span className="dot" />{first.ends_at ? `ends ${shortDate(first.ends_at)}` : "no end"}</div>

      <div className="a-card">
        <div className="a-card-h">
          <h3>{name}</h3><span className="sub">{used} of {codes.length} used{held ? ` · ${held} held` : ""}</span>
          <span className="r">
            <span className="a-seg2">
              <Link href={base} className={!showKey ? "on" : undefined}>All {codes.length}</Link>
              <Link href={`${base}?show=unused`} className={showKey === "unused" ? "on" : undefined}>Unused {codes.length - used - held}</Link>
              <Link href={`${base}?show=used`} className={showKey === "used" ? "on" : undefined}>Used {used + held}</Link>
            </span>
            <CopyAll codes={show.map((c) => c.code)} />
            <a className="a-btn sm primary" href={`${base}/codes.csv`} download><Icon name="download" />Download CSV</a>
          </span>
        </div>
        {visible.length === 0 ? <div className="a-card-b muted">No codes here.</div> : (
          <div className="a-codes">
            {visible.map((c) => (
              <div key={c.id} className={c.redemption?.state === "used" ? "used" : c.redemption?.state === "held" ? "held" : undefined}>
                <span className="a-code">{c.code}</span>
                <small>{c.redemption?.state === "used" ? c.redemption.order_number ?? "used" : c.redemption?.state === "held" ? "held · checkout open" : "unused"}</small>
              </div>
            ))}
          </div>
        )}
        {!sp.all && show.length > visible.length && (
          <div className="a-tfoot flush">{visible.length} of {show.length} shown<div className="r"><Link className="a-btn sm" href={`${base}?${new URLSearchParams({ ...(showKey ? { show: showKey } : {}), all: "1" })}`}>Show all</Link></div></div>
        )}
      </div>
      <div style={{ marginTop: 12 }}><ActivityCard events={events} /></div>
    </div>
  );
}
