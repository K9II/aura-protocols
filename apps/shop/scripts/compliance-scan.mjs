// Post-build compliance guard: scans every prerendered HTML page for
// human-use / dosing / benefit language and FAILS THE BUILD on a hit.
// Runs automatically: package.json "build" = next build && node scripts/compliance-scan.mjs
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

// Sentences allowed despite containing a banned word (legal boilerplate).
const ALLOW = [
  /not intended to diagnose, treat, cure,? or prevent any disease/gi,
];

// \bprotocol\b is singular on purpose: the brand is "Aura Protocols".
/** @type {[string, RegExp][]} */
export const RULES = [
  ["dose", /\bdos(e|es|ing|age)\b/i],
  ["protocol", /\bprotocol\b/i],
  ["stack", /\bstacks?\b/i],
  ["reconstitution", /reconstitut/i],
  ["injection", /\binject/i],
  ["weight loss", /weight[- ]loss/i],
  ["fat loss", /fat[- ]loss/i],
  ["benefit", /\bbenefits?\b/i],
  ["studied for", /studied for/i],
  ["for men/women", /\bfor (men|women)\b/i],
  ["libido", /\blibido\b/i],
  ["anti-aging", /anti-?aging/i],
  ["cure", /\bcures?\b/i],
  ["treat", /\btreat(s|ment|ing)?\b/i],
];

export function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function findViolations(text) {
  let t = text;
  for (const a of ALLOW) t = t.replace(a, " ");
  const out = [];
  for (const [rule, re] of RULES) {
    const m = t.match(re);
    if (m) {
      const at = m.index ?? 0;
      out.push({ rule, excerpt: t.slice(Math.max(0, at - 40), at + 40) });
    }
  }
  return out;
}

function htmlFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...htmlFiles(p));
    else if (name.endsWith(".html")) out.push(p);
  }
  return out;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const root = join(process.cwd(), ".next", "server", "app");
  let files = [];
  try { files = htmlFiles(root); } catch { /* handled below */ }
  if (files.length === 0) {
    console.error(`compliance-scan: found no prerendered HTML under ${root} — refusing to pass silently.`);
    process.exit(1);
  }
  let failures = 0;
  for (const f of files) {
    for (const v of findViolations(visibleText(readFileSync(f, "utf8")))) {
      failures++;
      console.error(`✗ ${relative(root, f)} [${v.rule}] …${v.excerpt}…`);
    }
  }
  if (failures) {
    console.error(`\ncompliance-scan: ${failures} violation(s) in ${files.length} pages. Fix the copy — do not widen ALLOW without legal reason.`);
    process.exit(1);
  }
  console.log(`compliance-scan: ${files.length} pages clean.`);
}
