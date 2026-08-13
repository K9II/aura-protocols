import VendorCard from "@/components/VendorCard";
import type { VendorGroup } from "@/lib/recommend/vendor-router";

interface Props {
  groups: VendorGroup[];
  templateLabel?: string;
}

export default function VendorRail({ groups, templateLabel }: Props) {
  if (groups.length === 0) return null;

  const liveCount = groups.filter((g) => g.kind === "live").length;
  const tbdCount = groups.filter((g) => g.kind === "tbd").length;
  const totalItems = groups.reduce((acc, g) => acc + g.items.length, 0);

  return (
    <section className="mt-8 p-card border border-[color:var(--line)] p-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="p-cat-label mb-1">
            ▸ Order your stack
          </div>
          <h2 className="p-serif text-2xl text-[color:var(--ink)]">
            {templateLabel ?? "Stack"} · {totalItems}{" "}
            {totalItems === 1 ? "item" : "items"}
          </h2>
          <p className="mt-1 text-xs text-[color:var(--ink-soft)]">
            One card per vendor — minimizes accounts you need to create.
          </p>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
            Routing
          </div>
          <div className="p-serif text-base text-[color:var(--ink)]">
            {liveCount} {liveCount === 1 ? "vendor" : "vendors"}
          </div>
          <div className="text-[11px] text-[color:var(--ink-faint)]">
            {tbdCount > 0 ? `+ ${tbdCount} TBD` : "all slots live"}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
        {groups.map((group, idx) => (
          <VendorCard
            key={group.kind === "live" ? group.vendor : `tbd-${group.category}`}
            group={group}
            index={idx}
          />
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[color:var(--line)] pt-4 text-[10px] uppercase tracking-[0.18em]">
        <span className="rounded-full border border-[color:var(--line)] bg-[color:var(--paper-deep)] px-2.5 py-1 text-[color:var(--ink-soft)]">
          {liveCount} live · {tbdCount} TBD
        </span>
        <span className="rounded-full border border-[color:var(--line)] bg-[color:var(--paper-deep)] px-2.5 py-1 text-[color:var(--ink-soft)]">
          Affiliate · sponsored
        </span>
      </div>
    </section>
  );
}
