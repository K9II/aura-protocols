// Customer replies keep only what they wrote: the quoted history mail clients
// add below (Gmail, Outlook, Apple Mail, iOS) is cut. The whole text is still
// stored (inquiry_messages.full_text, "Show full email"). Pure.
const ON_WROTE = /^on\s.+wrote:\s*$/i;                         // Gmail, Apple Mail, iOS
const ON_START = /^on\s.+/i;
const WROTE_END = /wrote:\s*$/i;
const ORIGINAL = /^-{2,}\s*(original message|forwarded message)\s*-{2,}/i;
const RULE = /^_{10,}\s*$/;                                     // Outlook desktop separator
const HEADER_FROM = /^\*?from:\*?\s/i;
const HEADER_NEXT = /^\*?(sent|date|to|subject|cc):\*?\s/i;
const SIG = /^--\s*$/;
const QUOTED = /^>/;
// Phone-app footers ("Sent from my iPhone", "Get Outlook for Android<https://aka.ms/…>").
const SENT_FROM = /^(sent from my\s.+|get outlook for (android|ios)\b.*|sent from (yahoo )?mail for (android|ios|iphone)\b.*|sent from outlook for (android|ios)\b.*)$/i;

export function cutQuoted(input: string): { body: string; cut: boolean } {
  const text = input.replace(/\r\n?/g, "\n");
  const lines = text.split("\n");
  let end = lines.length;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    const next = (lines[i + 1] ?? "").trim();
    const wrappedOn = ON_START.test(l) && !WROTE_END.test(l) && WROTE_END.test(next) && next.length < 200;
    const outlookHeader = HEADER_FROM.test(l) && lines.slice(i + 1, i + 5).some((x) => HEADER_NEXT.test(x.trim()));
    if (ON_WROTE.test(l) || wrappedOn || ORIGINAL.test(l) || RULE.test(l) || SIG.test(lines[i]) || QUOTED.test(l) || outlookHeader) {
      end = i;
      break;
    }
  }
  const head = lines.slice(0, end);
  const kept = head.filter((l) => !SENT_FROM.test(l.trim()));
  const body = kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!body) return { body: text.trim(), cut: false };
  return { body, cut: end < lines.length || kept.length !== head.length };
}

// HTML-only emails: text with line breaks; everything from the first
// <blockquote> on becomes a '>' line so cutQuoted removes it.
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, "")
    .replace(/<blockquote[\s\S]*$/i, "\n> quoted\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
