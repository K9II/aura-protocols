import Link from "next/link";

// "How an order runs" (home, after The lineup; mock "Option B · Engraved
// plate steps + journal masthead", approved 2026-10-14). Drawn as an
// engraved plate beside a side column — the same build as From the record.

const SEPIA = "#5A4A2E";
const RED = "#A32B1F";

const STEPS = [
  { title: "Pick a compound", body: "By class, or search by name, nickname or lot." },
  { title: "Read the lot's certificate", body: "Independent lab COA for the lot shipping now." },
  { title: "Check out securely", body: "Your vials are held from that same lot." },
  { title: "Tracked from the US", body: "The lot on your vial opens the same certificate." },
];

function Rack() {
  return (
    <svg viewBox="0 0 120 150" fill="none" stroke={SEPIA} strokeWidth="1.1" aria-hidden>
      <path d="M14 96 H106 M14 104 H106 M18 104 V138 M102 104 V138 M10 138 H110" />
      <path d="M28 40 V118 Q28 124 33 124 Q38 124 38 118 V40 M26 40 H40" />
      <path d="M50 30 V118 Q50 124 55 124 Q60 124 60 118 V30 M48 30 H62" />
      <path d="M72 46 V118 Q72 124 77 124 Q82 124 82 118 V46 M70 46 H84" />
      <path d="M94 36 V118 Q94 124 99 124 Q104 124 104 118 V36 M92 36 H106" stroke={RED} />
      <path d="M30 100 H36 M30 106 H36 M30 112 H36 M52 92 H58 M52 98 H58 M52 104 H58 M52 110 H58 M74 104 H80 M74 110 H80" strokeWidth=".6" />
      <path d="M96 96 H102 M96 102 H102 M96 108 H102 M96 114 H102" stroke={RED} strokeWidth=".6" />
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

function SealedVial() {
  return (
    <svg viewBox="0 0 120 150" fill="none" stroke={SEPIA} strokeWidth="1.1" aria-hidden>
      <rect x="40" y="14" width="40" height="10" rx="2" stroke={RED} />
      <rect x="42" y="24" width="36" height="16" />
      <path d="M46 28 V38 M52 28 V38 M58 28 V38 M64 28 V38 M70 28 V38" strokeWidth=".5" />
      <path d="M48 40 V46 Q30 48 30 62 V128 Q30 136 38 136 H82 Q90 136 90 128 V62 Q90 48 72 46 V40" />
      <rect x="30" y="70" width="60" height="44" strokeWidth=".9" />
      <path d="M36 82 H70 M36 90 H62 M36 100 H76" strokeWidth=".6" />
      <path d="M32 122 Q46 118 60 121 Q74 118 88 122" strokeWidth=".7" />
      <path d="M34 66 V130" strokeWidth=".4" />
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
  { Fig: Rack, word: "Pick" },
  { Fig: QrScan, word: "Verify" },
  { Fig: SealedVial, word: "Secure" },
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
        <Link href="/products" className="s-micro s-record-link">Shop the lineup →</Link>
        <p className="s-plate-cap">Plate I. An order, from the catalog to the bench.</p>
      </div>
      <div className="s-plate-art">
        <div className="s-plate-sheet">
          <span className="s-plate-taf" aria-hidden>Taf. I.</span>
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
