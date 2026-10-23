import { escapeHtml as e, usd } from "@/lib/html";
import type { OrderRow } from "@/lib/orders";
import { ORDERS_EMAIL, SUPPORT_EMAIL } from "@/lib/constants";
import { OFFER_PCT_TEXT } from "@/lib/account/offer";
import { dateLabel } from "@/lib/today/time";
import { compoundTitle } from "@/lib/catalog";
import { PROTECTION_DECLINED_SHORT, PROTECTION_LABEL } from "@/lib/shipping-protection";
import { siteUrl } from "@/lib/supabase/env";

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

export function shell(title: string, body: string, contact: string = SUPPORT_EMAIL): string {
  return `<div style="font-family:Georgia,serif;color:#1C1A15;max-width:560px">
<p style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#A32B1F">Aura Protocols</p>
<h1 style="font-weight:400;font-size:26px;margin:0 0 16px">${e(title)}</h1>${body}
<p style="font-size:12px;color:#4A4438;border-top:1px solid #C9C2AE;padding-top:12px;margin-top:24px">${RUO}<br>Questions: ${e(contact)}</p></div>`;
}

// Customer email about an order: footer and replies go to the orders mailbox.
function orderShell(title: string, body: string): string {
  return shell(title, body, ORDERS_EMAIL);
}
const ORDER_REPLY = { replyTo: ORDERS_EMAIL } as const;

function itemsTable(o: OrderRow): string {
  const rows = (o.order_items ?? []).map((i) =>
    `<tr><td style="padding:6px 0">${e(i.compound_name)} · ${e(i.strength)} · ${i.pack_qty}-pack × ${i.quantity}<br><span style="font-size:12px;color:#4A4438">Lot ${e(i.lot_number)}</span></td><td style="text-align:right">${usd(i.line_total_cents)}</td></tr>`,
  ).join("");
  return `<table style="width:100%;border-collapse:collapse;font-size:14px">${rows}
<tr><td style="padding-top:10px">Subtotal</td><td style="text-align:right">${usd(o.subtotal_cents)}</td></tr>
${o.partner_discount_cents > 0 ? `<tr><td>${o.new_account_discount ? `New-account ${OFFER_PCT_TEXT}` : "Discount code"}</td><td style="text-align:right">−${usd(o.partner_discount_cents)}</td></tr>` : ""}
<tr><td>Shipping</td><td style="text-align:right">${o.shipping_cents ? usd(o.shipping_cents) : "Free"}</td></tr>
<tr><td>${PROTECTION_LABEL}</td><td style="text-align:right">${o.protection === "declined" ? "Declined" : usd(o.insurance_cents)}</td></tr>
<tr><td>Sales tax</td><td style="text-align:right">${usd(o.tax_cents)}</td></tr>
<tr><td><b>Total</b></td><td style="text-align:right"><b>${usd(o.total_cents)}</b></td></tr>
${o.store_credit_cents > 0 ? `<tr><td>Paid with store credit</td><td style="text-align:right">−${usd(o.store_credit_cents)}</td></tr>
<tr><td>Charged</td><td style="text-align:right">${usd(o.total_cents - o.store_credit_cents)}</td></tr>` : ""}</table>${o.protection === "declined" ? `
<p style="font-size:12px;color:#A32B1F">${PROTECTION_LABEL}: ${e(PROTECTION_DECLINED_SHORT)}</p>` : ""}`;
}

function shipTo(o: OrderRow): string {
  return `<p style="font-size:14px">Ship to:<br>${e(o.ship_name)}<br>${e(o.ship_line1)}${o.ship_line2 ? `<br>${e(o.ship_line2)}` : ""}<br>${e(o.ship_city)}, ${e(o.ship_state)} ${e(o.ship_zip)}</p>`;
}

