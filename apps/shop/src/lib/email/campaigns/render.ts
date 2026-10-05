// A campaign as an email, in the approved marketing style. Pure: the editor's
// live preview (browser) and the sender (server) both call this.
import { escapeHtml as e } from "@/lib/html";
import { frameHtml, lotTable, p, SIGN, type AlertLot, type Msg } from "@/lib/emails-marketing";
import { kicker, paragraphs, type CampaignContent, type CampaignKind } from "@/lib/email/campaigns/rules";
import { shortDate } from "@/lib/discounts/time";

export type RenderCode = { code: string; summary: string; endsAt: string | null; oncePerCustomer: boolean; minOrderCents: number | null };
export type RenderInput = { kind: CampaignKind; subject: string; previewText: string; content: CampaignContent; lots: AlertLot[]; code: RenderCode | null };
export type RenderCtx = { site: string; unsubscribeUrl: string; mailingAddress: string };

const INK = "#1C1A15", SOFT = "#4A4438";

function codeBox(c: RenderCode): string {
  const terms = [
    c.endsAt ? `Ends ${shortDate(c.endsAt)}` : null,
    c.oncePerCustomer ? "one use per account" : null,
    c.minOrderCents ? `orders of $${(c.minOrderCents / 100).toLocaleString("en-US")} or more` : null,
  ].filter(Boolean).join(" · ");
  return `<table role="presentation" style="border:1px solid ${INK};border-collapse:collapse;margin:0 0 18px"><tr><td style="padding:10px 14px;font-family:'Courier New',monospace;font-size:12px;letter-spacing:.1em">CODE · ${e(c.summary.toUpperCase())}<br><span style="font-size:20px;letter-spacing:.04em;color:${INK}"><b>${e(c.code)}</b></span>${terms ? `<br><span style="color:${SOFT};letter-spacing:0">${e(terms)}</span>` : ""}</td></tr></table>`;
}

function button(site: string, label: string, path: string): string {
  return `<p style="margin:2px 0 16px"><a href="${(site + path).replace(/"/g, "&quot;")}" style="display:inline-block;background:${INK};color:#EDE9E0;padding:10px 18px;font-family:Georgia,serif;font-size:12px;letter-spacing:.08em;text-transform:uppercase;text-decoration:none">${e(label)}</a></p>`;
}

export function campaignEmail(c: RenderInput, ctx: RenderCtx, opts: { test?: boolean } = {}): Msg {
  const body = paragraphs(c.content.body).map((t) => p(e(t))).join("")
    + (c.kind === "new_lots" && c.lots.length ? lotTable(ctx.site, c.lots) : "")
    + (c.kind === "promotion" && c.code ? codeBox(c.code) : "")
    + (c.content.buttonLabel && c.content.buttonPath ? button(ctx.site, c.content.buttonLabel, c.content.buttonPath) : "")
    + SIGN;
  return {
    subject: `${opts.test ? "[Test] " : ""}${c.subject}`,
    html: frameHtml({
      label: kicker(c.kind, c.code?.endsAt ?? null), title: c.content.headline, body,
      footer: { address: ctx.mailingAddress, unsubscribeUrl: ctx.unsubscribeUrl }, preview: c.previewText || undefined,
    }),
  };
}
