import { FREE_SHIPPING_THRESHOLD_USD } from "@/lib/cart";

// "How an order runs" (home, after The lineup; mock "Option B · Engraved
// plate steps + journal masthead", approved 2026-10-14). Drawn as an
// engraved plate beside a side column — the same build as From the record.

const SEPIA = "#5A4A2E";
const RED = "#A32B1F";

const STEPS = [
  { title: "Pick a research compound", body: "By class, or search by name, nickname or lot." },
  // say "ISO/IEC 17025-accredited lab", never call the certificate itself accredited;
  // the hyphen after 17025 is a non-breaking one (U+2011), so phones keep the phrase together
  { title: "Read the lot's certificate", body: "Seven-point panel from an independent ISO/IEC 17025‑accredited US lab." },
  { title: "Checkout process", body: "Secure bank-to-bank transfer." },
  // never delivery days or a city (2026-10-18: the QR line moved out; this step is shipping only)
  { title: "Tracked from the US", body: `Ships from the US with tracking on every order. Free over $${FREE_SHIPPING_THRESHOLD_USD}.` },
];

// Fig. 1 (2026-10-18): a ball-and-stick molecule — a six-atom ring with a side chain, one
// atom in red. Bonds stop at each atom's edge, so nothing needs a fill to hide them.
const ATOMS: [number, number, number][] = [
  [50, 74, 6.5], [69, 85, 6.5], [69, 107, 6.5], [50, 118, 6.5], [31, 107, 6.5], [31, 85, 6.5],
  [88, 74, 6], [107, 85, 6], [88, 52, 7.5], [107, 107, 5], [50, 132, 4.5], [13, 74, 5],
];
const BONDS: [number, number, boolean?][] = [
  [0, 1, true], [1, 2], [2, 3, true], [3, 4], [4, 5, true], [5, 0],
  [1, 6], [6, 7], [6, 8, true], [7, 9], [3, 10], [5, 11],
];
function bondPath(i: number, j: number, offset: number) {
  const [x1, y1, r1] = ATOMS[i];
  const [x2, y2, r2] = ATOMS[j];
  const d = Math.hypot(x2 - x1, y2 - y1);
  const ux = (x2 - x1) / d, uy = (y2 - y1) / d;
  const ox = -uy * offset, oy = ux * offset;
  const f = (n: number) => n.toFixed(1);
  return `M${f(x1 + ux * (r1 + 1) + ox)} ${f(y1 + uy * (r1 + 1) + oy)} L${f(x2 - ux * (r2 + 1) + ox)} ${f(y2 - uy * (r2 + 1) + oy)}`;
}
function Molecule() {
  const RED_ATOM = 8;
  return (
    <svg viewBox="0 0 120 150" fill="none" stroke={SEPIA} strokeWidth="1.1" aria-hidden>
      {/* raised so it centres on the phone beside it */}
      <g transform="translate(0 -14)">
      {BONDS.map(([i, j, double]) => (
        <path key={`${i}-${j}`} d={double ? `${bondPath(i, j, -2)} ${bondPath(i, j, 2)}` : bondPath(i, j, 0)}
          strokeWidth={double ? ".8" : "1.1"} />
      ))}
      {ATOMS.map(([x, y, r], k) => (
        <g key={k} stroke={k === RED_ATOM ? RED : SEPIA}>
          <circle cx={x} cy={y} r={r} />
          {/* engraved shading: a crescent on the lower right of each atom */}
          <path d={`M${x + r * 0.2} ${y + r * 0.75} A${r * 0.8} ${r * 0.8} 0 0 0 ${x + r * 0.75} ${y + r * 0.2}`} strokeWidth=".5" />
        </g>
      ))}
      </g>
    </svg>
  );
}

// Fig. 2 (2026-10-18): a phone scanning the QR code on the vial's label — the code opens the
// lot's certificate (the green check under it).
const QR_DOTS = [
  [57, 53], [60, 56], [57, 59], [60, 62], [63, 59], [66, 66], [69, 63], [72, 66], [75, 69], [69, 69],
  [57, 69], [60, 72], [63, 75], [66, 72], [72, 75], [75, 78], [69, 78], [66, 81], [72, 81], [57, 75],
];
function QrScan() {
  return (
    <svg viewBox="0 0 120 150" fill="none" stroke={SEPIA} strokeWidth="1.1" aria-hidden>
      {/* the phone */}
      <rect x="30" y="16" width="60" height="120" rx="9" />
      <rect x="35" y="27" width="50" height="96" strokeWidth=".6" />
      <path d="M53 21.5 H67" strokeWidth="1" />
      <path d="M54 129.5 H66" strokeWidth="1.4" />
      <path d="M91 24 L93 28 V124 L91 130" strokeWidth=".4" opacity=".7" />
      {/* the camera's frame round the code */}
      <path d="M41 44 V38 H47 M73 38 H79 V44 M79 86 V92 H73 M47 92 H41 V86" />
      {/* the code: three finder squares and its modules */}
      <rect x="44" y="41" width="11" height="11" /><rect x="47" y="44" width="5" height="5" fill={SEPIA} stroke="none" />
      <rect x="65" y="41" width="11" height="11" /><rect x="68" y="44" width="5" height="5" fill={SEPIA} stroke="none" />
      <rect x="44" y="78" width="11" height="11" /><rect x="47" y="81" width="5" height="5" fill={SEPIA} stroke="none" />
      {QR_DOTS.map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width="2.6" height="2.6" fill={SEPIA} stroke="none" />)}
      {/* the scan line */}
      <path d="M38 65 H82" stroke={RED} strokeWidth="1.2" />
      <path d="M38 63 H82 M38 67 H82" stroke={RED} strokeWidth=".3" opacity=".6" />
      {/* the certificate it opens */}
      <circle cx="60" cy="106" r="7" stroke="#2F6B3A" />
      <path d="M56.5 106 L59 108.5 L63.5 103.5" stroke="#2F6B3A" strokeWidth="1.3" />
      <path d="M44 118 H76" strokeWidth=".5" />
    </svg>
  );
}

