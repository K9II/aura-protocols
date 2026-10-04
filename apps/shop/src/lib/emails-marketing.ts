// Marketing emails: the "Paperwork" welcome series, cart reminders, lot
// alerts, and the opt-in confirmation. Copy approved 2026-10-03 (spec
// Appendix A). Every marketing email carries the RUO line, our mailing
// address (CAN-SPAM) and a signed unsubscribe link.
import { escapeHtml as e } from "@/lib/html";
import { OFFER_PCT_TEXT, OFFER_DAYS_TEXT, type FirstOrderOffer } from "@/lib/account/offer";

export type MarketingCtx = { site: string; unsubscribeUrl: string };
export type Msg = { subject: string; html: string };
export type CartOrder = {
  order_number: string;
  order_items?: { compound_name: string; compound_slug: string; strength: string; pack_qty: number; quantity: number; lot_number: string }[];
};
export type AlertLot = {
  compoundName: string; slug: string; strengths: string; lot: string;
  purityPct: number; method: "HPLC" | "HPLC+MS"; testedOn: string; coaFile: string;
};

const INK = "#1C1A15", SOFT = "#4A4438", RED = "#A32B1F", LINE = "#C9C2AE";
const RUO = "All products are sold for laboratory research use only. Not for human or animal consumption.";

function mailingAddress(): string {
  const a = process.env.MAILING_ADDRESS;
  if (!a) throw new Error("Missing MAILING_ADDRESS environment variable (required in every marketing email)");
  return a;
}

