import Link from "next/link";
import { requireOwner } from "@/lib/dal";
import { catalogContent } from "@/data/catalog";
import { fetchAdminOps } from "@/lib/catalog-ops/data";
import { adminRows, CATALOG_TABS, rowsForTab, searchRows, TAB_LABEL, tabCounts, type AdminRow, type CatalogTab } from "@/lib/catalog-ops/rules";
import { Crumbs, Icon, Kpis, Tabs } from "@/components/admin/ui";
import { usd } from "@/lib/html";

export const metadata = { title: "Catalog & lots", robots: { index: false } };
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const STOCK: Record<AdminRow["stock"], [string, string]> = { in: ["c-in", "In stock"], low: ["c-low", "Low"], out: ["c-out", "Out of stock"] };

function Stock({ r }: { r: AdminRow }) { const [c, l] = STOCK[r.stock]; return <span className={`a-chip ${c}`}>{l}</span>; }
function Selling({ r }: { r: AdminRow }) {
  if (r.selling) return <span className="a-lotref">{r.selling.lotNumber}<small>{r.selling.purityPct}% · {r.selling.method}</small></span>;
  return <span className="a-lotref muted">—<small>{r.lastSoldOut ? `${r.lastSoldOut} sold out` : "COA pending · no lot yet"}</small></span>;
}
function Next({ r }: { r: AdminRow }) {
  if (!r.next) return <span className="muted">—</span>;
  return (
    <span className="a-lotref">{r.next.lotNumber}<small>
      {r.next.status === "live" ? `live · ${r.next.available} vials` : <><span className="a-chip c-draft sm">Draft</span>{r.next.discrepancy && <> <span className="a-chip c-disc sm">Discrepancy</span></>}</>}
    </small></span>
  );
}

export default async function CatalogPage({ searchParams }: { searchParams: Promise<{ q?: string | string[]; tab?: string | string[] }> }) {
  await requireOwner();
  const sp = await searchParams;
  const tab = (CATALOG_TABS as readonly string[]).includes(first(sp.tab) ?? "") ? (first(sp.tab) as CatalogTab) : "all";
  const q = (first(sp.q) ?? "").slice(0, 60);
  const ops = await fetchAdminOps();
  const all = adminRows(catalogContent, ops);
  const counts = tabCounts(all);
  const lotsBy = new Map<string, string[]>();
  for (const l of ops.lots) lotsBy.set(`${l.slug}:${l.variant_id}`, [...(lotsBy.get(`${l.slug}:${l.variant_id}`) ?? []), l.lot_number]);
  const rows = searchRows(rowsForTab(all, tab), q, lotsBy);
  const href = (t: CatalogTab) => `/admin/catalog${t !== "all" || q ? `?${new URLSearchParams({ ...(t !== "all" ? { tab: t } : {}), ...(q ? { q } : {}) })}` : ""}`;
  const shownProducts = ops.products.filter((p) => p.shown).length;
  const hiddenProducts = ops.products.length - shownProducts;

  return (
    <div className="a-page">
      <Crumbs items={[{ label: "Catalog & lots" }]} />
      <div className="a-ph"><div><h1>Catalog &amp; lots</h1><p>Prices, stock and certified lots. Changes show on the store within seconds.</p></div></div>
      <div className="a-only-desk">
        <Kpis items={[
          { label: "Products shown", value: shownProducts, sub: `${hiddenProducts} hidden · ${all.length} strengths` },
          { label: "Low stock", value: counts.low, sub: "at or under their low level" },
          { label: "Out of stock", value: counts.out, sub: "can't be added to cart" },
          { label: "Discrepancies", value: counts.discrepancies, sub: "received ≠ ordered" },
          { label: "Draft lots", value: counts.drafts, sub: "received, not live yet" },
        ]} />
      </div>
      <div className="a-toolbar">
        <Tabs items={CATALOG_TABS.map((t) => ({ href: href(t), label: TAB_LABEL[t], n: counts[t], on: t === tab }))} />
        <form className="a-search" action="/admin/catalog" role="search" style={{ width: 280 }}>
          {tab !== "all" && <input type="hidden" name="tab" value={tab} />}
          <Icon name="search" /><input name="q" defaultValue={q} placeholder="Product or lot number" aria-label="Search catalog" />
        </form>
      </div>
      {rows.length === 0 ? <div className="a-empty">{q ? "Nothing matches." : "Nothing here."}</div> : (
        <>
          <table className="a-t a-only-desk">
            <thead><tr><th>Product</th><th className="num">Price</th><th>Stock</th><th className="num">Available</th><th>Selling now</th><th>Next lot</th><th>Store</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={`${r.slug}:${r.variantId}`} className={r.shown ? undefined : "a-dim"}>
                <td className="a-prod"><b><Link href={`/admin/catalog/${r.slug}`}>{r.name}</Link></b><small>{r.strength} · {r.chemicalClass}</small></td>
                <td className="num a-mono">{usd(r.priceCents)}</td>
                <td><Stock r={r} /></td>
                <td className="num a-avail">{r.available}{r.stock === "low" && <small>low at {r.lowAt}</small>}{r.stock === "out" && r.held > 0 && <small>{r.held} held</small>}</td>
                <td><Selling r={r} /></td>
                <td><Next r={r} /></td>
                <td>{r.shown ? <span className="a-chip c-shown">Shown</span> : <span className="a-chip c-hidden">Hidden</span>}</td>
              </tr>
            ))}</tbody>
          </table>
          <div className="a-plist a-only-phone">{rows.map((r) => (
            <Link key={`${r.slug}:${r.variantId}`} href={`/admin/catalog/${r.slug}`} className="a-pcust">
              <b>{r.name} · {r.strength}</b><Stock r={r} />
              <span className="em">{r.selling ? `${r.selling.lotNumber} · ${r.selling.purityPct}%` : r.lastSoldOut ? `${r.lastSoldOut} sold out` : "COA pending · no lot yet"}{r.next ? ` · ${r.next.status === "draft" ? "draft" : "next"} ${r.next.lotNumber}` : ""}</span>
              <div className="meta"><span><b>{usd(r.priceCents)}</b></span><span><b>{r.available}</b> left{r.stock === "low" ? ` · low at ${r.lowAt}` : ""}</span>{!r.shown && <span>Hidden</span>}</div>
            </Link>
          ))}</div>
          <div className="a-tfoot">Showing {rows.length} of {all.length} strengths · A–Z by class</div>
        </>
      )}
    </div>
  );
}
