// tests/lib/terra/template-constraint.test.ts
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { PROTOCOL_TEMPLATES } from "@/lib/constants";

// Parse the template list from the latest migration that defines the
// protocol_recommendations template CHECK, and assert it equals PROTOCOL_TEMPLATES.
function templatesFromLatestMigration(): Set<string> {
  const dir = path.resolve(__dirname, "../../../supabase/migrations");
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  let latest: string | null = null;
  for (const f of files) {
    const sql = readFileSync(path.join(dir, f), "utf8");
    if (/template\s+in\s*\(/i.test(sql) || /template\s*=\s*any/i.test(sql)) latest = sql;
  }
  if (!latest) throw new Error("no migration defines a template CHECK");
  const match = latest.match(/template[^()]*in\s*\(([^)]*)\)/i);
  if (!match) throw new Error("could not parse template CHECK list");
  return new Set(
    match[1].split(",").map((s) => s.trim().replace(/^'|'$/g, "")),
  );
}

describe("protocol template constraint stays in sync with constants", () => {
  it("PROTOCOL_TEMPLATES equals the migration CHECK list", () => {
    const fromSql = templatesFromLatestMigration();
    const fromConst = new Set<string>(PROTOCOL_TEMPLATES);
    expect(fromSql).toEqual(fromConst);
  });
});
