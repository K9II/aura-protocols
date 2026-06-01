// Full Aura Protocols lockup: the symbol doubles as the initials. The kinetic
// "A" with "ura" stacked beneath it; the pulse draws the "p", with "rotocols"
// running off it. One scalable SVG — animation via globals.css, reduced-motion safe.

const PULSE =
  "M34,110 L46,86 L58,86 L64,68 L70,108 L76,86 L92,86 L106,86 L118,87 L124,90 A19,19 0 1 0 124,52 L124,116";

type AuraLockupProps = {
  mode?: "loop" | "once" | "static";
  className?: string;
};

export default function AuraLockup({ mode = "loop", className = "" }: AuraLockupProps) {
  const modeClass = mode === "loop" ? "aura-loop" : mode === "once" ? "aura-once" : "";
  const animated = mode !== "static";

  return (
    <svg
      className={`aura-svg ${modeClass} ${className}`.trim()}
      viewBox="0 0 330 252"
      fill="none"
      role="img"
      aria-label="Aura Protocols"
      shapeRendering="geometricPrecision"
    >
      <defs>
        <linearGradient id="auraGradLockup" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#00d4ff" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>

      {/* mark */}
      <g
        transform="translate(20,8) skewX(-7)"
        stroke="url(#auraGradLockup)"
        strokeLinecap="round"
        strokeLinejoin="miter"
        strokeMiterlimit={9}
      >
        <g strokeWidth={14}>
          <path d="M30,128 L70,20" />
          <path d="M70,20 L110,128" />
        </g>
        <path d="M124,46 A26,26 0 1 1 124,98" strokeWidth={3.5} opacity={0.26} />
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

      {/* wordmark — symbol-as-letter: "ura" under the A, "rotocols" after the p */}
      <g className="aura-wordmark" fontWeight={600} fontSize={34} style={{ letterSpacing: "-1px" }}>
        <text x={74} y={168} textAnchor="middle" fill="#fff">u</text>
        <text x={74} y={202} textAnchor="middle" fill="#fff">r</text>
        <text x={74} y={236} textAnchor="middle" fill="#fff">a</text>
        <text x={166} y={104} fill="url(#auraGradLockup)">rotocols</text>
      </g>
    </svg>
  );
}
