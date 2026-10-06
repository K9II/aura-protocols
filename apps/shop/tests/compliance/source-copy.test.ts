import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { findViolations } from "../../scripts/compliance-scan.mjs";

// The post-build compliance-scan.mjs script only sees prerendered HTML, so
// it can't catch banned copy that's client-only (rendered after hydration,
// e.g. the gate or cart drawer) or produced by a fully dynamic route (the
// /products listing, which reads the catalog at request/render time rather
// than baking fixed HTML). This scans the raw TSX/TS *source* of those
// surfaces instead, using the same rule set.

const SRC = join(__dirname, "..", "..", "src");

function storeComponentFiles(): string[] {
  return readdirSync(join(SRC, "components", "store"))
    .filter((name) => name.endsWith(".tsx"))
    .map((name) => join(SRC, "components", "store", name));
}

// Strip comments before scanning so a rule can only be tripped by copy a
// visitor would actually see, not by an identifier or an explanatory code
// comment (e.g. a variable named `dosageForm`, or a comment mentioning
// "protocol" while explaining why a check exists).
function stripComments(source: string): string {
  let out = source.replace(/\/\*[\s\S]*?\*\//g, " ");
  // Only strip `//` that starts a comment (preceded by line-start or
  // whitespace) so it doesn't eat the `//` in a URL like "https://...".
  out = out.replace(/(^|\s)\/\/[^\n]*$/gm, "$1");
  return out;
}

function tsxUnder(...parts: string[]): string[] {
  const dir = join(SRC, ...parts);
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((d) => d.isFile() && /\.tsx?$/.test(d.name))
    .map((d) => join(d.parentPath ?? (d as unknown as { path: string }).path, d.name));
}

const FILES = [
  ...storeComponentFiles(), join(SRC, "app", "products", "page.tsx"), join(SRC, "data", "catalog.ts"), join(SRC, "data", "catalog-descriptions.ts"), join(SRC, "lib", "catalog.ts"),
  ...tsxUnder("components", "account"), ...tsxUnder("app", "sign-in"), ...tsxUnder("app", "checkout"),
  ...tsxUnder("app", "account"), ...tsxUnder("app", "order"), ...tsxUnder("app", "admin"),
  ...tsxUnder("app", "forgot-password"), ...tsxUnder("app", "reset-password"),
  ...tsxUnder("components", "partners"), ...tsxUnder("app", "partners"), ...tsxUnder("app", "affiliates"),
  ...tsxUnder("app", "partner-agreement"), join(SRC, "lib", "emails-partners.ts"),
  join(SRC, "lib", "emails.ts"),
  // Dispute evidence goes to banks (Part 6).
  join(SRC, "lib", "disputes", "evidence.ts"), ...tsxUnder("components", "admin", "disputes"),
];

describe("compliance scan — client-only and dynamic source copy", () => {
  it.each(FILES.map((f) => [f.slice(SRC.length + 1).replace(/\\/g, "/"), f] as const))("%s has no banned-phrase copy", (_label, file) => {
    const source = stripComments(readFileSync(file, "utf8"));
    const violations = findViolations(source);
    expect(violations).toEqual([]);
  });
});
