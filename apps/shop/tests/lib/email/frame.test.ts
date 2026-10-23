import { describe, it, expect } from "vitest";
import { PHOTO_VIALS, photoVial } from "@/lib/email/photo-vials";
import { brandEmail, vialBlock, para, inviteBox, signOff, turningVialBlock, sticker, sampleCertificate, vialGrid, button } from "@/lib/email/frame";
import { SAMPLE_PANEL } from "@/lib/coa/sample-panel";

const site = "https://auraprotocols.com";
const footer = { address: "30 N Gould St, Sheridan, WY 82801", unsubscribeUrl: `${site}/api/unsubscribe?e=a&s=x`, reason: "you joined the Aura Protocols waitlist" };

describe("brandEmail", () => {
  const html = brandEmail(site, { preview: "Inbox line", kicker: "The waitlist", headline: "You're on *the list.*", intro: "Hello.", rows: para("Body") + signOff(false), footer });

  it("is a whole document with the phone rules in the head", () => {
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toMatch(/<head>[\s\S]*@media \(max-width:620px\)[\s\S]*<\/head>/);
    expect(html).toContain('name="viewport"');
  });

  it("shows the logo as an absolute PNG, the kicker, and the headline with one red italic accent", () => {
    expect(html).toContain(`src="${site}/email/aura-logo.png"`);
    expect(html).toContain("The waitlist");
    expect(html).toContain(`You&#39;re on <em style="color:#A32B1F;font-weight:500">the list.</em>`);
  });

  it("hides the inbox preview line and ends with RUO, the reason, the address and unsubscribe", () => {
    expect(html).toMatch(/display:none[^>]*>Inbox line</);
    expect(html).toContain("For research use only. Not for human use.");
    expect(html).toContain("you joined the Aura Protocols waitlist");
    expect(html).toContain("Sheridan, WY");
    expect(html).toContain(`href="${footer.unsubscribeUrl}"`);
  });
});

describe("blocks", () => {
  it("vialBlock: the photo at 240 px, scientific name first, nickname and class under it", () => {
    const b = vialBlock(site, "wolverine");
    expect(b).toContain(`src="${site}/email/vials/wolverine.jpg"`);
    expect(b).toContain('width="240"');
    expect(b).toContain("BPC-157 / TB-500 · 10 mg");
    expect(b).toContain("Wolverine · Blends");
  });

  it("inviteBox: the link, the credit, and when it's added", () => {
    const b = inviteBox({ url: `${site}/?r=K7QM2P`, label: "auraprotocols.com/?r=K7QM2P", creditDollars: 10 });
    expect(b).toContain(`href="${site}/?r=K7QM2P"`);
    expect(b).toContain("auraprotocols.com/?r=K7QM2P");
    expect(b).toContain("$10");
    expect(b).toContain("first order ships");
  });

  it("signOff: Alvester, with the reply line only when asked", () => {
    expect(signOff(true)).toContain("It comes straight to me.");
    expect(signOff(false)).not.toContain("straight to me");
    expect(signOff(false)).toContain("Alvester");
  });
});

describe("photo vials", () => {
  it("names each vial from the catalog, nickname alongside the scientific name", () => {
    expect(photoVial("wolverine")).toMatchObject({ name: "BPC-157 / TB-500", designation: "Wolverine", strength: "10 mg", chemicalClass: "Blends", slug: "bpc-157-tb-500-blend" });
    expect(photoVial("nad-plus")).toMatchObject({ name: "NAD+", designation: null, strength: "500 mg" });
    expect(Object.keys(PHOTO_VIALS)).toEqual(["bpc-157", "klow", "nad-plus", "wolverine", "ghk-cu", "glow"]);
  });
});

describe("pre-launch blocks", () => {
  it("turningVialBlock: the site's turning vial GIF, BPC-157 · 10 mg", () => {
    const b = turningVialBlock(site);
    expect(b).toContain(`src="${site}/email/bpc-turn.gif"`);
    expect(b).toContain('width="240"');
    expect(b).toContain("BPC-157 · 10 mg");
    expect(b).toContain("Peptide Fragments");
  });

  it("sticker: scan the vial, see its lab report", () => {
    expect(sticker()).toContain("Scan the vial");
    expect(sticker()).toContain("See its lab report");
  });

  it("sampleCertificate: a labelled sample with all ten tests and the ISO lab line", () => {
    const b = sampleCertificate();
    expect(b).toContain("Sample");
    expect(b).toContain("10 checks");
    for (const [, rows] of SAMPLE_PANEL) for (const [t] of rows) expect(b).toContain(t);
    expect(b).toContain("Up to a ten-point panel");
    expect(b).toContain("ISO/IEC 17025-accredited");
    expect(b).toContain("verify page");
    expect(b).not.toMatch(/accredited (result|test|certificate)/i);
  });

  it("vialGrid: same-size cells, each vial and View link to its product page when linked", () => {
    const b = vialGrid(site, ["bpc-157", "glow"], true);
    expect(b).toContain(`src="${site}/email/vials/bpc-157.jpg"`);
    expect(b).toContain(`src="${site}/email/vials/glow.jpg"`);
    expect(b.match(/href="https:\/\/auraprotocols\.com\/products\/bpc-157-tb-500-ghk-cu"/g)?.length).toBe(2);
    expect(b).toContain("GLOW · 70 mg");
    expect(b.match(/width:170px/g)?.length).toBe(2);
    expect(vialGrid(site, ["glow"], false)).not.toContain("href=");
  });

  it("button: a dark button to a page on the site", () => {
    expect(button(site, "Visit auraprotocols.com", "/")).toContain(`href="${site}/"`);
  });
});
