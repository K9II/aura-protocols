// The ready-made pre-launch emails (2026-10-23, mock https://claude.ai/artifact/SGTmkNtKkywUJhBxihHEDQ
// tabs 2 and 4), sent once each to the waitlist from Email → Pre-launch. The wording is
// fixed here (approved), so they have no editor. Pure — the admin preview renders them too.
import { OFFER_DAYS_TEXT, OFFER_PCT_TEXT } from "@/lib/account/offer";
import { brandEmail, button, para, sampleCertificate, signOff, sticker, turningVialBlock, vialGrid } from "@/lib/email/frame";
import type { Msg } from "@/lib/emails-marketing";

export type PrelaunchCtx = { site: string; unsubscribeUrl: string; mailingAddress: string };

const footer = (c: PrelaunchCtx) => ({ address: c.mailingAddress, unsubscribeUrl: c.unsubscribeUrl, reason: "you joined the Aura Protocols waitlist" });

export function firstLookEmail(c: PrelaunchCtx): Msg {
  return {
    subject: "A first look at the vials",
    html: brandEmail(c.site, {
      preview: "This is the vial you'll get: the name up front, the strength, and a code that opens its own lot's report.",
      kicker: "A first look",
      headline: "This is what a vial from us *looks like.*",
      intro: "We wanted you to see one before the store opens. The name comes first, then the strength, and the back of every label carries a code that opens the lab report for that exact lot.",
      rows: turningVialBlock(c.site) + sticker() + sampleCertificate() + button(c.site, "Visit auraprotocols.com", "/") + signOff(true),
      footer: footer(c),
    }),
  };
}

// Goes to waitlisters with no order yet, on launch day — the lineup shown must all be on sale.
export function weAreOpenEmail(c: PrelaunchCtx): Msg {
  return {
    subject: "We're open",
    html: brandEmail(c.site, {
      preview: `The full lineup is live, and your first order is ${OFFER_PCT_TEXT} off.`,
      kicker: "Now open",
      headline: "The store is *open.*",
      intro: "Aura Protocols is open to everyone today. Here&#39;s the lineup we&#39;re starting with.",
      rows: vialGrid(c.site, ["bpc-157", "klow", "nad-plus", "wolverine", "ghk-cu", "glow"], true)
        + para(`Your first order is <b style="color:#1C1A15">${OFFER_PCT_TEXT} off</b> when you place it within ${OFFER_DAYS_TEXT} of making your account. It comes off automatically at checkout.`)
        + sticker()
        + button(c.site, "Visit auraprotocols.com", "/", "4px 44px 8px")
        + signOff(true),
      footer: footer(c),
    }),
  };
}
