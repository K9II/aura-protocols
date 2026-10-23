// The marketing email frame (2026-10-23, mock https://claude.ai/artifact/SGTmkNtKkywUJhBxihHEDQ):
// warm gradient top, white 600 px card, photo vials, Alvester's sign-off. Pure — returns
// a whole HTML document (the head carries the phone rules). Images are absolute URLs to
// public/email/ on the site. Every block is a <tr> for the card's table.
import { escapeHtml as e } from "@/lib/html";
import { photoVial, type PhotoVialKey } from "@/lib/email/photo-vials";

const INK = "#1C1A15", BODY = "#3a342a", RED = "#A32B1F", MUTED = "#6a6152", SLATE = "#4B5560";
// Newsreader where the mail app loads web fonts (Apple Mail); Gmail doesn't, so Palatino
// comes next — Georgia's old-style numbers made "10 mg" read "1o mg".
export const SERIF = "font-family:'Newsreader','Palatino Linotype',Palatino,'Book Antiqua','Times New Roman',serif";
const FONTS = "https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400..700;1,6..72,400..700&family=Inter:wght@400;600&display=swap";
export const SANS = "font-family:Inter,'Helvetica Neue',Arial,sans-serif";
const attr = (s: string) => s.replace(/"/g, "&quot;");

const HEAD_STYLE = `body{margin:0;padding:0;background:#f3eee8}a{color:${RED}}
@media (max-width:620px){
.ap-wrap{width:100%!important;border-radius:0!important}
.ap-outer{padding:0!important}
.ap-pad{padding-left:20px!important;padding-right:20px!important}
.ap-h1{font-size:34px!important;line-height:38px!important}
.ap-vialcell{padding:26px 0 18px!important}
.ap-vial{width:200px!important}
.ap-link{font-size:16px!important;line-height:22px!important}
}`;

// "You're on *the list.*" → escaped, with the starred words in red italic.
export function accent(text: string): string {
  return e(text).replace(/\*(.+?)\*/, `<em style="color:${RED};font-weight:500">$1</em>`);
}

export function para(html: string): string {
  return `<tr><td class="ap-pad" style="padding:0 44px 18px"><p style="${SANS};margin:0;font-size:16px;line-height:25px;color:${BODY}">${html}</p></td></tr>`;
}

export function vialBlock(site: string, key: PhotoVialKey): string {
  const v = photoVial(key);
  const alt = `Aura Protocols vial: ${v.name}, ${v.strength}${v.designation ? ` (${v.designation})` : ""}, research use only`;
  const sub = `${v.designation ? `${v.designation} · ` : ""}${v.chemicalClass}`;
  return `<tr><td class="ap-vialcell" align="center" style="padding:34px 0 22px;background:#ffffff">
<img class="ap-vial" src="${attr(`${site}/email/vials/${v.key}.jpg`)}" width="240" alt="${attr(alt)}" style="display:block;width:240px;height:auto;border:0"></td></tr>
<tr><td class="ap-pad" align="center" style="padding:0 44px 26px">
<p style="${SERIF};margin:0;font-size:24px;line-height:30px;font-weight:600;color:${INK}">${e(v.name)} · ${e(v.strength)}</p>
<p style="${SANS};margin:6px 0 0;font-size:12px;letter-spacing:.2em;font-weight:600;color:${SLATE};text-transform:uppercase">${e(sub)}</p></td></tr>`;
}

export function inviteBox(i: { url: string; label: string; creditDollars: number }): string {
  return `<tr><td class="ap-pad" style="padding:6px 44px 6px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f7ef;border:1px solid #d6e6cc;border-radius:14px"><tr><td style="padding:20px 24px">
<p style="${SANS};margin:0;font-size:15px;line-height:23px;color:${BODY}"><b style="color:${INK}">Working with other researchers?</b> Send them your link. Every colleague who places a first order adds <b style="color:${INK}">$${i.creditDollars}</b> to your store credit. No limit.</p>
<p style="${SANS};margin:14px 0 0;font-size:11px;letter-spacing:.16em;font-weight:600;color:#3f6a2e;text-transform:uppercase">Your invite link</p>
<p class="ap-link" style="${SERIF};margin:4px 0 0;font-size:19px;line-height:25px;font-weight:600;overflow-wrap:anywhere"><a href="${attr(i.url)}" style="color:${RED};text-decoration:none">${e(i.label)}</a></p>
<p style="${SANS};margin:12px 0 0;font-size:12px;line-height:18px;color:${MUTED}">Credit is added once your colleague&#39;s first order ships. Full terms are on auraprotocols.com.</p></td></tr></table></td></tr>`;
}

export function signOff(replyLine: boolean): string {
  const reply = replyLine ? `<p style="${SANS};margin:0 0 14px;font-size:15px;line-height:24px;color:${BODY}">Reply to this email if you have a question about a lot. It comes straight to me.</p>` : "";
  return `<tr><td class="ap-pad" style="padding:${replyLine ? 26 : 24}px 44px 34px">${reply}<p style="${SERIF};margin:0;font-size:17px;color:${INK}">Alvester<br><span style="${SANS};font-size:13px;color:${MUTED}">Aura Protocols</span></p></td></tr>`;
}

export type FrameInput = {
  preview: string; kicker: string; headline: string; intro: string; rows: string;
  footer: { address: string; unsubscribeUrl: string; reason: string };
};

export function brandEmail(site: string, o: FrameInput): string {
  const logo = `<img src="${attr(`${site}/email/aura-logo.png`)}" width="118" height="74" alt="Aura Protocols" style="display:block;border:0">`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(o.kicker)}</title><link href="${FONTS}" rel="stylesheet"><style>${HEAD_STYLE}</style></head><body style="margin:0;padding:0;background:#f3eee8">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${e(o.preview)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3eee8"><tr><td align="center" class="ap-outer" style="padding:28px 12px 40px">
<table role="presentation" class="ap-wrap" width="600" cellpadding="0" cellspacing="0" style="width:600px;background:#ffffff;border-radius:18px;overflow:hidden">
<tr><td class="ap-pad" style="background:#fbe3cf;background-image:linear-gradient(160deg,#fde6d2 0%,#f7dccf 45%,#dfe9f6 100%);padding:30px 44px 34px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td>${logo}</td><td align="right" style="${SANS};font-size:11px;letter-spacing:.18em;color:#8a4a2b;font-weight:600;text-transform:uppercase">${e(o.kicker)}</td></tr></table>
<h1 class="ap-h1" style="${SERIF};margin:26px 0 0;font-size:42px;line-height:46px;font-weight:600;color:${INK};letter-spacing:-.01em">${accent(o.headline)}</h1>
<p style="${SANS};margin:16px 0 0;font-size:16px;line-height:25px;color:${BODY}">${o.intro}</p></td></tr>
${o.rows}
<tr><td class="ap-pad" style="${SANS};background:#faf7f3;border-top:1px solid #efe6dc;padding:20px 44px 24px;font-size:11px;line-height:17px;color:#7a7064">For research use only. Not for human use.<br>You&#39;re getting this because ${e(o.footer.reason)}. <a href="${attr(o.footer.unsubscribeUrl)}" style="color:#7a7064">Unsubscribe</a><br>${e(o.footer.address)}</td></tr>
</table></td></tr></table></body></html>`;
}
