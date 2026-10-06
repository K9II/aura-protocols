// Evidence goes to the bank, so our copy passes the same banned-phrase scan
// as the site build before every save and submit. Server only: the scanner
// imports node:fs. The customer's own name, email and addresses are blanked
// first — their street name is data, not our copy.
import { findViolations } from "../../../scripts/compliance-scan.mjs";
import type { EvidenceText } from "@/lib/disputes/evidence";

const SCANNED = ["uncategorized_text", "product_description", "refund_policy_disclosure", "refund_refusal_explanation", "access_activity_log"] as const;
type Scanned = (typeof SCANNED)[number];
const LABEL: Record<Scanned, string> = {
  uncategorized_text: "Cover letter", product_description: "Product description", refund_policy_disclosure: "Refund policy",
  refund_refusal_explanation: "Refund refusal", access_activity_log: "Account activity",
};
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// field → message, for each scanned field with a banned phrase.
export function evidenceViolations(e: Pick<EvidenceText, Scanned>, ignore: string[]): Record<string, string> {
  const blanks = [...ignore].filter((x) => x.trim()).sort((a, b) => b.length - a.length).map((x) => new RegExp(escape(x), "gi"));
  const out: Record<string, string> = {};
  for (const k of SCANNED) {
    const text = blanks.reduce((t, re) => t.replace(re, " "), e[k] ?? "");
    const hits = findViolations(text) as Array<{ rule: string }>;
    if (hits.length) out[k] = `${LABEL[k]}: "${hits[0].rule}" is a banned phrase. Change the wording to save.`;
  }
  return out;
}
