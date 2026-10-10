// SVG stand-in for product photography: clear glass vial, flip-off cap
// (red, black or white — see vialCap()), powder cake visible below the label, lot printed on glass.
// Label = full Aura Protocols lockup (same A geometry + pulse path as
// AuraLockup), compound, strength, RUO.
const PULSE = "M44,110 L56,86 L68,86 L74,68 L80,108 L86,86 L100,86";
const BODY = "M38,44 L82,44 L82,50 Q100,52 100,64 L100,186 Q100,195 91,195 L29,195 Q20,195 20,186 L20,64 Q20,52 38,50 Z";
const SERIF = { fontFamily: "var(--font-newsreader), Georgia, serif" };
const MONO = { fontFamily: "var(--font-jetbrains), monospace" };
// Cap gradient stops, left edge → right edge.
const CAPS = {
  red: ["#6d1b13", "#c4473a", "#8a241a", "#7e2017"],
  black: ["#0c0b09", "#4a4640", "#1c1a15", "#121110"],
  white: ["#b9bcbd", "#ffffff", "#c9cccd", "#d9dbdc"],
} as const;

type VialProps = {
  id: string;            // unique per page instance (gradient ids)
  label: string;         // already shortened via vialLabel()
  strength: string;
  tilt?: number;         // degrees
  width?: number;        // rendered width; height keeps the 120:200 ratio
  cap?: keyof typeof CAPS;
  rule?: string;         // label hairlines: the chemical class colour (lib/class-colors.ts); specimen red by default
};

