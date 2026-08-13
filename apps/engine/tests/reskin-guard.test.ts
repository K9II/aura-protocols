import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((e) => {
    const p = join(dir, e);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const SRC = join(process.cwd(), "src");
const norm = (p: string) => p.replace(/\\/g, "/");
const files = walk(SRC).filter((f) => /\.(tsx?|css)$/.test(f));
// The palette module + globals intentionally reference old hex in comments/vars.
const EXEMPT = ["src/lib/theme/instrument.ts", "src/app/globals.css"];
const isExempt = (f: string) => EXEMPT.some((x) => norm(f).endsWith(x));

describe("reskin guard", () => {
  it("no shelved Aura Clinical brand remains in source", () => {
    const hits = files.filter((f) =>
      /aura ?clinical|auraclinical\.com/i.test(readFileSync(f, "utf8")),
    );
    expect(hits).toEqual([]);
  });

  it("no neon literals remain in component/page source", () => {
    const neon = /#00d4ff|#8b5cf6|#fb7185|#34d399|#fbbf24|#04060f/i;
    const hits = files
      .filter((f) => !isExempt(f))
      .filter((f) => neon.test(readFileSync(f, "utf8")));
    expect(hits).toEqual([]);
  });
});