export function orderConfirmationEmail(o: OrderRow) {
  return {
    ...ORDER_REPLY,
    subject: `Order ${o.order_number} confirmed`,
    html: orderShell(`Order ${o.order_number} confirmed`, `<p>Thank you — your payment was received. Each item lists the lot it ships from; the certificate for every lot is on our COA lookup.</p>${itemsTable(o)}${shipTo(o)}`),
  };
}

// No-charge order (seeding, replacement, sample): items, no prices. The usual
// shipped email follows on Ship.
export function noChargeEmail(o: OrderRow) {
  const items = (o.order_items ?? []).map((i) => `<li>${e(i.compound_name)} · ${e(i.strength)} × ${i.pack_qty * i.quantity}</li>`).join("");
  return {
    ...ORDER_REPLY,
    subject: `Order ${o.order_number} is on its way soon`,
    html: orderShell(`Order ${o.order_number}`, `<p>We're sending you the items below at no charge. You'll get a tracking email when they ship. Each item ships from a lot whose certificate is on our COA lookup.</p><ul>${items}</ul>${shipTo(o)}`),
  };
}

// Owner alerts end with a link straight to the order in the admin (Alvester 2026-10-16).
const adminLink = (href: string, label: string) => `<p><a href="${e(href)}" style="color:#A32B1F">${e(label)} →</a></p>`;
const adminOrderLink = (base: string, n: string) => adminLink(`${base}/admin/orders/${encodeURIComponent(n)}`, `Open ${n} in the admin`);

export function ownerNewOrderEmail(o: OrderRow, base: string = siteUrl()) {
  return {
    subject: `New order ${o.order_number} — ${usd(o.total_cents)}`,
    html: shell(`New order ${o.order_number}`, `<p>${e(o.email)}</p>${itemsTable(o)}${shipTo(o)}${adminOrderLink(base, o.order_number)}`),
  };
}

export function shippedEmail(o: OrderRow) {
  const url = o.tracking_number ? trackingUrl(o.carrier ?? "usps", o.tracking_number) : null;
  return {
    ...ORDER_REPLY,
    subject: `Order ${o.order_number} has shipped`,
    html: orderShell(`Order ${o.order_number} has shipped`,
      `<p>${url ? `Tracking: <a href="${e(url)}">${e(o.tracking_number ?? "")}</a>` : "Your order is on its way."}</p>${shipTo(o)}`),
  };
}

export function achFailedEmail(o: OrderRow) {
  return {
    ...ORDER_REPLY,
    subject: `Payment for order ${o.order_number} didn't go through`,
    html: orderShell(`Payment didn't go through`, `<p>Your bank payment for order ${e(o.order_number)} was declined, so the order has been cancelled and nothing was charged. You're welcome to place it again with a card or another bank account.</p>`),
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
    ...ORDER_REPLY,
    subject: `Order ${o.order_number} was cancelled and refunded`,
    html: orderShell(`Order ${o.order_number} cancelled`, `<p>Order ${e(o.order_number)} was cancelled before it shipped and refunded in full: ${parts}.${charged > 0 ? " Card refunds usually appear within 5–10 business days, depending on your bank." : ""}</p><p>Questions about this order? Email ${e(ORDERS_EMAIL)}.</p>`),
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
    ...ORDER_REPLY,
    subject: `Order ${o.order_number} was refunded`,
    html: orderShell(`Order ${o.order_number} refunded`, `<p>We've refunded order ${e(o.order_number)}: ${parts}.</p><p>Questions about this order? Email ${e(ORDERS_EMAIL)}.</p>`),
  };
}

