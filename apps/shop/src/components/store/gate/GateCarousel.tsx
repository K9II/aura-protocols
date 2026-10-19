"use client";

import { useEffect, useState } from "react";
import { PURITY_FLOOR_PCT } from "@/lib/constants";

// Captions in the plates' lab-notebook voice (Alvester chose set B, 2026-10-10).
const SLIDES = [
  { eb: "Plate I · Specimens", h: <>Purity verified, <em>then</em> released.</>, sub: `Every lot is tested against a ${PURITY_FLOOR_PCT}% purity floor before it’s listed. Testing includes ISO/IEC 17025-accredited US lab.` },
  { eb: "Plate II · The record", h: <>Verify the certificate <em>before</em> you order.</>, sub: "Look up any lot’s COA by the number on its vial." },
  { eb: "Plate III · The catalog", h: <>Every compound <em>on the record.</em></>, sub: "Arranged by chemical class, each with its own lot history." },
];
const ADVANCE_MS = 5500;

// Desktop left column: cross-fades every 5.5 s, pauses while hovered, dots
// pick a slide. Starts when the gate enters and keeps running on every step.
export default function GateCarousel({ scenes, running }: { scenes: readonly string[] | null; running: boolean }) {
  const [cur, setCur] = useState(-1);
  const [hover, setHover] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- first slide appears when the gate enters
    if (running && cur < 0) setCur(0);
  }, [running, cur]);

  useEffect(() => {
    if (!running || hover || cur < 0) return;
    const t = setTimeout(() => setCur((c) => (c + 1) % SLIDES.length), ADVANCE_MS);
    return () => clearTimeout(t);
  }, [running, hover, cur]);

  return (
    <aside className="a-media" aria-roledescription="carousel" aria-label="About Aura Protocols"
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      {SLIDES.map((s, k) => (
        <div key={k} className={`slide${k === cur ? " on" : ""}`} aria-roledescription="slide" aria-label={`${k + 1} of ${SLIDES.length}`} aria-hidden={k !== cur}>
          {scenes && <div aria-hidden="true" dangerouslySetInnerHTML={{ __html: scenes[k] }} />}
          <div className="a-cap"><p className="micro r-eb">{s.eb}</p><h3 className="r-h">{s.h}</h3><p className="s r-sub">{s.sub}</p></div>
        </div>
      ))}
      <div className="dots" role="group" aria-label="Choose slide">
        {SLIDES.map((_, k) => (
          <button key={k} type="button" aria-label={`Slide ${k + 1}`} aria-current={k === cur ? "true" : "false"} onClick={() => setCur(k)}><i /></button>
        ))}
      </div>
    </aside>
  );
}
