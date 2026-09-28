import type { Metadata } from "next";
import CompoundCard from "@/components/store/CompoundCard";
import CategoryPills from "@/components/store/CategoryPills";
import { CHEMICAL_CLASSES, compounds, type ChemicalClass } from "@/data/catalog";
import { isPendingLot } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Research Compounds",
  description: "Lab-tested research peptides by chemical class. Every lot independently tested, every certificate on the page.",
  alternates: { canonical: "/products" },
};

function matches(q: string) {
  const needle = q.trim().toLowerCase();
  return (c: (typeof compounds)[number]) =>
    c.name.toLowerCase().includes(needle) ||
    (c.identity.cas ?? "").includes(needle) ||
    (!isPendingLot(c.currentLot) && c.currentLot.lot.toLowerCase() === needle);
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; q?: string }>;
}) {
  const { cat, q } = await searchParams;
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
          <CategoryPills active={active} />
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
