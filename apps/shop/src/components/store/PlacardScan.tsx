"use client";

import { useChosenStrength } from "@/lib/chosen-strength";
import type { VialStrength } from "@/components/store/VialTurn";

// The placard's scan code (desktop only; phones can't scan their own screen). It follows the
// size picker, like the turning vial: the chosen strength's lot certificate, or the lookup.
export default function PlacardScan({ slug, strengths }: { slug: string; strengths: VialStrength[] }) {
  const chosenId = useChosenStrength(slug, strengths[0].id);
  const { qr } = strengths.find((s) => s.id === chosenId) ?? strengths[0];
  const n = qr.length + 2; // one-square margin; the white box adds the rest
  const d = qr.flatMap((row, y) => [...row].map((v, x) => (v === "1" ? `M${x + 1},${y + 1}h1v1h-1z` : ""))).join("");
  return (
    <div className="s-pdp-scan">
      <svg viewBox={`0 0 ${n} ${n}`} shapeRendering="crispEdges" aria-hidden>
        <rect width={n} height={n} fill="#fff" />
        <path d={d} fill="#1C1A15" />
      </svg>
      <span>Scan for lot&apos;s certificate of analysis</span>
    </div>
  );
}
