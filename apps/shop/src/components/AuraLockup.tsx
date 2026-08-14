"use client";

// Full brand lockup: the Aura "A" + "ura" (specimen) + "Protocols" subline,
// centered beneath "ura". Same A geometry/pulse as AuraMark — do not
// freestyle. "Protocols" position is measured at runtime (not CSS-estimated)
// to exactly match the approved mockup regardless of rendered size.

import { useEffect, useLayoutEffect, useRef } from "react";

const PULSE = "M44,110 L56,86 L68,86 L74,68 L80,108 L86,86 L100,86";

// ratios locked from the approved concept, tuned at svg height 118px
const WORD_SIZE_RATIO = 112 / 118;
const WORD_PULL_IN_RATIO = -40 / 118;
const SUB_SIZE_RATIO = 20 / 118;
const SUB_OFFSET_RATIO = -14 / 118;

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

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

  const lockupRef = useRef<HTMLSpanElement>(null);
  const wordRef = useRef<HTMLSpanElement>(null);
  const subRef = useRef<HTMLSpanElement>(null);

  useIsoLayoutEffect(() => {
    const lockup = lockupRef.current;
    const word = wordRef.current;
    const sub = subRef.current;
    if (!lockup || !word || !sub) return;

    const align = () => {
      const wr = word.getBoundingClientRect();
      const pr = lockup.getBoundingClientRect();
      sub.style.left = `${wr.left + wr.width / 2 - pr.left}px`;
      sub.style.top = `${wr.bottom - pr.top + subOffset}px`;
    };
    align();
    window.addEventListener("resize", align);
    return () => window.removeEventListener("resize", align);
  }, [subOffset]);

  return (
    <span
      ref={lockupRef}
      className={`relative inline-flex items-end ${className}`.trim()}
    >
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
        style={{ overflow: "visible", flexShrink: 0 }}
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
        ref={wordRef}
        style={{
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
      </span>
      <span
        ref={subRef}
        style={{
          position: "absolute",
          fontFamily: "var(--font-newsreader), Georgia, serif",
          fontWeight: 500,
          fontSize: subSize,
          letterSpacing: "0.05em",
          color: "#4A4438",
          whiteSpace: "nowrap",
          transform: "translateX(-50%)",
        }}
      >
        Protocols
      </span>
    </span>
  );
}
