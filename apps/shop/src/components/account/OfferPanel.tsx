import type { CSSProperties } from "react";
import { NEW_ACCOUNT_PCT, OFFER_DAYS_TEXT } from "@/lib/account/offer";
import { PURITY_FLOOR_PCT } from "@/lib/constants";
import { FREE_SHIPPING_THRESHOLD_USD } from "@/lib/cart";
import { currentMs } from "@/lib/clock";
import { isHolidaySeason } from "@/lib/holiday/season";
import { garlandDefsSvg, garlandStripSvg, hollySvg, GARLAND_THICKNESS, HOLLY_BOX, HOLLY_REACH } from "@/lib/holiday/garland";
import TrustRow from "@/components/store/TrustRow";

// The welcome-offer placard (mock "A · Placard and hanging tag", 2026-10-14,
// https://claude.ai/artifact/Vfv9Ljw59JtpqeA1mP8xep): the partner page's raised
// tile + placard + hanging tag, with the trust row underneath. Server component,
// no client JS: the season check runs on the server and every SVG is generated
// deterministically. In the holiday window (lib/holiday/season.ts) a pine
// garland with holly corners frames the tile; it reaches outside the tile, so
// nothing on .s-offer or the tile may clip (overflow hidden/clip).

let art: { defs: string; h: string; v: string; holly: string[] } | null = null;
const holidayArt = () => (art ??= {
  defs: garlandDefsSvg(), h: garlandStripSvg("h"), v: garlandStripSvg("v"),
  holly: ([0, 1, 2, 3] as const).map((c) => hollySvg(c)),
});

const HOLLY_CORNERS = ["tl", "tr", "br", "bl"] as const;

export default function OfferPanel() {
  const holiday = isHolidaySeason(currentMs());
  const a = holiday ? holidayArt() : null;
  return (
    <aside className={`s-offer${holiday ? " s-offer--holiday" : ""}`} aria-label="Welcome offer">
      <div className="s-pp-tile s-offer-tile">
        <div className="s-pp-placard s-offer-placard">
          <p className="s-pp-k s-offer-eyebrow">Welcome offer · new accounts</p>
          <p className="s-offer-big"><span className="s-offer-num">{NEW_ACCOUNT_PCT}</span><span className="s-offer-pct">%</span></p>
          <p className="s-offer-lead">off your first order, placed within <em>{OFFER_DAYS_TEXT}.</em></p>
          <dl className="s-offer-proof">
            <dt>Purity</dt><dd>≥{PURITY_FLOOR_PCT}% HPLC floor</dd>
            <dt>Record</dt><dd>1 : 1 vial to certificate</dd>
            <dt>Shipping</dt><dd>free over ${FREE_SHIPPING_THRESHOLD_USD}</dd>
          </dl>
          <span className="s-placard-r">Research use only · Not for human use</span>
        </div>
        <div className="s-pp-code s-pp-tag s-offer-tag" aria-hidden="true"><span>New account</span><b>First order</b><i>{NEW_ACCOUNT_PCT}% off</i></div>
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
      </div>
      <TrustRow className="s-trust--offer" />
    </aside>
  );
}
