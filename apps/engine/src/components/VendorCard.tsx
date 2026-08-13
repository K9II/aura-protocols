import { AFFILIATE_REL } from "@/lib/constants";
import type { VendorGroup } from "@/lib/recommend/vendor-router";

type Accent = "cyan" | "violet" | "amber" | "emerald";

// Muted instrument palette — cyan→bio, violet→llm, amber→warn, emerald→ok.
const ACCENT_RING: Record<Accent, string> = {
  cyan: "border-[color:var(--sig-bio)]",
  violet: "border-[color:var(--sig-llm)]",
  amber: "border-[color:var(--sig-warn)]",
  emerald: "border-[color:var(--sig-ok)]",
};

const ACCENT_TAG: Record<Accent, string> = {
  cyan: "text-[color:var(--sig-bio)]",
  violet: "text-[color:var(--sig-llm)]",
  amber: "text-[color:var(--sig-warn)]",
  emerald: "text-[color:var(--sig-ok)]",
};

const ACCENT_BUTTON: Record<Accent, string> = {
  cyan: "bg-[color:var(--sig-bio)] text-[color:var(--paper)]",
  violet: "bg-[color:var(--sig-llm)] text-[color:var(--paper)]",
  amber: "bg-[color:var(--paper-deep)] text-[color:var(--sig-warn)] border border-[color:var(--sig-warn)]",
  emerald: "bg-[color:var(--paper-deep)] text-[color:var(--sig-ok)] border border-[color:var(--sig-ok)]",
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
      className={`p-card flex flex-col border ${ACCENT_RING[tone]} p-5 transition`}
    >
      <div
        className={`mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.18em] ${ACCENT_TAG[tone]}`}
      >
        <span>▸ Vendor · {itemCount} {itemCount === 1 ? "item" : "items"}</span>
        <span className="inline-flex items-center gap-1.5 text-[color:var(--sig-ok)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--sig-ok)]" />
          live
        </span>
      </div>

      <div className="mb-3 p-serif text-lg leading-tight text-[color:var(--ink)]">
        {group.vendor}
      </div>

      <ul className="mb-4 space-y-2 border-y border-[color:var(--line)] py-3">
        {group.items.map((item) => (
          <li key={item.slug} className="flex flex-col gap-0.5 text-xs">
            {item.url ? (
              <a
                href={item.url}
                target="_blank"
                rel={AFFILIATE_REL}
                className="font-medium text-[color:var(--ink-soft)] underline-offset-2 hover:text-[color:var(--specimen)] hover:underline transition-colors"
              >
                {item.name} ↗
              </a>
            ) : (
              <span className="font-medium text-[color:var(--ink-soft)]">{item.name}</span>
            )}
            {item.dose && (
              <span className="text-[11px] text-[color:var(--ink-faint)]">{item.dose}</span>
            )}
          </li>
        ))}
      </ul>

      <p className="mb-4 text-[11px] leading-relaxed text-[color:var(--ink-faint)]">
        First time? You&apos;ll create a quick account at {group.vendor}.
      </p>

      <a
        href={group.url}
        target="_blank"
        rel={AFFILIATE_REL}
        className={`mt-auto block w-full px-4 py-3 text-center text-sm font-bold transition min-h-[44px] ${ACCENT_BUTTON[tone]}`}
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
      className={`p-card flex flex-col border ${ACCENT_RING[tone]} p-5 opacity-70`}
    >
      <div
        className={`mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.18em] ${ACCENT_TAG[tone]}`}
      >
        <span>▸ {group.category}</span>
        <span className="inline-flex items-center gap-1.5 text-[color:var(--ink-faint)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--ink-faint)]" />
          tbd
        </span>
      </div>

      <div className="mb-3 p-serif text-lg leading-tight text-[color:var(--ink-soft)]">
        Partner TBD
      </div>

      <ul className="mb-4 space-y-2 border-y border-[color:var(--line)] py-3">
        {group.items.map((item) => (
          <li
            key={item.slug}
            className="flex flex-col gap-0.5 text-xs"
          >
            <span className="font-medium text-[color:var(--ink-soft)]">{item.name}</span>
            {item.dose && (
              <span className="text-[11px] text-[color:var(--ink-faint)]">{item.dose}</span>
            )}
          </li>
        ))}
      </ul>

      <p className="mb-4 text-[11px] leading-relaxed text-[color:var(--ink-faint)]">
        We&apos;re sourcing a vetted partner for this slot.
      </p>

      <button
        type="button"
        disabled
        aria-disabled="true"
        className={`mt-auto block w-full px-4 py-3 text-center text-sm font-bold transition cursor-not-allowed min-h-[44px] ${ACCENT_BUTTON[tone]}`}
      >
        Coming Soon
      </button>
    </div>
  );
}
