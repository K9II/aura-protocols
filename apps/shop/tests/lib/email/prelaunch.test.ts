import { describe, it, expect } from "vitest";
import { findViolations, visibleText } from "../../../scripts/compliance-scan.mjs";
import { OFFER_DAYS_TEXT, OFFER_PCT_TEXT } from "@/lib/account/offer";
import { firstLookEmail, weAreOpenEmail } from "@/lib/email/prelaunch";

const site = "https://auraprotocols.com";
const ctx = { site, unsubscribeUrl: `${site}/api/unsubscribe?e=a%40b.co&s=x`, mailingAddress: "Aura Protocols LLC · 30 N Gould St, Sheridan, WY 82801" };
const clean = (html: string) => {
  expect(findViolations(visibleText(html))).toEqual([]);
  expect(html).not.toMatch(/certificate for every lot|retatrutide|tirzepatide/i);
  expect(html).toContain(`href="${ctx.unsubscribeUrl}"`);
  expect(html).toContain("Sheridan, WY");
  expect(html).toContain("you joined the Aura Protocols waitlist");
};

describe("pre-launch emails", () => {
  it("A first look: the turning vial, the sticker, the sample certificate, the site button and the reply line", () => {
    const m = firstLookEmail(ctx);
    expect(m.subject).toBe("A first look at the vials");
    expect(m.html).toContain(`${site}/email/bpc-turn.gif`);
    expect(m.html).toContain("Scan the vial");
    expect(m.html).toContain("10 checks");
    expect(m.html).toContain(`href="${site}/"`);
    expect(m.html).toContain("It comes straight to me.");
    clean(m.html);
  });

  it("We're open: all six vials in order, each linked, the 25% line with its window, the sticker", () => {
    const m = weAreOpenEmail(ctx);
    expect(m.subject).toBe("We're open");
    const imgs = [...m.html.matchAll(/email\/vials\/([a-z0-9-]+)\.jpg/g)].map((x) => x[1]);
    expect(imgs).toEqual(["bpc-157", "klow", "nad-plus", "wolverine", "ghk-cu", "glow"]);
    for (const slug of ["bpc-157", "bpc-157-tb-500-ghk-cu-kpv", "nad-plus", "bpc-157-tb-500-blend", "ghk-cu", "bpc-157-tb-500-ghk-cu"]) {
      expect(m.html).toContain(`href="${site}/products/${slug}"`);
    }
    expect(m.html).toContain(`${OFFER_PCT_TEXT} off</b> when you place it within ${OFFER_DAYS_TEXT} of making your account`);
    expect(m.html).toContain("Scan the vial");
    clean(m.html);
  });
});
