import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/dal";
import { getDiscountCap } from "@/lib/discounts/data";
import { getLiveCatalog } from "@/lib/catalog-live";
import DiscountForm from "@/components/admin/discounts/DiscountForm";
import { Crumbs } from "@/components/admin/ui";

export const metadata: Metadata = { title: "New code", robots: { index: false, follow: false } };

export default async function NewCodePage({ searchParams }: { searchParams: Promise<{ mode?: string | string[] }> }) {
  await requirePermission("discounts.edit");
  const mode = (await searchParams).mode === "batch" ? "batch" : "single";
  const [capPct, live] = await Promise.all([getDiscountCap(), getLiveCatalog()]);
  return (
    <div className="a-page">
      <Crumbs items={[{ label: "Discounts", href: "/admin/discounts" }, { label: mode === "batch" ? "New batch" : "New code" }]} />
      <div className="a-ph">
        <div><h1>{mode === "batch" ? "New batch" : "New code"}</h1></div>
        <div className="actions">
          <div className="a-seg2">
            <Link href="/admin/discounts/new" className={mode === "single" ? "on" : undefined} aria-current={mode === "single" ? "page" : undefined}>Single code</Link>
            <Link href="/admin/discounts/new?mode=batch" className={mode === "batch" ? "on" : undefined} aria-current={mode === "batch" ? "page" : undefined}>Batch of unique codes</Link>
          </div>
        </div>
      </div>
      <DiscountForm key={mode} mode={mode} capPct={capPct} catalog={live.all} />
    </div>
  );
}
