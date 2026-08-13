"use client";

import { AFFILIATE_SLOTS } from "@/lib/constants";
import type { NutritionItem, FoodItem } from "@/lib/recommend/schema";

interface ProtocolSectionProps {
  title: string;
  color: "rose" | "emerald" | "violet" | "amber" | "cyan";
  items: NutritionItem[] | FoodItem[];
  affiliateSlotKey?: string;
}

// Muted instrument palette — rose→alert, emerald→ok, violet→llm, amber→warn, cyan→bio.
const COLOR_CLASSES = {
  rose: { badge: "bg-[color:var(--sig-alert-tint)] text-[color:var(--sig-alert)] border-[color:var(--sig-alert)]", dot: "bg-[color:var(--sig-alert)]" },
  emerald: { badge: "bg-[color:var(--sig-ok-tint)] text-[color:var(--sig-ok)] border-[color:var(--sig-ok)]", dot: "bg-[color:var(--sig-ok)]" },
  violet: { badge: "bg-[color:var(--sig-llm-tint)] text-[color:var(--sig-llm)] border-[color:var(--sig-llm)]", dot: "bg-[color:var(--sig-llm)]" },
  amber: { badge: "bg-[color:var(--sig-warn-tint)] text-[color:var(--sig-warn)] border-[color:var(--sig-warn)]", dot: "bg-[color:var(--sig-warn)]" },
  cyan: { badge: "bg-[color:var(--sig-bio-tint)] text-[color:var(--sig-bio)] border-[color:var(--sig-bio)]", dot: "bg-[color:var(--sig-bio)]" },
};

function isNutritionItem(item: NutritionItem | FoodItem): item is NutritionItem {
  return "dose" in item;
}

export default function ProtocolSection({ title, color, items, affiliateSlotKey }: ProtocolSectionProps) {
  const colors = COLOR_CLASSES[color];
  const affiliateUrl = affiliateSlotKey ? AFFILIATE_SLOTS[affiliateSlotKey] : null;

  return (
    <div className="p-card border border-[color:var(--line)] p-5">
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
              className="p-btn-outline px-3 py-1.5 text-xs font-medium"
            >
              Shop →
            </a>
          ) : (
            <button disabled className="border border-[color:var(--line)] bg-[color:var(--paper-deep)] px-3 py-1.5 text-xs font-medium text-[color:var(--ink-faint)] cursor-not-allowed">
              Shop → (coming soon)
            </button>
          )
        )}
      </div>

      <ul className="space-y-3">
        {items.map((item, i) => (
          <li key={i} className="flex flex-col gap-0.5">
            <div className="flex items-baseline gap-2">
              <span className="font-semibold text-[color:var(--ink)] text-sm">{item.name}</span>
              {isNutritionItem(item) ? (
                <span className="text-xs text-[color:var(--ink-soft)]">{item.dose}</span>
              ) : (
                <span className="text-xs text-[color:var(--ink-soft)]">{item.frequency}</span>
              )}
            </div>
            <p className="text-xs text-[color:var(--ink-faint)]">{item.rationale}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
