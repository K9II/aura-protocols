"use client";

import { useEffect, useState } from "react";

const SLIDES = [
  { eb: "Tested in an ISO/IEC 17025-accredited US lab", h: <>Proof before <em>product.</em></>, sub: "Research compounds released only after independent lot testing." },
  { eb: "Lot release", h: <>Tested before it’s listed.</>, sub: "Every lot’s certificate is published under its lot number." },
  { eb: "The catalog", h: <>Every compound by its <em>scientific name.</em></>, sub: "Grouped by chemical class. No nicknames." },
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
