import type { CSSProperties } from "react";
import { NEW_ACCOUNT_PCT, OFFER_DAYS_TEXT } from "@/lib/account/offer";
import { PURITY_FLOOR_PCT } from "@/lib/constants";
import { FREE_SHIPPING_THRESHOLD_USD } from "@/lib/cart";
import { currentMs } from "@/lib/clock";
import { isHolidaySeason } from "@/lib/holiday/season";
import { treeSvg } from "@/lib/holiday/tree";
import { garlandDefsSvg, garlandStripSvg, hollySvg, GARLAND_THICKNESS, HOLLY_BOX, HOLLY_REACH } from "@/lib/holiday/garland";

// The Ink welcome-offer panel (mock: private repo 2026-10-05-google-signin-mocks,
// "Ink with garland"). Server component, no client JS: the season check runs
// on the server and every SVG is generated deterministically, so the HTML is
// the same on every render. In the holiday window (lib/holiday/season.ts) it
// adds a tree, snowfall and a pine garland; the rest of the year it is the
// same panel without them. Animation is CSS only and stops for reduced motion.

let art: { tree: string; defs: string; h: string; v: string; holly: string[] } | null = null;
const holidayArt = () => (art ??= {
  tree: treeSvg(), defs: garlandDefsSvg(), h: garlandStripSvg("h"), v: garlandStripSvg("v"),
  holly: ([0, 1, 2, 3] as const).map((c) => hollySvg(c)),
});

// 46 flakes, spread and timed by formula (as in the mock) — no randomness at render.
const FLAKES = Array.from({ length: 46 }, (_, i) => ({
  left: `${(i * 37) % 100}%`, size: 2 + (i % 4), duration: 8 + ((i * 13) % 10), delay: -((i * 7) % 14),
  dx: ((i % 5) - 2) * 14, opacity: 0.35 + (i % 5) * 0.12,
}));

const HOLLY_CORNERS = ["tl", "tr", "br", "bl"] as const;

export default function OfferPanel() {
  const holiday = isHolidaySeason(currentMs());
  const a = holiday ? holidayArt() : null;
  return (
    <aside className={`s-offer${holiday ? " s-offer--holiday" : ""}`} aria-label="Welcome offer">
      {a && (
        <div className="s-offer-snow" aria-hidden="true">
          {FLAKES.map((f, i) => (
            <i key={i} style={{ left: f.left, width: f.size, height: f.size, opacity: f.opacity.toFixed(2), animationDuration: `${f.duration}s`, animationDelay: `${f.delay}s`, "--dx": `${f.dx}px` } as CSSProperties} />
          ))}
        </div>
      )}
      <div className="s-offer-body">
        <p className="s-micro s-offer-eyebrow">Welcome offer · new accounts</p>
        <p className="s-offer-big"><span className="s-offer-num">{NEW_ACCOUNT_PCT}</span><span className="s-offer-pct">%</span></p>
        <p className="s-offer-lead">off your first order,{" "}<br /><span className="s-offer-nowrap">placed within <em>{OFFER_DAYS_TEXT}.</em></span></p>
        <dl className="s-offer-proof">
          <div><dt>≥{PURITY_FLOOR_PCT}%</dt><dd>HPLC floor</dd></div>
          <div><dt>1 : 1</dt><dd>vial to certificate</dd></div>
          <div><dt>${FREE_SHIPPING_THRESHOLD_USD}</dt><dd>free shipping</dd></div>
        </dl>
      </div>
      {a && <div className="s-offer-tree" aria-hidden="true" dangerouslySetInnerHTML={{ __html: a.tree }} />}
      {a && (
        <div className="s-offer-garland" aria-hidden="true"
          style={{ "--s-offer-g": `${GARLAND_THICKNESS}px`, "--s-offer-hb": `${HOLLY_BOX}px`, "--s-offer-hr": `${HOLLY_REACH}px` } as CSSProperties}>
          <div className="s-offer-defs-box" dangerouslySetInnerHTML={{ __html: a.defs }} />
          <div className="s-offer-strip s-offer-strip--top" dangerouslySetInnerHTML={{ __html: a.h }} />
          <div className="s-offer-strip s-offer-strip--bottom" dangerouslySetInnerHTML={{ __html: a.h }} />
          <div className="s-offer-strip s-offer-strip--left" dangerouslySetInnerHTML={{ __html: a.v }} />
          <div className="s-offer-strip s-offer-strip--right" dangerouslySetInnerHTML={{ __html: a.v }} />
          {HOLLY_CORNERS.map((c, i) => <div key={c} className={`s-offer-holly s-offer-holly--${c}`} dangerouslySetInnerHTML={{ __html: a.holly[i] }} />)}
        </div>
      )}
    </aside>
  );
}
