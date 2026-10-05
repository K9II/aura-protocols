import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwner } from "@/lib/dal";
import { catalogContent } from "@/data/catalog";
import { catalogEvents, fetchAdminOps, variantHistory, type CatalogEvent } from "@/lib/catalog-ops/data";
import { adminRows, byLiveThenNumber, COUNT_REASON_LABEL, isDiscrepancy, liveRefusal, type AdminLotRow, type CountReason } from "@/lib/catalog-ops/rules";
import { Crumbs, Icon } from "@/components/admin/ui";
import { coaPublicUrl } from "@/lib/catalog-live";
import { usd } from "@/lib/html";
import { putLiveAction, restoreStrengthAction, setStrengthShownAction } from "@/app/admin/catalog/actions";
import ReceiveLotDialog from "@/components/admin/catalog/ReceiveLotDialog";
import CorrectCountDialog from "@/components/admin/catalog/CorrectCountDialog";
import InlineField from "@/components/admin/catalog/InlineField";
import ShownSwitch from "@/components/admin/catalog/ShownSwitch";
import LotActions from "@/components/admin/catalog/LotActions";
import StrengthMenu from "@/components/admin/catalog/StrengthMenu";
import AddStrengthDialog from "@/components/admin/catalog/AddStrengthDialog";

export const metadata = { title: "Catalog & lots", robots: { index: false } };
const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
// Labeled UTC like customers/[id]/page.tsx's utcStamp — the server's clock, unambiguous for an audit log.
const when = (iso: string) => `${new Date(iso).toLocaleString("en-US", { timeZone: "UTC", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} UTC`;

function status(l: AdminLotRow): [string, string] {
  if (l.status === "draft") return ["c-draft", "Draft"];
  if (l.status === "retired") return ["c-retired", "Retired"];
  return l.available > 0 ? ["c-live", "Live"] : ["c-soldout", "Sold out"];
}

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;
const MISMATCH_NOTE: Record<string, string> = { moved: "vials moved to the shipped lot", "not moved": "not moved — check stock" };

