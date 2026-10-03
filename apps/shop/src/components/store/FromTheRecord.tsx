import Image from "next/image";
import Link from "next/link";

// Homepage band: Tsvet's 1906 chromatography plate beside a drawn HPLC trace.
// The trace shows what the method looks like — it carries no lot number or
// purity figure, and links to the real certificates instead.
// Plate: M. Tswett, Ber. Dtsch. Bot. Ges. 24 (1906), Taf. XVIII — public
// domain; scan from the Biodiversity Heritage Library (item 131391).

const PEAKS = [
  { t: 3.1, h: 0.05, w: 0.18 },
  { t: 9.6, h: 0.035, w: 0.2 },
  { t: 12.9, h: 0.06, w: 0.16 },
  { t: 14.2, h: 1, w: 0.22 },
  { t: 16.0, h: 0.045, w: 0.18 },
  { t: 21.4, h: 0.03, w: 0.25 },
];
const T_MAX = 30;
const MONO = "var(--font-jetbrains), monospace";

function tracePath(w: number, h: number) {
  const pts: string[] = [];
  for (let i = 0; i <= 400; i++) {
    const t = (i / 400) * T_MAX;
    let y = 0.008 * Math.sin(t * 7.3) * Math.sin(t * 1.9);
    for (const p of PEAKS) y += p.h * Math.exp(-((t - p.t) ** 2) / (2 * p.w * p.w));
    pts.push(`${((t / T_MAX) * w).toFixed(1)},${(h - y * (h - 14)).toFixed(1)}`);
  }
  return `M${pts.join(" L")}`;
}

function HplcTrace() {
  const W = 300, H = 230, padL = 46, padB = 30, plotW = W - padL - 10, plotH = H - padB - 10;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="s-trace" role="img" aria-label="HPLC chromatogram: one main peak with small impurity peaks">
      <g transform={`translate(${padL},10)`}>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1="0" x2={plotW} y1={plotH * f} y2={plotH * f} stroke="var(--line)" strokeWidth=".6" strokeDasharray={f === 1 ? undefined : "2 4"} />
        ))}
        <line x1="0" x2="0" y1="0" y2={plotH} stroke="var(--ink-soft)" strokeWidth=".8" />
        {[0, 10, 20, 30].map((m) => (
          <g key={m} transform={`translate(${(m / T_MAX) * plotW},${plotH})`}>
            <line y2="5" stroke="var(--ink-soft)" strokeWidth=".8" />
            <text y="18" textAnchor="middle" fontFamily={MONO} fontSize="10" fill="var(--ink-soft)">{m}</text>
          </g>
        ))}
        <path d={tracePath(plotW, plotH)} fill="none" stroke="var(--ink)" strokeWidth="1.3" strokeLinejoin="round" />
        <g transform={`translate(${(14.2 / T_MAX) * plotW},6)`}>
          <line x1="10" x2="34" y1="10" y2="10" stroke="var(--specimen)" strokeWidth=".8" />
          <text x="40" y="14" fontFamily={MONO} fontSize="10" letterSpacing="1" fill="var(--specimen)">MAIN PEAK</text>
        </g>
        <text x={plotW} y={plotH + 28} textAnchor="end" fontFamily={MONO} fontSize="9.5" letterSpacing="1" fill="var(--ink-soft)">TIME (MIN)</text>
        <text transform={`translate(-34,${plotH / 2}) rotate(-90)`} textAnchor="middle" fontFamily={MONO} fontSize="9.5" letterSpacing="1" fill="var(--ink-soft)">mAU · 214 nm</text>
      </g>
    </svg>
  );
}

export default function FromTheRecord() {
  return (
    <section className="s-record p-reveal" aria-labelledby="record-h">
      <figure className="s-record-plate">
        <span className="s-record-tag"><b>1906</b><span className="s-micro">Taf. XVIII</span></span>
        <Image
          src="/images/tsvet-1906-plate-xviii.jpg"
          width={2000}
          height={1272}
          sizes="(max-width: 860px) 100vw, 840px"
          alt="Plate XVIII from Tsvet's 1906 paper: a column chromatography apparatus, and a chalk column with pigments separated into bands"
        />
      </figure>
      <div className="s-record-side">
        <span className="s-micro s-record-eyebrow">From the record · 1906 → today</span>
        <h2 id="record-h" className="s-h2">Purity has a <em>method.</em></h2>
        <p>Tsvet named chromatography with this plate. Every lot we sell is checked by its modern form, HPLC.</p>
        <div className="s-record-trace">
          <span className="s-record-tag s-record-tag--today"><b>Today</b><span className="s-micro">HPLC</span></span>
          <HplcTrace />
          <Link href="/coa" className="s-micro s-record-link">See each lot&apos;s certificate →</Link>
        </div>
        <p className="s-record-cite">M. Tswett, &ldquo;Adsorptionsanalyse und chromatographische Methode&rdquo;, Berichte der Deutschen Botanischen Gesellschaft 24 (1906), Taf. XVIII. Biodiversity Heritage Library, public domain.</p>
      </div>
    </section>
  );
}
