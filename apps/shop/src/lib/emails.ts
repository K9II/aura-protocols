import { escapeHtml as e, usd } from "@/lib/html";
import type { OrderRow } from "@/lib/orders";
import { SUPPORT_EMAIL } from "@/lib/constants";
import { OFFER_PCT_TEXT } from "@/lib/account/offer";

export const CARRIERS = ["usps", "ups", "fedex", "dhl"] as const;
export type Carrier = (typeof CARRIERS)[number];

export function trackingUrl(carrier: string, number: string): string {
  const n = encodeURIComponent(number);
  switch (carrier) {
    case "ups": return `https://www.ups.com/track?tracknum=${n}`;
    case "fedex": return `https://www.fedex.com/fedextrack/?trknbr=${n}`;
    case "dhl": return `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${n}`;
    default: return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}`;
  }
}

const RUO = "All products are sold for laboratory research use only. Not for human or animal consumption.";

export function shell(title: string, body: string): string {
  return `<div style="font-family:Georgia,serif;color:#1C1A15;max-width:560px">
<p style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#A32B1F">Aura Protocols</p>
<h1 style="font-weight:400;font-size:26px;margin:0 0 16px">${e(title)}</h1>${body}
<p style="font-size:12px;color:#4A4438;border-top:1px solid #C9C2AE;padding-top:12px;margin-top:24px">${RUO}<br>Questions: ${e(SUPPORT_EMAIL)}</p></div>`;
}

function itemsTable(o: OrderRow): string {
  const rows = (o.order_items ?? []).map((i) =>
    `<tr><td style="padding:6px 0">${e(i.compound_name)} · ${e(i.strength)} · ${i.pack_qty}-pack × ${i.quantity}<br><span style="font-size:12px;color:#4A4438">Lot ${e(i.lot_number)}</span></td><td style="text-align:right">${usd(i.line_total_cents)}</td></tr>`,
  ).join("");
  return `<table style="width:100%;border-collapse:collapse;font-size:14px">${rows}
<tr><td style="padding-top:10px">Subtotal</td><td style="text-align:right">${usd(o.subtotal_cents)}</td></tr>
${o.partner_discount_cents > 0 ? `<tr><td>${o.new_account_discount ? `New-account ${OFFER_PCT_TEXT}` : "Discount code"}</td><td style="text-align:right">−${usd(o.partner_discount_cents)}</td></tr>` : ""}
<tr><td>Shipping</td><td style="text-align:right">${o.shipping_cents ? usd(o.shipping_cents) : "Free"}</td></tr>
<tr><td>Shipping insurance</td><td style="text-align:right">${usd(o.insurance_cents)}</td></tr>
<tr><td>Sales tax</td><td style="text-align:right">${usd(o.tax_cents)}</td></tr>
<tr><td><b>Total</b></td><td style="text-align:right"><b>${usd(o.total_cents)}</b></td></tr>
${o.store_credit_cents > 0 ? `<tr><td>Paid with store credit</td><td style="text-align:right">−${usd(o.store_credit_cents)}</td></tr>
<tr><td>Charged</td><td style="text-align:right">${usd(o.total_cents - o.store_credit_cents)}</td></tr>` : ""}</table>`;
}

function shipTo(o: OrderRow): string {
  return `<p style="font-size:14px">Ship to:<br>${e(o.ship_name)}<br>${e(o.ship_line1)}${o.ship_line2 ? `<br>${e(o.ship_line2)}` : ""}<br>${e(o.ship_city)}, ${e(o.ship_state)} ${e(o.ship_zip)}</p>`;
}

export function orderConfirmationEmail(o: OrderRow) {
  return {
    subject: `Order ${o.order_number} confirmed`,
    html: shell(`Order ${o.order_number} confirmed`, `<p>Thank you — your payment was received. Each item lists the lot it ships from; the certificate for every lot is on our COA lookup.</p>${itemsTable(o)}${shipTo(o)}`),
  };
}

export function ownerNewOrderEmail(o: OrderRow) {
  return {
    subject: `New order ${o.order_number} — ${usd(o.total_cents)}`,
    html: shell(`New order ${o.order_number}`, `<p>${e(o.email)}</p>${itemsTable(o)}${shipTo(o)}`),
  };
}

export function shippedEmail(o: OrderRow) {
  const url = o.tracking_number ? trackingUrl(o.carrier ?? "usps", o.tracking_number) : null;
  return {
    subject: `Order ${o.order_number} has shipped`,
    html: shell(`Order ${o.order_number} has shipped`,
      `<p>${url ? `Tracking: <a href="${e(url)}">${e(o.tracking_number ?? "")}</a>` : "Your order is on its way."}</p>${shipTo(o)}`),
  };
}

export function achFailedEmail(o: OrderRow) {
  return {
    subject: `Payment for order ${o.order_number} didn't go through`,
    html: shell(`Payment didn't go through`, `<p>Your bank payment for order ${e(o.order_number)} was declined, so the order has been cancelled and nothing was charged. You're welcome to place it again with a card or another bank account.</p>`),
  };
}

export function opsAlertEmail(title: string, detail: string) {
  return { subject: `[Aura shop] ${title}`, html: shell(title, `<pre style="white-space:pre-wrap;font-size:13px">${e(detail)}</pre>`) };
}

export function verifyEmail(url: string) {
  return {
    subject: "Confirm your email",
    html: shell("Confirm your email",
      `<p style="font-size:15px;line-height:1.6">Confirm this address to finish setting up your Aura Protocols account. You'll need it confirmed before your first order.</p>
<p style="font-size:15px"><a href="${e(url)}" style="color:#A32B1F">Confirm my email →</a></p>
<p style="font-size:13px;color:#4A4438">Didn't create an account? Ignore this email.</p>`),
  };
}
