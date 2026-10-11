import type { Tier } from "@/lib/wholesale/rules";
import { VOLUME_QUOTE_ANCHOR, VOLUME_QUOTE_MIN_KITS } from "@/lib/wholesale/rules";

// "5–9 kits / 20% off" — phones get "5–9 / 20%" (mock w8). activePct highlights the current tier.
// While the top tier starts below the volume-quote threshold, it ends there ("20–49 kits") and a
// fourth card points larger orders to a quote (mock "Volume Quote Mocks", option B).
export default function TierTable({ tiers, activePct }: { tiers: Tier[]; activePct?: number | null }) {
  const quote = tiers.length > 0 && tiers[tiers.length - 1].minKits < VOLUME_QUOTE_MIN_KITS;
  return (
    <div className={`s-ws-tiers${quote ? " s-ws-tiers--q" : ""}`} role="list" aria-label="Volume pricing">
      {tiers.map((t, i) => {
        const end = tiers[i + 1] ? tiers[i + 1].minKits - 1 : quote ? VOLUME_QUOTE_MIN_KITS - 1 : null;
        const range = end != null ? `${t.minKits}–${end}` : `${t.minKits}+`;
        return (
          <div key={t.minKits} role="listitem" className={t.pct === activePct ? "on" : undefined}>
            <span className="s-micro">{range}<span className="s-ws-long"> kits</span></span>
            <b>{t.pct}%<span className="s-ws-long"> off</span></b>
          </div>
        );
      })}
      {quote && (
        <div role="listitem" className="s-ws-q">
          <span className="s-micro">{VOLUME_QUOTE_MIN_KITS}+<span className="s-ws-long"> kits</span></span>
          <b>Volume quote</b>
          <a href={`#${VOLUME_QUOTE_ANCHOR}`}>Ask us ↓</a>
        </div>
      )}
    </div>
  );
}
