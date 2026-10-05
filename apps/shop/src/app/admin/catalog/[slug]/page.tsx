import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwner } from "@/lib/dal";
import { catalogContent } from "@/data/catalog";
import { catalogEvents, fetchAdminOps, type CatalogEvent } from "@/lib/catalog-ops/data";
import { adminRows, COUNT_REASON_LABEL, isDiscrepancy, type AdminLotRow, type CountReason } from "@/lib/catalog-ops/rules";
import { Crumbs, Icon } from "@/components/admin/ui";
import { coaPublicUrl } from "@/lib/catalog-live";
import { usd } from "@/lib/html";
import { putLiveAction } from "@/app/admin/catalog/actions";
import ReceiveLotDialog from "@/components/admin/catalog/ReceiveLotDialog";
import CorrectCountDialog from "@/components/admin/catalog/CorrectCountDialog";
import InlineField from "@/components/admin/catalog/InlineField";
import ShownSwitch from "@/components/admin/catalog/ShownSwitch";
import LotActions from "@/components/admin/catalog/LotActions";

export const metadata = { title: "Catalog & lots", robots: { index: false } };
const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const when = (iso: string) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

function status(l: AdminLotRow): [string, string] {
  if (l.status === "draft") return ["c-draft", "Draft"];
  if (l.status === "retired") return ["c-retired", "Retired"];
  return l.available > 0 ? ["c-live", "Live"] : ["c-soldout", "Sold out"];
}

