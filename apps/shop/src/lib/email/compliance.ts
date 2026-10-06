// Every email we write passes the same banned-phrase scan as the site build.
// A failing email throws, so it can never be sent. `ignore`: the customer's
// own name and email — their words aren't our copy (a customer named "Treat").
import { findViolations, visibleText } from "../../../scripts/compliance-scan.mjs";
import { escapeHtml } from "@/lib/html";

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function blankOut(text: string, ignore: string[]): string {
  return [...ignore].filter((x) => x.trim()).sort((a, b) => b.length - a.length)
    .reduce((t, x) => t.replace(new RegExp(escapeRe(x), "gi"), " "), text);
}

export function assertCompliant(subject: string, html: string, ignore: string[] = []): void {
  const all = [...ignore, ...ignore.map(escapeHtml)];
  const hits = findViolations(blankOut(`${subject} ${visibleText(blankOut(html, all))}`, all)) as { rule: string; excerpt: string }[];
  if (hits.length) {
    throw new Error(`email failed compliance scan: ${hits.map((h) => `[${h.rule}] …${h.excerpt}…`).join("; ")}`);
  }
}
