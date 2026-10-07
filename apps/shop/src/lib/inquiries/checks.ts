// The owner's reply passes the site's banned-phrase scan before it can be
// sent; the hit is shown with the whole word. Server only: the scanner
// imports node:fs.
import { RULES, findViolations, stripAllowed } from "../../../scripts/compliance-scan.mjs";
import { blankOut } from "@/lib/email/compliance";

export function replyViolation(text: string, ignore: string[]): { phrase: string } | null {
  const t = blankOut(text, ignore);
  const hits = findViolations(t) as Array<{ rule: string }>;
  if (!hits.length) return null;
  // Locate the phrase in the same allowlist-stripped text findViolations
  // scanned, so the match can never fall inside an allowed legal sentence.
  const allowed = stripAllowed(t);
  const re = (RULES as Array<[string, RegExp]>).find(([r]) => r === hits[0].rule)![1];
  const m = re.exec(allowed)!;
  const before = /[A-Za-z-]*$/.exec(allowed.slice(0, m.index))![0];
  const after = /^[A-Za-z-]*/.exec(allowed.slice(m.index + m[0].length))![0];
  return { phrase: `${before}${m[0]}${after}` };
}

export const replyBlockedMessage = (phrase: string) =>
  `Not sent. Remove "${phrase}" before sending — we can't advise on preparation or use. The saved reply "Research use only" answers this kind of question.`;
