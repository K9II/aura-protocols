// src/lib/coa/read.ts — reads a certificate PDF with Claude (spec 2026-10-12-coa-autofill-design.md).
// Server only. Never throws: the form falls back to typing by hand. A missing
// or rejected key, or an account out of credit, alerts the owner (stable title — the dedupe key).
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { alertOwner } from "@/lib/notify";
import { hasOpenAlert } from "@/lib/today/alerts";
import { parseReading, READING_JSON_SCHEMA } from "@/lib/coa/reading-schema";
import type { Reading } from "@/lib/coa/reading";

export const COA_READER_MODEL = "claude-opus-5";   // accuracy first; the owner may pick a cheaper model later
const ALERT = "Certificate reader unavailable";
const OUT_OF_CREDIT = /credit|billing|spend limit|usage limit/i;

const PROMPT = `This PDF is a laboratory certificate of analysis for a research peptide vial.
Fill the JSON fields with what is printed on it. Use null for anything not printed — never guess.
- lab_name, lab_city: the testing laboratory (not the client or the manufacturer). City as "City, ST".
- report_number: the lab's report, sample or certificate number as printed.
- verify_code: only a separate code printed for online verification (for example the certificate ID beside a QR code, or an access code under it). Null when verification uses the report number.
- tested_on: the analysis or report date, as YYYY-MM-DD.
- purity_pct: the purity percentage as a number (99.47 for 99.47%).
- method: "HPLC+MS" when the purity/identity used HPLC with mass spectrometry (LC-MS), "HPLC" for HPLC alone.
- measured_mg: the measured quantity per vial in mg.
- identity, endotoxin, sterility, heavy_metals, fentanyl: "pass" or "fail" only when the report shows a result for that test (a conforming identity is "pass"; an endotoxin level within the limit printed on the report is "pass", above it is "fail"); "not_tested" only when the report says it was not tested; otherwise null.
- product_name, strength_label, batch: the sample's product name, labelled strength (e.g. "10 mg") and batch/lot as printed.`;

// One alert until the owner marks it done, not one (and an email) per upload.
// A failed check alerts anyway — better twice than never.
async function alertOnce(detail: string): Promise<void> {
  try { if (await hasOpenAlert(ALERT)) return; }
  catch (err) { console.error("certificate reader: open alert check failed:", err); }
  await alertOwner(ALERT, detail);
}

export type ReadResult = { ok: true; reading: Reading } | { ok: false };

export async function readCertificate(pdf: Uint8Array, lotNumber: string, today: string): Promise<ReadResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    await alertOnce(`${lotNumber} · ANTHROPIC_API_KEY is not set, so certificate PDFs can't be read. Fill certificates in by hand until it is.`);
    return { ok: false };
  }
  const client = new Anthropic({ apiKey, timeout: 90_000, maxRetries: 0 });
  try {
    const res = await client.beta.messages.create({
      model: COA_READER_MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      thinking: { type: "adaptive" },
      output_config: { format: { type: "json_schema", schema: READING_JSON_SCHEMA } },
      messages: [{
        role: "user",
        content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: Buffer.from(pdf).toString("base64") } },
          { type: "text", text: PROMPT },
        ],
      }],
    });
    console.info(`certificate read ${lotNumber}: ${res.stop_reason}, in ${res.usage?.input_tokens ?? "?"} / out ${res.usage?.output_tokens ?? "?"} tokens`);
    if (res.stop_reason !== "end_turn") return { ok: false };
    const text = res.content.find((b): b is Extract<typeof b, { type: "text" }> => b.type === "text")?.text;
    if (!text) return { ok: false };
    let json: unknown;
    try { json = JSON.parse(text); } catch { return { ok: false }; }
    const reading = parseReading(json, today);
    return reading ? { ok: true, reading } : { ok: false };
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
      await alertOnce(`${lotNumber} · the Anthropic API rejected the key (${(err as { status?: number }).status}). Fill certificates in by hand until it's fixed.`);
    } else if ((err instanceof Anthropic.BadRequestError || err instanceof Anthropic.RateLimitError) && OUT_OF_CREDIT.test(err.message)) {
      // Unlike a plain rate limit this won't clear on its own.
      await alertOnce(`${lotNumber} · the Anthropic account is out of credit or over its spend limit (${err.status}). Fill certificates in by hand until it's topped up or the limit is raised.`);
    } else {
      console.error(`certificate read ${lotNumber} failed:`, err);
    }
    return { ok: false };
  }
}
