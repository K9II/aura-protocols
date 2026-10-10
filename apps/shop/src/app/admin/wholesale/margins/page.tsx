import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/dal";
import { getLiveCatalog } from "@/lib/catalog-live";
import { getWholesaleSettings } from "@/lib/wholesale/data";
import { supplierPricesFor } from "@/lib/wholesale/runs-data";
import { lotDefaults } from "@/lib/catalog-ops/data";
import { kitRows } from "@/lib/wholesale/rules";
import { kitMargins } from "@/lib/wholesale/margins";
import { Crumbs } from "@/components/admin/ui";
import KitMarginsChart from "@/components/admin/wholesale/KitMarginsChart";

export const metadata: Metadata = { title: "Wholesale margins", robots: { index: false, follow: false } };
// Always today's prices, supplier costs and settings: nothing here is cached.
export const dynamic = "force-dynamic";

// Owner-only reference (Alvester, 2026-10-10: "a living document … as I make changes"):
// margin per kit at each volume tier, recomputed from the live catalog price, the
// supplier box prices synced from AIOS and the lot-cost defaults on every visit.
export default async function WholesaleMarginsPage() {
  await requirePermission("wholesale.margins");
  const [live, s, d] = await Promise.all([getLiveCatalog(), getWholesaleSettings(), lotDefaults()]);
  const rows = kitRows(live.shown);
  const prices = await supplierPricesFor(rows.map((r) => `${r.slug}/${r.variantId}`));
  const m = kitMargins(rows, prices, { tiers: s.tiers, lotTestCents: d.testCents, inboundPerBoxCents: d.inboundPerBoxCents, labelPerVialCents: d.labelPerVialCents });

  return (
    <div className="a-page">
      <Crumbs items={[{ label: "Wholesale", href: "/admin/wholesale" }, { label: "Margins" }]} />
      <div className="a-ph"><div><h1>Kit margins</h1><p>What each 10-vial kit earns at each volume tier, worked out from today&apos;s retail price, the supplier box prices synced from AIOS and your lot-cost settings. It updates as soon as any of those change. Only you can see this page.</p></div>
        <div className="actions"><Link className="a-btn" href="/admin/wholesale/settings">Wholesale settings</Link></div></div>
      <KitMarginsChart
        rows={m.rows} missing={m.missing} tiers={s.tiers}
        costs={{ lotTestCents: d.testCents, inboundPerBoxCents: d.inboundPerBoxCents, labelPerVialCents: d.labelPerVialCents }}
      />
    </div>
  );
}