const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const p = (html: string) => `<p style="font-size:15px;line-height:1.6;margin:0 0 14px">${html}</p>`;
// Only the attribute-breakout character needs escaping here — these hrefs are
// server-built URLs (never raw user text), and callers compare the rendered
// link against the exact unsubscribe/confirm URL, so "&" must stay literal.
const attr = (s: string) => s.replace(/"/g, "&quot;");
const link = (href: string, text: string) => `<a href="${attr(href)}" style="color:${RED}">${text}</a>`;
const check = (href: string, text: string) => p(`<b>Check it yourself →</b> ${link(href, text)}`);
const SIGN = `<p style="font-size:15px;margin:18px 0 0">— Alvester<br><span style="color:${SOFT}">Aura Protocols</span></p>`;

// headline: plain text with one *italic* accent, e.g. "Start with the *number.*"
function headline(text: string): string {
  return e(text).replace(/\*(.+?)\*/, `<em style="color:${RED}">$1</em>`);
}

function frame(label: string, title: string, body: string, ctx: MarketingCtx | null): string {
  const footer = ctx
    ? `${RUO}<br>${e(mailingAddress())}<br>${link(ctx.unsubscribeUrl, "Unsubscribe")}`
    : RUO;
  return `<div style="font-family:Georgia,serif;color:${INK};max-width:560px">
<p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:${RED};margin:0 0 8px">${e(label)}</p>
<h1 style="font-weight:400;font-size:26px;margin:0 0 18px">${headline(title)}</h1>${body}
<p style="font-size:12px;color:${SOFT};border-top:1px solid ${LINE};padding-top:12px;margin-top:24px">${footer}</p></div>`;
}

function offerBox(): string {
  return `<table role="presentation" style="border:1px solid ${INK};border-collapse:collapse;margin:0 0 18px"><tr><td style="padding:10px 14px;font-family:'Courier New',monospace;font-size:12px;letter-spacing:.1em">FIRST ORDER · ${OFFER_PCT_TEXT}<br><span style="font-size:20px;letter-spacing:.04em;color:${INK}"><b>Applied automatically</b></span><br><span style="color:${SOFT};letter-spacing:0">on a first order within ${OFFER_DAYS_TEXT} of opening your account</span></td></tr></table>`;
}

export function welcomeEmail(n: 1 | 2 | 3 | 4 | 5, ctx: MarketingCtx, offer: FirstOrderOffer): Msg {
  const s = ctx.site;
  switch (n) {
    case 1: return {
      subject: "You asked for the paperwork.",
      html: frame("File 01 / 05 · The lot number", "Start with the *number.*",
        (offer ? offerBox() : "")
        + p("Most peptide sellers ask you to trust a label. We publish the paperwork instead. Over the next ten days we'll show you how to read all of it, ours and anyone else's.")
        + p("Start with the smallest thing on the vial: the lot number. It ties a certificate to the powder in front of you. A certificate without one proves that <em>something</em> was tested once. It doesn't prove this was.")
        + p("Every vial we ship carries a lot number. Enter it in our COA Lookup and you get the certificate for that exact lot: who tested it, when, and what they found. If a lot has no certificate yet, it isn't for sale. No matching COA, no sale.")
        + check(`${s}/coa`, "Look up a lot") + SIGN, ctx),
    };
    case 2: return {
      subject: "Three ways a fake COA gives itself away",
      html: frame("File 02 / 05 · The certificate", "How to read a *certificate.*",
        p("A certificate of analysis is easy to fake and hard to fake well. Three giveaways:")
        + p("<b>1. The lot doesn't match.</b> Or there isn't one. A certificate that isn't tied to a lot is a brochure.")
        + p("<b>2. A purity number with no chromatogram.</b> \"99%\" is a claim. The chromatogram is the evidence: the trace the instrument actually drew.")
        + p("<b>3. A lab you can't find.</b> A real certificate names a lab with an address and a test date. \"Tested in-house\" isn't independent.")
        + p("Hold every certificate to all three, including ours.")
        + check(`${s}/coa`, "Open a current certificate") + SIGN, ctx),
    };
    case 3: return {
      subject: "What 99% looks like",
      html: frame("File 03 / 05 · The chromatogram", "Purity has a *method.*",
        p("In 1906 a botanist named Mikhail Tsvet poured plant pigments through a glass column packed with chalk. The colors pulled apart into bands. He called the method chromatography, \"color writing.\" His surname, <em>Tsvet</em>, is Russian for <em>color</em>.")
        + p("HPLC is the same idea under high pressure. The sample is pushed through a packed column, each component comes out at its own moment, and a detector draws a peak for each one. The tall peak is the compound. Everything else is something else.")
        + p("Purity is that peak's share of the total. Our floor is 99%. Below it, the lot doesn't go on sale.")
        + `<p style="margin:0 0 14px"><img src="${e(s)}/images/tsvet-1906-plate-xviii.jpg" alt="Plate XVIII from Tsvet's 1906 paper: a chalk column with pigments separated into bands" width="560" style="max-width:100%;border:1px solid ${LINE}"></p>`
        + check(`${s}/coa`, "Find the peak on a real certificate") + SIGN, ctx),
    };
    case 4: return {
      subject: "Who checks the lab?",
      html: frame("File 04 / 05 · The lab", "Who checks *the checker.*",
        p("A certificate is only as good as the lab that signs it. So who checks the lab?")
        + p("ISO/IEC 17025 is the international standard for testing laboratories. To hold it, a lab is assessed by an independent accreditation body on its methods, instrument calibration, staff and record-keeping, and then reassessed on a schedule. It's the difference between a lab <em>saying</em> its results are right and an outsider confirming that they can be.")
        + p("Every lot we sell is tested by an ISO/IEC 17025-accredited lab in the United States, never in-house. Mass spectrometry confirms identity: the molecule weighs what it should. HPLC measures purity. And the lot on the certificate matches the lot on your vial.")
        + check(`${s}/quality-standards`, "How we test every lot") + SIGN, ctx),
    };
    case 5: return {
      subject: "What's not on our label",
      html: frame("File 05 / 05 · The label", "What's *not* on the label.",
        p("Look at one of our labels and notice what's missing.")
        + p("<b>No nickname.</b> Every compound goes by its scientific name, grouped by chemical class.")
        + p("<b>No instructions.</b> Everything we sell is for in-vitro laboratory research, and we don't advise on any other use.")
        + p("What is there: the compound, the amount, and the lot number, which leads back to its certificate.")
        + p("Two rules we don't bend. You must be 21 or older. And an order can be cancelled for a full refund until it ships. After that the sale is final, because research material that has left our control can't be recertified.")
        + (offer ? p(`Your ${OFFER_PCT_TEXT} applies automatically to a first order placed within ${OFFER_DAYS_TEXT} of opening your account.`) : "")
        + p(link(`${s}/products`, "Browse compounds →"))
        + p("From here on, we write when there's something to show you. Usually that's a new lot and its certificate.")
        + SIGN, ctx),
    };
  }
}

function itemLines(o: CartOrder, coa?: (slug: string) => string | null, site?: string): string {
  return (o.order_items ?? []).map((i) => {
    const cert = coa && site ? coa(i.compound_slug) : null;
    return p(`${e(i.compound_name)} · ${e(i.strength)} · ${i.pack_qty}-pack × ${i.quantity}<br><span style="font-size:13px;color:${SOFT}">Lot ${e(i.lot_number)}${cert ? ` — ${link(`${site}${cert}`, "Certificate →")}` : ""}</span>`);
  }).join("");
}

// A non-subscriber (or one who hasn't confirmed) gets this line: CAN-SPAM
// 15 U.S.C. §7704(a)(5)(A)(i) requires a commercial email to identify
// itself as an advertisement to anyone who didn't opt in to the list.
const PROMO_LINE = p(`<span style="color:${SOFT}">This is a promotional reminder about your unfinished checkout.</span>`);

export function cartEmail(n: 1 | 2 | 3, ctx: MarketingCtx, o: CartOrder, coaFor: (slug: string) => string | null, promo?: boolean): Msg {
  const finish = p(link(`${ctx.site}/cart`, "Finish at checkout →"));
  const promoLine = promo ? PROMO_LINE : "";
  switch (n) {
    case 1: return {
      subject: `Your order ${o.order_number} is still open`,
      html: frame("Checkout · Open", "Still *open.*",
        p("You started checkout and didn't finish. Nothing has been charged. Here's what was in it, with the lot each item would ship from:")
        + itemLines(o) + finish
        + p("Orders can be cancelled for a full refund until they ship. After that the sale is final.") + SIGN + promoLine, ctx),
    };
    case 2: return {
      subject: "The certificates for your cart",
      html: frame("Checkout · The paperwork", "Read before *you buy.*",
        p("Each item in your cart ships from a tested lot. Here are the certificates:")
        + itemLines(o, coaFor, ctx.site) + finish + SIGN + promoLine, ctx),
    };
    case 3: return {
      subject: "Your checkout closes tonight",
      html: frame("Checkout · Closing", "Closing in *an hour.*",
        p("The checkout you started yesterday closes in about an hour. Nothing has been charged. Your cart is still saved in the browser you used, so you can start a new checkout whenever you're ready.")
        + finish + SIGN + promoLine, ctx),
    };
  }
}

export function lotAlertEmail(ctx: MarketingCtx, lots: AlertLot[]): Msg {
  const subject = lots.length === 1 ? `Certified: ${lots[0].compoundName}, lot ${lots[0].lot}` : `Certified: ${lots.length} new lots`;
  const th = `style="text-align:left;font-family:'Courier New',monospace;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:${SOFT};padding:6px 8px 6px 0;border-bottom:1px solid ${LINE}"`;
  const td = `style="font-size:14px;padding:8px 8px 8px 0;border-bottom:1px solid ${LINE}"`;
  const rows = lots.map((l) => `<tr><td ${td}>${e(l.compoundName)} · ${e(l.strengths)}</td><td ${td}>${e(l.lot)}</td><td ${td}>${l.purityPct.toFixed(1)}%</td><td ${td}>${l.method === "HPLC+MS" ? "Confirmed" : "—"}</td><td ${td}>${shortDate(l.testedOn)}</td></tr>
<tr><td colspan="5" style="font-size:13px;padding:4px 0 10px">${l.coaFile ? `${link(`${ctx.site}${l.coaFile}`, "Certificate →")} · ` : ""}${link(`${ctx.site}/products/${l.slug}`, "Product page →")}</td></tr>`).join("");
  const title = lots.length === 1 ? `Lot ${lots[0].lot} is *in.*` : `${lots.length} new lots are *in.*`;
  return {
    subject,
    html: frame("New lot · Certified", title,
      `<table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 14px"><tr><th ${th}>Compound</th><th ${th}>Lot</th><th ${th}>Purity (HPLC)</th><th ${th}>Identity (MS)</th><th ${th}>Tested</th></tr>${rows}</table>`
      + SIGN, ctx),
  };
}