function kitsTable(o: OrderRow): string {
  const items = o.order_items ?? [];
  const title = (i: (typeof items)[number]) => `${e(compoundTitle({ slug: i.compound_slug, name: i.compound_name }))} · ${e(i.strength)}`;
  const rows = items.map((i) =>
    `<tr><td>${title(i)}</td><td>${i.quantity} kit${i.quantity === 1 ? "" : "s"} (${i.pack_qty * i.quantity} vials)</td><td style="text-align:right">${usd(i.line_total_cents)}</td></tr>`).join("");
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
  const refundableLine = cutoff && o.deposit_method === "bank"
    ? `<p>Your deposit is refundable until ${e(cutoff)}. It was paid by bank transfer, so to cancel, reply to this email and we'll refund it by bank transfer.</p>`
    : cutoff
    ? `<p>Your deposit is refundable until ${e(cutoff)} — cancel from your order page.</p>`
    : `<p>Your deposit is refundable until the order-by date — we'll confirm it by email.</p>`;
  return {
    ...ORDER_REPLY,
    subject: `Order ${o.order_number} — deposit received`,
    html: orderShell(`Order ${o.order_number} — deposit received`,
      `<p>Thank you — your deposit of <b>${usd(o.deposit_cents ?? 0)}</b> was received. Your kits are made to order with this production run.</p>${kitsTable(o)}${datesLine}<p>Balance when your lot passes testing: <b>${usd(o.balance_cents ?? 0)}</b> (includes shipping, shipping protection and sales tax). We'll email you a link to pay it; it's due within 7 days.</p>${refundableLine}${shipTo(o)}`),
  };
}

export function wholesaleCancelledEmail(o: OrderRow) {
  return {
    ...ORDER_REPLY,
    subject: `Order ${o.order_number} cancelled — deposit refunded`,
    html: orderShell(`Order ${o.order_number} cancelled`,
      o.refund_destination === "bank"
        ? `<p>Your wholesale order was cancelled. Your deposit of <b>${usd(o.deposit_cents ?? 0)}</b> was paid by bank transfer, so we'll send it back by bank transfer; we'll confirm by email when it's on its way.</p>${kitsTable(o)}`
        : `<p>Your wholesale order was cancelled before its order-by date. Your deposit of <b>${usd(o.deposit_cents ?? 0)}</b> is being refunded to the way you paid; it can take 5–10 business days to appear.</p>${kitsTable(o)}`),
  };
}

// runId: the production run the order joined (its admin page lists every order and kit in it).
export function ownerNewWholesaleOrderEmail(o: OrderRow, d: { runId: string | null; base?: string } = { runId: null }) {
  const base = d.base ?? siteUrl();
  const run = d.runId ? adminLink(`${base}/admin/wholesale/runs/${encodeURIComponent(d.runId)}`, "Open its production run") : adminLink(`${base}/admin/wholesale`, "Production runs");
  return {
    subject: `New wholesale order ${o.order_number} — deposit ${usd(o.deposit_cents ?? 0)}`,
    html: shell(`New wholesale order ${o.order_number}`, `<p>${e(o.email)} · run ${e(o.wholesale_cutoff_on ?? "")} · total ${usd(o.total_cents)}</p>${kitsTable(o)}${shipTo(o)}${adminOrderLink(base, o.order_number)}${run}`),
  };
}

const orderLink = (siteUrl: string, n: string) => `${siteUrl}/order/${encodeURIComponent(n)}`;

// Wholesale quote orders (quote-orders.sql): the customer's link to pay the
// deposit, and the owner's "a transfer is on its way" notice.
export function quoteOrderReadyEmail(o: OrderRow, d: { siteUrl: string; validUntil: string; note: string | null }) {
  const link = orderLink(d.siteUrl, o.order_number);
  return {
    ...ORDER_REPLY,
    subject: `Order ${o.order_number} — your volume price is ready`,
    html: orderShell(`Your volume price is ready`,
      `<p>Your volume price is ready. Paying the deposit confirms the order at this price.</p>${d.note ? `<p>${e(d.note)}</p>` : ""}${kitsTable(o)}<p>Total before tax: <b>${usd(o.total_cents)}</b> (includes shipping protection). Deposit to hold your place in the run: <b>${usd(o.deposit_cents ?? 0)}</b>; the balance is due when your lot passes testing.</p><p><a href="${e(link)}">Add your shipping address and pay the deposit</a> on your order page. This quote is good until <b>${e(dateLabel(d.validUntil))}</b>.</p>`),
  };
}

