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

function Certificate() {
  return (
    <svg viewBox="0 0 120 150" fill="none" stroke={SEPIA} strokeWidth="1.1" aria-hidden>
      <path d="M26 20 H84 L96 32 V132 H26 Z M84 20 V32 H96" />
      <path d="M36 44 H86 M36 54 H80 M36 64 H86 M36 74 H70" />
      <path d="M36 86 L44 86 L48 78 L52 96 L56 86 H86" stroke="#2F6B3A" />
      <circle cx="76" cy="112" r="12" /><circle cx="76" cy="112" r="8" strokeWidth=".6" />
      <path d="M70 122 L66 136 L72 132 L76 138 L78 124 M82 122 L86 136 L80 132" strokeWidth=".9" />
      <path d="M28 24 L92 128 M40 24 L94 112" strokeWidth=".3" opacity=".5" />
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

const FIGURES = [Rack, Certificate, SealedVial, Parcel];

export default function OrderPlate() {
  return (
    <section className="s-plate p-reveal" aria-labelledby="order-plate">
      <div className="s-plate-art">
        <div className="s-plate-sheet">
          <span className="s-plate-taf" aria-hidden>Taf. I.</span>
          <div className="s-plate-figs">
            <svg className="s-plate-ground" viewBox="0 0 1000 20" preserveAspectRatio="none" aria-hidden>
              <path d="M0 10 H440 L452 10 L458 2 L466 18 L472 10 H1000" fill="none" stroke={SEPIA} strokeWidth="1" vectorEffect="non-scaling-stroke" />
              <path d="M452 10 L458 2 L466 18 L472 10" fill="none" stroke={RED} strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
            </svg>
            {FIGURES.map((Fig, i) => (
              <figure key={i}>
                <Fig />
                <figcaption>Fig. {i + 1}.</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </div>
      <div className="s-plate-side">
        <p className="s-micro s-record-eyebrow">How an order runs</p>
        <h2 id="order-plate" className="s-h2">One lot number, <em>start to finish.</em></h2>
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
    </section>
  );
}
