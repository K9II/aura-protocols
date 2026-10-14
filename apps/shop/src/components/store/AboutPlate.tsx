// The engraved plate at the top of /about (mock "Aura About Page" v2, approved
// 2026-10-14): the 1906 label, the 1966 instrument, today's lot record, on the
// home page's ground line with the brand pulse.

const SEPIA = "#5A4A2E";
const RED = "#A32B1F";
const GREEN = "#2F6B3A";

function Year({ x, y, children, red }: { x: number; y: number; children: string; red?: boolean }) {
  return (
    <text x={x} y={y} fontFamily="var(--font-newsreader), Georgia, serif" fontStyle="italic" fontSize="15" fill={red ? RED : SEPIA} stroke="none" textAnchor="middle">
      {children}
    </text>
  );
}

export default function AboutPlate() {
  return (
    <figure className="s-about-plate">
      <div className="s-about-sheet">
        <span className="s-plate-taf" aria-hidden>Taf. I.</span>
        <svg viewBox="0 0 520 170" fill="none" stroke={SEPIA} strokeWidth="1.1" aria-hidden>
          {/* 1906: a labelled bottle */}
          <rect x="62" y="20" width="22" height="11" rx="2" />
          <path d="M64 31 V40 Q46 46 46 62 V146 Q46 152 52 152 H94 Q100 152 100 146 V62 Q100 46 82 40 V31" />
          <rect x="52" y="78" width="42" height="34" stroke={RED} />
          <path d="M57 87 H89 M59 94 H87 M57 101 H89" strokeWidth=".6" />
          <path d="M50 66 V144" strokeWidth=".35" />
          {/* ground line with the brand pulse */}
          <path d="M10 156 H236 L244 156 L250 146 L258 166 L264 156 H510" strokeWidth="1" />
          <path d="M244 156 L250 146 L258 166 L264 156" stroke={RED} strokeWidth="1.4" />
          {/* 1966: a chromatogram */}
          <path d="M150 140 H240 M150 140 V64" strokeWidth=".9" />
          <path d="M152 138 Q166 138 170 132 Q173 124 176 132 Q180 138 188 137 Q192 136 194 122 Q197 62 200 122 Q202 137 208 137 Q218 138 222 132 Q224 127 226 132 Q230 138 238 138" stroke={GREEN} />
          {/* today: a vial and its certificate */}
          <path d="M360 40 H418 L430 52 V150 H360 Z M418 40 V52 H430" strokeWidth=".9" />
          <path d="M368 62 H418 M368 70 H412 M368 78 H420" strokeWidth=".5" />
          <path d="M368 92 L376 92 L379 86 L383 100 L386 92 H420" stroke={GREEN} strokeWidth=".9" />
          <circle cx="408" cy="128" r="11" stroke={RED} />
          <path d="M403 128 L407 132 L413 123" stroke={RED} />
          <rect x="296" y="52" width="28" height="9" rx="2" stroke={RED} />
          <path d="M298 61 V68 Q284 70 284 84 V146 Q284 152 290 152 H330 Q336 152 336 146 V84 Q336 70 322 68 V61" />
          <rect x="284" y="94" width="52" height="34" fill="#EFE6C9" strokeWidth=".9" />
          <path d="M290 104 H320 M290 111 H314 M290 119 H328" strokeWidth=".6" />
          <Year x={73} y={14}>1906</Year>
          <Year x={195} y={56}>1966</Year>
          <Year x={357} y={30} red>Today</Year>
        </svg>
        <figcaption>The label, the instrument, the lot record.</figcaption>
      </div>
    </figure>
  );
}
