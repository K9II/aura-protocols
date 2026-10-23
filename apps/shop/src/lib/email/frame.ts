// The marketing email frame (2026-10-23, mock https://claude.ai/artifact/SGTmkNtKkywUJhBxihHEDQ):
// warm gradient top, white 600 px card, photo vials, Alvester's sign-off. Pure — returns
// a whole HTML document (the head carries the phone rules). Images are absolute URLs to
// public/email/ on the site. Every block is a <tr> for the card's table.
import { escapeHtml as e } from "@/lib/html";
import { photoVial, type PhotoVialKey } from "@/lib/email/photo-vials";
import { SAMPLE_PANEL, SAMPLE_PANEL_COUNT } from "@/lib/coa/sample-panel";

const INK = "#1C1A15", BODY = "#3a342a", RED = "#A32B1F", MUTED = "#6a6152", SLATE = "#4B5560", GREEN = "#2f6b3a", FAINT = "#7a7064";
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
.ap-gridpad{padding:24px 6px 4px!important}
.ap-cell{width:48%!important;margin-left:1%!important;margin-right:1%!important}
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

// The coming-soon page's turning vial, recorded as a GIF (scripts/email-vial-turn.mjs).
// Outlook shows its first frame: the front.
export function turningVialBlock(site: string): string {
  const v = photoVial("bpc-157");
  return `<tr><td class="ap-vialcell" align="center" style="padding:30px 0 18px;background:#ffffff">
<img class="ap-vial" src="${attr(`${site}/email/bpc-turn.gif`)}" width="240" alt="An Aura Protocols BPC-157 vial turning to show the lot QR code on the back of its label" style="display:block;width:240px;height:auto;border:0"></td></tr>
<tr><td class="ap-pad" align="center" style="padding:0 44px 6px">
<p style="${SERIF};margin:0;font-size:24px;line-height:30px;font-weight:600;color:${INK}">${e(v.name)} · ${e(v.strength)}</p>
<p style="${SANS};margin:6px 0 0;font-size:12px;letter-spacing:.2em;font-weight:600;color:${SLATE};text-transform:uppercase">${e(v.chemicalClass)}</p></td></tr>`;
}

// The standard stamp (2026-10-23): one light testing mention per email.
export function sticker(): string {
  return `<tr><td align="center" style="padding:4px 44px 26px"><table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto"><tr>
<td style="background:#fff7f1;border:1px solid #f1d9c9;border-radius:14px;padding:12px 20px;text-align:left">
<span style="${SERIF};display:block;font-size:20px;line-height:22px;font-weight:700;color:${INK}">Scan the vial</span>
<span style="${SANS};display:block;margin-top:5px;font-size:11px;letter-spacing:.16em;font-weight:600;color:${RED};text-transform:uppercase">See its lab report</span></td></tr></table></td></tr>`;
}

