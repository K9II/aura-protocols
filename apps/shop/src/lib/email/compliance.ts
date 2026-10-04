// Every marketing email passes the same banned-phrase scan as the site build.
// A failing email throws, so it can never be sent.
import { findViolations, visibleText } from "../../../scripts/compliance-scan.mjs";

export function assertCompliant(subject: string, html: string): void {
  const hits = findViolations(`${subject} ${visibleText(html)}`) as { rule: string; excerpt: string }[];
  if (hits.length) {
    throw new Error(`email failed compliance scan: ${hits.map((h) => `[${h.rule}] …${h.excerpt}…`).join("; ")}`);
  }
}
