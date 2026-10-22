import { useId } from "react";
import Vial from "@/components/store/Vial";
import type { KitArt } from "@/lib/wholesale/rules";

// A 10-vial kit, option A "Vial in front" (mock /mock/kits, Alvester 2026-10-22): the
// store's vial at the shop card's size stands in front so a blend's scientific name on its
// label can be read; the kit carton stands behind it, up and to the left, and still says
// it's a kit of 10. Sizes and positions are CSS (.s-kc-art in globals.css) so the pair
// scales with the tile. The carton was ported from the approved mock (2026-10-08-wholesale-mocks, KitBox).
const PULSE = "M44,110 L56,86 L68,86 L74,68 L80,108 L86,86 L100,86";
const SERIF = "var(--font-newsreader), Georgia, serif";
const MONO = "var(--font-jetbrains), monospace";
const SANS = "var(--font-sans), Inter, sans-serif";

// The carton carries the product name only (a blend's nickname, e.g. GLOW); the vial in
// front carries the scientific name, like the store vial.
function Carton({ title, strength, vialLabel }: { title: string; strength: string; vialLabel: string }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const boxName = title.length > 16 ? vialLabel : title;
  const nameSize = boxName.length > 12 ? 11 : 13;
  return (
    <svg viewBox="10 16 140 126" aria-hidden="true">
      <defs>
        <linearGradient id={`s${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#1C1A15" stopOpacity=".06" /><stop offset="1" stopColor="#1C1A15" stopOpacity=".16" />
        </linearGradient>
      </defs>
      {/* top, side, front */}
      <path d="M14,34 L30,20 L146,20 L130,34 Z" fill="#EDE9E0" stroke="#1C1A15" strokeWidth="1" />
      <path d="M130,34 L146,20 L146,124 L130,138 Z" fill="#D6CFBC" stroke="#1C1A15" strokeWidth="1" />
      <rect x="14" y="34" width="116" height="104" fill="#E2DCCC" stroke="#1C1A15" strokeWidth="1" />
      <rect x="14" y="34" width="116" height="104" fill={`url(#s${id})`} />
      {/* kit label */}
      <line x1="22" y1="44" x2="122" y2="44" stroke="#A32B1F" strokeWidth=".8" />
      <g transform="translate(22,47) scale(.11)" fill="none" stroke="#1C1A15" strokeLinecap="round" strokeWidth="9">
        <g transform="translate(6,4) skewX(-7)"><path d="M30,128 L63,23" /><path d="M77,23 L124,128" /><path stroke="#A32B1F" strokeWidth="6" d={PULSE} /></g>
      </g>
      <text x="40" y="59" fontFamily={SERIF} fontSize="9" fontWeight="500" fill="#4A4438" letterSpacing=".3">Aura Protocols</text>
      <text x="22" y="80" fontFamily={SERIF} fontSize={nameSize} fontWeight="600" fill="#1C1A15">{boxName}</text>
      <text x="22" y="92" fontFamily={SANS} fontSize="9" fill="#A32B1F">{strength}</text>
      <line x1="22" y1="99" x2="88" y2="99" stroke="#C9C2AE" strokeWidth=".8" />
      <text x="22" y="109" fontFamily={MONO} fontSize="6" fill="#1C1A15" letterSpacing=".5">KIT · 10 VIALS</text>
      <text x="22" y="118" fontFamily={MONO} fontSize="5.2" fill="#4A4438" letterSpacing=".4">ONE LOT · CERTIFICATE</text>
      <text x="22" y="126" fontFamily={MONO} fontSize="5.2" fill="#4A4438" letterSpacing=".4">RESEARCH USE ONLY</text>
      <line x1="22" y1="131" x2="122" y2="131" stroke="#A32B1F" strokeWidth=".8" />
    </svg>
  );
}

export default function KitBox({ id, title, strength, art, rule }: {
  id: string;     // unique per page (the vial's gradient ids)
  title: string; strength: string; art: KitArt;
  rule: string;   // the vial label's hairlines: the class colour, like the store vial
}) {
  const lines = art.vialLines ?? [art.vialLabel];
  return (
    <div className="s-kc-art" role="img" aria-label={`${title} ${strength} kit of 10 vials`}>
      <div className="s-kc-carton"><Carton title={title} strength={strength} vialLabel={art.vialLabel} /></div>
      <div className="s-kc-vial">
        <Vial id={id} label={lines[0]} label2={lines[1]} cap={art.cap} rule={rule} parts={art.parts} strength={strength} tilt={0} width={120} />
      </div>
    </div>
  );
}
