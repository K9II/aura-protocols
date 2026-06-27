import { AFFILIATE_REL } from "@/lib/constants";
import type { VendorGroup } from "@/lib/recommend/vendor-router";

type Accent = "cyan" | "violet" | "amber" | "emerald";

const ACCENT_RING: Record<Accent, string> = {
  cyan: "border-cyan-500/25 hover:border-cyan-400/50",
  violet: "border-violet-500/25 hover:border-violet-400/50",
  amber: "border-amber-500/20",
  emerald: "border-emerald-500/20",
};

const ACCENT_TAG: Record<Accent, string> = {
  cyan: "text-cyan-400",
  violet: "text-violet-400",
  amber: "text-amber-400",
  emerald: "text-emerald-400",
};

const ACCENT_BUTTON: Record<Accent, string> = {
  cyan: "bg-cyan-500 hover:bg-cyan-400 text-[#04060f]",
  violet: "bg-violet-500 hover:bg-violet-400 text-white",
  amber: "bg-white/5 text-amber-300 border border-amber-500/30",
  emerald: "bg-white/5 text-emerald-300 border border-emerald-500/30",
};

interface Props {
  group: VendorGroup;
  accent?: Accent;
  index: number;
}

export default function VendorCard({ group, accent, index }: Props) {
  if (group.kind === "tbd") {
    return <TbdCard group={group} index={index} />;
  }

  const tone: Accent = accent ?? (index % 2 === 0 ? "cyan" : "violet");
  const itemCount = group.items.length;

  return (
    <div
      className={`flex flex-col rounded-xl border ${ACCENT_RING[tone]} bg-white/[0.03] p-5 transition`}
    >
      <div
        className={`mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.18em] ${ACCENT_TAG[tone]}`}
      >
        <span>▸ Vendor · {itemCount} {itemCount === 1 ? "item" : "items"}</span>
        <span className="inline-flex items-center gap-1.5 text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          live
        </span>
      </div>

      <div className="mb-3 font-display text-lg font-bold leading-tight text-white">
        {group.vendor}
      </div>

      <ul className="mb-4 space-y-2 border-y border-white/5 py-3">
        {group.items.map((item) => (
          <li key={item.slug} className="flex flex-col gap-0.5 text-xs">
            {item.url ? (
              <a
                href={item.url}
                target="_blank"
                rel={AFFILIATE_REL}
                className="font-medium text-slate-200 underline-offset-2 hover:text-cyan-300 hover:underline transition-colors"
              >
                {item.name} ↗
              </a>
            ) : (
              <span className="font-medium text-slate-200">{item.name}</span>
            )}
            {item.dose && (
              <span className="text-[11px] text-slate-500">{item.dose}</span>
            )}
          </li>
        ))}
      </ul>

      <p className="mb-4 text-[11px] leading-relaxed text-slate-500">
        First time? You&apos;ll create a quick account at {group.vendor}.
      </p>

      <a
        href={group.url}
        target="_blank"
        rel={AFFILIATE_REL}
        className={`mt-auto block w-full rounded-lg px-4 py-3 text-center text-sm font-bold transition min-h-[44px] ${ACCENT_BUTTON[tone]}`}
      >
        Continue to {group.vendor} →
      </a>
    </div>
  );
}

function TbdCard({ group, index }: { group: Extract<VendorGroup, { kind: "tbd" }>; index: number }) {
  const tone: Accent = index % 2 === 0 ? "amber" : "emerald";
  return (
    <div
      className={`flex flex-col rounded-xl border ${ACCENT_RING[tone]} bg-white/[0.02] p-5 opacity-70`}
    >
      <div
        className={`mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.18em] ${ACCENT_TAG[tone]}`}
      >
        <span>▸ {group.category}</span>
        <span className="inline-flex items-center gap-1.5 text-slate-500">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
          tbd
        </span>
      </div>

      <div className="mb-3 font-display text-lg font-bold leading-tight text-slate-300">
        Partner TBD
      </div>

      <ul className="mb-4 space-y-2 border-y border-white/5 py-3">
        {group.items.map((item) => (
          <li
            key={item.slug}
            className="flex flex-col gap-0.5 text-xs"
          >
            <span className="font-medium text-slate-300">{item.name}</span>
            {item.dose && (
              <span className="text-[11px] text-slate-500">{item.dose}</span>
            )}
          </li>
        ))}
      </ul>

      <p className="mb-4 text-[11px] leading-relaxed text-slate-500">
        We&apos;re sourcing a vetted partner for this slot.
      </p>

      <button
        type="button"
        disabled
        aria-disabled="true"
        className={`mt-auto block w-full rounded-lg px-4 py-3 text-center text-sm font-bold transition cursor-not-allowed min-h-[44px] ${ACCENT_BUTTON[tone]}`}
      >
        Coming Soon
      </button>
    </div>
  );
}
