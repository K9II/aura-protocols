// The ready-made pre-launch emails (2026-10-23, mock https://claude.ai/artifact/SGTmkNtKkywUJhBxihHEDQ
// tabs 2–4), sent once each to the waitlist from Email → Pre-launch. The wording is
// fixed here (approved), so they have no editor. Pure — the admin preview renders them too.
import { OFFER_DAYS_TEXT, OFFER_PCT_TEXT } from "@/lib/account/offer";
import { brandEmail, button, checkoutCard, note, para, sampleCertificate, signOff, sticker, turningVialBlock, vialGrid } from "@/lib/email/frame";
import { openingLabel } from "@/lib/early/rules";
import { escapeHtml as e } from "@/lib/html";
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

// The person's own early link and code, the opening date typed in at send time, and GLOW's
// live price (lib/email/campaigns/send.ts fills these per recipient).
export type EarlyCtx = { openingOn: string; url: string; code: string; priceCents: number };

export const earlyPreview = (openingOn: string) => `Your code is already in the box. The store opens to everyone on ${openingLabel(openingOn)}.`;

export function earlyAccessEmail(c: PrelaunchCtx, x: EarlyCtx): Msg {
  return {
    subject: "Your early access is open",
    html: brandEmail(c.site, {
      preview: earlyPreview(x.openingOn),
      kicker: "Early access",
      headline: "You're in a day *early.*",
      intro: `The store opens to everyone on ${e(openingLabel(x.openingOn))}. You get in first, and your code is already in the box: open your link, make your account, and your first order is ${OFFER_PCT_TEXT} off.`,
      cta: { label: "Open my early access", url: x.url },
      rows: checkoutCard(c.site, { code: x.code, priceCents: x.priceCents })
        + note(`The ${OFFER_PCT_TEXT} applies to a first order placed within ${OFFER_DAYS_TEXT} of making your account.`)
        + signOff(true),
      footer: footer(c),
    }),
  };
}

// Goes to waitlisters with no order yet, on launch day — the vials shown must all be on sale.
// They're a few from the catalog, never "the lineup": the catalog is bigger than six, and
// saying otherwise would mislead (Alvester, 2026-10-23). The button goes to the full catalog.
// Cap colours mixed (2026-10-23, Alvester): silver BPC-157/KLOW, red GHK-Cu/Wolverine, black
// GLOW/NAD+. No two of a colour side by side at 3 across (desktop) or 2 across (phones); with
// three pairs in six cells one stacked pair per layout can't be avoided (GLOW over NAD+ on
// desktop, GHK-Cu over Wolverine on phones). Singles and blends alternate across the rows.
const VIAL_ORDER: Parameters<typeof vialGrid>[1] = ["bpc-157", "ghk-cu", "glow", "wolverine", "klow", "nad-plus"];

export function weAreOpenEmail(c: PrelaunchCtx): Msg {
  return {
    subject: "We're open",
    html: brandEmail(c.site, {
      preview: `The full catalog is live, and your first order is ${OFFER_PCT_TEXT} off.`,
      kicker: "Now open",
      headline: "The store is *open.*",
      intro: "Aura Protocols is open to everyone today. Here are a few of the compounds on the shelf. The full catalog is on the site.",
      rows: vialGrid(c.site, VIAL_ORDER, true)
        + para(`Your first order is <b style="color:#1C1A15">${OFFER_PCT_TEXT} off</b> when you place it within ${OFFER_DAYS_TEXT} of making your account. It comes off automatically at checkout.`)
        + sticker()
        + button(c.site, "See the full catalog", "/products", "4px 44px 8px")
        + signOff(true),
      footer: footer(c),
    }),
  };
}
