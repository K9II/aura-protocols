import type { ReactNode } from "react";
import { ringRepeat, type AuraRing } from "@/lib/hero-aura";

// Home hero, mock v4 "1 · Dictionary" (2026-10-17, https://claude.ai/artifact/Mha5JnMX9YXXAcsXEqgAwN).

// "au·ra /ˈôr-ə/ noun — 1. the distinct quality that surrounds something."
export function DictionaryEntry({ className = "" }: { className?: string }) {
  return (
    <p className={`s-dict ${className}`}>
      <span className="s-dict-hw">au<i>·</i>ra</span>
      <span className="s-dict-pr">/ˈôr-ə/</span>
      <span className="s-dict-pos">noun</span>
      <span className="s-dict-def"><span className="s-dict-n">1.</span>the distinct quality that <em>surrounds</em> something.</span>
    </p>
  );
}

// The sphere inside rings of certificate text. The sphere's canvas is 504 wide in
// the 640 box (78.75%), centred; its own caption line drops below the picture.
export function HeroAura({ rings, children }: { rings: AuraRing[]; children: ReactNode }) {
  const C = 320;
  return (
    <figure className="s-aura">
      <div className="s-aura-pic">
        {/* One layer per ring, turned by the compositor: rotating SVG text inside one
            drawing made phones repaint it every frame under the sphere (glitchy). */}
        <div className="s-aura-rings" role="img" aria-label="The compound sphere, ringed by lines of text from each lot’s certificate of analysis">
          {rings.map((R, i) => {
            const id = `s-aura-r${i}`;
            const circ = 2 * Math.PI * R.r;
            return (
              <div key={id} className="s-aura-in" style={{ animationDelay: `${0.2 + i * 0.16}s` }}>
                <div className="s-aura-ring" style={{ animationDuration: `${R.seconds}s`, animationDirection: R.reverse ? "reverse" : "normal" }}>
                  <svg viewBox="0 0 640 640" aria-hidden fill={R.fill} opacity={R.opacity}>
                    <circle cx={C} cy={C} r={R.r + R.size * 0.78} fill="none" stroke="#C9C2AE" strokeWidth=".7" strokeDasharray="1 5" />
                    <path id={id} d={`M ${C},${C - R.r} a ${R.r},${R.r} 0 1 1 0,${2 * R.r} a ${R.r},${R.r} 0 1 1 0,${-2 * R.r}`} fill="none" />
                    <text fontSize={R.size} letterSpacing={R.track}>
                      <textPath href={`#${id}`} textLength={(circ - 1).toFixed(1)} lengthAdjust="spacing">{ringRepeat(R)}</textPath>
                    </text>
                  </svg>
                </div>
              </div>
            );
          })}
        </div>
        <div className="s-aura-core">{children}</div>
      </div>
    </figure>
  );
}