// Fig. 3 (2026-10-18): paying bank to bank — two bank facades joined by a locked link.
function Bank({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <path d="M2 86 L24 73 L46 86 Z" />
      <rect x="2" y="86" width="44" height="5" />
      <path d="M8 91 V126 M12 91 V126 M18 91 V126 M22 91 V126 M26 91 V126 M30 91 V126 M36 91 V126 M40 91 V126" strokeWidth=".8" />
      <path d="M0 126 H48 M-2 131 H50 M-4 136 H52" />
      <circle cx="24" cy="81" r="2.2" strokeWidth=".6" />
    </g>
  );
}
function BankToBank() {
  return (
    <svg viewBox="0 0 120 150" fill="none" stroke={SEPIA} strokeWidth="1.1" aria-hidden>
      <Bank x={4} />
      <Bank x={68} />
      {/* the link, locked in the middle */}
      <path d="M28 70 Q32 56 51 55 M69 55 Q88 56 92 70" stroke={RED} strokeWidth="1" />
      <path d="M88.6 66.2 L92 70 L93.4 64.8" stroke={RED} strokeWidth="1" />
      <path d="M55 49 V44 Q55 38 60 38 Q65 38 65 44 V49" />
      <rect x="51" y="49" width="18" height="14" />
      <circle cx="60" cy="54.5" r="1.6" fill={SEPIA} stroke="none" />
      <path d="M60 56 V59.5" strokeWidth="1.2" />
    </svg>
  );
}

function Parcel() {
  return (
    <svg viewBox="0 0 120 150" fill="none" stroke={SEPIA} strokeWidth="1.1" aria-hidden>
      <path d="M16 70 L60 52 L104 70 L60 88 Z" />
      <path d="M16 70 V118 L60 136 V88 M104 70 V118 L60 136" />
      <path d="M38 61 L82 79 V127 M82 61 L38 79 V127" stroke={RED} strokeWidth=".9" />
      <path d="M54 50 Q46 38 56 40 Q60 46 60 52 Q60 46 64 40 Q74 38 66 50" stroke={RED} strokeWidth=".9" />
      <path d="M22 76 V116 M28 79 V118 M34 81 V121 M40 84 V124 M46 86 V127 M52 89 V130" strokeWidth=".35" />
      <rect x="70" y="96" width="22" height="14" transform="skewY(-22) translate(0 35)" strokeWidth=".7" />
    </svg>
  );
}

// The word over each figure (2026-10-14).
const FIGURES = [
  { Fig: Molecule, word: "Pick" },
  { Fig: QrScan, word: "Verify" },
  { Fig: BankToBank, word: "Secure" },
  { Fig: Parcel, word: "Receive" },
];

export default function OrderPlate() {
  return (
    <section className="s-plate p-reveal" aria-labelledby="order-plate">
      {/* The heading and steps come first (phones show them above the figures,
          Alvester 2026-10-14); on desktop CSS keeps them in the right column. */}
      <div className="s-plate-side">
        <p className="s-micro s-record-eyebrow">How an order runs</p>
        <h2 id="order-plate" className="s-h2">Four simple steps, <em>start to finish.</em></h2>
        <ol className="s-plate-steps">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <span>Fig. {i + 1}</span>
              <b>{s.title}</b>
              <small>{s.body}</small>
            </li>
          ))}
        </ol>
      </div>
      <div className="s-plate-art">
        <div className="s-plate-sheet">
          <div className="s-plate-figs">
            <svg className="s-plate-ground" viewBox="0 0 1000 20" preserveAspectRatio="none" aria-hidden>
              <path d="M0 10 H440 L452 10 L458 2 L466 18 L472 10 H1000" fill="none" stroke={SEPIA} strokeWidth="1" vectorEffect="non-scaling-stroke" />
              <path d="M452 10 L458 2 L466 18 L472 10" fill="none" stroke={RED} strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
            </svg>
            {FIGURES.map(({ Fig, word }, i) => (
              <figure key={word}>
                <span className="s-plate-word">{word}</span>
                <Fig />
                <figcaption>Fig. {i + 1}.</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
