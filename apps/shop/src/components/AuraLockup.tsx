// Full brand lockup: the Aura "A" + "ura" (specimen) + "Protocols" subline,
// centered under "ura" (Kearney, 2026-09-28). Same A geometry/pulse as
// AuraMark — do not freestyle. Positioned with plain CSS (a child of the
// "ura" word, centered on it) so it is correct on first paint, without
// JavaScript and regardless of when the web font loads.

const PULSE = "M44,110 L56,86 L68,86 L74,68 L80,108 L86,86 L100,86";

// ratios locked from the approved concept, tuned at svg height 118px
const WORD_SIZE_RATIO = 112 / 118;
const WORD_PULL_IN_RATIO = -40 / 118;
// Kearney 2026-09-28: "Protocols" a bit larger (was 20/118).
const SUB_SIZE_RATIO = 25 / 118;
// The A's ink starts ~17/160 into the viewBox (skewed left leg + round cap).
// Pull the svg left by that much so the VISIBLE logo is what gets centered
// (header) or aligned with the text column (footer, gate).
const A_LEFT_BEARING = 17 / 160;
const SUB_OFFSET_RATIO = -14 / 118;

type AuraLockupProps = {
  /** Rendered width of the A in px; "ura" + "Protocols" scale with it. */
  size?: number;
  mode?: "loop" | "once" | "static";
  className?: string;
};

export default function AuraLockup({
  size = 126,
  mode = "once",
  className = "",
}: AuraLockupProps) {
  const modeClass = mode === "loop" ? "aura-loop" : mode === "once" ? "aura-once" : "";
  const animated = mode !== "static";

  const svgHeight = (size * 150) / 160;
  const wordSize = svgHeight * WORD_SIZE_RATIO;
  const wordPullIn = svgHeight * WORD_PULL_IN_RATIO;
  const subSize = svgHeight * SUB_SIZE_RATIO;
  const subOffset = svgHeight * SUB_OFFSET_RATIO;
  // "Protocols" hangs below "ura"; reserve that space so whatever sits under
  // the lockup (nav links, footer copy) is laid out clear of it.
  const subReserve = Math.max(0, subOffset + subSize * 1.25);

  return (
    <span className={`relative inline-flex items-end ${className}`.trim()} style={{ paddingBottom: subReserve }}>
      <svg
        className={`aura-svg ${modeClass}`}
        width={size}
        height={svgHeight}
        viewBox="0 0 160 150"
        fill="none"
        stroke="#1C1A15"
        strokeLinecap="round"
        strokeLinejoin="miter"
        strokeMiterlimit={9}
        shapeRendering="geometricPrecision"
        style={{ overflow: "visible", flexShrink: 0, marginLeft: -size * A_LEFT_BEARING }}
        role="img"
        aria-label="Aura Protocols"
      >
        <g transform="translate(6,4) skewX(-7)">
          <g strokeWidth={6}>
            <path d="M30,128 L63,23" />
            <path d="M77,23 L124,128" />
          </g>
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
      <span
        style={{
          position: "relative",
          fontFamily: "var(--font-newsreader), Georgia, serif",
          fontWeight: 500,
          fontSize: wordSize,
          lineHeight: 1,
          color: "#A32B1F",
          letterSpacing: "-0.01em",
          marginLeft: wordPullIn,
        }}
      >
        ura
        <span
          data-lockup-sub=""
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            top: `calc(100% + ${subOffset}px)`,
            fontFamily: "var(--font-newsreader), Georgia, serif",
            fontWeight: 500,
            fontSize: subSize,
            letterSpacing: "0.05em",
            color: "#4A4438",
            whiteSpace: "nowrap",
          }}
        >
          Protocols
        </span>
      </span>
    </span>
  );
}
