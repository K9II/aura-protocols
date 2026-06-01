// Aura brand symbol: the kinetic "A" whose crossbar is a flow-through ECG pulse
// that draws the "p" (bowl + stem). Animation is pure CSS (see globals.css),
// gated behind prefers-reduced-motion. Geometry is ported verbatim from the
// approved design mockups — do not freestyle these paths.

const PULSE =
  "M34,110 L46,86 L58,86 L64,68 L70,108 L76,86 L92,86 L106,86 L118,87 L124,90 A19,19 0 1 0 124,52 L124,116";

type AuraMarkProps = {
  /** Rendered width in px; height scales to the 160×150 viewBox. */
  size?: number;
  /** loop = continuous (hero), once = play on mount then rest (navbar), static = no motion. */
  mode?: "loop" | "once" | "static";
  className?: string;
};

export default function AuraMark({
  size = 32,
  mode = "once",
  className = "",
}: AuraMarkProps) {
  const modeClass = mode === "loop" ? "aura-loop" : mode === "once" ? "aura-once" : "";
  const animated = mode !== "static";

  return (
    <svg
      className={`aura-svg ${modeClass} ${className}`.trim()}
      width={size}
      height={(size * 150) / 160}
      viewBox="0 0 160 150"
      fill="none"
      stroke="url(#auraGrad)"
      strokeLinecap="round"
      strokeLinejoin="miter"
      strokeMiterlimit={9}
      shapeRendering="geometricPrecision"
      role="img"
      aria-label="Aura Protocols"
    >
      <defs>
        <linearGradient id="auraGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#00d4ff" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <g transform="translate(6,4) skewX(-7)">
        {/* kinetic A */}
        <g strokeWidth={14}>
          <path d="M30,128 L70,20" />
          <path d="M70,20 L110,128" />
        </g>
        {/* faint aura echo ring */}
        <path d="M124,46 A26,26 0 1 1 124,98" strokeWidth={3.5} opacity={0.26} />
        {/* pulse that draws the p — blurred glow under, crisp stroke over */}
        <path className="aura-glow" pathLength={100} strokeWidth={9} d={PULSE} />
        <path className="aura-pulse" pathLength={100} strokeWidth={6} d={PULSE} />
        {animated && (
          <>
            <circle
              className="aura-comet"
              r={4}
              fill="#eafcff"
              stroke="none"
              style={{ offsetPath: `path('${PULSE}')` }}
            />
            <circle className="aura-spark" cx={124} cy={116} r={5} fill="#eafcff" stroke="none" />
          </>
        )}
      </g>
    </svg>
  );
}
