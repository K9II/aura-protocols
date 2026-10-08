import { useId } from "react";
import type { KitArt } from "@/lib/wholesale/rules";

// A 10-vial kit: carton with the kit label, the store's vial (same geometry
// and cap as components/store/Vial.tsx) standing in front in clear glass.
// Ported from the approved mock (2026-10-08-wholesale-mocks, KitBox).
const BODY = "M38,44 L82,44 L82,50 Q100,52 100,64 L100,186 Q100,195 91,195 L29,195 Q20,195 20,186 L20,64 Q20,52 38,50 Z";
const PULSE = "M44,110 L56,86 L68,86 L74,68 L80,108 L86,86 L100,86";
const SERIF = "var(--font-newsreader), Georgia, serif";
const MONO = "var(--font-jetbrains), monospace";
const SANS = "var(--font-sans), Inter, sans-serif";
const CAPS = {
  red: ["#6d1b13", "#c4473a", "#8a241a", "#7e2017"],
  black: ["#0c0b09", "#4a4640", "#1c1a15", "#121110"],
  white: ["#b9bcbd", "#ffffff", "#c9cccd", "#d9dbdc"],
} as const;

// The picture carries the product name only: an APro designation, never the
// scientific name (2026-10-08). The page text around it shows the scientific name.
export default function KitBox({ title, strength, art, width }: {
  title: string; strength: string; art: KitArt; width: number;
}) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const boxName = title.length > 16 ? art.vialLabel : title;
  const nameSize = boxName.length > 12 ? 11 : 13;
  const vialSize = art.vialLabel.length > 9 ? 10.5 : art.vialLabel.length > 7 ? 12.5 : 14;
  const c = CAPS[art.cap];
  return (
    <svg width={width} height={(width * 150) / 200} viewBox="0 0 200 150" role="img" aria-label={`${title} ${strength} kit of 10 vials`}>
      <defs>
        <linearGradient id={`g${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#7f8b92" stopOpacity=".42" /><stop offset=".08" stopColor="#fff" stopOpacity=".55" />
          <stop offset=".16" stopColor="#dfe6ea" stopOpacity=".1" /><stop offset=".6" stopColor="#fff" stopOpacity=".06" />
          <stop offset="1" stopColor="#6f7b82" stopOpacity=".5" />
        </linearGradient>
        <linearGradient id={`a${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#8b9196" /><stop offset=".35" stopColor="#f6f7f8" /><stop offset=".6" stopColor="#a9afb4" /><stop offset="1" stopColor="#7d8388" />
        </linearGradient>
        <linearGradient id={`c${id}`} x1="0" x2="1">
          {[0, 0.3, 0.7, 1].map((o, i) => <stop key={o} offset={o} stopColor={c[i]} />)}
        </linearGradient>
        <linearGradient id={`s${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#1C1A15" stopOpacity=".06" /><stop offset="1" stopColor="#1C1A15" stopOpacity=".16" />
        </linearGradient>
      </defs>
      {/* carton: top, side, front */}
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
      {/* vial in front, clear glass (no backing fill) */}
      <g transform="translate(112,30) rotate(6 30 50) scale(.58)" style={{ filter: "drop-shadow(0 6px 6px rgba(28,26,21,.18))" }}>
        <path d={BODY} fill={`url(#g${id})`} stroke="#9aa6ad" strokeOpacity=".55" strokeWidth=".8" />
        <path d="M22,178 Q34,173.5 46,176 Q60,172.5 74,175.5 Q88,173 98,177 L98,190 L22,190 Z" fill="#fbfaf6" />
        <path d="M22,62 Q24,53 38,51" fill="none" stroke="#fff" strokeWidth="1.2" opacity=".75" />
        <rect x="20" y="66" width="80" height="94" fill="#FBFAF7" />
        <line x1="20" y1="66.4" x2="100" y2="66.4" stroke="#A32B1F" strokeWidth=".8" />
        <line x1="20" y1="159.6" x2="100" y2="159.6" stroke="#A32B1F" strokeWidth=".8" />
        <g transform="translate(23,66) scale(.175)" fill="none" stroke="#1C1A15" strokeLinecap="round" strokeWidth="8">
          <g transform="translate(6,4) skewX(-7)"><path d="M30,128 L63,23" /><path d="M77,23 L124,128" /><path stroke="#A32B1F" strokeWidth="5.5" d={PULSE} /></g>
        </g>
        <text x="43" y="89.5" fontFamily={SERIF} fontSize="22" fontWeight="500" fill="#A32B1F">ura</text>
        <text x="58" y="98" fontFamily={SERIF} fontSize="6.6" fontWeight="500" fill="#4A4438" textAnchor="middle">Protocols</text>
        <line x1="26" y1="103" x2="94" y2="103" stroke="#C9C2AE" strokeWidth=".8" />
        <text x="26" y="117" fontFamily={SERIF} fontSize={vialSize} fontWeight="600" fill="#1C1A15">{art.vialLabel}</text>
        <text x="26" y="127" fontFamily={SANS} fontSize="8.5" fill="#A32B1F">{strength}</text>
        <line x1="26" y1="133" x2="94" y2="133" stroke="#C9C2AE" strokeWidth=".8" />
        <text x="26" y="148.5" fontFamily={MONO} fontSize="5.4" fill="#4A4438">RESEARCH USE ONLY</text>
        <rect x="25.5" y="56" width="2.6" height="134" rx="1.3" fill="#fff" opacity=".45" />
        <rect x="38" y="38" width="44" height="8" fill={`url(#g${id})`} stroke="#9aa6ad" strokeOpacity=".5" strokeWidth=".6" />
        <rect x="30" y="18" width="60" height="23" rx="2" fill={`url(#a${id})`} />
        <rect x="28" y="8" width="64" height="12" rx="3" fill={`url(#c${id})`} />
      </g>
    </svg>
  );
}
