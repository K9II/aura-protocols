export type LeadMagnetGoal =
  | "Maintaining Muscle During GLP-1"
  | "Weight Loss"
  | "Muscle & Performance"
  | "Sleep & Recovery";

type Template = { subject: string; html: string };

export const LEAD_MAGNET_TEMPLATES: Record<LeadMagnetGoal, Template> = {
  "Maintaining Muscle During GLP-1": {
    subject: "The 2-compound stack for keeping muscle on GLP-1",
    html: `<html><body><p>Hey — you told us your #1 goal is maintaining muscle while on a GLP-1. Here's a research-backed starting point.</p>

<p>GLP-1s (Semaglutide, Tirzepatide, Retatrutide) don't distinguish between fat and lean tissue — a real share of the weight lost on these drugs is muscle. The two compounds below are studied for counteracting that specific effect, on top of whatever GLP-1 you're already taking:</p>

<ul>
<li style="margin-bottom: 14px;"><b>CJC-1295 / Ipamorelin</b> — 1–2 mg/week (CJC-1295) + 100–300 mcg/dose 2–3x/day fasted (Ipamorelin), both SubQ. A GHRH analog + GH secretagogue pair studied for GH pulse amplification — the mechanism behind preserving lean mass during a caloric deficit.</li>
<li><b>IGF-1 LR3</b> — 20–50 mcg/day, SubQ/IM, post-training. Long-acting IGF-1 analog studied for muscle protein synthesis — the downstream signal GH pulses are trying to trigger.</li>
</ul>

<p><a href="https://auraprotocols.com/products/cjc-1295-ipamorelin">See CJC-1295/Ipamorelin sourcing</a> &middot; <a href="https://auraprotocols.com/products/igf-1-lr3">See IGF-1 LR3 sourcing</a></p>

<p><b>Make it personal:</b> connect your Whoop, Oura, or Apple Health and the Aura Engine tunes timing and dosing to your actual recovery and sleep data — not a generic protocol.</p>

<p><i>These compounds are for research use only and have not been evaluated by the FDA for the uses described above. Nothing here is medical advice — consult a physician before starting any new compound, especially alongside a prescription medication.</i></p></body></html>`,
  },
  "Weight Loss": {
    subject: "Your weight-loss starting protocol — 3 compounds, real doses",
    html: `<html><body><p>Here's the research-backed starting point for your #1 goal: weight loss.</p>

<ul>
<li style="margin-bottom: 14px;"><b>Semaglutide</b> — 0.25 mg → 2.4 mg, weekly, SubQ. GLP-1 receptor agonist studied for appetite regulation and blood-sugar control (FDA-approved compound, studied in the STEP trials).</li>
<li style="margin-bottom: 14px;"><b>Retatrutide</b> — 1 mg → up to 12 mg, weekly, SubQ. Triple GLP-1/GIP/glucagon agonist — Phase 3 data recorded up to 24.2% body-weight reduction, the highest of any compound in its class.</li>
<li><b>AOD-9604</b> — 250–300 mcg/day, SubQ, fasted AM. hGH fragment studied specifically for fat metabolism, without the blood-sugar or IGF-1 effects of full-length GH peptides.</li>
</ul>

<p><a href="https://auraprotocols.com/products/semaglutide">See Semaglutide sourcing</a> &middot; <a href="https://auraprotocols.com/products/retatrutide">See Retatrutide sourcing</a> &middot; <a href="https://auraprotocols.com/products/aod-9604">See AOD-9604 sourcing</a></p>

<p><b>Make it personal:</b> connect a wearable and the Aura Engine tunes this to your actual recovery and metabolic data.</p>

<p><i>These compounds are for research use only and have not been evaluated by the FDA for the uses described above. Nothing here is medical advice — consult a physician before starting any new compound, especially alongside a prescription medication.</i></p></body></html>`,
  },
  "Muscle & Performance": {
    subject: "Your muscle & performance starting protocol",
    html: `<html><body><p>Here's the research-backed starting point for your #1 goal: muscle and performance.</p>

<ul>
<li style="margin-bottom: 14px;"><b>CJC-1295 / Ipamorelin</b> — 1–2 mg/week + 100–300 mcg/dose 2–3x/day fasted, SubQ. The most-studied GH-axis pairing for lean-mass and recovery research.</li>
<li style="margin-bottom: 14px;"><b>Tesamorelin</b> — 1–2 mg/day, SubQ. GHRH analog (FDA-approved as Egrifta) studied for visceral-fat reduction and body composition alongside GH stimulation.</li>
<li><b>IGF-1 LR3</b> — 20–50 mcg/day, SubQ/IM, post-training. Extended-half-life IGF-1 analog studied for muscle protein synthesis.</li>
</ul>

<p><a href="https://auraprotocols.com/products/cjc-1295-ipamorelin">See CJC-1295/Ipamorelin sourcing</a> &middot; <a href="https://auraprotocols.com/products/tesamorelin">See Tesamorelin sourcing</a> &middot; <a href="https://auraprotocols.com/products/igf-1-lr3">See IGF-1 LR3 sourcing</a></p>

<p><b>Make it personal:</b> connect your Whoop, Oura, or Apple Health and the Aura Engine tunes dosing and timing to your training load and recovery data.</p>

<p><i>These compounds are for research use only and have not been evaluated by the FDA for the uses described above. Nothing here is medical advice — consult a physician before starting any new compound, especially alongside a prescription medication.</i></p></body></html>`,
  },
  "Sleep & Recovery": {
    subject: "Your sleep & recovery starting protocol",
    html: `<html><body><p>Here's the research-backed starting point for your #1 goal: sleep and recovery.</p>

<ul>
<li style="margin-bottom: 14px;"><b>DSIP (Delta Sleep-Inducing Peptide)</b> — 100–300 mcg/dose, SubQ, nightly before bed. Studied since the 1970s for slow-wave sleep promotion — the most sleep-specific compound in this protocol.</li>
<li style="margin-bottom: 14px;"><b>BPC-157</b> — 250–500 mcg/day, SubQ/oral. One of the most-studied peptides for tissue repair and recovery between training sessions.</li>
<li><b>Epithalon</b> — 5–10 mg/day, SubQ/IV, in 10–20 day cycles (1–2x/year). Studied for pineal gland regulation and melatonin output.</li>
</ul>

<p><a href="https://auraprotocols.com/products/dsip">See DSIP sourcing</a> &middot; <a href="https://auraprotocols.com/products/bpc-157">See BPC-157 sourcing</a> &middot; <a href="https://auraprotocols.com/products/epithalon">See Epithalon sourcing</a></p>

<p><b>Make it personal:</b> connect your Whoop, Oura, or Apple Health and the Aura Engine tunes this to your actual sleep and recovery data.</p>

<p><i>These compounds are for research use only and have not been evaluated by the FDA for the uses described above. Nothing here is medical advice — consult a physician before starting any new compound, especially alongside a prescription medication.</i></p></body></html>`,
  },
};

const UNSUBSCRIBE_BASE = "https://auraprotocols.com/api/unsubscribe";

function unsubscribeFooter(recipientEmail: string): string {
  const url = `${UNSUBSCRIBE_BASE}?email=${encodeURIComponent(recipientEmail)}`;
  return `<hr style="margin-top:32px;border:none;border-top:1px solid #dddddd;">
<p style="font-size:12px;color:#888888;">You're receiving this because you requested a starting protocol at <a href="https://auraprotocols.com">auraprotocols.com</a>. <a href="${url}">Unsubscribe with one click</a>.</p>`;
}

// Every send must carry a working unsubscribe link (CAN-SPAM + SES deliverability),
// so the recipient email is required — you cannot render a sendable email without it.
export function getLeadMagnetTemplate(
  goal: LeadMagnetGoal,
  recipientEmail: string
): Template {
  const base = LEAD_MAGNET_TEMPLATES[goal];
  return {
    subject: base.subject,
    html: base.html.replace(
      "</body></html>",
      `${unsubscribeFooter(recipientEmail)}</body></html>`
    ),
  };
}
