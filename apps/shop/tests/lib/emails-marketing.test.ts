import { describe, it, expect, beforeEach } from "vitest";
import { findViolations, visibleText } from "../../scripts/compliance-scan.mjs";

const ctx = { site: "https://auraprotocols.com", unsubscribeUrl: "https://auraprotocols.com/api/unsubscribe?e=a%40b.co&s=x" };
const offer = { endsAt: "2026-12-15T00:00:00.000Z" };

describe("marketing emails", () => {
  beforeEach(() => { process.env.MAILING_ADDRESS = "Aura Protocols LLC · 30 N Gould St, Sheridan, WY 82801"; });

  it("welcome files 1–5 have the approved subjects", async () => {
    const { welcomeEmail } = await import("@/lib/emails-marketing");
    const subjects = [1, 2, 3, 4, 5].map((n) => welcomeEmail(n as 1 | 2 | 3 | 4 | 5, ctx, offer).subject);
    expect(subjects).toEqual([
      "You asked for the paperwork.",
      "Three ways a fake COA gives itself away",
      "What 99% looks like",
      "Who checks the lab?",
      "What's not on our label",
    ]);
  });

  it("shows the automatic 15% and its window in days (never a date) in Files 01 and 05 only, and drops it without an offer", async () => {
    const { welcomeEmail } = await import("@/lib/emails-marketing");
    expect(welcomeEmail(1, ctx, offer).html).toContain("FIRST ORDER · 15%");
    expect(welcomeEmail(1, ctx, offer).html).toContain("Applied automatically");
    expect(welcomeEmail(1, ctx, offer).html).toContain("on a first order within 14 days of opening your account");
    expect(welcomeEmail(1, ctx, offer).html).not.toMatch(/Dec 15|no code needed/);
    expect(welcomeEmail(5, ctx, offer).html).toContain("Your 15% applies automatically to a first order placed within 14 days of opening your account.");
    expect(welcomeEmail(3, ctx, offer).html).not.toContain("15%");
    expect(welcomeEmail(1, ctx, null).html).not.toContain("15%");
    expect(welcomeEmail(5, ctx, null).html).not.toContain("15%");
    expect(welcomeEmail(1, ctx, offer).html).not.toMatch(/AURA-|10%/);
  });

  it("every marketing email has the RUO line, mailing address, unsubscribe link and Alvester's sign-off", async () => {
    const m = await import("@/lib/emails-marketing");
    const order = { order_number: "AP-1042", order_items: [{ compound_name: "BPC-157", strength: "10 mg", pack_qty: 2, quantity: 1, lot_number: "AP-2611", compound_slug: "bpc-157" }] };
    const lots = [{ compoundName: "BPC-157", slug: "bpc-157", strengths: "10 mg", lot: "AP-2611", purityPct: 99.4, method: "HPLC+MS" as const, testedOn: "2026-11-28", coaFile: "/coa/AP-2611.pdf" }];
    const all = [
      ...[1, 2, 3, 4, 5].map((n) => m.welcomeEmail(n as 1 | 2 | 3 | 4 | 5, ctx, offer)),
      ...[1, 2, 3].map((n) => m.cartEmail(n as 1 | 2 | 3, ctx, order, () => "/coa/AP-2611.pdf")),
      m.lotAlertEmail(ctx, lots),
    ];
    for (const e of all) {
      expect(e.html, e.subject).toContain("laboratory research use only");
      expect(e.html, e.subject).toContain("30 N Gould St");
      expect(e.html, e.subject).toContain(ctx.unsubscribeUrl);
      expect(e.html, e.subject).toContain("Alvester");
      expect(findViolations(`${e.subject} ${visibleText(e.html)}`), e.subject).toEqual([]);
    }
  });

  it("names a single lot in the lot-alert subject and counts several", async () => {
    const { lotAlertEmail } = await import("@/lib/emails-marketing");
    const l = { compoundName: "BPC-157", slug: "bpc-157", strengths: "10 mg", lot: "AP-2611", purityPct: 99.4, method: "HPLC+MS" as const, testedOn: "2026-11-28", coaFile: "/coa/AP-2611.pdf" };
    expect(lotAlertEmail(ctx, [l]).subject).toBe("Certified: BPC-157, lot AP-2611");
    expect(lotAlertEmail(ctx, [l, { ...l, lot: "AP-2612" }]).subject).toBe("Certified: 2 new lots");
  });

  it("adds a promotional-reminder line for a non-confirmed subscriber, and omits it otherwise", async () => {
    const { cartEmail } = await import("@/lib/emails-marketing");
    const order = { order_number: "AP-1042", order_items: [] };
    const promo = cartEmail(1, ctx, order, () => null, true);
    expect(promo.html).toContain("This is a promotional reminder about your unfinished checkout.");
    expect(findViolations(`${promo.subject} ${visibleText(promo.html)}`)).toEqual([]);
    const notPromo = cartEmail(1, ctx, order, () => null, false);
    expect(notPromo.html).not.toContain("promotional reminder");
    const omitted = cartEmail(1, ctx, order, () => null);
    expect(omitted.html).not.toContain("promotional reminder");
  });

  it("escapes a cart item name, never renders it raw", async () => {
    const { cartEmail } = await import("@/lib/emails-marketing");
    const order = { order_number: "AP-1042", order_items: [{ compound_name: "<script>x</script>", strength: "10 mg", pack_qty: 2, quantity: 1, lot_number: "AP-2611", compound_slug: "bpc-157" }] };
    const html = cartEmail(1, ctx, order, () => null).html;
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>x</script>");
  });

  it("throws when MAILING_ADDRESS is missing (CAN-SPAM)", async () => {
    delete process.env.MAILING_ADDRESS;
    const { welcomeEmail } = await import("@/lib/emails-marketing");
    expect(() => welcomeEmail(2, ctx, null)).toThrow("MAILING_ADDRESS");
  });
});
