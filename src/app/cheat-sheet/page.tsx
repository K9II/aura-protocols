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

        .cs-root {
          font-family: 'Inter', sans-serif;
          background: #fff;
          color: #0d1117;
          margin: 0;
          padding: 0;
        }

        /* ── screen wrapper ── */
        .cs-screen-hint {
          background: #04060f;
          color: #8b9cba;
          text-align: center;
          padding: 10px 16px;
          font-size: 13px;
        }
        .cs-screen-hint strong { color: #00d4ff; }

        /* ── page canvas ── */
        .cs-page {
          width: 8.5in;
          min-height: 11in;
          margin: 0 auto;
          padding: 0.45in 0.5in 0.35in;
          box-sizing: border-box;
          background: #fff;
        }

        /* ── header ── */
        .cs-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          border-bottom: 2.5px solid #00d4ff;
          padding-bottom: 7px;
          margin-bottom: 10px;
        }
        .cs-header-left h1 {
          font-size: 19px;
          font-weight: 700;
          margin: 0 0 2px;
          color: #04060f;
          letter-spacing: -0.3px;
        }
        .cs-header-left p {
          font-size: 10px;
          color: #6b7280;
          margin: 0;
        }
        .cs-header-right {
          font-size: 10px;
          color: #6b7280;
          text-align: right;
        }
        .cs-header-right span {
          display: block;
          font-weight: 600;
          color: #8b5cf6;
          font-size: 11px;
        }

        /* ── two-column body ── */
        .cs-body {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        /* ── section ── */
        .cs-section {
          margin-bottom: 11px;
        }
        .cs-section-title {
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          color: #fff;
          background: #04060f;
          padding: 3px 7px;
          margin: 0 0 5px;
          border-radius: 2px;
        }
        .cs-section-title.recovery  { background: #065f46; }
        .cs-section-title.weight    { background: #9f1239; }
        .cs-section-title.growth    { background: #4c1d95; }
        .cs-section-title.wellness  { background: #0e7490; }

        /* ── compound rows ── */
        table.cs-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 9.5px;
          margin-bottom: 4px;
        }
        table.cs-table thead tr {
          background: #f3f4f6;
        }
        table.cs-table thead th {
          text-align: left;
          padding: 3px 5px;
          font-size: 8.5px;
          font-weight: 600;
          color: #374151;
          border-bottom: 1px solid #e5e7eb;
          white-space: nowrap;
        }
        table.cs-table tbody tr {
          border-bottom: 1px solid #f3f4f6;
        }
        table.cs-table tbody tr:last-child {
          border-bottom: none;
        }
        table.cs-table td {
          padding: 3.5px 5px;
          vertical-align: top;
          line-height: 1.35;
          color: #1f2937;
        }
        table.cs-table td:first-child {
          font-weight: 600;
          white-space: nowrap;
          color: #04060f;
          width: 105px;
        }
        .badge-fda {
          display: inline-block;
          font-size: 7px;
          font-weight: 700;
          background: #d1fae5;
          color: #065f46;
          border-radius: 2px;
          padding: 0 3px;
          margin-left: 3px;
          vertical-align: middle;
          letter-spacing: 0.3px;
        }

        /* ── COA box ── */
        .cs-box {
          border: 1.5px solid #e5e7eb;
          border-radius: 4px;
          padding: 7px 9px;
          margin-bottom: 11px;
          font-size: 9.5px;
        }
        .cs-box-title {
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.7px;
          margin: 0 0 5px;
          color: #374151;
        }
        .cs-box ul {
          margin: 0;
          padding: 0 0 0 13px;
        }
        .cs-box li {
          margin-bottom: 2.5px;
          line-height: 1.35;
          color: #374151;
        }
        .cs-box li strong { color: #04060f; }
        .red { color: #b91c1c; }
        .green { color: #065f46; }

        /* ── stacking grid ── */
        .cs-stacks {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 5px;
          font-size: 9px;
          margin-top: 4px;
        }
        .cs-stack-item {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 3px;
          padding: 4px 6px;
          line-height: 1.4;
        }
        .cs-stack-item strong {
          display: block;
          color: #04060f;
          font-size: 9px;
          margin-bottom: 1px;
        }

        /* ── timing notes ── */
        .cs-timing-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px;
          font-size: 9px;
          margin-top: 4px;
        }
        .cs-timing-item {
          display: flex;
          gap: 5px;
          align-items: flex-start;
        }
        .cs-timing-compound {
          font-weight: 600;
          min-width: 75px;
          color: #04060f;
        }

        /* ── footer ── */
        .cs-footer {
          border-top: 1px solid #e5e7eb;
          margin-top: 10px;
          padding-top: 6px;
          font-size: 8px;
          color: #9ca3af;
          display: flex;
          justify-content: space-between;
        }

        /* ── print ── */
        @media print {
          .cs-screen-hint { display: none; }
          .cs-page {
            width: 100%;
            min-height: auto;
            margin: 0;
            padding: 0.4in 0.45in 0.3in;
          }
          body { margin: 0; }
          @page { size: letter; margin: 0; }
        }
      `}</style>

      <div className="cs-root">
        {/* Screen-only print hint */}
        <div className="cs-screen-hint">
          To save as PDF: <strong>Ctrl + P</strong> (or Cmd + P) → Change destination to{" "}
          <strong>Save as PDF</strong> → Print
        </div>

        <div className="cs-page">
          {/* Header */}
          <div className="cs-header">
            <div className="cs-header-left">
              <h1>The Peptide Protocol Cheat Sheet</h1>
              <p>
                Research reference only — not medical advice. All compounds for laboratory use.
              </p>
            </div>
            <div className="cs-header-right">
              <span>Aura Protocols</span>
              shop.auraprotocols.com
            </div>
          </div>

          {/* Two-column body */}
          <div className="cs-body">
            {/* ── LEFT COLUMN ── */}
            <div>
              {/* Recovery */}
              <div className="cs-section">
                <div className="cs-section-title recovery">Recovery &amp; Tissue Repair</div>
                <table className="cs-table">
                  <thead>
                    <tr>
                      <th>Compound</th>
                      <th>Research Dose Range</th>
                      <th>Frequency</th>
                      <th>Route</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>BPC-157</td>
                      <td>250–500 mcg/day</td>
                      <td>Daily</td>
                      <td>SubQ / oral</td>
                    </tr>
                    <tr>
                      <td>TB-500</td>
                      <td>5–10 mg (load)<br />2–2.5 mg (maint)</td>
                      <td>2×/wk → weekly</td>
                      <td>SubQ / IM</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Weight Management */}
              <div className="cs-section">
                <div className="cs-section-title weight">Weight Management &amp; Metabolic</div>
                <table className="cs-table">
                  <thead>
                    <tr>
                      <th>Compound</th>
                      <th>Research Dose Range</th>
                      <th>Frequency</th>
                      <th>Route</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        Semaglutide
                        <span className="badge-fda">FDA</span>
                      </td>
                      <td>0.25 mg (start) → 2.4 mg</td>
                      <td>Weekly</td>
                      <td>SubQ</td>
                    </tr>
                    <tr>
                      <td>Retatrutide</td>
                      <td>1 mg (start) → up to 12 mg</td>
                      <td>Weekly</td>
                      <td>SubQ</td>
                    </tr>
                    <tr>
                      <td>AOD-9604</td>
                      <td>250–300 mcg/day</td>
                      <td>Daily (AM fasted)</td>
                      <td>SubQ</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* COA Red Flags */}
              <div className="cs-box">
                <div className="cs-box-title">⚠ COA Red Flags — Walk Away If You See These</div>
                <ul>
                  <li><span className="red">✗</span> No third-party lab — in-house testing only</li>
                  <li><span className="red">✗</span> COA older than 18 months</li>
                  <li><span className="red">✗</span> Purity not tied to a specific batch/lot number</li>
                  <li><span className="red">✗</span> HPLC purity below 98%</li>
                  <li><span className="red">✗</span> No mass spectrometry (MS) identity confirmation</li>
                  <li><span className="red">✗</span> Lab not ISO 17025 accredited</li>
                  <li><span className="red">✗</span> COA only available "on request" — not posted publicly</li>
                </ul>
                <div style={{ marginTop: 5, fontSize: 9, color: "#374151" }}>
                  <span className="green">✓</span>{" "}
                  <strong>Green light:</strong> ≥99% HPLC + MS confirmation + accredited lab +
                  batch-specific + dated within 12 months
                </div>
              </div>

              {/* Stacking */}
              <div className="cs-box">
                <div className="cs-box-title">Common Research Stacks</div>
                <div className="cs-stacks">
                  <div className="cs-stack-item">
                    <strong>Recovery Stack</strong>
                    BPC-157 + TB-500 — tissue repair via two non-overlapping mechanisms (angiogenesis + actin)
                  </div>
                  <div className="cs-stack-item">
                    <strong>GH Optimization</strong>
                    CJC-1295 + Ipamorelin — GHRH + GHSR dual-axis, synergistic GH pulse amplification
                  </div>
                  <div className="cs-stack-item">
                    <strong>Body Recomposition</strong>
                    Semaglutide + CJC-1295/Ipamorelin — GLP-1 appetite suppression + GH-driven lipolysis
                  </div>
                  <div className="cs-stack-item">
                    <strong>Performance + Recovery</strong>
                    Tesamorelin + BPC-157 — visceral fat reduction + localized tissue repair
                  </div>
                </div>
              </div>
            </div>

            {/* ── RIGHT COLUMN ── */}
            <div>
              {/* Growth & Performance */}
              <div className="cs-section">
                <div className="cs-section-title growth">Growth &amp; Performance</div>
                <table className="cs-table">
                  <thead>
                    <tr>
                      <th>Compound</th>
                      <th>Research Dose Range</th>
                      <th>Frequency</th>
                      <th>Route</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>CJC-1295 (DAC)</td>
                      <td>1–2 mg/week</td>
                      <td>1–2×/week</td>
                      <td>SubQ</td>
                    </tr>
                    <tr>
                      <td>Ipamorelin</td>
                      <td>100–300 mcg/dose</td>
                      <td>2–3×/day (fasted)</td>
                      <td>SubQ</td>
                    </tr>
                    <tr>
                      <td>Sermorelin</td>
                      <td>200–500 mcg/day</td>
                      <td>Daily (before sleep)</td>
                      <td>SubQ</td>
                    </tr>
                    <tr>
                      <td>
                        Tesamorelin
                        <span className="badge-fda">FDA</span>
                      </td>
                      <td>1–2 mg/day</td>
                      <td>Daily</td>
                      <td>SubQ</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Wellness & Longevity */}
              <div className="cs-section">
                <div className="cs-section-title wellness">Wellness &amp; Longevity</div>
                <table className="cs-table">
                  <thead>
                    <tr>
                      <th>Compound</th>
                      <th>Research Dose Range</th>
                      <th>Frequency / Cycle</th>
                      <th>Route</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        PT-141
                        <span className="badge-fda">FDA</span>
                      </td>
                      <td>0.5–2 mg/dose</td>
                      <td>As needed (1–4h before)</td>
                      <td>SubQ</td>
                    </tr>
                    <tr>
                      <td>Epithalon</td>
                      <td>5–10 mg/day</td>
                      <td>Daily × 10–20 days, 2×/yr</td>
                      <td>SubQ / IV</td>
                    </tr>
                    <tr>
                      <td>MOTS-c</td>
                      <td>5–10 mg/week</td>
                      <td>Weekly</td>
                      <td>SubQ</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Timing Notes */}
              <div className="cs-box">
                <div className="cs-box-title">Timing Notes</div>
                <div className="cs-timing-grid">
                  <div className="cs-timing-item">
                    <span className="cs-timing-compound">BPC-157</span>
                    <span>Any time; split AM/PM if full dose</span>
                  </div>
                  <div className="cs-timing-item">
                    <span className="cs-timing-compound">TB-500</span>
                    <span>Timing flexible; load 4–6 wks then maintain</span>
                  </div>
                  <div className="cs-timing-item">
                    <span className="cs-timing-compound">Semaglutide</span>
                    <span>Same day each week; dose-escalate over 4–16 wks</span>
                  </div>
                  <div className="cs-timing-item">
                    <span className="cs-timing-compound">AOD-9604</span>
                    <span>Fasted AM (30+ min before food) for peak lipolysis</span>
                  </div>
                  <div className="cs-timing-item">
                    <span className="cs-timing-compound">GH Peptides</span>
                    <span>Fasted state, pre-sleep pulse aligns with natural GH rhythm</span>
                  </div>
                  <div className="cs-timing-item">
                    <span className="cs-timing-compound">Tesamorelin</span>
                    <span>Morning or evening, consistent time daily</span>
                  </div>
                  <div className="cs-timing-item">
                    <span className="cs-timing-compound">PT-141</span>
                    <span>1–4 hours before; nausea risk lower at 0.5–1 mg</span>
                  </div>
                  <div className="cs-timing-item">
                    <span className="cs-timing-compound">Epithalon</span>
                    <span>Before bed; 10–20 day cycle 1–2× per year</span>
                  </div>
                </div>
              </div>

              {/* Quick Mechanism Reference */}
              <div className="cs-box">
                <div className="cs-box-title">Mechanism Quick Reference</div>
                <ul>
                  <li><strong>GLP-1 agonists</strong> (Semaglutide, Retatrutide) — appetite + insulin via gut hormone mimicry</li>
                  <li><strong>GHRH analogues</strong> (CJC-1295, Sermorelin, Tesamorelin) — pituitary GH release via GHRH receptors</li>
                  <li><strong>GHSR agonists</strong> (Ipamorelin) — GH pulse amplitude via ghrelin receptors</li>
                  <li><strong>Melanocortin</strong> (PT-141) — central arousal via MC3R/MC4R in hypothalamus</li>
                  <li><strong>GH fragment</strong> (AOD-9604) — fat-specific lipolysis, no IGF-1/glucose effect</li>
                  <li><strong>Actin regulator</strong> (TB-500) — cell migration + new vessel formation at injury sites</li>
                  <li><strong>Tetrapeptide</strong> (Epithalon) — telomerase activation + pineal melatonin support</li>
                  <li><strong>Mitokine</strong> (MOTS-c) — AMPK activation, mitochondrial glucose/lipid regulation</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="cs-footer">
            <span>
              FDA = approved formulation exists for a specific indication under medical supervision.
              Research-grade compounds are not equivalent to pharmaceutical-grade.
            </span>
            <span>© 2026 Aura Protocols LLC · shop.auraprotocols.com</span>
          </div>
        </div>
      </div>
    </>
  );
}
