// SVG stand-in for product photography. Label = full Aura Protocols lockup
// (same A geometry + pulse path as AuraLockup), compound, strength, RUO.
const PULSE = "M44,110 L56,86 L68,86 L74,68 L80,108 L86,86 L100,86";

type VialProps = {
  id: string;            // unique per page instance (gradient ids)
  label: string;         // already shortened via vialLabel()
  strength: string;
  tilt?: number;         // degrees
  width?: number;        // rendered width; height keeps the 120:200 ratio
};

export default function Vial({ id, label, strength, tilt = -10, width = 160 }: VialProps) {
  const nameSize = label.length > 9 ? 10.5 : label.length > 7 ? 12.5 : 14;
  const gl = `vial-gl-${id}`;
  const cap = `vial-cap-${id}`;
  return (
    <svg
      width={width}
      height={(width * 200) / 120}
      viewBox="0 0 120 200"
      role="img"
      aria-label={`${label} ${strength} vial`}
      style={{ transform: `rotate(${tilt}deg)`, filter: "drop-shadow(0 14px 16px rgba(28,26,21,.22))" }}
    >
      <defs>
        <linearGradient id={gl} x1="0" x2="1">
          <stop offset="0" stopColor="#e9edf0" />
          <stop offset=".45" stopColor="#ffffff" />
          <stop offset="1" stopColor="#d5dade" />
        </linearGradient>
        <linearGradient id={cap} x1="0" x2="1">
          <stop offset="0" stopColor="#9aa0a6" />
          <stop offset=".5" stopColor="#eef0f2" />
          <stop offset="1" stopColor="#8d9398" />
        </linearGradient>
      </defs>
      <rect x="30" y="8" width="60" height="30" rx="4" fill={`url(#${cap})`} />
      <rect x="36" y="36" width="48" height="10" fill="#c9ced2" />
      <rect x="20" y="44" width="80" height="150" rx="12" fill={`url(#${gl})`} stroke="#cfd4d8" />
      <rect x="20" y="70" width="80" height="108" fill="#FBFAF7" />
      <g transform="translate(23,71) scale(.175)" fill="none" stroke="#1C1A15" strokeLinecap="round" strokeWidth="8">
        <g transform="translate(6,4) skewX(-7)">
          <path d="M30,128 L63,23" />
          <path d="M77,23 L124,128" />
          <path stroke="#A32B1F" strokeWidth="5.5" d={PULSE} />
        </g>
      </g>
      <text x="43" y="94.5" style={{ fontFamily: "var(--font-newsreader), Georgia, serif" }} fontSize="22" fontWeight="500" fill="#A32B1F" letterSpacing="-.3">ura</text>
      <text x="58" y="103" style={{ fontFamily: "var(--font-newsreader), Georgia, serif" }} fontSize="6.6" fontWeight="500" fill="#4A4438" letterSpacing=".3" textAnchor="middle">Protocols</text>
      <line x1="26" y1="108" x2="94" y2="108" stroke="#C9C2AE" strokeWidth=".8" />
      <text x="26" y="123" style={{ fontFamily: "var(--font-newsreader), Georgia, serif" }} fontSize={nameSize} fontWeight="600" fill="#1C1A15">{label}</text>
      <text x="26" y="133" style={{ fontFamily: "var(--font-sans), Inter, sans-serif" }} fontSize="8.5" fill="#A32B1F">{strength}</text>
      <line x1="26" y1="140" x2="94" y2="140" stroke="#C9C2AE" strokeWidth=".8" />
      {/* Every line must end before x=94 (the paper label's right margin). */}
      <text x="26" y="149" style={{ fontFamily: "var(--font-jetbrains), monospace" }} fontSize="5.4" fill="#4A4438" letterSpacing=".4">LYOPHILIZED</text>
      <text x="26" y="157" style={{ fontFamily: "var(--font-jetbrains), monospace" }} fontSize="5.4" fill="#4A4438" letterSpacing=".4">RESEARCH USE ONLY</text>
      <text x="26" y="165" style={{ fontFamily: "var(--font-jetbrains), monospace" }} fontSize="5.4" fill="#4A4438" letterSpacing=".2">NOT FOR HUMAN USE</text>
      <text x="26" y="173" style={{ fontFamily: "var(--font-jetbrains), monospace" }} fontSize="5.4" fill="#4A4438">LOT ——————</text>
    </svg>
  );
}
