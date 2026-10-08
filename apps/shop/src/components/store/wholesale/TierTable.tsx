import type { Tier } from "@/lib/wholesale/rules";

// "5–9 kits / 20% off" — phones get "5–9 / 20%" (mock w8). activePct highlights the current tier.
export default function TierTable({ tiers, activePct }: { tiers: Tier[]; activePct?: number | null }) {
  return (
    <div className="s-ws-tiers" role="list" aria-label="Volume pricing">
      {tiers.map((t, i) => {
        const range = tiers[i + 1] ? `${t.minKits}–${tiers[i + 1].minKits - 1}` : `${t.minKits}+`;
        return (
          <div key={t.minKits} role="listitem" className={t.pct === activePct ? "on" : undefined}>
            <span className="s-micro">{range}<span className="s-ws-long"> kits</span></span>
            <b>{t.pct}%<span className="s-ws-long"> off</span></b>
          </div>
        );
      })}
    </div>
  );
}
