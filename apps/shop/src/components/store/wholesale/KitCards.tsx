"use client";

import Link from "next/link";
import { useState } from "react";
import type { CSSProperties } from "react";
import KitBox from "@/components/store/wholesale/KitBox";
import { featuredKits, kitTitle, type KitSheetRow, type Tier } from "@/lib/wholesale/rules";
import { CLASS_COLOR } from "@/lib/class-colors";
import type { ChemicalClass } from "@/data/catalog";

// Option C "Kit placards" (approved 2026-10-10, options page RPuHJX4ETSpeyaVFA7kVzz):
// every strength offered as a kit, shown like the product cards — kit art on a raised
// tile with a hanging tag (class colour, name, kit, volume price) — filtered by class
// pills. Volume pricing only; per-kit prices stay on the order sheet.
// With seeAllHref (the landing page): only the featured kits (FEATURED_KITS) and a
// "See all" link to the order sheet, where every kit is listed (Alvester 2026-10-10:
// the landing page showed too many at once). Without it: every kit with class pills.
export default function KitCards({ rows, tiers, seeAllHref }: { rows: KitSheetRow[]; tiers: Tier[]; seeAllHref?: string }) {
  const classes = [...new Set(rows.map((r) => r.chemicalClass))];
  const [cls, setCls] = useState<string | null>(null);
  const featured = featuredKits(rows);
  const short = !!seeAllHref && rows.length > featured.length;
  const shown = short ? featured : cls ? rows.filter((r) => r.chemicalClass === cls) : rows;
  const pcts = tiers.map((t) => t.pct);
  const range = pcts.length ? `${Math.min(...pcts)}–${Math.max(...pcts)}% off` : "";
  const color = (c: string) => CLASS_COLOR[c as ChemicalClass] ?? "var(--ink)";

  return (
    <>
      <p className="s-micro" style={{ margin: "8px 0 4px" }}>
        {short ? `Featured kits · ${featured.length} of ${rows.length} strengths` : `Offered as kits · ${rows.length} strengths`}
      </p>
      {!short && (
        <div className="s-kc-pills" role="group" aria-label="Show kits by class">
          <button type="button" aria-pressed={cls === null} onClick={() => setCls(null)}>All {rows.length}</button>
          {classes.map((c) => (
            <button key={c} type="button" aria-pressed={cls === c} onClick={() => setCls(c)} style={{ "--cls": color(c) } as CSSProperties}>
              <i />{c}
            </button>
          ))}
        </div>
      )}
      <ul className={short ? "s-kc-grid s-kc-feat" : "s-kc-grid"}>
        {shown.map((r) => {
          const t = kitTitle(r);
          const body = (
            <>
              <div className="s-kc-tile"><KitBox title={t.title} strength={r.strength} art={r.art} width={220} /></div>
              <div className="s-kc-tag">
                <span className="s-kc-c">{r.chemicalClass}</span>
                <span className="s-kc-nm">{t.title}{t.scientific ? ` (${t.scientific})` : ""}</span>
                <span className="s-kc-row">
                  <span><small>Kit</small>{r.strength} × 10<span className="s-kc-v"> vials</span></span>
                  <span><small>Volume price</small>{range}</span>
                </span>
              </div>
            </>
          );
          // With a destination the card is a link and moves on hover like the shop cards.
          return (
            <li key={`${r.slug}/${r.variantId}`} className="s-kc-card" style={{ "--cls": color(r.chemicalClass) } as CSSProperties}>
              {seeAllHref ? <Link href={seeAllHref} className="s-kc-link">{body}</Link> : body}
            </li>
          );
        })}
      </ul>
      {short && seeAllHref && (
        <p className="s-kc-more"><Link href={seeAllHref}>See all {rows.length} kits →</Link></p>
      )}
    </>
  );
}
