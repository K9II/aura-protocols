import { describe, it, expect } from "vitest";
import { findViolations, visibleText } from "../../../scripts/compliance-scan.mjs";
import { OFFER_DAYS_TEXT, OFFER_PCT_TEXT } from "@/lib/account/offer";
import { earlyAccessEmail, firstLookEmail, weAreOpenEmail } from "@/lib/email/prelaunch";

const site = "https://auraprotocols.com";
const ctx = { site, unsubscribeUrl: `${site}/api/unsubscribe?e=a%40b.co&s=x`, mailingAddress: "Aura Protocols LLC · 30 N Gould St, Sheridan, WY 82801" };
const invite = { url: `${site}/?r=K7QM2P`, label: "auraprotocols.com/?r=K7QM2P" };
// Every pre-launch email carries the person's invite link (2026-10-24).
const hasInvite = (html: string) => {
  expect(html).toContain(`href="${invite.url}"`);
  expect(html).toContain(">auraprotocols.com/?r=K7QM2P</a>");
  expect(html).toContain("Every colleague who places a first order adds <b");
  expect(html).toContain("No limit.");
};
const clean = (html: string) => {
  expect(findViolations(visibleText(html))).toEqual([]);
  expect(html).not.toMatch(/certificate for every lot|retatrutide|tirzepatide/i);
  expect(html).toContain(`href="${ctx.unsubscribeUrl}"`);
  expect(html).toContain("Sheridan, WY");
  expect(html).toContain("you joined the Aura Protocols waitlist");
};

describe("pre-launch emails", () => {
  it("A first look: the turning vial, the sticker, the sample certificate, the site button and the reply line", () => {
    const m = firstLookEmail(ctx, invite);
    expect(m.subject).toBe("A first look at the vials");
    expect(m.html).toContain(`${site}/email/bpc-turn.gif`);
    expect(m.html).toContain("Scan the vial");
    expect(m.html).toContain("10 checks");
    expect(m.html).toContain(`href="${site}/"`);
    expect(m.html).toContain("It comes straight to me.");
    hasInvite(m.html);
    clean(m.html);
  });

  it("Early access: the date, the person's link up top, the checkout card with no code (taken off automatically), the window, the invite", () => {
    const url = `${site}/early?t=K7QM2P.sig`;
    const m = earlyAccessEmail(ctx, { openingOn: "2026-12-01", url, priceCents: 17500 }, invite);
    expect(m.subject).toBe("Your early access is open");
    expect(m.html).toContain(`No code needed: your ${OFFER_PCT_TEXT} comes off automatically. The store opens to everyone on Tuesday, December 1.`);
    expect(m.html).toContain(`your first order is ${OFFER_PCT_TEXT} off. No code needed.`);
    expect(m.html).toContain("You&#39;re in a day <em");
    expect(m.html).toContain("The store opens to everyone on Tuesday, December 1. You get in first");
    expect(m.html.split(`href="${url}"`).length - 1).toBe(1);
    expect(m.html).toContain(">Open my early access</a>");
    expect(m.html).toContain(`${site}/email/vials/glow.jpg`);
    expect(m.html).not.toMatch(/EARLY-|Promotion code|in the box/);
    expect(m.html).toContain("&#10003; Taken off automatically");
    for (const money of ["$175.00", "&minus;$43.75", "$131.25"]) expect(m.html).toContain(money);
    expect(m.html).toContain(`The ${OFFER_PCT_TEXT} applies to a first order placed within ${OFFER_DAYS_TEXT} of making your account.`);
    expect(m.html).not.toContain("ten-point"); // the checkout only — no testing mention (2026-10-23)
    expect(m.html).not.toContain("Scan the vial");
    expect(m.html).toContain("It comes straight to me.");
    hasInvite(m.html);
    clean(m.html);
  });

  it("We're open: all six vials in order, each linked, the 25% line with its window, the sticker", () => {
    const m = weAreOpenEmail(ctx, invite);
    expect(m.subject).toBe("We're open");
    const imgs = [...m.html.matchAll(/email\/vials\/([a-z0-9-]+)\.jpg/g)].map((x) => x[1]);
    expect(imgs).toEqual(["bpc-157", "ghk-cu", "glow", "wolverine", "klow", "nad-plus"]);
    // cap colours never side by side, 3 across (desktop) or 2 across (phones)
    const cap: Record<string, string> = { "bpc-157": "silver", klow: "silver", "nad-plus": "black", glow: "black", wolverine: "red", "ghk-cu": "red" };
    for (const [a, b] of [[0, 1], [1, 2], [3, 4], [4, 5], [2, 3]]) expect(cap[imgs[a]]).not.toBe(cap[imgs[b]]);
    for (const slug of ["bpc-157", "bpc-157-tb-500-ghk-cu-kpv", "nad-plus", "bpc-157-tb-500-blend", "ghk-cu", "bpc-157-tb-500-ghk-cu"]) {
      expect(m.html).toContain(`href="${site}/products/${slug}"`);
    }
    expect(m.html).toContain(`${OFFER_PCT_TEXT} off</b> when you place it within ${OFFER_DAYS_TEXT} of making your account`);
    expect(m.html).toContain("Scan the vial");
    // six from a bigger catalog, never "the lineup" (2026-10-23)
    expect(m.html).not.toMatch(/lineup/i);
    expect(m.html).toContain("Here are a few of the compounds on the shelf. The full catalog is on the site.");
    expect(m.html).toMatch(new RegExp(`href="${site}/products"[^>]*>See the full catalog</a>`));
    hasInvite(m.html);
    clean(m.html);
  });
});