export function ownerTransferSentEmail(o: OrderRow, d: { payment: "deposit" | "balance"; base?: string }) {
  const base = d.base ?? siteUrl();
  const cents = d.payment === "deposit" ? o.deposit_cents : o.balance_cents;
  return {
    subject: `Bank transfer on its way — ${o.order_number} ${d.payment} ${usd(cents ?? 0)}`,
    html: shell(`Bank transfer on its way`, `<p>${e(o.email)} says the ${d.payment} of <b>${usd(cents ?? 0)}</b> for ${e(o.order_number)} was sent, with ${e(o.order_number)} as the reference. When it reaches the account, open the order and click Record bank transfer.</p>${adminOrderLink(base, o.order_number)}`),
  };
}

// The owner closed a volume-quote request without pricing it.
export function quoteRequestClosedEmail(o: OrderRow, d: { siteUrl: string }) {
  return {
    ...ORDER_REPLY,
    subject: `Order ${o.order_number} — quote request closed`,
    html: orderShell(`Quote request closed`,
      `<p>We've closed your volume-quote request ${e(o.order_number)}. Nothing was charged.</p><p>Reply to this email if you have any questions, or <a href="${e(`${d.siteUrl}/wholesale?step=order`)}">order kits on the order sheet</a>.</p>`),
  };
}

// A volume-quote request we didn't price in time closed on its own.
export function quoteRequestExpiredEmail(d: { orderNumber: string; siteUrl: string }) {
  return {
    ...ORDER_REPLY,
    subject: `Order ${d.orderNumber} — quote request closed`,
    html: orderShell(`Quote request closed`,
      `<p>We're sorry: we couldn't price your volume-quote request ${e(d.orderNumber)} in time, so it has closed. Nothing was charged.</p><p>Reply to this email and we'll price it, or <a href="${e(`${d.siteUrl}/wholesale?step=order`)}">send a new request from the order sheet</a>.</p>`),
  };
}

// The buyer closed a volume-quote request before it was priced (cancelled it, or
// ordered the kits at the order-sheet price instead): don't price it.
export function ownerQuoteRequestClosedEmail(d: { orderNumber: string; name: string; email: string; reason: "customer_cancelled" | "ordered_now"; link: string }) {
  const why = d.reason === "ordered_now" ? "is ordering these kits at the order-sheet price instead" : "cancelled the request";
  return {
    subject: `Quote request ${d.orderNumber} closed by the buyer — no need to price it`,
    html: shell(`Quote request closed`, `<p>${e(d.name)} (${e(d.email)}) ${why}, so ${e(d.orderNumber)} is closed and doesn't need a price.</p><p><a href="${e(d.link)}" style="color:#A32B1F">Open ${e(d.orderNumber)} →</a></p>`),
  };
}

export function wholesaleBalanceDueEmail(o: OrderRow, d: { dueOn: string; siteUrl: string }) {
  const link = orderLink(d.siteUrl, o.order_number);
  return {
    ...ORDER_REPLY,
    subject: `Order ${o.order_number} — your kits passed testing`,
    html: orderShell(`Your kits passed testing`,
      `<p>Your production lot passed independent testing and your kits are set aside for you.</p>${kitsTable(o)}<p>Balance: <b>${usd(o.balance_cents ?? 0)}</b> (includes shipping, shipping protection and sales tax), due by <b>${e(dateLabel(d.dueOn))}</b>.</p><p><a href="${e(link)}">Pay your balance</a> on your order page. Unpaid orders are cancelled after the due date and the deposit is kept.</p>`),
  };
}

export function wholesaleBalanceReminderEmail(o: OrderRow, d: { dueOn: string; siteUrl: string }) {
  return {
    ...ORDER_REPLY,
    subject: `Order ${o.order_number} — balance due ${dateLabel(d.dueOn)}`,
    html: orderShell(`Balance due ${e(dateLabel(d.dueOn))}`,
      `<p>A reminder: the balance of <b>${usd(o.balance_cents ?? 0)}</b> for order ${e(o.order_number)} is due by <b>${e(dateLabel(d.dueOn))}</b>. <a href="${e(orderLink(d.siteUrl, o.order_number))}">Pay it on your order page</a>. After that date the order is cancelled and the deposit is kept.</p>`),
  };
}

