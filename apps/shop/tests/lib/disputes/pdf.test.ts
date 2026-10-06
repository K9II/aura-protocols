import { describe, it, expect } from "vitest";
import { inflateSync } from "node:zlib";
import { buildEvidencePdf } from "@/lib/disputes/pdf";
import { facts } from "../../helpers/dispute-fixtures";

// The drawn text: pdf-lib Flate-compresses each page's content stream, and
// every drawn line is a hex string followed by Tj.
function pdfText(bytes: Uint8Array): string {
  const s = Buffer.from(bytes).toString("latin1");
  const out: string[] = [];
  for (const m of s.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    let body: string;
    try { body = inflateSync(Buffer.from(m[1], "latin1")).toString("latin1"); } catch { continue; }
    for (const h of body.matchAll(/<([0-9A-Fa-f]+)>\s*Tj/g)) out.push(Buffer.from(h[1], "hex").toString("latin1"));
  }
  return out.join("\n").replace(/\s+/g, " ");
}

describe("evidence PDF", () => {
  it("is a PDF with the order, tracking, lots and the agreement timestamp", async () => {
    const { bytes, pages } = await buildEvidencePdf(facts());
    expect(Buffer.from(bytes.slice(0, 5)).toString("latin1")).toBe("%PDF-");
    expect(pages).toBe(1);
    const text = pdfText(bytes);
    expect(text).toContain("Aura Protocols LLC - Dispute evidence");
    expect(text).toContain("Order AP-1031 · Stripe dispute dp_1Q7Xz");
    expect(text).toContain("1 · RECEIPT");
    expect(text).toContain("tracking 9400111899223401552788");
    expect(text).toContain("AP-BPC-2604 · BPC-157 10 mg · 3 vials");
    expect(text).toContain("Agreement accepted: 2026-09-15 01:02:41 UTC");
  });

  it("the same records give the same bytes (the download is what's attached)", async () => {
    const a = await buildEvidencePdf(facts());
    const b = await buildEvidencePdf(facts());
    expect(Buffer.from(a.bytes).equals(Buffer.from(b.bytes))).toBe(true);
  });

  it("never throws on characters the standard fonts can't draw", async () => {
    const f = facts(
      { customer: { name: "Dana ≤ Whitfield 😀", email: "dana.w@example.com", createdAt: "2026-09-15T01:02:00Z", lastSignInAt: null } },
      { ship: { name: "Dana — W", line1: "1 “Elm” St", line2: null, city: "Boulder", state: "CO", zip: "80302" } },
    );
    const text = pdfText((await buildEvidencePdf(f)).bytes);
    expect(text).toContain("Customer: Dana <= Whitfield ?");
    expect(text).toContain("Ship to: Dana - W, 1 \"Elm\" St, Boulder, CO 80302");
  });

  it("runs onto more pages for a long order", async () => {
    const item = facts().items[0];
    const { pages } = await buildEvidencePdf(facts({ items: Array.from({ length: 80 }, (_, i) => ({ ...item, name: `Compound ${i}` })) }));
    expect(pages).toBeGreaterThan(1);
  });
});
