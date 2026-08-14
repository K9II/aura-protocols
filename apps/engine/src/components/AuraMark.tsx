// Aura brand symbol: the kinetic "A", disconnected at the apex, with a live
// EKG pulse threading through it — the pulse is pure animation, not a
// letterform. Solid ink, no gradient, no ring. Geometry is finalized —
// do not freestyle these paths. Mirrors apps/shop/src/components/AuraMark.tsx.

const PULSE = "M44,110 L56,86 L68,86 L74,68 L80,108 L86,86 L100,86";

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
      stroke="#1C1A15"
      strokeLinecap="round"
      strokeLinejoin="miter"
      strokeMiterlimit={9}
      shapeRendering="geometricPrecision"
      role="img"
      aria-label="Aura Protocols"
    >
      <g transform="translate(6,4) skewX(-7)">
        {/* kinetic A — disconnected at the apex */}
        <g strokeWidth={6}>
          <path d="M30,128 L63,23" />
          <path d="M77,23 L124,128" />
        </g>
        {/* live EKG pulse — animation only, never a letterform */}
        <path className="aura-glow" pathLength={100} stroke="#A32B1F" strokeWidth={4} d={PULSE} />
        <path className="aura-pulse" pathLength={100} stroke="#A32B1F" strokeWidth={2.5} d={PULSE} />
        {animated && (
          <>
            <circle
              className="aura-comet"
              r={2.5}
              fill="#EDE9E0"
              stroke="none"
              style={{ offsetPath: `path('${PULSE}')` }}
            />
            <circle className="aura-spark" cx={100} cy={86} r={3} fill="#EDE9E0" stroke="none" />
          </>
        )}
      </g>
    </svg>
  );
}
