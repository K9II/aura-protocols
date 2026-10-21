import type { PublicLot } from "@/data/catalog-types";

// The home hero's "aura" (mock v4 "1 · Dictionary", 2026-10-17,
// https://claude.ai/artifact/Mha5JnMX9YXXAcsXEqgAwN): four rings of certificate
// text around the sphere, drawn in a 640 × 640 box. Pure — the page passes in the lots.

export type AuraRing = { r: number; size: number; track: number; fill: string; opacity: number; seconds: number; reverse: boolean; text: string };

const SEP = " · ";

// Ring 1 = lots selling now: "BPC-157 · LOT BPC-2611-03 · 99.4%". Never example lots:
// with none released (pre-launch) it says what each entry will be instead.
export const RING1_FALLBACK = "Compound · lot number · purity · certificate on file";

// One ring holds this many characters at its size before the text would crowd.
function capacity(r: number, size: number, track: number) {
  return Math.floor((2 * Math.PI * r) / (size * 0.6 + track));
}

export function lotRingText(lots: PublicLot[], maxChars: number): string {
  const seen = new Set<string>();
  const entries: string[] = [];
  let used = 0;
  for (const l of lots) {
    if (l.status !== "live" || !l.onStore || seen.has(l.lot)) continue;
    seen.add(l.lot);
    const entry = `${l.compoundName}${SEP}lot ${l.lot}${SEP}${l.purityPct}%${SEP}`;
    if (used + entry.length > maxChars) break;
    entries.push(entry);
    used += entry.length;
  }
  return entries.length ? entries.join("") : RING1_FALLBACK + SEP;
}

export function auraRings(lots: PublicLot[]): AuraRing[] {
  const r1 = { r: 252, size: 11, track: 1.2 };
  return [
    { ...r1, fill: "#A32B1F", opacity: 0.95, seconds: 200, reverse: false, text: lotRingText(lots, capacity(r1.r, r1.size, r1.track)) },
    { r: 274, size: 10, track: 1.3, fill: "#2F6B3A", opacity: 0.8, seconds: 260, reverse: true,
      // The panel's tests (Alvester, 2026-10-20: kept when the "every lot" seven-test claim went
      // off — the ring names what we test for, it doesn't say every lot gets all of them).
      text: "Identity confirmed · quantity measured · endotoxin pass · sterility pass · heavy metals pass · fentanyl screen clear · " },
    { r: 295, size: 9.5, track: 1.4, fill: "#4A4438", opacity: 0.5, seconds: 340, reverse: false, text: "Independent third-party US lab · certificate published under every lot number · " },
    { r: 314, size: 9, track: 1.5, fill: "#4A4438", opacity: 0.26, seconds: 420, reverse: true, text: "Scan the vial · read the certificate · " },
  ];
}

// The phrase repeated to go once round, as the mock does; the SVG stretches it to fit exactly.
export function ringRepeat(ring: AuraRing): string {
  const unit = ring.size * 0.6 + ring.track;
  const n = Math.max(1, Math.round((2 * Math.PI * ring.r) / (ring.text.length * unit)));
  return ring.text.toUpperCase().repeat(n);
}