function eventLine(e: CatalogEvent): React.ReactNode {
  const who = e.actorName ?? (e.source === "3pl" ? "The 3PL" : "System");
  const lot = e.lotNumber ? <b>{e.lotNumber}</b> : null;
  const a = (e.after ?? {}) as Record<string, number | string>, b = (e.before ?? {}) as Record<string, number | string>;
  switch (e.kind) {
    case "lot_received": return <>{who} received {lot} · {a.counted} of {a.ordered}{Number(a.damaged) ? `, ${a.damaged} damaged` : ""}</>;
    case "lot_edited": return <>{who} edited draft {lot}</>;
    case "lot_live": return <>{who} put {lot} live</>;
    case "lot_retired": return <>{who} retired {lot}</>;
    case "count_corrected": return <>{who} corrected {lot} count {Number(a.sellable) - Number(b.sellable) > 0 ? "+" : ""}{Number(a.sellable) - Number(b.sellable)} · {COUNT_REASON_LABEL[e.reason as CountReason] ?? e.reason}</>;
    case "certificate_replaced": return <>{who} replaced the certificate for {lot}</>;
    case "price_changed": return <>{who} changed {e.variant_id} price <b>{usd(Number(b.price_cents))} → {usd(Number(a.price_cents))}</b></>;
    case "low_at_changed": return <>{who} set {e.variant_id} low level to {a.low_at}</>;
    case "threepl_sku_changed": return <>{who} set {e.variant_id} 3PL SKU to {a.threepl_sku ?? "none"}</>;
    case "shown": return <>{who} showed it on the store</>;
    case "hidden": return <>{who} hid it from the store</>;
    case "oversold": return <>Oversold on {e.note}: {a.need} ordered, {a.covered} held</>;
    case "lot_mismatch": return <>{who === "System" ? "Shipped" : `${who} shipped`} a different lot than allocated · {e.note}{a.order_number ? <> · <Link href={`/admin/orders?status=all#${a.order_number}`}>{a.order_number}</Link></> : null}</>;
    default: return e.kind;
  }
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireOwner();
  const { slug } = await params;
  const c = catalogContent.find((x) => x.slug === slug);
  if (!c) notFound();
  const [ops, events] = await Promise.all([fetchAdminOps(slug), catalogEvents(slug)]);
  const shown = ops.products.find((p) => p.slug === slug)?.shown ?? false;
  const rows = adminRows([c], ops);

  return (
    <div className="a-page">
      <Crumbs items={[{ label: "Catalog & lots", href: "/admin/catalog" }, { label: c.name }]} />
      <div className="a-vh">
        <div><h1>{c.name}</h1><div className="sub">{c.chemicalClass}<span className="dot" />{c.form} · {c.vialMl} mL vial<span className="dot" />{c.variants.length} strength{c.variants.length === 1 ? "" : "s"}</div></div>
        <div className="actions">
          <ShownSwitch slug={slug} name={c.name} shown={shown} />
          <a className="a-btn" href={`/products/${slug}`} target="_blank" rel="noopener noreferrer"><Icon name="ext" />View on store</a>
        </div>
      </div>

      <div className="a-grid-d">
        <div className="a-rail" style={{ gap: 18 }}>
          {rows.map((r) => {
            const lots = ops.lots.filter((l) => l.variant_id === r.variantId);
            const live = lots.filter((l) => l.status === "live" && l.available > 0).sort((a, b) => (a.live_at ?? "").localeCompare(b.live_at ?? ""));
            const drafts = lots.filter((l) => l.status === "draft");
            const old = lots.filter((l) => l.status === "retired" || (l.status === "live" && l.available <= 0));
            const lotRow = (l: AdminLotRow, i: number, kind: "live" | "draft" | "old") => {
              const [cls, label] = status(l);
              const disc = isDiscrepancy(l.ordered_qty, l.counted_qty, l.damaged_qty);
              return [
                <tr key={l.id} className={kind === "old" ? "a-old" : undefined}>
                  <td className="a-lotref">{l.lot_number}<small>{l.purity_pct}% · {l.method} · tested {day(l.tested_on)}</small>
                    {l.coa_path && <a className="a-coa" href={coaPublicUrl(l.coa_path)} target="_blank" rel="noopener noreferrer"><Icon name="download" />Certificate</a>}</td>
                  <td><span className={`a-chip ${cls}`}>{label}</span>
                    {kind === "live" && <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>{i === 0 ? "selling now" : "next in line"}</div>}
                    {kind === "draft" && disc && <div style={{ marginTop: 4 }}><span className="a-chip c-disc">Discrepancy</span></div>}</td>
                  <td className="a-rcv">Ordered <b>{l.ordered_qty}</b> · counted <b>{l.counted_qty}</b>{l.damaged_qty > 0 && <> · damaged <b>{l.damaged_qty}</b></>} · sellable <b>{l.sellable}</b>
                    <small>{day(l.received_at)}{l.adjust_qty ? ` · corrected ${l.adjust_qty > 0 ? "+" : ""}${l.adjust_qty}` : ""}</small></td>
                  <td><div className="a-cnt"><span><small>Held</small>{l.held}</span><span><small>Sold</small>{l.sold}</span><span><small>Left</small>{l.available}</span></div></td>
                  <td><div className="a-acts">
                    {kind === "live" && <><CorrectCountDialog lotId={l.id} lotNumber={l.lot_number} left={l.available} held={l.held} sold={l.sold} /><LotActions lotId={l.id} lotNumber={l.lot_number} lastLive={live.length === 1} /></>}
                    {kind === "draft" && <>
                      <form action={putLiveAction}><input type="hidden" name="lotId" value={l.id} /><button type="submit" className="a-btn sm primary" disabled={!l.coa_path || l.sellable <= 0}>Put live</button></form>
                      <ReceiveLotDialog small slug={slug} variantId={r.variantId} title={`${c.name} ${r.strength}`} draft={{ id: l.id, lotNumber: l.lot_number, purity: String(l.purity_pct), method: l.method, testedOn: l.tested_on, ordered: String(l.ordered_qty), counted: String(l.counted_qty), damaged: String(l.damaged_qty), note: l.discrepancy_note ?? "", coaPath: l.coa_path ?? "" }} />
                    </>}
                  </div></td>
                </tr>,
                kind !== "old" && disc && l.discrepancy_note ? (
                  <tr key={`${l.id}-note`} className="a-noterow"><td colSpan={5}><div className="a-note"><Icon name="warn" /><span><b>Discrepancy · </b>{l.discrepancy_note}</span></div></td></tr>
                ) : null,
              ];
            };
            const [sc, sl] = r.stock === "in" ? ["c-in", "In stock"] : r.stock === "low" ? ["c-low", "Low"] : ["c-out", "Out of stock"];
            return (
              <div key={r.variantId} className="a-card">
                <div className="a-st-h">
                  <h2>{r.strength}</h2><span className={`a-chip ${sc}`}>{sl}</span>
                  <div className="facts">
                    <div><span className="l">Price / vial</span><InlineField slug={slug} variantId={r.variantId} field="price" label="Price per vial" display={usd(r.priceCents)} initial={(r.priceCents / 100).toFixed(2)} /></div>
                    <div><span className="l">Low at</span><InlineField slug={slug} variantId={r.variantId} field="low" label="Low stock level" display={String(r.lowAt)} initial={String(r.lowAt)} /></div>
                    <div><span className="l">3PL SKU</span><InlineField slug={slug} variantId={r.variantId} field="sku" label="3PL SKU" display={r.sku ?? "—"} initial={r.sku ?? ""} /></div>
                    <div><span className="l">Available</span><span className="a-inl">{r.available}</span></div>
                  </div>
                  <div className="r"><ReceiveLotDialog small slug={slug} variantId={r.variantId} title={`${c.name} ${r.strength}`} /></div>
                </div>
                {lots.length === 0 ? <div className="a-card-b muted">No lots yet — this strength shows Out of stock with &ldquo;COA pending&rdquo; until a lot goes live.</div> : (
                  <>
                    <table className="a-t a-lots a-only-desk" style={{ border: 0 }}>
                      <colgroup><col style={{ width: 196 }} /><col style={{ width: 100 }} /><col style={{ width: 200 }} /><col style={{ width: 150 }} /><col /></colgroup>
                      <thead><tr><th>Lot</th><th>Status</th><th>Received</th><th>Held · sold · left</th><th className="num" /></tr></thead>
                      <tbody>
                        {live.flatMap((l, i) => lotRow(l, i, "live"))}
                        {drafts.flatMap((l, i) => lotRow(l, i, "draft"))}
                        {old.length > 0 && <tr className="a-sub"><td colSpan={5}>Sold out and retired · still findable in COA lookup</td></tr>}
                        {old.flatMap((l, i) => lotRow(l, i, "old"))}
                      </tbody>
                    </table>
                    <div className="a-only-phone">{[...live, ...drafts, ...old].map((l) => {
                      const [cls, label] = status(l);
                      const disc = isDiscrepancy(l.ordered_qty, l.counted_qty, l.damaged_qty);
                      return (
                        <div key={l.id} className="a-plot">
                          <div className="top"><b className="a-mono">{l.lot_number}</b>{l.status === "draft" && disc && <span className="a-chip c-disc">Discrepancy</span>}<span className={`a-chip ${cls}`}>{label}</span></div>
                          <div className="meta">{l.status === "draft" ? `Ordered ${l.ordered_qty} · counted ${l.counted_qty} · damaged ${l.damaged_qty} · ${l.sellable} sellable` : `${l.purity_pct}% · ${l.method} · ${l.held} held · ${l.sold} sold · ${l.available} left`}</div>
                          {l.status === "draft" && <form action={putLiveAction}><input type="hidden" name="lotId" value={l.id} /><button type="submit" className="a-btn primary" style={{ width: "100%", justifyContent: "center", height: 34, marginTop: 8 }} disabled={!l.coa_path || l.sellable <= 0}>Put live</button></form>}
                        </div>
                      );
                    })}</div>
                    {live.length > 1 && <div className="a-fifo"><Icon name="info" />Orders take vials from {live[0].lot_number} first, then {live.slice(1).map((l) => l.lot_number).join(", then ")}. An order can take some from each.</div>}
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div className="a-rail">
          <div className="a-card">
            <div className="a-card-h"><h3>On the store</h3></div>
            <div className="a-card-b" style={{ paddingTop: 6, paddingBottom: 6 }}>
              <dl className="a-facts2">
                <dt>Visibility</dt><dd>{shown ? "Shown" : "Hidden"}</dd>
                {rows.map((r) => <span key={r.variantId} style={{ display: "contents" }}><dt>{r.strength}</dt><dd>{r.stock === "in" ? "In stock" : r.stock === "low" ? "Low stock" : "Out of stock"}{r.selling ? ` · lot ${r.selling.lotNumber}` : ""}</dd></span>)}
                <dt>COA lookup</dt><dd>{ops.lots.filter((l) => l.live_at).length} lots findable</dd>
              </dl>
            </div>
          </div>
          <div className="a-card">
            <div className="a-card-h"><h3>Activity</h3></div>
            <div className="a-card-b">
              {events.length === 0 ? <p className="muted">Nothing yet.</p> : (
                <ul className="a-log">{events.map((e) => (
                  <li key={e.id}><span>{eventLine(e)}<small>{when(e.created_at)}{e.note && e.kind !== "oversold" && e.kind !== "lot_mismatch" ? ` · "${e.note}"` : ""}</small></span></li>
                ))}</ul>
              )}
            </div>
          </div>
          <p className="muted" style={{ fontSize: 12 }}><Link href="/admin/catalog">← All products</Link></p>
        </div>
      </div>
    </div>
  );
}
