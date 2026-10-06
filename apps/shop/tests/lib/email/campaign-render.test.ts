import { describe, it, expect } from "vitest";
import { findViolations, visibleText } from "../../../scripts/compliance-scan.mjs";
import { campaignEmail } from "@/lib/email/campaigns/render";

const ctx = { site: "https://auraprotocols.com", unsubscribeUrl: "https://auraprotocols.com/api/unsubscribe?e=a%40b.co&c=campaign.k1&s=x", mailingAddress: "Aura Protocols LLC · 30 N Gould St, Sheridan, WY 82801" };
const lot = { compoundName: "BPC-157", slug: "bpc-157", strengths: "10 mg", lot: "AP-BPC-2610", purityPct: 99.4, method: "HPLC+MS" as const, testedOn: "2026-10-02", coaFile: "/coa/AP-BPC-2610.pdf" };
const base = { subject: "Certified: 2 new lots", previewText: "With their certificates.", content: { headline: "2 new lots are *in.*", body: "Tested before going live.\n\nEvery vial carries its lot.", buttonLabel: "See all certificates", buttonPath: "/coa" }, lots: [] as typeof lot[], code: null };

describe("campaignEmail", () => {
  it("new lots: label, accent, preheader, paragraphs, lot table, button, sign-off, footer", () => {
    const m = campaignEmail({ ...base, kind: "new_lots", lots: [lot] }, ctx);
    expect(m.subject).toBe("Certified: 2 new lots");
    expect(m.html).toContain("New lot · Certified");
    expect(m.html).toContain('<em style="color:#A32B1F">in.</em>');
    expect(m.html).toMatch(/<div style="display:none[^"]*">With their certificates\.<\/div>/);
    expect(m.html).toContain(">Tested before going live.</p>");
    expect(m.html).toContain(">Every vial carries its lot.</p>");
    expect(m.html).toContain("AP-BPC-2610");
    expect(m.html).toContain("https://auraprotocols.com/coa/AP-BPC-2610.pdf");
    expect(m.html).toContain('href="https://auraprotocols.com/coa"');
    expect(m.html).toContain("— Alvester");
    expect(m.html).toContain("Sheridan, WY 82801");
    expect(m.html).toContain(ctx.unsubscribeUrl);
    expect(findViolations(`${m.subject} ${visibleText(m.html)}`)).toEqual([]);
  });

  it("promotion: the code box with its terms", () => {
    const m = campaignEmail({ ...base, kind: "promotion", code: { code: "OCT10", summary: "10% off items", endsAt: "2026-10-13T05:59:59Z", oncePerCustomer: true, minOrderCents: 15000 } }, ctx);
    expect(m.html).toContain("Promotion · Through Oct 12");
    expect(m.html).toContain("CODE · 10% OFF ITEMS");
    expect(m.html).toContain("<b>OCT10</b>");
    expect(m.html).toContain("Ends Oct 12 · one use per account · orders of $150 or more");
  });

  it("news: no code, no lots; no button when the label is blank", () => {
    const m = campaignEmail({ ...base, kind: "news", content: { ...base.content, buttonLabel: "", buttonPath: "" } }, ctx);
    expect(m.html).toContain("Research news");
    expect(m.html).not.toContain("CODE ·");
    expect(m.html).not.toContain("text-transform:uppercase;text-decoration:none");
  });

  it("escapes owner text", () => {
    const m = campaignEmail({ ...base, kind: "news", content: { ...base.content, headline: "<b>x</b>", body: "a < b & c" } }, ctx);
    expect(m.html).toContain("&lt;b&gt;x&lt;/b&gt;");
    expect(m.html).toContain("a &lt; b &amp; c");
  });

  it("a test send prefixes the subject", () => {
    expect(campaignEmail({ ...base, kind: "news" }, ctx, { test: true }).subject).toBe("[Test] Certified: 2 new lots");
  });
});
