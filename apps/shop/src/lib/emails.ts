import { escapeHtml as e, usd } from "@/lib/html";
import type { OrderRow } from "@/lib/orders";
import { SUPPORT_EMAIL } from "@/lib/constants";
import { OFFER_PCT_TEXT } from "@/lib/account/offer";
import { dateLabel } from "@/lib/today/time";

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

// No-charge order (seeding, replacement, sample): items, no prices. The usual
// shipped email follows on Ship.
export function noChargeEmail(o: OrderRow) {
  const items = (o.order_items ?? []).map((i) => `<li>${e(i.compound_name)} · ${e(i.strength)} × ${i.pack_qty * i.quantity}</li>`).join("");
  return {
    subject: `Order ${o.order_number} is on its way soon`,
    html: shell(`Order ${o.order_number}`, `<p>We're sending you the items below at no charge. You'll get a tracking email when they ship. Each item ships from a lot whose certificate is on our COA lookup.</p><ul>${items}</ul>${shipTo(o)}`),
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

// An early fraud warning refunded before shipping (Disputes, Cancel and refund).
export function orderRefundedEmail(o: OrderRow) {
  const charged = o.total_cents - o.store_credit_cents;
  const parts = [
    charged > 0 ? `${usd(charged)} back to your original payment method` : null,
    o.store_credit_cents > 0 ? `${usd(o.store_credit_cents)} back to your store credit` : null,
  ].filter(Boolean).join(" and ");
  return {
    subject: `Order ${o.order_number} was cancelled and refunded`,
    html: shell(`Order ${o.order_number} cancelled`, `<p>Order ${e(o.order_number)} was cancelled before it shipped and refunded in full: ${parts}.${charged > 0 ? " Card refunds usually appear within 5–10 business days, depending on your bank." : ""}</p><p>Questions about this order? Email ${e(SUPPORT_EMAIL)}.</p>`),
  };
}

// A shipped order refunded as a recorded exception (admin Refund…): card part
// back to the card, store credit, or both. Never says "cancelled".
export function orderRefundedAfterShipEmail(o: OrderRow, s: { cardCents: number; creditBackCents: number; cardToCreditCents: number; totalCents: number }) {
  const parts = [
    s.cardCents > 0 ? `${usd(s.cardCents)} back to your original payment method (usually 5–10 business days, depending on your bank)` : null,
    s.creditBackCents + s.cardToCreditCents > 0 ? `${usd(s.creditBackCents + s.cardToCreditCents)} to your store credit, available right away` : null,
  ].filter(Boolean).join(" and ");
  return {
    subject: `Order ${o.order_number} was refunded`,
    html: shell(`Order ${o.order_number} refunded`, `<p>We've refunded order ${e(o.order_number)}: ${parts}.</p><p>Questions about this order? Email ${e(SUPPORT_EMAIL)}.</p>`),
  };
}

function kitsTable(o: OrderRow): string {
  const rows = (o.order_items ?? []).map((i) =>
    `<tr><td>${e(i.compound_name)} · ${e(i.strength)}</td><td>${i.quantity} kit${i.quantity === 1 ? "" : "s"} (${i.pack_qty * i.quantity} vials)</td><td style="text-align:right">${usd(i.line_total_cents)}</td></tr>`).join("");
  return `<table style="width:100%;border-collapse:collapse">${rows}</table>`;
}

// Wholesale (made to order): deposit received, the run's dates, the balance
// to come. `d` (and the cutoff itself) can be missing — a run not yet set —
// in which case the dates sentence is dropped and the refundable line stays
// generic rather than showing an empty date.
export function wholesaleDepositEmail(o: OrderRow, d: { testedAbout: string; shipsAbout: string } | null) {
  const cutoff = o.wholesale_cutoff_on ? dateLabel(o.wholesale_cutoff_on) : null;
  const datesLine = cutoff && d
    ? `<p>Order-by date: <b>${e(cutoff)}</b> · lot tested about ${e(dateLabel(d.testedAbout))} · ships about <b>${e(dateLabel(d.shipsAbout))}</b>.</p>`
    : "";
  const refundableLine = cutoff
    ? `<p>Your deposit is refundable until ${e(cutoff)} — cancel from your order page.</p>`
    : `<p>Your deposit is refundable until the order-by date — we'll confirm it by email.</p>`;
  return {
    subject: `Order ${o.order_number} — deposit received`,
    html: shell(`Order ${o.order_number} — deposit received`,
      `<p>Thank you — your deposit of <b>${usd(o.deposit_cents ?? 0)}</b> was received. Your kits are made to order with this production run.</p>${kitsTable(o)}${datesLine}<p>Balance when your lot passes testing: <b>${usd(o.balance_cents ?? 0)}</b> (includes shipping, insurance and sales tax). We'll email you a link to pay it; it's due within 7 days.</p>${refundableLine}${shipTo(o)}`),
  };
}

export function wholesaleCancelledEmail(o: OrderRow) {
  return {
    subject: `Order ${o.order_number} cancelled — deposit refunded`,
    html: shell(`Order ${o.order_number} cancelled`,
      `<p>Your wholesale order was cancelled before its order-by date. Your deposit of <b>${usd(o.deposit_cents ?? 0)}</b> is being refunded to the way you paid; it can take 5–10 business days to appear.</p>${kitsTable(o)}`),
  };
}

export function ownerNewWholesaleOrderEmail(o: OrderRow) {
  return {
    subject: `New wholesale order ${o.order_number} — deposit ${usd(o.deposit_cents ?? 0)}`,
    html: shell(`New wholesale order ${o.order_number}`, `<p>${e(o.email)} · run ${e(o.wholesale_cutoff_on ?? "")} · total ${usd(o.total_cents)}</p>${kitsTable(o)}${shipTo(o)}`),
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

// Owner added store credit (admin Customers → Adjust credit, "Email the customer").
export function storeCreditAddedEmail(amountCents: number, balanceCents: number, message: string | null, site: string) {
  const title = `${usd(amountCents)} has been added to your account`;
  return {
    subject: `${usd(amountCents)} store credit added to your account`,
    html: shell(title,
      `<p style="font-size:15px;line-height:1.6">Your store credit balance is now <b>${usd(balanceCents)}</b>. To use it, tick <b>Apply store credit</b> at checkout.</p>
${message ? `<p style="font-size:15px;line-height:1.6;border-left:2px solid #C9C2AE;padding-left:12px;color:#4A4438;font-style:italic">${e(message)}</p>` : ""}
<p style="font-size:15px"><a href="${e(site)}/account" style="color:#A32B1F">View your account →</a></p>`),
  };
}