export function wholesaleLotFailedEmail(o: OrderRow, d: { strengths: string[]; newShipsAbout: string; siteUrl: string }) {
  const list = d.strengths.map((s) => `<li>${e(s)}</li>`).join("");
  return {
    ...ORDER_REPLY,
    subject: `Order ${o.order_number} — a lot needs re-sourcing`,
    html: orderShell(`A lot needs re-sourcing`,
      `<p>The production lot for the following did not pass our independent testing, so it will not be sold:</p><ul>${list}</ul><p>We are re-sourcing it. New estimated ship date: <b>${e(dateLabel(d.newShipsAbout))}</b>. Nothing is needed from you to keep your order. If you would rather not wait, <a href="${e(orderLink(d.siteUrl, o.order_number))}">cancel on your order page for a full refund of your deposit</a>.</p>`),
  };
}

export function wholesaleForfeitEmail(o: OrderRow) {
  return {
    ...ORDER_REPLY,
    subject: `Order ${o.order_number} cancelled — balance not received`,
    html: orderShell(`Order ${o.order_number} cancelled`,
      `<p>We did not receive the balance for order ${e(o.order_number)} by its due date, so the order was cancelled and the deposit of <b>${usd(o.deposit_cents ?? 0)}</b> was kept, as set out in the wholesale terms.</p>`),
  };
}

export function wholesaleBalanceReceivedEmail(o: OrderRow, d: { shipsAbout: string | null }) {
  return {
    ...ORDER_REPLY,
    subject: `Order ${o.order_number} — balance received`,
    html: orderShell(`Balance received`,
      `<p>Thank you — your balance of <b>${usd(o.balance_cents ?? 0)}</b> was received.</p>${kitsTable(o)}${d.shipsAbout ? `<p>Your kits ship about <b>${e(dateLabel(d.shipsAbout))}</b>, with the lot's certificate. We'll email tracking when they ship.</p>` : ""}${shipTo(o)}`),
  };
}

export function opsAlertEmail(title: string, detail: string) {
  return { subject: `[Aura shop] ${title}`, html: shell(title, `<pre style="white-space:pre-wrap;font-size:13px">${e(detail)}</pre><p style="font-size:12px;color:#4A4438">An automatic alert from the shop. Mark it done on Today in the admin; replies go to ${SUPPORT_EMAIL}.</p>`) };
}

// One per new waitlist sign-up, to the owner (2026-10-23). The subject starts
// with WAITLIST_NOTICE_SUBJECT — the owner's inbox rule files on it, so keep it.
export const WAITLIST_NOTICE_SUBJECT = "Waitlist sign-up";
export function waitlistSignupNotice(n: { email: string; code: string; referrerEmail: string | null; referredBy: string | null; total: number; at: string }) {
  const via = n.referrerEmail ? `${n.referrerEmail} (link ${n.referredBy})` : "Direct (no invite link)";
  const rows = [["Email", n.email], ["Joined", n.at], ["Came through", via], ["Their invite link", `auraprotocols.com/?r=${n.code}`], ["On the list now", String(n.total)]]
    .map(([k, v]) => `<tr><td style="padding:4px 14px 4px 0;color:#4A4438;font-size:13px">${e(k)}</td><td style="padding:4px 0;font-size:14px">${e(v)}</td></tr>`).join("");
  return {
    subject: `${WAITLIST_NOTICE_SUBJECT}: ${n.email}`,
    html: shell("New on the waitlist", `<table role="presentation" style="border-collapse:collapse">${rows}</table><p style="font-size:12px;color:#4A4438">Sent for every new sign-up on auraprotocols.com.</p>`),
  };
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
