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
    <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-400">
            ▸ Order your stack
          </div>
          <h2 className="font-display text-2xl font-bold text-white">
            {templateLabel ?? "Stack"} · {totalItems}{" "}
            {totalItems === 1 ? "item" : "items"}
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            One card per vendor — minimizes accounts you need to create.
          </p>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Routing
          </div>
          <div className="font-display text-base font-bold text-white">
            {liveCount} {liveCount === 1 ? "vendor" : "vendors"}
          </div>
          <div className="text-[11px] text-slate-500">
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

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/5 pt-4 text-[10px] uppercase tracking-[0.18em]">
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-slate-400">
          {liveCount} live · {tbdCount} TBD
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-slate-400">
          Affiliate · sponsored
        </span>
      </div>
    </section>
  );
}