// The labelled sample certificate (lib/coa/sample-panel.ts) — what the vial's code opens.
export function sampleCertificate(): string {
  const cell = "border-bottom:1px solid #e3e9f2;vertical-align:top";
  const rows = SAMPLE_PANEL.map(([group, tests]) =>
    `<tr><td colspan="2" style="${SANS};padding:14px 0 4px;font-size:10px;letter-spacing:.18em;font-weight:600;color:${FAINT};text-transform:uppercase;border-bottom:1px solid #e3e9f2">${e(group)}</td></tr>`
    + tests.map(([t, r, d]) => `<tr><td style="${SANS};padding:7px 8px 7px 0;font-size:14px;line-height:18px;color:${INK};${cell}">${e(t)}</td>`
      + `<td align="right" style="${SANS};padding:7px 0;font-size:13px;line-height:18px;font-weight:600;color:${GREEN};${cell}">&#10003; ${e(r)}${d ? `<br><span style="font-weight:400;font-size:11px;color:${FAINT}">${e(d)}</span>` : ""}</td></tr>`).join(""),
  ).join("");
  return `<tr><td class="ap-pad" style="padding:18px 44px 6px">
<p style="${SERIF};margin:0 0 12px;font-size:21px;line-height:26px;font-weight:600;color:${INK};text-align:center">${accent("And this is what the code *opens.*")}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f9fc;border:1px solid #dbe3ee;border-radius:14px"><tr><td style="padding:18px 20px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td style="${SANS};font-size:10px;letter-spacing:.18em;font-weight:600;color:${SLATE};text-transform:uppercase">Certificate of analysis<br><span style="${SERIF};font-size:18px;letter-spacing:0;text-transform:none;color:${INK}">Sample <span style="font-weight:400;color:${MUTED}">· what each lot gets</span></span></td>
<td align="right" style="vertical-align:top"><span style="${SANS};display:inline-block;background:#e6f2e2;color:${GREEN};border-radius:999px;padding:5px 10px;font-size:12px;font-weight:600;white-space:nowrap">&#10003; ${SAMPLE_PANEL_COUNT} checks</span></td></tr></table>
<p style="${SANS};margin:12px 0 0;font-size:13px;line-height:19px;color:${BODY}"><b style="color:${INK}">BPC-157 · 10 mg</b><br>Independent US lab · ISO/IEC 17025-accredited</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:4px">${rows}</table>
<p style="${SANS};margin:14px 0 0;font-size:11px;line-height:16px;letter-spacing:.14em;font-weight:600;color:${RED};text-transform:uppercase">Up to a ten-point panel · ISO/IEC 17025-accredited US lab</p>
<p style="${SANS};margin:4px 0 0;font-size:12px;line-height:18px;color:${MUTED}">Each real certificate links to the lab&#39;s own verify page.</p>
</td></tr></table></td></tr>`;
}

// Photo vials side by side: 170 px cells (three across), two across on phones.
export function vialGrid(site: string, keys: PhotoVialKey[], linked: boolean): string {
  const cells = keys.map((key) => {
    const v = photoVial(key);
    const href = `${site}/products/${v.slug}`;
    const alt = `Aura Protocols vial: ${v.name}, ${v.strength}${v.designation ? ` (${v.designation})` : ""}, research use only`;
    let img = `<img src="${attr(`${site}/email/vials/${v.key}.jpg`)}" width="170" alt="${attr(alt)}" style="display:block;width:100%;height:auto;border:0">`;
    if (linked) img = `<a href="${attr(href)}" style="text-decoration:none">${img}</a>`;
    const view = linked ? `<p style="${SANS};margin:6px 0 0;font-size:13px;line-height:17px;font-weight:600"><a href="${attr(href)}" style="color:${RED};text-decoration:none">View &rarr;</a></p>` : "";
    return `<div class="ap-cell" style="display:inline-block;vertical-align:top;width:170px;margin:0 0 24px;text-align:center">${img}`
      + `<p style="${SERIF};margin:6px 0 0;font-size:15px;line-height:19px;font-weight:600;color:${INK}">${e(v.name)}</p>`
      + `<p style="${SANS};margin:4px 0 0;font-size:11px;line-height:15px;letter-spacing:.16em;font-weight:600;color:${SLATE};text-transform:uppercase">${e(v.designation ? `${v.designation} · ` : "")}${e(v.strength)}</p>${view}</div>`;
  }).join("");
  return `<tr><td class="ap-gridpad" align="center" style="padding:30px 30px 6px;background:#ffffff"><div style="font-size:0;line-height:0">${cells}</div></td></tr>`;
}

export function button(site: string, label: string, path: string, pad = "30px 44px 8px"): string {
  return `<tr><td align="center" style="padding:${pad}"><a href="${attr(`${site}${path}`)}" style="${SANS};display:inline-block;background:${INK};color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:15px 30px;border-radius:10px">${e(label)}</a></td></tr>`;
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