export default function Vial({ id, label, strength, tilt = -10, width = 160, cap: capColor = "red", rule = "#A32B1F" }: VialProps) {
  // A class colour reads as a band, so it draws a little heavier than the red hairline.
  const ruleWidth = rule === "#A32B1F" ? 0.8 : 1.6;
  const nameSize = label.length > 9 ? 10.5 : label.length > 7 ? 12.5 : 14;
  const glass = `vial-glass-${id}`;
  const alu = `vial-alu-${id}`;
  const cap = `vial-cap-${id}`;
  const wrap = `vial-wrap-${id}`;
  const powder = `vial-powder-${id}`;
  const clip = `vial-clip-${id}`;
  return (
    <svg
      width={width}
      height={(width * 200) / 120}
      viewBox="0 0 120 200"
      role="img"
      aria-label={`${label} ${strength} vial`}
      style={{ transform: `rotate(${tilt}deg)`, filter: "drop-shadow(0 12px 14px rgba(28,26,21,.14))" }}
    >
      <defs>
        <linearGradient id={glass} x1="0" x2="1">
          <stop offset="0" stopColor="#7f8b92" stopOpacity=".42" />
          <stop offset=".08" stopColor="#ffffff" stopOpacity=".55" />
          <stop offset=".16" stopColor="#dfe6ea" stopOpacity=".1" />
          <stop offset=".6" stopColor="#ffffff" stopOpacity=".06" />
          <stop offset=".88" stopColor="#cfd8dd" stopOpacity=".22" />
          <stop offset="1" stopColor="#6f7b82" stopOpacity=".5" />
        </linearGradient>
        <linearGradient id={alu} x1="0" x2="1">
          <stop offset="0" stopColor="#8b9196" />
          <stop offset=".18" stopColor="#d7dbde" />
          <stop offset=".35" stopColor="#f6f7f8" />
          <stop offset=".6" stopColor="#a9afb4" />
          <stop offset=".85" stopColor="#c8cdd0" />
          <stop offset="1" stopColor="#7d8388" />
        </linearGradient>
        <linearGradient id={cap} x1="0" x2="1">
          {[0, 0.3, 0.7, 1].map((o, i) => <stop key={o} offset={o} stopColor={CAPS[capColor][i]} />)}
        </linearGradient>
        {/* Cylindrical shading across the paper label. */}
        <linearGradient id={wrap} x1="0" x2="1">
          <stop offset="0" stopColor="#1C1A15" stopOpacity=".16" />
          <stop offset=".12" stopColor="#1C1A15" stopOpacity="0" />
          <stop offset=".8" stopColor="#1C1A15" stopOpacity="0" />
          <stop offset="1" stopColor="#1C1A15" stopOpacity=".2" />
        </linearGradient>
        <linearGradient id={powder} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fbfaf6" />
          <stop offset="1" stopColor="#e6e1d4" />
        </linearGradient>
        <clipPath id={clip}>
          <path d={BODY} />
        </clipPath>
      </defs>

      {/* Glass body */}
      <path d={BODY} fill={`url(#${glass})`} stroke="#9aa6ad" strokeOpacity=".55" strokeWidth=".8" />
      <g clipPath={`url(#${clip})`}>
        {/* Lyophilized cake */}
        <path d="M22,178 Q34,173.5 46,176 Q60,172.5 74,175.5 Q88,173 98,177 L98,190 L22,190 Z" fill={`url(#${powder})`} />
        <path d="M22,178 Q34,173.5 46,176 Q60,172.5 74,175.5 Q88,173 98,177" fill="none" stroke="#fff" strokeWidth=".9" opacity=".8" />
        {/* Thick glass base */}
        <rect x="20" y="189" width="80" height="7" fill="#9aa6ad" opacity=".28" />
        <path d="M24,190 Q60,186 96,190" fill="none" stroke="#fff" strokeWidth=".8" opacity=".7" />
        {/* Shoulder refraction */}
        <path d="M22,62 Q24,53 38,51" fill="none" stroke="#fff" strokeWidth="1.2" opacity=".75" />
        <path d="M98,62 Q96,53 82,51" fill="none" stroke="#5f6b72" strokeWidth=".9" opacity=".35" />
      </g>
      {/* Specular streaks (behind the label) */}
      <rect x="25.5" y="56" width="2.6" height="134" rx="1.3" fill="#fff" opacity=".55" />
      <rect x="29.5" y="58" width=".9" height="130" fill="#fff" opacity=".35" />
      <rect x="91" y="60" width="1.6" height="126" rx=".8" fill="#fff" opacity=".35" />
      {/* Lot printed on the glass */}
      <text x="60" y="171" style={MONO} fontSize="4.2" fill="#4A4438" opacity=".55" letterSpacing=".8" textAnchor="middle">LOT ——————</text>

      {/* Paper label */}
      <rect x="20" y="66" width="80" height="94" fill="#FBFAF7" />
      <line x1="20" y1="66.4" x2="100" y2="66.4" stroke={rule} strokeWidth={ruleWidth} />
      <line x1="20" y1="159.6" x2="100" y2="159.6" stroke={rule} strokeWidth={ruleWidth} />
      <g transform="translate(23,66) scale(.175)" fill="none" stroke="#1C1A15" strokeLinecap="round" strokeWidth="8">
        <g transform="translate(6,4) skewX(-7)">
          <path d="M30,128 L63,23" />
          <path d="M77,23 L124,128" />
          <path stroke="#A32B1F" strokeWidth="5.5" d={PULSE} />
        </g>
      </g>
      <text x="43" y="89.5" style={SERIF} fontSize="22" fontWeight="500" fill="#A32B1F" letterSpacing="-.3">ura</text>
      <text x="58" y="98" style={SERIF} fontSize="6.6" fontWeight="500" fill="#4A4438" letterSpacing=".3" textAnchor="middle">Protocols</text>
      <line x1="26" y1="103" x2="94" y2="103" stroke="#C9C2AE" strokeWidth=".8" />
      <text x="26" y="117" style={SERIF} fontSize={nameSize} fontWeight="600" fill="#1C1A15">{label}</text>
      <text x="26" y="127" style={{ fontFamily: "var(--font-sans), Inter, sans-serif" }} fontSize="8.5" fill="#A32B1F">{strength}</text>
      <line x1="26" y1="133" x2="94" y2="133" stroke="#C9C2AE" strokeWidth=".8" />
      {/* Every line must end before x=94 (the paper label's right margin). */}
      <text x="26" y="141.5" style={MONO} fontSize="5.4" fill="#4A4438" letterSpacing=".4">LYOPHILIZED</text>
      <text x="26" y="148.5" style={MONO} fontSize="5.4" fill="#4A4438" letterSpacing=".4">RESEARCH USE ONLY</text>
      <text x="26" y="155.5" style={MONO} fontSize="5.4" fill="#4A4438" letterSpacing=".2">NOT FOR HUMAN USE</text>
      <rect x="20" y="66" width="80" height="94" fill={`url(#${wrap})`} />
      {/* Glass edges catching light over the label */}
      <rect x="21.6" y="66" width="1.4" height="94" fill="#fff" opacity=".5" />
      <rect x="95.5" y="66" width="1.2" height="94" fill="#fff" opacity=".3" />

      {/* Neck, aluminum crimp seal, flip-off cap */}
      <rect x="38" y="38" width="44" height="8" fill={`url(#${glass})`} stroke="#9aa6ad" strokeOpacity=".5" strokeWidth=".6" />
      <rect x="30" y="18" width="60" height="23" rx="2" fill={`url(#${alu})`} />
      <rect x="30" y="37" width="60" height="4" fill="#8b9196" opacity=".45" />
      <line x1="30" y1="22" x2="90" y2="22" stroke="#fff" strokeWidth=".5" opacity=".6" />
      <rect x="28" y="8" width="64" height="12" rx="3" fill={`url(#${cap})`} />
      <rect x="28" y="17.5" width="64" height="2.5" fill="#000" opacity=".08" />
    </svg>
  );
}
