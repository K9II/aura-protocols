export const metadata = {
  title: "Peptide Protocol Cheat Sheet | Aura Protocols",
  description:
    "One-page research reference: doses, stacks, timing, and COA red flags for the 11 most studied peptides.",
  robots: { index: false, follow: false },
};

export default function CheatSheetPage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body, html { background: #fff; }

        .hint {
          background: #04060f;
          color: #8b9cba;
          text-align: center;
          padding: 8px;
          font-family: Inter, sans-serif;
          font-size: 12px;
        }
        .hint strong { color: #00d4ff; }

        .page {
          font-family: Inter, sans-serif;
          width: 8.5in;
          height: 11in;
          margin: 0 auto;
          padding: 0.3in 0.38in 0.25in;
          background: #fff;
          color: #111;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        /* Header */
        .hdr {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          border-bottom: 2px solid #00d4ff;
          padding-bottom: 5px;
          margin-bottom: 8px;
          flex-shrink: 0;
        }
        .hdr h1 { font-size: 16px; font-weight: 700; letter-spacing: -0.3px; color: #04060f; }
        .hdr p  { font-size: 8.5px; color: #6b7280; margin-top: 1px; }
        .hdr-right { font-size: 8.5px; color: #6b7280; text-align: right; }
        .hdr-right strong { display: block; font-size: 10px; font-weight: 700; color: #8b5cf6; }

        /* Two columns */
        .cols {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          flex: 1;
          min-height: 0;
        }

        /* Section label */
        .label {
          font-size: 7.5px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.7px;
          color: #fff;
          padding: 2px 6px;
          border-radius: 2px;
          margin-bottom: 3px;
        }
        .rec  { background: #065f46; }
        .wt   { background: #9f1239; }
        .gr   { background: #4c1d95; }
        .well { background: #0e7490; }

        /* Tables */
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 8.5px;
          margin-bottom: 7px;
        }
        thead tr { background: #f3f4f6; }
        th {
          text-align: left;
          padding: 2px 4px;
          font-size: 7.5px;
          font-weight: 600;
          color: #374151;
          border-bottom: 1px solid #e5e7eb;
          white-space: nowrap;
        }
        td {
          padding: 2.5px 4px;
          vertical-align: top;
          line-height: 1.3;
          color: #1f2937;
          border-bottom: 1px solid #f3f4f6;
        }
        tr:last-child td { border-bottom: none; }
        td:first-child { font-weight: 600; color: #04060f; width: 90px; white-space: nowrap; }
        .fda {
          display: inline-block;
          font-size: 6.5px;
          font-weight: 700;
          background: #d1fae5;
          color: #065f46;
          border-radius: 2px;
          padding: 0 2px;
          margin-left: 2px;
          vertical-align: middle;
        }

        /* Boxes */
        .box {
          border: 1px solid #e5e7eb;
          border-radius: 3px;
          padding: 5px 7px;
          margin-bottom: 7px;
          font-size: 8.5px;
        }
        .box-title {
          font-size: 7.5px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          color: #374151;
          margin-bottom: 4px;
        }
        .box ul { padding-left: 11px; }
        .box li { margin-bottom: 2px; line-height: 1.3; color: #374151; }
        .box li strong { color: #111; }
        .red   { color: #b91c1c; }
        .green { color: #065f46; }
        .coa-pass {
          margin-top: 4px;
          font-size: 8px;
          color: #374151;
          padding-top: 3px;
          border-top: 1px solid #f3f4f6;
        }

        /* Stacks */
        .stacks {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px;
          font-size: 8px;
        }
        .stack {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 2px;
          padding: 3px 5px;
          line-height: 1.3;
        }
        .stack strong { display: block; font-size: 8px; color: #04060f; margin-bottom: 1px; }

        /* Timing */
        .timing {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2px 8px;
          font-size: 8px;
        }
        .t-row { display: flex; gap: 4px; line-height: 1.3; }
        .t-name { font-weight: 600; min-width: 72px; color: #04060f; flex-shrink: 0; }

        /* Footer */
        .ftr {
          border-top: 1px solid #e5e7eb;
          margin-top: 6px;
          padding-top: 4px;
          font-size: 7px;
          color: #9ca3af;
          display: flex;
          justify-content: space-between;
          flex-shrink: 0;
        }

        @media print {
          .hint { display: none; }
          .page {
            width: 100%;
            height: 100vh;
            margin: 0;
            padding: 0.28in 0.35in 0.22in;
          }
          @page { size: letter portrait; margin: 0; }
        }
      `}</style>

      <div className="hint">
        <strong>Ctrl + P</strong> → Destination: <strong>Save as PDF</strong> → Margins: <strong>None</strong> → Print
      </div>

      <div className="page">

        {/* ── HEADER ── */}
        <div className="hdr">
          <div>
            <h1>The Peptide Protocol Cheat Sheet</h1>
            <p>Research reference only — not medical advice · All compounds for laboratory use</p>
          </div>
          <div className="hdr-right">
            <strong>Aura Protocols</strong>
            shop.auraprotocols.com
          </div>
        </div>

        {/* ── COLUMNS ── */}
        <div className="cols">

          {/* ══ LEFT ══ */}
          <div>
            <div className="label rec">Recovery &amp; Tissue Repair</div>
            <table>
              <thead><tr><th>Compound</th><th>Research Dose</th><th>Frequency</th><th>Route</th></tr></thead>
              <tbody>
                <tr><td>BPC-157</td><td>250–500 mcg/day</td><td>Daily</td><td>SubQ / oral</td></tr>
                <tr><td>TB-500</td><td>5–10 mg load · 2 mg maint</td><td>2×/wk → weekly</td><td>SubQ / IM</td></tr>
              </tbody>
            </table>

            <div className="label wt">Weight Management &amp; Metabolic</div>
            <table>
              <thead><tr><th>Compound</th><th>Research Dose</th><th>Frequency</th><th>Route</th></tr></thead>
              <tbody>
                <tr>
                  <td>Semaglutide <span className="fda">FDA</span></td>
                  <td>0.25 mg → 2.4 mg (titrate)</td><td>Weekly</td><td>SubQ</td>
                </tr>
                <tr><td>Retatrutide</td><td>1 mg → up to 12 mg (titrate)</td><td>Weekly</td><td>SubQ</td></tr>
                <tr><td>AOD-9604</td><td>250–300 mcg/day</td><td>Daily, AM fasted</td><td>SubQ</td></tr>
              </tbody>
            </table>

            {/* COA Red Flags */}
            <div className="box">
              <div className="box-title">⚠ COA Red Flags — Walk Away</div>
              <ul>
                <li><span className="red">✗</span> No third-party lab — in-house testing only</li>
                <li><span className="red">✗</span> COA older than 18 months</li>
                <li><span className="red">✗</span> Not tied to a specific batch / lot number</li>
                <li><span className="red">✗</span> HPLC purity below 98%</li>
                <li><span className="red">✗</span> No mass spectrometry (MS) identity confirmation</li>
                <li><span className="red">✗</span> Lab not ISO 17025 accredited</li>
                <li><span className="red">✗</span> COA only available on request, not posted publicly</li>
              </ul>
              <div className="coa-pass">
                <span className="green">✓ Green light:</span> ≥99% HPLC + MS confirmed + ISO 17025 lab + batch-specific + dated within 12 months
              </div>
            </div>

            {/* Stacks */}
            <div className="box">
              <div className="box-title">Common Research Stacks</div>
              <div className="stacks">
                <div className="stack">
                  <strong>Recovery</strong>
                  BPC-157 + TB-500 — angiogenesis + actin repair, non-overlapping mechanisms
                </div>
                <div className="stack">
                  <strong>GH Optimization</strong>
                  CJC-1295 + Ipamorelin — GHRH + GHSR dual-axis, synergistic pulse amplification
                </div>
                <div className="stack">
                  <strong>Body Recomposition</strong>
                  Semaglutide + CJC-1295/Ipamorelin — appetite control + GH-driven lipolysis
                </div>
                <div className="stack">
                  <strong>Performance + Repair</strong>
                  Tesamorelin + BPC-157 — visceral fat reduction + localized tissue repair
                </div>
              </div>
            </div>
          </div>

          {/* ══ RIGHT ══ */}
          <div>
            <div className="label gr">Growth &amp; Performance</div>
            <table>
              <thead><tr><th>Compound</th><th>Research Dose</th><th>Frequency</th><th>Route</th></tr></thead>
              <tbody>
                <tr><td>CJC-1295 (DAC)</td><td>1–2 mg/week</td><td>1–2×/week</td><td>SubQ</td></tr>
                <tr><td>Ipamorelin</td><td>100–300 mcg/dose</td><td>2–3×/day fasted</td><td>SubQ</td></tr>
                <tr><td>Sermorelin</td><td>200–500 mcg/day</td><td>Daily, pre-sleep</td><td>SubQ</td></tr>
                <tr>
                  <td>Tesamorelin <span className="fda">FDA</span></td>
                  <td>1–2 mg/day</td><td>Daily</td><td>SubQ</td>
                </tr>
              </tbody>
            </table>

            <div className="label well">Wellness &amp; Longevity</div>
            <table>
              <thead><tr><th>Compound</th><th>Research Dose</th><th>Frequency / Cycle</th><th>Route</th></tr></thead>
              <tbody>
                <tr>
                  <td>PT-141 <span className="fda">FDA</span></td>
                  <td>0.5–2 mg/dose</td><td>As needed, 1–4h before</td><td>SubQ</td>
                </tr>
                <tr><td>Epithalon</td><td>5–10 mg/day</td><td>Daily × 10–20 days, 2×/yr</td><td>SubQ</td></tr>
                <tr><td>MOTS-c</td><td>5–10 mg/week</td><td>Weekly</td><td>SubQ</td></tr>
              </tbody>
            </table>

            {/* Timing */}
            <div className="box">
              <div className="box-title">Timing Notes</div>
              <div className="timing">
                <div className="t-row"><span className="t-name">BPC-157</span><span>Any time; split AM/PM for full dose</span></div>
                <div className="t-row"><span className="t-name">TB-500</span><span>Flexible; load 4–6 wks then maintain</span></div>
                <div className="t-row"><span className="t-name">Semaglutide</span><span>Same day weekly; titrate over 4–16 wks</span></div>
                <div className="t-row"><span className="t-name">AOD-9604</span><span>Fasted AM, 30+ min before food</span></div>
                <div className="t-row"><span className="t-name">GH Peptides</span><span>Fasted + pre-sleep aligns with natural GH pulse</span></div>
                <div className="t-row"><span className="t-name">Tesamorelin</span><span>Consistent daily time, AM or PM</span></div>
                <div className="t-row"><span className="t-name">PT-141</span><span>1–4h before; start at 0.5–1 mg to assess nausea</span></div>
                <div className="t-row"><span className="t-name">Epithalon</span><span>Before bed; 10–20 day cycle, 1–2× per year</span></div>
              </div>
            </div>

            {/* Mechanism */}
            <div className="box">
              <div className="box-title">Mechanism Quick Reference</div>
              <ul>
                <li><strong>GLP-1 agonists</strong> (Semaglutide, Retatrutide) — appetite + insulin via gut hormone mimicry</li>
                <li><strong>GHRH analogues</strong> (CJC-1295, Sermorelin, Tesamorelin) — pituitary GH release via GHRH-R</li>
                <li><strong>GHSR agonist</strong> (Ipamorelin) — GH pulse amplitude via ghrelin receptor; no cortisol/prolactin rise</li>
                <li><strong>Melanocortin</strong> (PT-141) — central arousal via MC3R/MC4R in hypothalamus; not vascular</li>
                <li><strong>GH fragment</strong> (AOD-9604) — isolated lipolysis; no IGF-1 or glucose effect</li>
                <li><strong>Actin regulator</strong> (TB-500) — cell migration + angiogenesis at injury sites; systemic distribution</li>
                <li><strong>Tetrapeptide</strong> (Epithalon) — telomerase activation + pineal melatonin support</li>
                <li><strong>Mitokine</strong> (MOTS-c) — AMPK activation; mitochondrial glucose/lipid regulation; declines with age</li>
              </ul>
            </div>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div className="ftr">
          <span>FDA = approved formulation exists for a specific indication under medical supervision. Research-grade ≠ pharmaceutical-grade.</span>
          <span>© 2026 Aura Protocols LLC · shop.auraprotocols.com</span>
        </div>

      </div>
    </>
  );
}
