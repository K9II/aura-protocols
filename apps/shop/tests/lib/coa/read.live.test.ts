// Real Claude reads of public sample certificates (≈5–10¢ each). Skipped unless asked:
// COA_LIVE=1 COA_SAMPLES=<dir with *.pdf + truth.json> pnpm --filter @aura/shop test -- tests/lib/coa/read.live.test.ts
// truth.json: { "<file>.pdf": { "<field>": [acceptable values…] } } — the samples are never
// uploaded to our coa bucket or committed.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const dir = process.env.COA_SAMPLES ?? "";
const norm = (v: unknown) => (typeof v === "string" ? v.trim().toLowerCase() : v);

describe.skipIf(process.env.COA_LIVE !== "1" || !dir)("certificate reader — live", () => {
  it("reads each sample; prints a field-by-field table", async () => {
    const { readCertificate } = await import("@/lib/coa/read");
    const truth = JSON.parse(fs.readFileSync(path.join(dir, "truth.json"), "utf8")) as Record<string, Record<string, unknown[]>>;
    const rows: string[] = [];
    let wrong = 0;
    for (const [file, want] of Object.entries(truth)) {
      const r = await readCertificate(new Uint8Array(fs.readFileSync(path.join(dir, file))), "LIVE-TEST", "2099-12-31");
      expect(r.ok, `${file} was not read`).toBe(true);
      if (!r.ok) continue;
      for (const [k, ok] of Object.entries(want)) {
        const got = (r.reading as Record<string, unknown>)[k];
        const right = ok.some((v) => norm(v) === norm(got));
        if (!right) wrong++;
        rows.push(`${file}\t${k}\t${JSON.stringify(ok)}\t${JSON.stringify(got)}\t${right ? "right" : got === null ? "BLANK" : "WRONG"}`);
      }
      rows.push(`${file}\tproduct_name\t-\t${JSON.stringify(r.reading.product_name)}\t(info)`);
    }
    console.log(["file\tfield\taccepted\tread\tverdict", ...rows].join("\n"));
    console.log(`${wrong} field(s) not matching`);
  }, 300_000);
});
