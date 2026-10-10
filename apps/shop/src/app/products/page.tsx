import type { Metadata } from "next";
import CompoundCard from "@/components/store/CompoundCard";
import CategoryPills from "@/components/store/CategoryPills";
import Unavailable from "@/components/store/Unavailable";
import { CHEMICAL_CLASSES, type ChemicalClass, type Compound } from "@/data/catalog";
import { getLiveCatalogOrNull } from "@/lib/catalog-live";
import { isPendingLot } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Research Compounds",
  description: "Research peptides by chemical class. No lot is sold before independent testing, and each lot's certificate is published on its product page.",
  alternates: { canonical: "/products" },
};

function matches(q: string) {
  const needle = q.trim().toLowerCase();
  return (c: Compound) =>
    c.name.toLowerCase().includes(needle) ||
    (c.identity.cas ?? "").includes(needle) ||
    c.variants.some((v) => !isPendingLot(v.lot) && v.lot.lot.toLowerCase() === needle);
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; q?: string }>;
}) {
  const { cat, q } = await searchParams;
  const live = await getLiveCatalogOrNull();
  if (!live) return <Unavailable />;
  const compounds = live.shown;
  const active = CHEMICAL_CLASSES.includes(cat as ChemicalClass) ? (cat as ChemicalClass) : undefined;
  let list = active ? compounds.filter((c) => c.chemicalClass === active) : compounds;
  if (q) list = list.filter(matches(q));

  return (
    <div className="pharmacopoeia">
      <div className="p-container">
        <div className="s-shophero">
          <h1 className="s-h1">Every lot,<br /><em>on the record.</em></h1>
          <div className="s-stats s-micro">
            <div><b>{compounds.length}</b>Compounds</div>
            <div><b>≥99%</b>HPLC floor</div>
            <div><b>1 : 1</b>Vial-to-COA</div>
          </div>
        </div>
        <div className="flex flex-col gap-3.5 pt-6 pb-2">
          <form className="s-search" action="/products" role="search">
            {active && <input type="hidden" name="cat" value={active} />}
            <input name="q" defaultValue={q ?? ""} placeholder="Search compounds, CAS no., or lot…" aria-label="Search" />
            <button type="submit">Search</button>
          </form>
          <CategoryPills catalog={compounds} active={active} />
        </div>
        <section className="py-6 pb-16" style={{ borderBottom: "none" }}>
          {list.length === 0 ? (
            <p className="text-[color:var(--ink-soft)]">No compounds match “{q}”.</p>
          ) : (
            <div className="s-grid">
              {list.map((c, i) => <CompoundCard key={c.slug} compound={c} index={i} />)}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
