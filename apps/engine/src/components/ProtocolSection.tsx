"use client";

import { AFFILIATE_SLOTS } from "@/lib/constants";
import type { NutritionItem, FoodItem } from "@/lib/recommend/schema";

interface ProtocolSectionProps {
  title: string;
  color: "rose" | "emerald" | "violet" | "amber" | "cyan";
  items: NutritionItem[] | FoodItem[];
  affiliateSlotKey?: string;
}

const COLOR_CLASSES = {
  rose: { badge: "bg-rose-500/20 text-rose-300 border-rose-500/30", dot: "bg-rose-400" },
  emerald: { badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", dot: "bg-emerald-400" },
  violet: { badge: "bg-violet-500/20 text-violet-300 border-violet-500/30", dot: "bg-violet-400" },
  amber: { badge: "bg-amber-500/20 text-amber-300 border-amber-500/30", dot: "bg-amber-400" },
  cyan: { badge: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30", dot: "bg-cyan-400" },
};

function isNutritionItem(item: NutritionItem | FoodItem): item is NutritionItem {
  return "dose" in item;
}

export default function ProtocolSection({ title, color, items, affiliateSlotKey }: ProtocolSectionProps) {
  const colors = COLOR_CLASSES[color];
  const affiliateUrl = affiliateSlotKey ? AFFILIATE_SLOTS[affiliateSlotKey] : null;

  return (
    <div className="rounded-xl border border-white/10 bg-[#0d1117] p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${colors.badge}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
          {title}
        </span>
        {affiliateSlotKey && (
          affiliateUrl ? (
            <a
              href={affiliateUrl}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/20"
            >
              Shop →
            </a>
          ) : (
            <button disabled className="rounded-lg bg-white/5 px-3 py-1.5 text-xs font-medium text-white/30 cursor-not-allowed">
              Shop → (coming soon)
            </button>
          )
        )}
      </div>

      <ul className="space-y-3">
        {items.map((item, i) => (
          <li key={i} className="flex flex-col gap-0.5">
            <div className="flex items-baseline gap-2">
              <span className="font-semibold text-white text-sm">{item.name}</span>
              {isNutritionItem(item) ? (
                <span className="text-xs text-slate-400">{item.dose}</span>
              ) : (
                <span className="text-xs text-slate-400">{item.frequency}</span>
              )}
            </div>
            <p className="text-xs text-slate-500">{item.rationale}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