function eventLine(e: CatalogEvent, strengthOf: (variantId: string | null) => string): React.ReactNode {
  const who = e.actorName ?? (e.source === "3pl" ? "The 3PL" : "System");
  const lot = e.lotNumber ? <b>{e.lotNumber}</b> : null;
  const a = (e.after ?? {}) as Record<string, number | string>, b = (e.before ?? {}) as Record<string, number | string>;
  // Strength events carry the label, so a deleted strength still reads right.
  const st = <b>{String(a.strength ?? b.strength ?? strengthOf(e.variant_id))}</b>;
  switch (e.kind) {
    case "strength_added": return <>{who} added {st} · {usd(Number(a.price_cents))} · hidden</>;
    case "strength_shown": return <>{who} showed {st} on the store</>;
    case "strength_hidden": return <>{who} hid {st} from the store</>;
    case "strength_archived": return <>{who} archived {st}</>;
    case "strength_restored": return <>{who} restored {st} · hidden</>;
    case "strength_deleted": return <>{who} deleted {st}</>;
    case "lot_received": return <>{who} received {lot} · {a.counted} of {a.ordered}{Number(a.damaged) ? `, ${a.damaged} damaged` : ""}</>;
    case "lot_edited": return <>{who} edited draft {lot}</>;
    case "lot_live": return <>{who} put {lot} live</>;
    case "lot_retired": return <>{who} retired {lot}</>;
    case "count_corrected": return <>{who} corrected {lot} count {Number(a.sellable) - Number(b.sellable) > 0 ? "+" : ""}{Number(a.sellable) - Number(b.sellable)} · {COUNT_REASON_LABEL[e.reason as CountReason] ?? e.reason}</>;
    case "certificate_replaced": return <>{who} replaced the certificate for {lot}</>;
    case "price_changed": return <>{who} changed {strengthOf(e.variant_id)} price <b>{usd(Number(b.price_cents))} → {usd(Number(a.price_cents))}</b></>;
    case "low_at_changed": return <>{who} set {strengthOf(e.variant_id)} low level to {a.low_at}</>;
    case "threepl_sku_changed": return <>{who} set {strengthOf(e.variant_id)} 3PL SKU to {a.threepl_sku ?? "none"}</>;
    case "shown": return <>{who} showed it on the store</>;
    case "hidden": return <>{who} hid it from the store</>;
    case "oversold": return <>Oversold on {e.note}: {a.need} ordered, {a.covered} held</>;
    case "lot_mismatch": return <>{who === "System" ? "Shipped" : `${who} shipped`} a different lot than allocated · {MISMATCH_NOTE[e.note ?? ""] ?? e.note}{a.order_number ? <> · <Link href={`/admin/orders?status=all#${a.order_number}`}>{a.order_number}</Link></> : null}</>;
    default: return e.kind;
  }
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireOwner();
  const { slug } = await params;
  const c = catalogContent.find((x) => x.slug === slug);
  if (!c) notFound();
  const [ops, events, history] = await Promise.all([fetchAdminOps(slug), catalogEvents(slug), variantHistory(slug)]);
  const shown = ops.products.find((p) => p.slug === slug)?.shown ?? false;
  const all = adminRows([c], ops);
  const rows = all.filter((r) => !r.archivedAt);
  const archived = all.filter((r) => r.archivedAt);
  const strengthOf = (variantId: string | null) => (variantId ? ops.variants.find((v) => v.variant_id === variantId)?.strength ?? variantId : "");
  // Strength-level counts; the product switch shows the product's own visibility.
  const shownCount = rows.filter((r) => r.strengthShown).length;
  const hiddenCount = rows.length - shownCount;
  const sub = [
    shownCount ? `${plural(shownCount, "strength")} ${shown ? "on the store" : "shown"}` : "",
    hiddenCount ? `${hiddenCount} hidden` : "",
    archived.length ? `${archived.length} archived` : "",
  ].filter(Boolean).join(" · ") || "No strengths yet";
  const historyOf = (variantId: string) => history.get(variantId) ?? { lots: 0, orders: 0 };

  return (
    <div className="a-page">
      <Crumbs items={[{ label: "Catalog & lots", href: "/admin/catalog" }, { label: c.name }]} />
      <div className="a-vh">
        <div><h1>{c.name}</h1><div className="sub">{c.chemicalClass}<span className="dot" />{c.form} · {c.vialMl} mL vial<span className="dot" />{sub}</div></div>
        <div className="actions">
          <ShownSwitch slug={slug} name={c.name} shown={shown} />
          <a className="a-btn" href={`/products/${slug}`} target="_blank" rel="noopener noreferrer"><Icon name="ext" />View on store</a>
        </div>
      </div>

      <div className="a-grid-d">
        <div className="a-rail" style={{ gap: 18 }}>
          {rows.map((r) => {
            const lots = ops.lots.filter((l) => l.variant_id === r.variantId);
            const live = lots.filter((l) => l.status === "live" && l.available > 0).sort(byLiveThenNumber);
            const drafts = lots.filter((l) => l.status === "draft").sort((a, b) => a.lot_number.localeCompare(b.lot_number));
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
                    <small>{l.received_by_name ? `${l.received_by_name} · ` : ""}{day(l.received_at)}{l.adjust_qty ? ` · corrected ${l.adjust_qty > 0 ? "+" : ""}${l.adjust_qty}` : ""}</small></td>
                  <td><div className="a-cnt"><span><small>Held</small>{l.held}</span><span><small>Sold</small>{l.sold}</span><span><small>Left</small>{l.available}</span></div></td>
                  <td><div className="a-acts">
                    {kind === "live" && <><CorrectCountDialog lotId={l.id} lotNumber={l.lot_number} left={l.available} held={l.held} sold={l.sold} /><LotActions lotId={l.id} lotNumber={l.lot_number} lastLive={live.length === 1} /></>}
                    {kind === "draft" && (() => {
                      const refusal = liveRefusal({ status: l.status, coaPath: l.coa_path, sellable: l.sellable });
                      return <>
                        <div>
                          <form action={putLiveAction}><input type="hidden" name="lotId" value={l.id} /><button type="submit" className="a-btn sm primary" disabled={!!refusal} title={refusal ?? undefined}>Put live</button></form>
                          {refusal && <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>{refusal}</div>}
                        </div>
                        <ReceiveLotDialog small slug={slug} variantId={r.variantId} title={`${c.name} ${r.strength}`} draft={{ id: l.id, lotNumber: l.lot_number, purity: String(l.purity_pct), method: l.method, testedOn: l.tested_on, ordered: String(l.ordered_qty), counted: String(l.counted_qty), damaged: String(l.damaged_qty), note: l.discrepancy_note ?? "", coaPath: l.coa_path ?? "" }} />
                      </>;
                    })()}
                  </div></td>
                </tr>,
                kind !== "old" && disc && l.discrepancy_note ? (
                  <tr key={`${l.id}-note`} className="a-noterow"><td colSpan={5}><div className="a-note"><Icon name="warn" /><span><b>Discrepancy · </b>{l.discrepancy_note}</span></div></td></tr>
                ) : null,
              ];
            };
            const [sc, sl] = !r.strengthShown ? ["c-hidden", "Hidden"] : r.stock === "in" ? ["c-in", "In stock"] : r.stock === "low" ? ["c-low", "Low"] : ["c-out", "Out of stock"];
            const h = historyOf(r.variantId);
            return (
              <div key={r.variantId} className={`a-card${r.strengthShown ? "" : " hid"}`}>
                <div className="a-st-h">
                  <h2>{r.strength}</h2><span className={`a-chip ${sc}`}>{sl}</span>
                  <div className="facts">
                    <div><span className="l"><span className="a-only-desk">Price / vial</span><span className="a-only-phone">Price</span></span><InlineField slug={slug} variantId={r.variantId} field="price" label="Price per vial" display={usd(r.priceCents)} initial={(r.priceCents / 100).toFixed(2)} /></div>
                    <div><span className="l">Low at</span><InlineField slug={slug} variantId={r.variantId} field="low" label="Low stock level" display={String(r.lowAt)} initial={String(r.lowAt)} /></div>
                    <div className="a-only-desk"><span className="l">3PL SKU</span><InlineField slug={slug} variantId={r.variantId} field="sku" label="3PL SKU" display={r.sku ?? "—"} initial={r.sku ?? ""} /></div>
                    <div><span className="l"><span className="a-only-desk">Available</span><span className="a-only-phone">Left</span></span><span className="a-inl">{r.available}</span></div>
                  </div>
                  <div className="r">
                    {!r.strengthShown && <form action={setStrengthShownAction}><input type="hidden" name="slug" value={slug} /><input type="hidden" name="variantId" value={r.variantId} /><input type="hidden" name="shown" value="true" /><button type="submit" className="a-btn sm">Show on store</button></form>}
                    <ReceiveLotDialog small slug={slug} variantId={r.variantId} title={`${c.name} ${r.strength}`} />
                    <StrengthMenu slug={slug} variantId={r.variantId} strength={r.strength} shown={r.strengthShown} canDelete={h.lots === 0 && h.orders === 0} />
                  </div>
                </div>
                {lots.length === 0 ? (r.strengthShown && <div className="a-card-b muted">No lots yet — this strength shows Out of stock with &ldquo;COA pending&rdquo; until a lot goes live.</div>) : (
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
                          {l.status === "draft" && (() => {
                            const refusal = liveRefusal({ status: l.status, coaPath: l.coa_path, sellable: l.sellable });
                            return <>
                              <form action={putLiveAction}><input type="hidden" name="lotId" value={l.id} /><button type="submit" className="a-btn primary" style={{ width: "100%", justifyContent: "center", height: 34, marginTop: 8 }} disabled={!!refusal} title={refusal ?? undefined}>Put live</button></form>
                              {refusal && <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>{refusal}</div>}
                            </>;
                          })()}
                        </div>
                      );
                    })}</div>
                    {live.length > 1 && <div className="a-fifo"><Icon name="info" />Orders take vials from {live[0].lot_number} first, then {live.slice(1).map((l) => l.lot_number).join(", then ")}. An order can take some from each.</div>}
                  </>
                )}
                {!r.strengthShown && <div className="a-fifo"><Icon name="info" />{lots.some((l) => l.status === "live")
                  ? "Hidden from the store. Show it again any time."
                  : "New strengths start hidden. Receive the first lot, put it live, then show it on the store."}</div>}
              </div>
            );
          })}
          <AddStrengthDialog slug={slug} title={c.name} />
          {archived.length > 0 && (
            <div className="a-arch">
              <div className="h">Archived strengths · not on the store</div>
              {archived.map((r) => {
                const h = historyOf(r.variantId);
                return (
                  <div key={r.variantId} className="row">
                    <b>{r.strength}</b>
                    <span className="muted">archived {day(r.archivedAt!)} · {plural(h.lots, "lot")} · {plural(h.orders, "order")}{shown && ops.lots.some((l) => l.variant_id === r.variantId && l.live_at) ? " · certificates stay in COA lookup" : ""}</span>
                    <form action={restoreStrengthAction} style={{ marginLeft: "auto" }}><input type="hidden" name="slug" value={slug} /><input type="hidden" name="variantId" value={r.variantId} /><button type="submit" className="a-btn sm">Restore</button></form>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="a-rail">
          <div className="a-card">
            <div className="a-card-h"><h3>On the store</h3></div>
            <div className="a-card-b" style={{ paddingTop: 6, paddingBottom: 6 }}>
              <dl className="a-facts2">
                <dt>Visibility</dt><dd>{shown ? "Shown" : "Hidden"}</dd>
                {rows.filter((r) => r.shown).map((r) => <span key={r.variantId} style={{ display: "contents" }}><dt>{r.strength}</dt><dd>{r.stock === "in" ? "In stock" : r.stock === "low" ? "Low stock" : "Out of stock"}{r.selling ? ` · lot ${r.selling.lotNumber}` : ""}</dd></span>)}
                <dt>COA lookup</dt><dd>{ops.lots.filter((l) => l.live_at).length} lots findable</dd>
              </dl>
            </div>
          </div>
          <div className="a-card">
            <div className="a-card-h"><h3>Activity</h3></div>
            <div className="a-card-b">
              {events.length === 0 ? <p className="muted">Nothing yet.</p> : (
                <ul className="a-log">{events.map((e) => (
                  <li key={e.id}><span>{eventLine(e, strengthOf)}<small>{when(e.created_at)}{e.note && e.kind !== "oversold" && e.kind !== "lot_mismatch" ? ` · "${e.note}"` : ""}</small></span></li>
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
