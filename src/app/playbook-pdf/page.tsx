export const metadata = {
  title: "The Peptide Protocol Playbook | Aura Protocols",
  robots: { index: false, follow: false },
};

export default function PlaybookPdfPage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body, html { background: #f8f9fa; font-family: Inter, sans-serif; }

        /* ── Screen hint ── */
        .hint {
          background: #04060f; color: #8b9cba; text-align: center;
          padding: 10px; font-size: 12px; font-family: Inter, sans-serif;
        }
        .hint strong { color: #00d4ff; }

        /* ── Page shell ── */
        .doc {
          width: 8.5in;
          margin: 0 auto;
          background: #fff;
        }

        /* ── Chapter (each is one printed page) ── */
        .chapter {
          width: 8.5in;
          min-height: 11in;
          padding: 0.6in 0.7in 0.5in;
          position: relative;
          background: #fff;
          border-bottom: 3px solid #e5e7eb;
        }

        /* ── Cover ── */
        .cover {
          background: #04060f;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: flex-start;
          padding: 0.8in 0.9in;
        }
        .cover-eyebrow {
          font-size: 11px; font-weight: 700; letter-spacing: 2px;
          text-transform: uppercase; color: #00d4ff; margin-bottom: 20px;
        }
        .cover-title {
          font-size: 48px; font-weight: 700; color: #fff;
          line-height: 1.1; letter-spacing: -1px; margin-bottom: 16px;
        }
        .cover-title span { color: #00d4ff; }
        .cover-subtitle {
          font-size: 18px; color: #94a3b8; line-height: 1.5;
          max-width: 5in; margin-bottom: 40px;
        }
        .cover-divider {
          width: 60px; height: 3px;
          background: linear-gradient(90deg, #00d4ff, #8b5cf6);
          margin-bottom: 32px; border-radius: 2px;
        }
        .cover-toc { width: 100%; }
        .cover-toc-title {
          font-size: 10px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 1.5px; color: #475569; margin-bottom: 12px;
        }
        .cover-toc-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 6px 40px;
        }
        .cover-toc-item {
          font-size: 12px; color: #94a3b8; line-height: 1.4;
          display: flex; gap: 8px;
        }
        .cover-toc-num { color: #00d4ff; font-weight: 600; min-width: 20px; }
        .cover-footer {
          position: absolute; bottom: 0.5in; left: 0.9in; right: 0.9in;
          display: flex; justify-content: space-between; align-items: center;
          border-top: 1px solid #1e293b; padding-top: 16px;
        }
        .cover-footer-brand { font-size: 13px; font-weight: 700; color: #475569; }
        .cover-footer-url   { font-size: 11px; color: #334155; }
        .cover-footer-disc  { font-size: 9px; color: #334155; max-width: 3.5in; text-align: right; line-height: 1.4; }

        /* ── Chapter header ── */
        .ch-num {
          font-size: 10px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 1.5px; color: #00d4ff; margin-bottom: 6px;
        }
        .ch-title {
          font-size: 26px; font-weight: 700; color: #04060f;
          letter-spacing: -0.5px; margin-bottom: 6px;
        }
        .ch-desc {
          font-size: 12px; color: #6b7280; margin-bottom: 20px;
          padding-bottom: 14px; border-bottom: 2px solid #e5e7eb;
        }

        /* ── Body typography ── */
        .h2 {
          font-size: 14px; font-weight: 700; color: #04060f;
          margin: 18px 0 8px; text-transform: none;
        }
        .h3 {
          font-size: 12px; font-weight: 700; color: #1f2937; margin: 12px 0 5px;
        }
        p {
          font-size: 11px; line-height: 1.65; color: #374151; margin-bottom: 8px;
        }
        ul { padding-left: 16px; margin-bottom: 8px; }
        li { font-size: 11px; line-height: 1.6; color: #374151; margin-bottom: 2px; }
        li strong { color: #111; }

        /* ── Tables ── */
        .tbl { width: 100%; border-collapse: collapse; font-size: 10.5px; margin: 10px 0 14px; }
        .tbl thead tr { background: #04060f; }
        .tbl thead th {
          text-align: left; padding: 5px 8px;
          font-size: 9px; font-weight: 600; color: #fff;
          letter-spacing: 0.5px; text-transform: uppercase;
        }
        .tbl tbody tr:nth-child(even) { background: #f9fafb; }
        .tbl tbody tr:hover { background: #f0f9ff; }
        .tbl td {
          padding: 5px 8px; vertical-align: top;
          line-height: 1.4; color: #1f2937;
          border-bottom: 1px solid #f3f4f6;
        }
        .tbl td:first-child { font-weight: 600; color: #04060f; }

        /* ── Boxes ── */
        .box {
          border-left: 3px solid #00d4ff; background: #f0f9ff;
          padding: 10px 14px; margin: 12px 0; border-radius: 0 4px 4px 0;
          font-size: 11px; line-height: 1.6; color: #1e40af;
        }
        .box-warn {
          border-left-color: #f59e0b; background: #fffbeb; color: #92400e;
        }
        .box-danger {
          border-left-color: #ef4444; background: #fef2f2; color: #991b1b;
        }
        .box-title {
          font-size: 10px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.8px; margin-bottom: 5px;
        }
        .box ul { margin: 0; }

        /* ── Protocol cards ── */
        .protocol-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 10px 0;
        }
        .protocol-card {
          border: 1px solid #e5e7eb; border-radius: 4px;
          padding: 10px 12px; background: #fafafa;
        }
        .protocol-card-title {
          font-size: 10px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.8px; color: #374151; margin-bottom: 6px;
          padding-bottom: 4px; border-bottom: 1px solid #e5e7eb;
        }
        .protocol-card p { font-size: 10.5px; margin-bottom: 4px; }
        .protocol-card .label { color: #6b7280; font-weight: 500; }
        .protocol-card .value { color: #04060f; font-weight: 600; }

        /* ── Compound section ── */
        .compound-header {
          background: #04060f; color: #fff;
          padding: 8px 12px; margin: 16px 0 8px;
          border-radius: 4px; display: flex;
          justify-content: space-between; align-items: center;
        }
        .compound-name { font-size: 13px; font-weight: 700; }
        .compound-cat  { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; }

        /* ── Matrix ── */
        .matrix { width: 100%; border-collapse: collapse; font-size: 10px; margin: 10px 0; }
        .matrix th {
          background: #f3f4f6; padding: 5px 7px;
          font-size: 9px; font-weight: 600; color: #374151;
          text-align: center; border: 1px solid #e5e7eb;
        }
        .matrix th:first-child { text-align: left; }
        .matrix td { padding: 4px 7px; border: 1px solid #f3f4f6; text-align: center; font-size: 10px; }
        .matrix td:first-child { text-align: left; font-weight: 600; color: #04060f; }
        .safe   { background: #d1fae5; color: #065f46; font-weight: 600; }
        .caution{ background: #fef3c7; color: #92400e; font-weight: 600; }
        .avoid  { background: #fee2e2; color: #991b1b; font-weight: 600; }
        .na     { background: #f9fafb; color: #9ca3af; }

        /* ── Page footer ── */
        .ch-footer {
          position: absolute; bottom: 0.35in; left: 0.7in; right: 0.7in;
          display: flex; justify-content: space-between; align-items: center;
          font-size: 8px; color: #9ca3af;
          border-top: 1px solid #f3f4f6; padding-top: 6px;
        }

        /* ── Two-col layout ── */
        .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

        /* ── Print ── */
        @media print {
          .hint { display: none; }
          .doc  { width: 100%; }
          .chapter {
            width: 100%; min-height: 0;
            page-break-before: always;
            border-bottom: none;
            padding: 0.55in 0.65in 0.45in;
          }
          .chapter:first-child { page-break-before: avoid; }
          @page { size: letter portrait; margin: 0; }
        }
      `}</style>

      <div className="hint">
        <strong>Ctrl + P</strong> → Destination: <strong>Save as PDF</strong> → Margins: <strong>None</strong> → <strong>Background graphics: ON</strong> → Print
      </div>

      <div className="doc">

        {/* ════════════════════════════════════════
            COVER
        ════════════════════════════════════════ */}
        <div className="chapter cover">
          <div className="cover-eyebrow">Aura Protocols — Research Edition</div>
          <div className="cover-title">The Peptide<br />Protocol <span>Playbook</span></div>
          <div className="cover-subtitle">
            Reconstitution math, cycling protocols, stacking combinations, and COA
            interpretation — everything needed to design and execute a peptide research protocol.
          </div>
          <div className="cover-divider" />
          <div className="cover-toc">
            <div className="cover-toc-title">Contents</div>
            <div className="cover-toc-grid">
              <div className="cover-toc-item"><span className="cover-toc-num">1</span><span>How to Use This Playbook</span></div>
              <div className="cover-toc-item"><span className="cover-toc-num">5</span><span>Weight Management Protocols</span></div>
              <div className="cover-toc-item"><span className="cover-toc-num">2</span><span>Peptide Fundamentals: Reconstitution &amp; Storage</span></div>
              <div className="cover-toc-item"><span className="cover-toc-num">6</span><span>Growth &amp; Performance Protocols</span></div>
              <div className="cover-toc-item"><span className="cover-toc-num">3</span><span>COA Masterclass: Reading the Data</span></div>
              <div className="cover-toc-item"><span className="cover-toc-num">7</span><span>Wellness &amp; Longevity Protocols</span></div>
              <div className="cover-toc-item"><span className="cover-toc-num">4</span><span>Recovery Protocols</span></div>
              <div className="cover-toc-item"><span className="cover-toc-num">8</span><span>Stacking &amp; Cycling Master Guide</span></div>
              <div className="cover-toc-item"><span className="cover-toc-num">—</span><span>Appendix: Dosing Tables &amp; Conversions</span></div>
            </div>
          </div>
          <div className="cover-footer">
            <div>
              <div className="cover-footer-brand">Aura Protocols</div>
              <div className="cover-footer-url">shop.auraprotocols.com</div>
            </div>
            <div className="cover-footer-disc">
              For research use only. Not medical advice. All compounds referenced are
              investigational or research-grade. Consult a qualified physician before
              any human application. © 2026 Aura Protocols LLC.
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════
            CH 1 — HOW TO USE
        ════════════════════════════════════════ */}
        <div className="chapter">
          <div className="ch-num">Chapter 1</div>
          <div className="ch-title">How to Use This Playbook</div>
          <div className="ch-desc">Who this is for, how it's structured, and what it doesn't cover.</div>

          <div className="h2">Who This Is For</div>
          <p>This playbook is written for researchers, practitioners, and informed individuals who have already made decisions about which compounds to study and need a precise, protocol-level reference. It assumes basic familiarity with peptide biology — if you need mechanism explanations, the Aura Protocols blog covers each compound in depth at <strong>shop.auraprotocols.com/blog</strong>.</p>

          <div className="h2">What This Playbook Covers</div>
          <ul>
            <li><strong>Reconstitution math</strong> — exact calculations for every compound, formatted for U-100 insulin syringes</li>
            <li><strong>Cycling protocols</strong> — on-periods, off-periods, and the physiological rationale for each</li>
            <li><strong>Stacking guidance</strong> — which compounds combine safely, which are redundant, and which to avoid together</li>
            <li><strong>COA interpretation</strong> — how to read HPLC and mass spec data, not just what numbers to look for</li>
            <li><strong>Goal-based protocol templates</strong> — four complete research designs ready to adapt</li>
          </ul>

          <div className="h2">What This Playbook Does Not Cover</div>
          <ul>
            <li>Mechanism of action explanations (see the blog for each compound)</li>
            <li>Clinical trial data and literature reviews (also covered in blog posts)</li>
            <li>Legal status by jurisdiction — this varies and changes; consult applicable regulations</li>
            <li>Medical advice of any kind — this is a research reference document</li>
          </ul>

          <div className="h2">How to Read Dose Entries</div>
          <p>Every protocol entry uses this format consistently:</p>
          <div className="box">
            <div className="box-title">Protocol Entry Format</div>
            <ul>
              <li><strong>Research dose range</strong> — the range observed in published research or studied in preclinical models</li>
              <li><strong>Reconstitution</strong> — standard vial size, BAC water volume, resulting concentration, and syringe units per dose</li>
              <li><strong>Cycle</strong> — on-period, off-period, and total duration studied</li>
              <li><strong>Timing</strong> — when to administer relative to meals, sleep, or exercise</li>
              <li><strong>Storage</strong> — lyophilized shelf life and post-reconstitution stability</li>
              <li><strong>Red flags</strong> — signs of degradation, adverse responses, or protocol errors</li>
            </ul>
          </div>

          <div className="h2">A Note on &quot;Studied Doses&quot;</div>
          <p>All doses in this document are described as &quot;research dose ranges&quot; — meaning these are doses documented in published preclinical or clinical research. This is not a prescription and does not constitute a recommendation for human use. Doses appropriate for a specific research subject depend on body weight, health status, concurrent medications, and numerous other variables that require individual assessment by a qualified clinician.</p>

          <div className="box box-warn">
            <div className="box-title">Research Use Only</div>
            All compounds in this playbook are sold for research purposes only. They are not approved drugs for the indications discussed (except where specifically noted with FDA approval markers). Nothing in this document constitutes medical advice.
          </div>

          <div className="ch-footer">
            <span>The Peptide Protocol Playbook — Aura Protocols</span>
            <span>Chapter 1 · How to Use This Playbook</span>
            <span>shop.auraprotocols.com</span>
          </div>
        </div>

        {/* ════════════════════════════════════════
            CH 2 — RECONSTITUTION
        ════════════════════════════════════════ */}
        <div className="chapter">
          <div className="ch-num">Chapter 2</div>
          <div className="ch-title">Peptide Fundamentals: Reconstitution &amp; Storage</div>
          <div className="ch-desc">BAC water vs. sterile water, the reconstitution calculation, and storage protocols for every compound.</div>

          <div className="h2">BAC Water vs. Sterile Water</div>
          <p>Research-grade peptides arrive as lyophilized (freeze-dried) powder and must be reconstituted before use. The choice of solvent matters.</p>
          <table className="tbl">
            <thead><tr><th>Solvent</th><th>Contains</th><th>Shelf Life (reconstituted)</th><th>Use When</th></tr></thead>
            <tbody>
              <tr><td>Bacteriostatic Water (BAC)</td><td>0.9% benzyl alcohol</td><td>28–30 days refrigerated</td><td>Multi-dose vials — standard choice for all peptides</td></tr>
              <tr><td>Sterile Water for Injection</td><td>Nothing (sterile only)</td><td>24 hours (single use only)</td><td>Single-dose use; some peptides sensitive to benzyl alcohol</td></tr>
              <tr><td>Sodium Chloride 0.9% (saline)</td><td>0.9% NaCl</td><td>24 hours</td><td>IV administration contexts only</td></tr>
            </tbody>
          </table>
          <p><strong>Default: use BAC water.</strong> It preserves multi-dose vials for up to 4 weeks refrigerated. Sterile water is only necessary for single-use administration where the full vial is used immediately.</p>

          <div className="h2">The Reconstitution Calculation</div>
          <p>The goal is to arrive at a concentration that produces a practical syringe volume per dose. The standard tool is a U-100 insulin syringe (100 units = 1 mL).</p>
          <div className="box">
            <div className="box-title">The Formula</div>
            <p style={{marginBottom: 4}}><strong>Dose volume (mL) = Dose (mg) ÷ Concentration (mg/mL)</strong></p>
            <p style={{marginBottom: 4}}><strong>Syringe units = Dose volume (mL) × 100</strong></p>
            <p style={{margin: 0, fontSize: 10}}>Example: 250 mcg dose from a 5 mg vial reconstituted with 2 mL BAC water<br/>
            Concentration = 5 mg ÷ 2 mL = 2.5 mg/mL = 2,500 mcg/mL<br/>
            Dose volume = 0.25 mg ÷ 2.5 mg/mL = 0.10 mL = <strong>10 units</strong></p>
          </div>

          <div className="h2">Reconstitution Reference — All 11 Compounds</div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Compound</th><th>Std Vial</th><th>BAC Water</th><th>Concentration</th><th>Low Dose</th><th>Units</th><th>High Dose</th><th>Units</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>BPC-157</td><td>5 mg</td><td>2 mL</td><td>2,500 mcg/mL</td><td>250 mcg</td><td>10</td><td>500 mcg</td><td>20</td></tr>
              <tr><td>TB-500</td><td>10 mg</td><td>2 mL</td><td>5,000 mcg/mL</td><td>2 mg</td><td>40</td><td>5 mg</td><td>100</td></tr>
              <tr><td>Semaglutide</td><td>5 mg</td><td>2 mL</td><td>2,500 mcg/mL</td><td>0.25 mg</td><td>10</td><td>1 mg</td><td>40</td></tr>
              <tr><td>Retatrutide</td><td>5 mg</td><td>2 mL</td><td>2,500 mcg/mL</td><td>1 mg</td><td>40</td><td>2 mg</td><td>80</td></tr>
              <tr><td>AOD-9604</td><td>5 mg</td><td>2 mL</td><td>2,500 mcg/mL</td><td>250 mcg</td><td>10</td><td>300 mcg</td><td>12</td></tr>
              <tr><td>CJC-1295</td><td>2 mg</td><td>1 mL</td><td>2,000 mcg/mL</td><td>1 mg</td><td>50</td><td>2 mg</td><td>100</td></tr>
              <tr><td>Ipamorelin</td><td>2 mg</td><td>2 mL</td><td>1,000 mcg/mL</td><td>200 mcg</td><td>20</td><td>300 mcg</td><td>30</td></tr>
              <tr><td>Sermorelin</td><td>3 mg</td><td>3 mL</td><td>1,000 mcg/mL</td><td>200 mcg</td><td>20</td><td>500 mcg</td><td>50</td></tr>
              <tr><td>Tesamorelin</td><td>2 mg</td><td>2 mL</td><td>1,000 mcg/mL</td><td>1 mg</td><td>100</td><td>2 mg</td><td>200*</td></tr>
              <tr><td>PT-141</td><td>10 mg</td><td>2 mL</td><td>5,000 mcg/mL</td><td>0.5 mg</td><td>10</td><td>2 mg</td><td>40</td></tr>
              <tr><td>Epithalon</td><td>10 mg</td><td>2 mL</td><td>5,000 mcg/mL</td><td>5 mg</td><td>100</td><td>10 mg</td><td>200*</td></tr>
              <tr><td>MOTS-c</td><td>10 mg</td><td>2 mL</td><td>5,000 mcg/mL</td><td>5 mg</td><td>100</td><td>10 mg</td><td>200*</td></tr>
            </tbody>
          </table>
          <p style={{fontSize: 9, color: '#6b7280'}}>* Doses above 1 mL (100 units) should be split across two injection sites. All units reference U-100 insulin syringe markings.</p>

          <div className="h2">Storage Protocols</div>
          <div className="two-col">
            <div>
              <div className="h3">Lyophilized (Unreconstituted)</div>
              <ul>
                <li>Room temperature: most peptides stable 6–12 months if kept dry and away from light</li>
                <li>Refrigerated (2–8°C): extends shelf life to 18–24 months</li>
                <li>Freezer (−20°C): maximum longevity for long-term storage; avoid repeated freeze-thaw cycles</li>
                <li>Never store in direct sunlight or humid environments</li>
              </ul>
            </div>
            <div>
              <div className="h3">Reconstituted (In BAC Water)</div>
              <ul>
                <li>Refrigerate immediately at 2–8°C after reconstitution</li>
                <li>Use within 28–30 days</li>
                <li>Do not freeze reconstituted peptides — BAC water disrupts peptide bonds at freezing temperatures</li>
                <li>Keep away from light; amber or opaque vials preferred</li>
                <li>Discard if solution becomes cloudy, discolored, or shows particulate matter</li>
              </ul>
            </div>
          </div>

          <div className="h2">Injection Site Rotation</div>
          <p>SubQ administration is standard for most peptides. Rotating injection sites prevents lipodystrophy (localized fat atrophy) and maintains tissue integrity for accurate absorption.</p>
          <ul>
            <li><strong>Primary sites:</strong> Lower abdominal wall (2–3 cm lateral to navel), lateral thigh, lateral upper arm</li>
            <li><strong>Rotation rule:</strong> Never inject the same site within 48 hours</li>
            <li><strong>Site log:</strong> Keep a written injection log; small sites become hard to track mentally over multi-week protocols</li>
            <li><strong>Needle depth:</strong> 45° angle for lean subjects; 90° with abdominal pinch for adequate SubQ depth</li>
          </ul>

          <div className="ch-footer">
            <span>The Peptide Protocol Playbook — Aura Protocols</span>
            <span>Chapter 2 · Reconstitution &amp; Storage</span>
            <span>shop.auraprotocols.com</span>
          </div>
        </div>

        {/* ════════════════════════════════════════
            CH 3 — COA MASTERCLASS
        ════════════════════════════════════════ */}
        <div className="chapter">
          <div className="ch-num">Chapter 3</div>
          <div className="ch-title">COA Masterclass: Reading the Data</div>
          <div className="ch-desc">How to interpret HPLC chromatograms, mass spec results, and purity numbers — not just what to look for.</div>

          <div className="h2">What a COA Actually Proves</div>
          <p>A Certificate of Analysis from a third-party lab makes two independent claims about a sample: (1) how pure it is, and (2) what it is. These are separate tests requiring separate methodologies. A COA that provides only one of the two is incomplete.</p>
          <div className="two-col">
            <div className="box" style={{margin: 0}}>
              <div className="box-title">HPLC — Answers: How Pure?</div>
              High-Performance Liquid Chromatography separates the components of a sample by molecular interaction with a stationary phase. The area under each peak represents a component's proportion by mass. The target peptide's peak area divided by total peak area = purity %.
            </div>
            <div className="box" style={{margin: 0}}>
              <div className="box-title">Mass Spectrometry — Answers: What Is It?</div>
              MS ionizes sample molecules and measures their mass-to-charge ratio (m/z). The resulting spectrum is compared against the theoretical molecular weight of the target peptide. A match confirms molecular identity; HPLC alone cannot.
            </div>
          </div>

          <div className="h2">Reading an HPLC Chromatogram</div>
          <p>The chromatogram is a graph with time on the x-axis and detector signal (UV absorbance at 214 nm for peptides) on the y-axis. Each peak represents a discrete compound eluting from the column.</p>
          <ul>
            <li><strong>Main peak:</strong> The tallest peak should correspond to the target peptide. Its retention time should match the reference standard for that compound.</li>
            <li><strong>Integration %:</strong> The number below the main peak is its % of total integrated area — this is the purity number. Anything ≥99% is pharmaceutical-grade; ≥98% is acceptable for most research applications.</li>
            <li><strong>Impurity peaks:</strong> Small peaks flanking the main peak are related peptide fragments or synthesis byproducts. A few small peaks at 0.1–0.3% are normal. Multiple peaks totaling &gt;2% is a quality flag.</li>
            <li><strong>Baseline noise:</strong> A flat, stable baseline indicates a clean sample and a well-maintained instrument. A noisy, irregular baseline suggests instrument issues or sample contamination — treat results from such runs with skepticism.</li>
          </ul>

          <div className="h2">Reading a Mass Spectrum</div>
          <ul>
            <li><strong>Molecular ion [M+H]+:</strong> The most common ionization in peptide MS. Add 1.008 (hydrogen) to the theoretical molecular weight to get the expected [M+H]+ m/z value.</li>
            <li><strong>Multiply charged ions:</strong> Larger peptides (MW &gt;2,000 Da) often appear as doubly or triply charged ions ([M+2H]2+, [M+3H]3+). Divide the observed m/z by the charge state to confirm the molecular weight.</li>
            <li><strong>Match tolerance:</strong> A match within ±0.5 Da of the theoretical value confirms identity. Deviations &gt;1 Da warrant scrutiny.</li>
            <li><strong>No spectrum = no confirmation:</strong> A COA with HPLC purity but no MS data confirms purity only — not that the purified material is actually the compound you ordered.</li>
          </ul>

          <div className="h2">Purity Numbers in Context</div>
          <table className="tbl">
            <thead><tr><th>Purity</th><th>Grade</th><th>Practical Meaning</th><th>Use</th></tr></thead>
            <tbody>
              <tr><td>≥99%</td><td>Pharmaceutical</td><td>Impurities &lt;1%; suitable for sensitive assays and in vivo models</td><td>All research applications</td></tr>
              <tr><td>98–99%</td><td>Research Grade</td><td>Standard quality; minor impurity fraction unlikely to affect most protocols</td><td>Acceptable for most research</td></tr>
              <tr><td>95–98%</td><td>Lower Grade</td><td>Up to 5% unknown impurities; variable batch-to-batch</td><td>Use with caution; not ideal</td></tr>
              <tr><td>&lt;95%</td><td>Substandard</td><td>Meaningful impurity burden; unknown compounds present</td><td>Do not use in research</td></tr>
            </tbody>
          </table>

          <div className="h2">Vendor Scorecard — 10-Point COA Evaluation</div>
          <table className="tbl">
            <thead><tr><th>#</th><th>Criterion</th><th>Pass</th><th>Fail</th></tr></thead>
            <tbody>
              <tr><td>1</td><td>Third-party lab (not in-house)</td><td>Independent lab letterhead</td><td>Vendor's own lab</td></tr>
              <tr><td>2</td><td>Lab ISO 17025 accreditation</td><td>Accreditation number listed</td><td>No accreditation mentioned</td></tr>
              <tr><td>3</td><td>Batch/lot number present</td><td>Specific lot tied to COA</td><td>Generic COA, no lot number</td></tr>
              <tr><td>4</td><td>Test date within 18 months</td><td>Dated, recent</td><td>Undated or &gt;18 months old</td></tr>
              <tr><td>5</td><td>HPLC purity ≥98%</td><td>98%+ reported with method</td><td>Below 98% or no method listed</td></tr>
              <tr><td>6</td><td>HPLC chromatogram included</td><td>Actual graph included</td><td>Number only, no graph</td></tr>
              <tr><td>7</td><td>Mass spectrometry identity confirmation</td><td>MS spectrum or m/z match</td><td>HPLC only</td></tr>
              <tr><td>8</td><td>Molecular weight matches theoretical</td><td>Within ±0.5 Da</td><td>Not stated or mismatch</td></tr>
              <tr><td>9</td><td>COA publicly posted (not on request only)</td><td>On product page</td><td>Email/request required</td></tr>
              <tr><td>10</td><td>Amino acid analysis or sequence confirmation</td><td>Included</td><td>Not included (minor flag only)</td></tr>
            </tbody>
          </table>
          <p style={{fontSize: 10, color: '#6b7280'}}>Score 9–10: high-confidence vendor. Score 7–8: acceptable with caution. Score below 7: do not source from this vendor.</p>

          <div className="ch-footer">
            <span>The Peptide Protocol Playbook — Aura Protocols</span>
            <span>Chapter 3 · COA Masterclass</span>
            <span>shop.auraprotocols.com</span>
          </div>
        </div>

        {/* ════════════════════════════════════════
            CH 4 — RECOVERY PROTOCOLS
        ════════════════════════════════════════ */}
        <div className="chapter">
          <div className="ch-num">Chapter 4</div>
          <div className="ch-title">Recovery Protocols</div>
          <div className="ch-desc">BPC-157, TB-500, and the combined recovery stack — protocols, cycles, and timing.</div>

          <div className="compound-header">
            <span className="compound-name">BPC-157 — Body Protection Compound-157</span>
            <span className="compound-cat">Recovery · Tissue Repair</span>
          </div>

          <div className="protocol-grid">
            <div className="protocol-card">
              <div className="protocol-card-title">Acute Injury Protocol</div>
              <p><span className="label">Dose: </span><span className="value">500 mcg/day</span></p>
              <p><span className="label">Frequency: </span><span className="value">Daily SubQ, near injury site</span></p>
              <p><span className="label">Cycle: </span><span className="value">4–6 weeks on; 2-week break; reassess</span></p>
              <p><span className="label">Reconstitution: </span><span className="value">5 mg + 2 mL BAC → 20 units/dose</span></p>
              <p><span className="label">Timing: </span><span className="value">Morning; split AM/PM if desired</span></p>
            </div>
            <div className="protocol-card">
              <div className="protocol-card-title">Gut Healing Protocol</div>
              <p><span className="label">Dose: </span><span className="value">250–500 mcg/day</span></p>
              <p><span className="label">Frequency: </span><span className="value">Daily oral (dissolved in water, fasted)</span></p>
              <p><span className="label">Cycle: </span><span className="value">6–12 weeks; stable for longer oral use</span></p>
              <p><span className="label">Reconstitution: </span><span className="value">5 mg + 2 mL sterile water; consume immediately</span></p>
              <p><span className="label">Timing: </span><span className="value">30 min before first meal</span></p>
            </div>
          </div>
          <ul style={{marginTop: 8}}>
            <li><strong>Storage:</strong> Lyophilized: room temp up to 12 months; reconstituted: refrigerated, use within 28 days</li>
            <li><strong>Red flags:</strong> No established toxicity in animal models; monitor for injection site irritation</li>
            <li><strong>Notes:</strong> SubQ injection near the injury site (not directly into the injury) is the standard preclinical model; systemic SubQ also produces effect via circulatory distribution</li>
          </ul>

          <div className="compound-header">
            <span className="compound-name">TB-500 — Thymosin Beta-4 Analogue</span>
            <span className="compound-cat">Recovery · Systemic Repair · Angiogenesis</span>
          </div>

          <div className="protocol-grid">
            <div className="protocol-card">
              <div className="protocol-card-title">Loading Phase (Weeks 1–6)</div>
              <p><span className="label">Dose: </span><span className="value">5–10 mg/week</span></p>
              <p><span className="label">Frequency: </span><span className="value">Split: 2.5–5 mg twice weekly</span></p>
              <p><span className="label">Reconstitution: </span><span className="value">10 mg + 2 mL BAC → 5 mg/mL; 5 mg = 100 units</span></p>
              <p><span className="label">Timing: </span><span className="value">Flexible; consistent days each week</span></p>
            </div>
            <div className="protocol-card">
              <div className="protocol-card-title">Maintenance Phase (Week 7+)</div>
              <p><span className="label">Dose: </span><span className="value">2–2.5 mg/week</span></p>
              <p><span className="label">Frequency: </span><span className="value">Once weekly</span></p>
              <p><span className="label">Reconstitution: </span><span className="value">Same vial; 2 mg = 40 units</span></p>
              <p><span className="label">Duration: </span><span className="value">Indefinite maintenance or 4-week break after 12 weeks</span></p>
            </div>
          </div>
          <ul style={{marginTop: 8}}>
            <li><strong>Key differentiator from BPC-157:</strong> TB-500 distributes systemically via bloodstream — suited for diffuse or multi-site injuries; BPC-157 works best for focal injury with local injection</li>
            <li><strong>Storage:</strong> Lyophilized: refrigerate; reconstituted: 28 days at 2–8°C</li>
            <li><strong>Red flags:</strong> Fatigue or lethargy at loading doses is occasionally reported; reduce to lower end of range</li>
          </ul>

          <div className="compound-header">
            <span className="compound-name">BPC-157 + TB-500 Combined Recovery Stack</span>
            <span className="compound-cat">Synergistic Stack · Non-Overlapping Mechanisms</span>
          </div>
          <p>These compounds act through non-overlapping mechanisms — BPC-157 via NO modulation and VEGF upregulation; TB-500 via actin polymerization and cell migration. Combining them addresses both local repair signaling and systemic tissue regeneration simultaneously.</p>
          <table className="tbl">
            <thead><tr><th>Compound</th><th>Dose</th><th>Frequency</th><th>Phase</th></tr></thead>
            <tbody>
              <tr><td>BPC-157</td><td>250–500 mcg</td><td>Daily SubQ</td><td>Weeks 1–8</td></tr>
              <tr><td>TB-500</td><td>5 mg (split 2×)</td><td>Twice weekly SubQ</td><td>Weeks 1–6 (loading)</td></tr>
              <tr><td>TB-500</td><td>2 mg</td><td>Once weekly SubQ</td><td>Weeks 7–12 (maintenance)</td></tr>
            </tbody>
          </table>
          <p>After week 8–12, BPC-157 can be discontinued while TB-500 maintenance continues, or both can be cycled off for 4 weeks before reassessment.</p>

          <div className="ch-footer">
            <span>The Peptide Protocol Playbook — Aura Protocols</span>
            <span>Chapter 4 · Recovery Protocols</span>
            <span>shop.auraprotocols.com</span>
          </div>
        </div>

        {/* ════════════════════════════════════════
            CH 5 — WEIGHT MANAGEMENT
        ════════════════════════════════════════ */}
        <div className="chapter">
          <div className="ch-num">Chapter 5</div>
          <div className="ch-title">Weight Management Protocols</div>
          <div className="ch-desc">Semaglutide titration schedules, Retatrutide initiation, and AOD-9604 fasted-state protocols.</div>

          <div className="compound-header">
            <span className="compound-name">Semaglutide <span style={{fontSize: 9, background: '#d1fae5', color: '#065f46', padding: '1px 4px', borderRadius: 2, marginLeft: 6}}>FDA APPROVED</span></span>
            <span className="compound-cat">GLP-1 Receptor Agonist · Weight Management</span>
          </div>
          <p>Semaglutide requires careful titration. Starting at the full studied dose causes severe nausea and GI distress — the gradual escalation schedule below mirrors the clinical trial protocols that produced STEP trial weight loss outcomes.</p>
          <table className="tbl">
            <thead><tr><th>Weeks</th><th>Dose</th><th>Syringe Units*</th><th>Purpose</th></tr></thead>
            <tbody>
              <tr><td>1–4</td><td>0.25 mg/week</td><td>10 units</td><td>GI tolerance establishment</td></tr>
              <tr><td>5–8</td><td>0.5 mg/week</td><td>20 units</td><td>Initial therapeutic effect</td></tr>
              <tr><td>9–12</td><td>1.0 mg/week</td><td>40 units</td><td>Meaningful weight loss range</td></tr>
              <tr><td>13–16</td><td>1.7 mg/week</td><td>68 units</td><td>Near-maximum studied dose</td></tr>
              <tr><td>17+</td><td>2.4 mg/week</td><td>96 units</td><td>Maximum studied dose (STEP trials)</td></tr>
            </tbody>
          </table>
          <p style={{fontSize: 10, color: '#6b7280'}}>*Based on 5 mg vial + 2 mL BAC water = 2,500 mcg/mL concentration</p>
          <ul>
            <li><strong>Timing:</strong> Same day each week; any time of day; does not require fasted state</li>
            <li><strong>Escalation:</strong> Only advance to the next dose tier if the current tier is well-tolerated for the full 4-week period</li>
            <li><strong>Common adverse effects:</strong> Nausea (most common at dose increases), constipation, delayed gastric emptying — typically resolves within 1–2 weeks of a new dose tier</li>
            <li><strong>Off-cycle:</strong> No defined off-cycle in clinical trials; weight regain documented on discontinuation — gradual taper preferred over abrupt stop</li>
            <li><strong>Storage:</strong> Reconstituted: refrigerate; do not freeze; discard after 28 days</li>
          </ul>

          <div className="compound-header">
            <span className="compound-name">Retatrutide</span>
            <span className="compound-cat">GLP-1R + GIPR + Glucagon Receptor Triple Agonist · Investigational</span>
          </div>
          <table className="tbl">
            <thead><tr><th>Weeks</th><th>Dose</th><th>Syringe Units*</th><th>Notes</th></tr></thead>
            <tbody>
              <tr><td>1–4</td><td>1 mg/week</td><td>40 units</td><td>Initiation; assess GI tolerance</td></tr>
              <tr><td>5–8</td><td>2 mg/week</td><td>80 units</td><td>First therapeutic tier</td></tr>
              <tr><td>9–16</td><td>4–8 mg/week</td><td>160–320 units†</td><td>Mid-range studied dose</td></tr>
              <tr><td>17+</td><td>Up to 12 mg/week</td><td>Per calculation</td><td>Maximum Phase II dose</td></tr>
            </tbody>
          </table>
          <p style={{fontSize: 10, color: '#6b7280'}}>*Based on 5 mg vial + 2 mL BAC water = 2,500 mcg/mL. †Doses above 100 units should be split across two sites.</p>
          <ul>
            <li><strong>GI profile:</strong> Similar to semaglutide; glucagon activity may produce additional nausea vs. GLP-1 only — conservative titration is more important here</li>
            <li><strong>Phase III status:</strong> As of 2026, Phase III trials ongoing; not yet FDA approved</li>
          </ul>

          <div className="compound-header">
            <span className="compound-name">AOD-9604 — hGH Fragment 176–191</span>
            <span className="compound-cat">GH-Derived Lipolytic · No IGF-1 Effect</span>
          </div>
          <div className="protocol-grid">
            <div className="protocol-card">
              <div className="protocol-card-title">Standard Protocol</div>
              <p><span className="label">Dose: </span><span className="value">250–300 mcg/day</span></p>
              <p><span className="label">Frequency: </span><span className="value">Daily SubQ, fasted AM</span></p>
              <p><span className="label">Timing: </span><span className="value">30–45 min before first meal or exercise</span></p>
              <p><span className="label">Reconstitution: </span><span className="value">5 mg + 2 mL BAC → 300 mcg = 12 units</span></p>
              <p><span className="label">Cycle: </span><span className="value">12 weeks on; 4–6 weeks off</span></p>
            </div>
            <div className="protocol-card">
              <div className="protocol-card-title">Key Mechanism Note</div>
              <p>AOD-9604 stimulates lipolysis via β3-adrenergic receptors — the same mechanism by which full hGH burns fat — without activating IGF-1 pathways or affecting blood glucose.</p>
              <p style={{marginTop: 6}}><strong>Critical:</strong> fasted-state administration is necessary for peak lipolytic effect. Insulin presence (post-meal) blunts β3-adrenergic activity.</p>
            </div>
          </div>

          <div className="ch-footer">
            <span>The Peptide Protocol Playbook — Aura Protocols</span>
            <span>Chapter 5 · Weight Management Protocols</span>
            <span>shop.auraprotocols.com</span>
          </div>
        </div>

        {/* ════════════════════════════════════════
            CH 6 — GROWTH & PERFORMANCE
        ════════════════════════════════════════ */}
        <div className="chapter">
          <div className="ch-num">Chapter 6</div>
          <div className="ch-title">Growth &amp; Performance Protocols</div>
          <div className="ch-desc">CJC-1295/Ipamorelin stack, Sermorelin, and Tesamorelin — GH axis protocols and cycling rationale.</div>

          <div className="compound-header">
            <span className="compound-name">CJC-1295 (with DAC) + Ipamorelin — GH Optimization Stack</span>
            <span className="compound-cat">GHRH Analogue + GHSR Agonist · Dual-Axis GH Stimulation</span>
          </div>
          <p>CJC-1295 and Ipamorelin are designed to be used together. They bind different receptor types within the GH axis — GHRH receptors and ghrelin receptors respectively — producing synergistic GH pulse amplification neither compound achieves alone.</p>
          <table className="tbl">
            <thead><tr><th>Compound</th><th>Dose</th><th>Frequency</th><th>Timing</th><th>Units*</th></tr></thead>
            <tbody>
              <tr><td>CJC-1295 (DAC)</td><td>1–2 mg/week</td><td>1–2× per week</td><td>Any time; consistent day</td><td>50–100 units</td></tr>
              <tr><td>Ipamorelin</td><td>200–300 mcg/dose</td><td>2–3× daily</td><td>Fasted; pre-sleep dose most valuable</td><td>20–30 units</td></tr>
            </tbody>
          </table>
          <p style={{fontSize: 10, color: '#6b7280'}}>*CJC-1295: 2 mg + 1 mL BAC = 2,000 mcg/mL. Ipamorelin: 2 mg + 2 mL BAC = 1,000 mcg/mL.</p>

          <div className="two-col" style={{marginTop: 8}}>
            <div>
              <div className="h3">Cycle Protocol</div>
              <ul>
                <li><strong>On-period:</strong> 3–6 months continuous</li>
                <li><strong>Off-period:</strong> 4–8 weeks (prevents GHRH-R downregulation)</li>
                <li><strong>Rationale:</strong> Sustained GHRH-R stimulation reduces pituitary sensitivity over time; cycling preserves responsiveness</li>
                <li><strong>After break:</strong> Return to same dose; sensitivity typically restores fully within the off-period</li>
              </ul>
            </div>
            <div>
              <div className="h3">Timing Optimization</div>
              <ul>
                <li>GH is primarily secreted during slow-wave (deep) sleep — the pre-sleep Ipamorelin dose amplifies the natural nocturnal GH pulse</li>
                <li>Fasted state is required: insulin suppresses GH secretion; administer ≥2 hours post-meal</li>
                <li>CJC-1295 DAC timing is flexible due to its 6–8 day half-life; weekends work well for weekly injection</li>
                <li>Post-workout Ipamorelin dose capitalizes on exercise-induced GH sensitivity</li>
              </ul>
            </div>
          </div>

          <div className="compound-header">
            <span className="compound-name">Sermorelin</span>
            <span className="compound-cat">GHRH Analogue (1–29) · Age-Related GH Decline</span>
          </div>
          <div className="protocol-grid">
            <div className="protocol-card">
              <div className="protocol-card-title">Standard Protocol</div>
              <p><span className="label">Dose: </span><span className="value">200–500 mcg/day</span></p>
              <p><span className="label">Frequency: </span><span className="value">Daily, before sleep</span></p>
              <p><span className="label">Reconstitution: </span><span className="value">3 mg + 3 mL BAC = 1,000 mcg/mL; 300 mcg = 30 units</span></p>
              <p><span className="label">Cycle: </span><span className="value">3–6 months on; 1–2 months off</span></p>
            </div>
            <div className="protocol-card">
              <div className="protocol-card-title">vs. CJC-1295</div>
              <p>Sermorelin has a ~10–20 min half-life vs. CJC-1295's 6–8 days. This means daily dosing is required but the GH pulse is more physiological — a single, sharp, natural-pattern pulse rather than sustained elevation.</p>
              <p style={{marginTop: 6}}>Best suited for subjects with documented age-related GH decline where pattern preservation is prioritized over pulse amplitude.</p>
            </div>
          </div>

          <div className="compound-header">
            <span className="compound-name">Tesamorelin <span style={{fontSize: 9, background: '#d1fae5', color: '#065f46', padding: '1px 4px', borderRadius: 2, marginLeft: 6}}>FDA APPROVED — EGRIFTA</span></span>
            <span className="compound-cat">Stabilized GHRH 1–44 · Visceral Fat Reduction</span>
          </div>
          <div className="protocol-grid">
            <div className="protocol-card">
              <div className="protocol-card-title">Approved Protocol (Egrifta)</div>
              <p><span className="label">Dose: </span><span className="value">2 mg/day</span></p>
              <p><span className="label">Frequency: </span><span className="value">Daily SubQ, abdomen</span></p>
              <p><span className="label">Reconstitution: </span><span className="value">2 mg + 2 mL BAC = 1 mg/mL; 2 mg = 200 units (split 2 sites)</span></p>
              <p><span className="label">Cycle: </span><span className="value">26-week trials; re-evaluate at 26 weeks</span></p>
            </div>
            <div className="protocol-card">
              <div className="protocol-card-title">Research Context</div>
              <p>Tesamorelin is the only GHRH analogue with FDA approval and large RCT data demonstrating visceral adipose tissue (VAT) reduction in humans — an average 18% reduction vs. placebo in HIV lipodystrophy trials.</p>
              <p style={{marginTop: 6}}>The VAT reduction mechanism is directly applicable to research in non-HIV populations with visceral adiposity.</p>
            </div>
          </div>

          <div className="box box-warn" style={{marginTop: 12}}>
            <div className="box-title">GH Secretagogue Selection Guide</div>
            <ul>
              <li><strong>Maximum GH pulse amplitude:</strong> CJC-1295 + Ipamorelin (dual-axis, synergistic)</li>
              <li><strong>Most physiological GH pattern:</strong> Sermorelin (short half-life, natural single-pulse)</li>
              <li><strong>Visceral fat target with RCT evidence:</strong> Tesamorelin (only FDA-approved GHRH analogue)</li>
              <li><strong>Do not combine multiple GHRH analogues:</strong> CJC-1295 + Sermorelin + Tesamorelin are redundant — they all compete for GHRH-R binding with no additive benefit and potential for receptor saturation</li>
            </ul>
          </div>

          <div className="ch-footer">
            <span>The Peptide Protocol Playbook — Aura Protocols</span>
            <span>Chapter 6 · Growth &amp; Performance Protocols</span>
            <span>shop.auraprotocols.com</span>
          </div>
        </div>

        {/* ════════════════════════════════════════
            CH 7 — WELLNESS & LONGEVITY
        ════════════════════════════════════════ */}
        <div className="chapter">
          <div className="ch-num">Chapter 7</div>
          <div className="ch-title">Wellness &amp; Longevity Protocols</div>
          <div className="ch-desc">PT-141 as-needed protocol, Epithalon cycling, and MOTS-c metabolic dosing.</div>

          <div className="compound-header">
            <span className="compound-name">PT-141 (Bremelanotide) <span style={{fontSize: 9, background: '#d1fae5', color: '#065f46', padding: '1px 4px', borderRadius: 2, marginLeft: 6}}>FDA APPROVED — VYLEESI</span></span>
            <span className="compound-cat">MC3R / MC4R Agonist · Central Arousal Pathway</span>
          </div>
          <p>PT-141 is used as-needed, not on a daily or weekly schedule. This is consistent with its mechanism — it initiates a neurological arousal cascade that does not require baseline saturation to be effective.</p>
          <div className="protocol-grid">
            <div className="protocol-card">
              <div className="protocol-card-title">As-Needed Protocol</div>
              <p><span className="label">Dose: </span><span className="value">0.5–2 mg/dose</span></p>
              <p><span className="label">Timing: </span><span className="value">1–4 hours before activity</span></p>
              <p><span className="label">Reconstitution: </span><span className="value">10 mg + 2 mL BAC = 5 mg/mL; 1 mg = 20 units</span></p>
              <p><span className="label">Maximum frequency: </span><span className="value">2–3× per week to limit melanocortin receptor desensitization</span></p>
            </div>
            <div className="protocol-card">
              <div className="protocol-card-title">Dose Titration</div>
              <p><strong>Start at 0.5 mg</strong> to assess nausea response. Nausea is the most common adverse effect (40% in RECONNECT trials) and is dose-dependent — most subjects tolerate 0.5–1 mg well.</p>
              <p style={{marginTop: 6}}>Flushing and transient blood pressure elevation are observed at higher doses. Blood pressure normalization occurs within 12 hours in trial subjects.</p>
            </div>
          </div>
          <ul style={{marginTop: 8}}>
            <li><strong>No formal cycling required:</strong> As-needed use avoids the desensitization risk associated with daily dosing</li>
            <li><strong>Storage:</strong> Reconstituted: refrigerate; use within 28 days; protect from light (amber vial preferred)</li>
            <li><strong>Mechanism reminder:</strong> PT-141 works centrally — it initiates desire neurologically, not through vascular mechanisms; onset is 45–60 min in clinical studies</li>
          </ul>

          <div className="compound-header">
            <span className="compound-name">Epithalon (Epitalon)</span>
            <span className="compound-cat">Synthetic Tetrapeptide · Telomerase Activation · Pineal Support</span>
          </div>
          <p>Epithalon is one of the few peptides with a defined intensive course protocol rather than continuous daily dosing. The Russian research basis (30+ years, St. Petersburg Institute) uses cyclical intensive courses.</p>
          <div className="protocol-grid">
            <div className="protocol-card">
              <div className="protocol-card-title">Standard Cycle Protocol</div>
              <p><span className="label">Dose: </span><span className="value">5–10 mg/day</span></p>
              <p><span className="label">Frequency: </span><span className="value">Daily SubQ or IV</span></p>
              <p><span className="label">Course length: </span><span className="value">10–20 consecutive days</span></p>
              <p><span className="label">Frequency per year: </span><span className="value">1–2 courses (spring + fall)</span></p>
              <p><span className="label">Reconstitution: </span><span className="value">10 mg + 2 mL BAC = 5 mg/mL; 5 mg = 100 units</span></p>
            </div>
            <div className="protocol-card">
              <div className="protocol-card-title">Timing Note</div>
              <p>Administer before sleep. Epithalon stimulates pineal gland melatonin production — evening dosing aligns with the circadian timing of natural melatonin secretion and is consistent with the Russian research protocols.</p>
              <p style={{marginTop: 6}}>The intensive course model (high dose for short period) is thought to produce lasting epigenetic effects beyond the administration window — the rationale for 2× annual rather than continuous dosing.</p>
            </div>
          </div>

          <div className="compound-header">
            <span className="compound-name">MOTS-c</span>
            <span className="compound-cat">Mitochondria-Derived Peptide · AMPK Activation · Metabolic Regulation</span>
          </div>
          <div className="protocol-grid">
            <div className="protocol-card">
              <div className="protocol-card-title">Research Protocol</div>
              <p><span className="label">Dose: </span><span className="value">5–10 mg/week</span></p>
              <p><span className="label">Frequency: </span><span className="value">Weekly SubQ</span></p>
              <p><span className="label">Timing: </span><span className="value">Pre-exercise on training days (AMPK pathway activated by exercise)</span></p>
              <p><span className="label">Reconstitution: </span><span className="value">10 mg + 2 mL BAC = 5 mg/mL; 5 mg = 100 units</span></p>
              <p><span className="label">Cycle: </span><span className="value">12 weeks on; 4 weeks off</span></p>
            </div>
            <div className="protocol-card">
              <div className="protocol-card-title">Research Context</div>
              <p>MOTS-c is produced endogenously in mitochondria and circulates as a systemic hormone. Levels decline with age and metabolic disease. Research in rodent models demonstrates improved glucose tolerance, reduced fat accumulation, and enhanced exercise capacity.</p>
              <p style={{marginTop: 6}}>Human trials are emerging as of 2026. This is among the newest compounds on this list — human protocols are extrapolated from preclinical data.</p>
            </div>
          </div>

          <div className="ch-footer">
            <span>The Peptide Protocol Playbook — Aura Protocols</span>
            <span>Chapter 7 · Wellness &amp; Longevity Protocols</span>
            <span>shop.auraprotocols.com</span>
          </div>
        </div>

        {/* ════════════════════════════════════════
            CH 8 — STACKING & CYCLING
        ════════════════════════════════════════ */}
        <div className="chapter">
          <div className="ch-num">Chapter 8</div>
          <div className="ch-title">Stacking &amp; Cycling Master Guide</div>
          <div className="ch-desc">Combination compatibility matrix, receptor desensitization logic, and four goal-based protocol templates.</div>

          <div className="h2">Receptor Desensitization: Why Cycling Matters</div>
          <p>Receptor desensitization occurs when sustained agonist exposure causes receptors to internalize or reduce in number, diminishing the compound's effect over time. Not all peptides carry equal desensitization risk.</p>
          <table className="tbl">
            <thead><tr><th>Receptor / Pathway</th><th>Compounds</th><th>Desensitization Risk</th><th>Cycling Recommendation</th></tr></thead>
            <tbody>
              <tr><td>GHRH-R (pituitary)</td><td>CJC-1295, Sermorelin, Tesamorelin</td><td>Moderate — sustained stimulation reduces pituitary sensitivity</td><td>3–6 months on; 4–8 weeks off</td></tr>
              <tr><td>GHSR (ghrelin)</td><td>Ipamorelin</td><td>Low — selective agonist; lower desensitization than GHRP-2/6</td><td>Can run longer; still recommend breaks</td></tr>
              <tr><td>GLP-1R</td><td>Semaglutide, Retatrutide</td><td>Low at therapeutic doses — clinical trials show sustained efficacy at 2 years</td><td>No formal off-cycle; taper preferred over abrupt stop</td></tr>
              <tr><td>MC3R / MC4R</td><td>PT-141</td><td>Low with as-needed use; moderate with daily dosing</td><td>As-needed use avoids cycling need; avoid daily dosing</td></tr>
              <tr><td>Tissue receptors</td><td>BPC-157, TB-500, AOD-9604</td><td>Low — no documented receptor saturation in preclinical models</td><td>Cycle for practical reasons (tissue response plateau) not receptor risk</td></tr>
            </tbody>
          </table>

          <div className="h2">Stacking Compatibility Matrix</div>
          <table className="matrix">
            <thead>
              <tr>
                <th>+</th><th>BPC-157</th><th>TB-500</th><th>Sema</th><th>Retrat</th><th>AOD</th><th>CJC/Ipa</th><th>Serm</th><th>Tesa</th><th>PT-141</th><th>Epi</th><th>MOTS-c</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>BPC-157</td><td className="na">—</td><td className="safe">SAFE</td><td className="safe">SAFE</td><td className="safe">SAFE</td><td className="safe">SAFE</td><td className="safe">SAFE</td><td className="safe">SAFE</td><td className="safe">SAFE</td><td className="safe">SAFE</td><td className="safe">SAFE</td><td className="safe">SAFE</td></tr>
              <tr><td>TB-500</td><td className="safe">SAFE</td><td className="na">—</td><td className="safe">SAFE</td><td className="safe">SAFE</td><td className="safe">SAFE</td><td className="safe">SAFE</td><td className="safe">SAFE</td><td className="safe">SAFE</td><td className="safe">SAFE</td><td className="safe">SAFE</td><td className="safe">SAFE</td></tr>
              <tr><td>Sema</td><td className="safe">SAFE</td><td className="safe">SAFE</td><td className="na">—</td><td className="avoid">AVOID</td><td className="caution">CAUTION</td><td className="safe">SAFE</td><td className="safe">SAFE</td><td className="safe">SAFE</td><td className="safe">SAFE</td><td className="safe">SAFE</td><td className="safe">SAFE</td></tr>
              <tr><td>CJC/Ipa</td><td className="safe">SAFE</td><td className="safe">SAFE</td><td className="safe">SAFE</td><td className="safe">SAFE</td><td className="safe">SAFE</td><td className="na">—</td><td className="avoid">AVOID</td><td className="avoid">AVOID</td><td className="safe">SAFE</td><td className="safe">SAFE</td><td className="safe">SAFE</td></tr>
            </tbody>
          </table>
          <p style={{fontSize: 9, color: '#6b7280', marginBottom: 8}}>AVOID = redundant mechanism or clinically contraindicated. CAUTION = overlapping pathway; use reduced doses and monitor. SAFE = non-overlapping mechanisms, no documented conflict. Matrix is not exhaustive — combinations not listed require individual assessment.</p>

          <div className="h2">Four Goal-Based Protocol Templates</div>

          <div className="two-col">
            <div className="protocol-card">
              <div className="protocol-card-title" style={{background: '#065f46', color: '#fff', margin: '-10px -12px 8px', padding: '5px 12px', borderRadius: '3px 3px 0 0'}}>Template 1 · Acute Injury Recovery</div>
              <p><strong>BPC-157:</strong> 500 mcg/day SubQ (near injury site) · Weeks 1–6</p>
              <p><strong>TB-500:</strong> 5 mg 2×/week SubQ · Weeks 1–4; then 2 mg/week · Weeks 5–8</p>
              <p style={{marginTop: 6, fontSize: 10, color: '#6b7280'}}>Total duration: 8 weeks. Reassess at week 4 and week 8. Continue TB-500 maintenance if recovery incomplete.</p>
            </div>
            <div className="protocol-card">
              <div className="protocol-card-title" style={{background: '#9f1239', color: '#fff', margin: '-10px -12px 8px', padding: '5px 12px', borderRadius: '3px 3px 0 0'}}>Template 2 · Body Recomposition</div>
              <p><strong>Semaglutide:</strong> Titrate 0.25 mg → 1 mg/week SubQ over 12 weeks</p>
              <p><strong>CJC-1295:</strong> 1 mg/week SubQ (consistent day)</p>
              <p><strong>Ipamorelin:</strong> 200 mcg 2×/day SubQ (AM fasted + pre-sleep)</p>
              <p style={{marginTop: 6, fontSize: 10, color: '#6b7280'}}>Mechanism split: GLP-1 controls appetite + insulin; GH axis drives lipolysis + muscle preservation.</p>
            </div>
            <div className="protocol-card">
              <div className="protocol-card-title" style={{background: '#4c1d95', color: '#fff', margin: '-10px -12px 8px', padding: '5px 12px', borderRadius: '3px 3px 0 0'}}>Template 3 · GH Optimization</div>
              <p><strong>CJC-1295 (DAC):</strong> 2 mg/week SubQ</p>
              <p><strong>Ipamorelin:</strong> 300 mcg 3×/day SubQ (fasted · post-workout · pre-sleep)</p>
              <p style={{marginTop: 4}}><strong>Cycle:</strong> 5 months on → 6-week off → repeat</p>
              <p style={{marginTop: 6, fontSize: 10, color: '#6b7280'}}>Target outcomes: lean mass, visceral fat reduction, sleep quality, recovery speed.</p>
            </div>
            <div className="protocol-card">
              <div className="protocol-card-title" style={{background: '#0e7490', color: '#fff', margin: '-10px -12px 8px', padding: '5px 12px', borderRadius: '3px 3px 0 0'}}>Template 4 · Longevity &amp; Wellness</div>
              <p><strong>Epithalon:</strong> 10 mg/day SubQ · 14-day course · 2× per year</p>
              <p><strong>MOTS-c:</strong> 5 mg/week SubQ · 12 weeks on / 4 weeks off</p>
              <p><strong>BPC-157:</strong> 250 mcg/day SubQ · ongoing baseline support</p>
              <p style={{marginTop: 6, fontSize: 10, color: '#6b7280'}}>Stagger Epithalon courses (spring/fall); MOTS-c and BPC-157 run on independent schedules.</p>
            </div>
          </div>

          <div className="ch-footer">
            <span>The Peptide Protocol Playbook — Aura Protocols</span>
            <span>Chapter 8 · Stacking &amp; Cycling</span>
            <span>shop.auraprotocols.com</span>
          </div>
        </div>

        {/* ════════════════════════════════════════
            APPENDIX
        ════════════════════════════════════════ */}
        <div className="chapter">
          <div className="ch-num">Appendix</div>
          <div className="ch-title">Dosing Tables &amp; Unit Conversions</div>
          <div className="ch-desc">Reconstitution calculator, unit conversion reference, and compound shelf life table.</div>

          <div className="h2">Reconstitution Calculator — Variable BAC Water Volumes</div>
          <p>Use this table when your vial size differs from the standard reconstitution. Find your vial size and desired concentration, then read off the BAC water volume needed.</p>
          <table className="tbl">
            <thead><tr><th>Vial Size</th><th>BAC Water</th><th>Resulting Concentration</th><th>250 mcg dose</th><th>500 mcg dose</th><th>1 mg dose</th><th>2 mg dose</th></tr></thead>
            <tbody>
              <tr><td>2 mg</td><td>1 mL</td><td>2,000 mcg/mL</td><td>12.5 units</td><td>25 units</td><td>50 units</td><td>100 units</td></tr>
              <tr><td>2 mg</td><td>2 mL</td><td>1,000 mcg/mL</td><td>25 units</td><td>50 units</td><td>100 units</td><td>200 units*</td></tr>
              <tr><td>5 mg</td><td>1 mL</td><td>5,000 mcg/mL</td><td>5 units</td><td>10 units</td><td>20 units</td><td>40 units</td></tr>
              <tr><td>5 mg</td><td>2 mL</td><td>2,500 mcg/mL</td><td>10 units</td><td>20 units</td><td>40 units</td><td>80 units</td></tr>
              <tr><td>10 mg</td><td>2 mL</td><td>5,000 mcg/mL</td><td>5 units</td><td>10 units</td><td>20 units</td><td>40 units</td></tr>
              <tr><td>10 mg</td><td>4 mL</td><td>2,500 mcg/mL</td><td>10 units</td><td>20 units</td><td>40 units</td><td>80 units</td></tr>
            </tbody>
          </table>
          <p style={{fontSize: 9, color: '#6b7280'}}>* Doses above 100 units (1 mL) should be split across two injection sites. All unit values reference U-100 syringe markings (100 units = 1 mL).</p>

          <div className="h2">Unit Conversion Reference</div>
          <div className="two-col">
            <div>
              <table className="tbl">
                <thead><tr><th>From</th><th>To</th><th>Multiply By</th></tr></thead>
                <tbody>
                  <tr><td>mg</td><td>mcg</td><td>× 1,000</td></tr>
                  <tr><td>mcg</td><td>mg</td><td>÷ 1,000</td></tr>
                  <tr><td>mL</td><td>Units (U-100)</td><td>× 100</td></tr>
                  <tr><td>Units (U-100)</td><td>mL</td><td>÷ 100</td></tr>
                  <tr><td>mcg/mL</td><td>mg/mL</td><td>÷ 1,000</td></tr>
                </tbody>
              </table>
            </div>
            <div>
              <div className="box" style={{margin: 0}}>
                <div className="box-title">Quick Dose Check Formula</div>
                <p style={{fontSize: 10, marginBottom: 4}}><strong>Units = (Dose in mcg ÷ Concentration in mcg/mL) × 100</strong></p>
                <p style={{fontSize: 10, margin: 0}}>Example: 300 mcg from 2,500 mcg/mL solution<br/>
                = (300 ÷ 2,500) × 100 = <strong>12 units</strong></p>
              </div>
            </div>
          </div>

          <div className="h2">Compound Shelf Life Reference</div>
          <table className="tbl">
            <thead><tr><th>Compound</th><th>Lyophilized (Room Temp)</th><th>Lyophilized (Refrigerated)</th><th>Reconstituted (Refrigerated)</th><th>Notes</th></tr></thead>
            <tbody>
              <tr><td>BPC-157</td><td>12 months</td><td>24 months</td><td>28 days</td><td>Stable in BAC water; oral solution use same day</td></tr>
              <tr><td>TB-500</td><td>12 months</td><td>24 months</td><td>28 days</td><td>—</td></tr>
              <tr><td>Semaglutide</td><td>12 months</td><td>24 months</td><td>28 days</td><td>Protect from light</td></tr>
              <tr><td>Retatrutide</td><td>12 months</td><td>24 months</td><td>28 days</td><td>—</td></tr>
              <tr><td>AOD-9604</td><td>12 months</td><td>24 months</td><td>28 days</td><td>—</td></tr>
              <tr><td>CJC-1295 (DAC)</td><td>12 months</td><td>24 months</td><td>28 days</td><td>DAC modification improves stability</td></tr>
              <tr><td>Ipamorelin</td><td>12 months</td><td>24 months</td><td>28 days</td><td>—</td></tr>
              <tr><td>Sermorelin</td><td>6–12 months</td><td>18 months</td><td>14–21 days</td><td>Shorter shelf life vs. DAC-modified peptides</td></tr>
              <tr><td>Tesamorelin</td><td>24 months</td><td>24 months</td><td>24 hours (sterile water) or 28 days (BAC)</td><td>Egrifta uses provided diluent; research-grade use BAC water</td></tr>
              <tr><td>PT-141</td><td>12 months</td><td>24 months</td><td>28 days</td><td>Amber vial recommended</td></tr>
              <tr><td>Epithalon</td><td>12 months</td><td>24 months</td><td>28 days</td><td>—</td></tr>
              <tr><td>MOTS-c</td><td>12 months</td><td>24 months</td><td>28 days</td><td>Newer compound; err toward shorter reconstituted use window</td></tr>
            </tbody>
          </table>

          <div className="box box-warn" style={{marginTop: 12}}>
            <div className="box-title">Final Reminder</div>
            All information in this playbook is research-oriented and provided for educational purposes only. It does not constitute medical advice. All compounds referenced are for laboratory and research use; they are not approved drugs outside of specific FDA-approved formulations noted in the text. Any application in humans requires oversight by a qualified physician. © 2026 Aura Protocols LLC · shop.auraprotocols.com
          </div>

          <div className="ch-footer">
            <span>The Peptide Protocol Playbook — Aura Protocols</span>
            <span>Appendix · Dosing Tables &amp; Conversions</span>
            <span>shop.auraprotocols.com</span>
          </div>
        </div>

      </div>
    </>
  );
}
