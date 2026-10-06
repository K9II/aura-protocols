// Dispute evidence built from the records the store keeps (spec
// 2026-10-05-admin-disputes-design.md). Pure: lib/disputes/data.ts gathers the
// facts, the owner edits the text fields, and lib/disputes/pdf.ts draws the
// same sections. Copy here goes to banks: research-use-only wording only.
import type Stripe from "stripe";
import { usd } from "@/lib/html";
import { trackingUrl } from "@/lib/emails";
import { fingerprint, summarizeUserAgent } from "@/lib/customers/rules";
import type { OrderStatus } from "@/lib/order-status";
import { SHOP_LEGAL_NAME } from "@/lib/disputes/constants";
import { EDITABLE_FIELDS, type EvidenceDraft } from "@/lib/disputes/fields";
import { addressText, carrierName, longDate, plural, utcStamp, type Addr } from "@/lib/disputes/format";
import { humanize } from "@/lib/disputes/rules";

// Sentences of the Refund & Dispute Policy (app/refund-policy/page.tsx),
// quoted to the bank. A test keeps them in step with the page.
export const POLICY_EXCERPTS = [
  "You may cancel any order for a full refund until it ships.",
  "Once an order has shipped it cannot be cancelled, returned, or refunded.",
  "Approved claims receive one replacement or reshipment of the affected items.",
  "You agreed when you created your account to contact us before filing a payment dispute.",
] as const;

export type EvidenceLot = { lotNumber: string; vials: number; purityPct: number | null; method: string | null; coaUrl: string | null };
export type EvidenceItem = { name: string; strength: string; vials: number; lineTotalCents: number; lots: EvidenceLot[] };
export type EvidenceFacts = {
  stripeDisputeId: string; reason: string; amountCents: number; openedAt: string;
  cardBrand: string | null; cardLast4: string | null; billingAddress: string | null;
  order: {
    number: string; status: OrderStatus; email: string; createdAt: string; paidAt: string | null; ruoConfirmedAt: string;
    ship: Addr; carrier: string | null; tracking: string | null; shippedAt: string | null;
    subtotalCents: number; discountCents: number; shippingCents: number; insuranceCents: number; taxCents: number; totalCents: number; creditCents: number;
  };
  items: EvidenceItem[];
  customer: { name: string; email: string; createdAt: string; lastSignInAt: string | null };
  agreement: { agreedAt: string; termsVersion: string; age21: boolean; ruo: boolean; disputePolicy: boolean; ipHash: string | null; userAgent: string | null } | null;
  priorOrders: Array<{ number: string; paidAt: string; disputed: boolean }>;
  site: string;
};
// Every text field we send to Stripe: the 8 the owner edits + 4 rebuilt from the records at each save.
export type EvidenceText = EvidenceDraft & { billing_address: string; refund_policy_disclosure: string; refund_refusal_explanation: string; access_activity_log: string };
export type FileField = "uncategorized_file" | "receipt" | "shipping_documentation";

export type LetterKind = "not_received" | "fraud" | "unacceptable" | "credit" | "general";
export function letterKind(reason: string): LetterKind {
  switch (reason) {
    case "product_not_received": return "not_received";
    case "fraudulent": case "unrecognized": return "fraud";
    case "product_unacceptable": return "unacceptable";
    case "credit_not_processed": return "credit";
    default: return "general";
  }
}
export const LETTER_FOR: Record<LetterKind, string> = {
  not_received: "not received", fraud: "fraud", unacceptable: "not as described", credit: "credit not processed", general: "a general dispute",
};

const sentence = (...xs: Array<string | null | false | undefined>): string => xs.filter(Boolean).join(" ");
const joinAnd = (xs: string[]): string =>
  xs.length <= 1 ? xs.join("") : xs.length === 2 ? `${xs[0]} and ${xs[1]}` : `${xs.slice(0, -1).join(", ")}, and ${xs[xs.length - 1]}`;
const cardText = (f: EvidenceFacts): string | null => (f.cardLast4 ? `${f.cardBrand ? humanize(f.cardBrand) : "Card"} ending ${f.cardLast4}` : null);
const paidText = (f: EvidenceFacts): string => (f.order.paidAt ? `, paid ${longDate(f.order.paidAt)}` : "");

function lotsText(i: EvidenceItem, withPurity: boolean): string {
  if (!i.lots.length) return "lot on file";
  return i.lots.map((l) => `lot ${l.lotNumber}${withPurity && l.purityPct != null ? `, ${l.purityPct}%${l.method ? ` ${l.method}` : ""}` : ""}`).join("; ");
}
const itemsText = (f: EvidenceFacts, withPurity = false): string =>
  f.items.map((i) => `${i.name} ${i.strength} (${lotsText(i, withPurity)}, ${plural(i.vials, "vial")})`).join("; ");

const CONTACT = "Our records show no contact from the cardholder about this order before the dispute.";
const INSURANCE = "Every order includes shipping insurance: a package the carrier confirms lost is replaced once the customer reports it to us.";
const LOT_TESTING = "Each lot is tested by an independent laboratory before it is offered for sale, and its certificate of analysis is published by lot number.";
const NO_RETURNS = "Our Refund & Dispute Policy, agreed at sign-up, states that once an order has shipped it cannot be cancelled, returned, or refunded, because research materials that have left our control can't be restocked or recertified.";
const NO_REFUND = "No refund is owed. Our Refund & Dispute Policy, agreed at sign-up, allows cancellation for a full refund until an order ships; once an order has shipped it cannot be cancelled, returned, or refunded.";

function trackingLine(f: EvidenceFacts): string | null {
  const o = f.order;
  return o.shippedAt && o.tracking ? `Carrier tracking: ${trackingUrl(o.carrier ?? "usps", o.tracking)}` : null;
}

// We record shipping, not delivery: the letter cites the carrier's tracking
// and the owner adds a delivery date if they have one.
function shipPara(f: EvidenceFacts, subject: string): string {
  const o = f.order;
  if (!o.shippedAt) return "The order has not shipped. Under our Refund & Dispute Policy it can still be cancelled for a full refund.";
  const carrier = carrierName(o.carrier);
  return `Our records show ${subject} was shipped on ${longDate(o.shippedAt)}${carrier ? ` by ${carrier}` : ""}${o.tracking ? ` (tracking ${o.tracking})` : ""} to the name and address the cardholder entered at checkout: ${addressText(o.ship)}.`;
}

function agreementPara(f: EvidenceFacts): string {
  const c = f.customer, a = f.agreement;
  const checkout = `At checkout on ${longDate(f.order.ruoConfirmedAt)} they confirmed again that the order was for laboratory research use only.`;
  if (!a) return sentence(`The order was placed from the cardholder's account with us (${c.email}), created on ${longDate(c.createdAt)}.`, checkout);
  const confirmed = [
    a.age21 && "they are 21 or older", a.ruo && "the products are for laboratory research use only",
    a.disputePolicy && "they would contact us before filing a payment dispute",
  ].filter((x): x is string => !!x);
  return sentence(
    `The cardholder created an account with us (${c.email}) on ${longDate(c.createdAt)} and, before any purchase, agreed to our Terms and our Refund & Dispute Policy (version ${a.termsVersion})${confirmed.length ? `, confirming that ${joinAnd(confirmed)}` : ""}.`,
    checkout, "The timestamped agreement record is attached.",
  );
}

function priorPara(f: EvidenceFacts): string | null {
  const p = f.priorOrders.filter((x) => !x.disputed);
  if (!p.length) return null;
  return `The same account has ${plural(p.length, "earlier order")} that ${p.length === 1 ? "was" : "were"} paid and not disputed: ${p.map((x) => `${x.number} (${longDate(x.paidAt)})`).join(", ")}.`;
}

const productsPara = (f: EvidenceFacts): string =>
  `The order contained research chemicals sold for laboratory research use only, not for human or animal use: ${itemsText(f)}. Each lot has an independent certificate of analysis, linked in the attached document.`;

function letterBody(f: EvidenceFacts): Array<string | null> {
  const n = f.order.number, shipped = !!f.order.shippedAt;
  const amount = `${usd(f.amountCents)}${paidText(f)}`;
  switch (letterKind(f.reason)) {
    case "not_received":
      return [`The cardholder states that order ${n} was not received. ${shipPara(f, "it")}`, trackingLine(f), shipped ? INSURANCE : null, agreementPara(f), CONTACT, productsPara(f)];
    case "fraud":
      return [
        sentence(f.reason === "unrecognized" ? `The cardholder states they do not recognize order ${n} (${amount}).` : `The cardholder states they did not authorize order ${n} (${amount}).`,
          "The purchase was made from the cardholder's own account with us."),
        agreementPara(f), priorPara(f), shipPara(f, `order ${n}`), trackingLine(f), productsPara(f),
      ];
    case "unacceptable":
      return [`The cardholder states that order ${n} was not as described.`, productsPara(f), LOT_TESTING, shipped ? NO_RETURNS : null, shipPara(f, `order ${n}`), trackingLine(f), agreementPara(f), CONTACT];
    case "credit":
      return [`The cardholder states that a refund for order ${n} was not processed.`, shipped ? NO_REFUND : null, shipPara(f, `order ${n}`), trackingLine(f), agreementPara(f), CONTACT];
    case "general":
      return [`The cardholder has disputed order ${n} (${amount}).`, shipPara(f, `order ${n}`), trackingLine(f), agreementPara(f), CONTACT, productsPara(f)];
  }
}

export function coverLetter(f: EvidenceFacts): string {
  return ["To the card issuer,", ...letterBody(f), "We ask that the dispute be decided in our favour.", SHOP_LEGAL_NAME]
    .filter((x): x is string => !!x).join("\n\n");
}

export const productDescription = (f: EvidenceFacts): string =>
  `Research chemicals for laboratory research use only, not for human or animal use: ${itemsText(f, true)}. Each lot has an independent certificate of analysis.`;

export function activityLog(f: EvidenceFacts): string {
  const c = f.customer, a = f.agreement, o = f.order;
  const yes = (b: boolean) => (b ? "yes" : "no");
  const card = cardText(f);
  return [
    `Account created: ${utcStamp(c.createdAt)} (${c.email})`,
    a
      ? `Agreement accepted: ${utcStamp(a.agreedAt)} · terms version ${a.termsVersion} · 21 or older: ${yes(a.age21)} · research use only: ${yes(a.ruo)} · Refund & Dispute Policy, including contacting us before a dispute: ${yes(a.disputePolicy)} · IP fingerprint (salted SHA-256): ${fingerprint(a.ipHash)} · device: ${summarizeUserAgent(a.userAgent)}`
      : "Agreement accepted: no record on file",
    c.lastSignInAt ? `Last sign-in: ${utcStamp(c.lastSignInAt)}` : null,
    `Order ${o.number} placed: ${utcStamp(o.createdAt)} · research use confirmed at checkout: ${utcStamp(o.ruoConfirmedAt)}`,
    o.paidAt ? `Order ${o.number} paid: ${utcStamp(o.paidAt)}${card ? ` · ${card}` : ""}` : null,
    o.shippedAt ? `Order ${o.number} shipped: ${utcStamp(o.shippedAt)}${o.tracking ? ` · ${carrierName(o.carrier)} ${o.tracking}` : ""}` : null,
    ...f.priorOrders.map((p) => `Earlier order ${p.number} paid: ${utcStamp(p.paidAt)} (${p.disputed ? "disputed" : "not disputed"})`),
  ].filter((x): x is string => !!x).join("\n");
}

const quote = (e: string): string => `"${e}"`;

export function policyDisclosure(f: EvidenceFacts): string {
  const a = f.agreement;
  return [
    a ? `The cardholder agreed to our Refund & Dispute Policy when creating their account on ${longDate(a.agreedAt)} (a required checkbox, recorded with a timestamp; terms version ${a.termsVersion}).`
      : "Our Refund & Dispute Policy is part of the agreement every account accepts at sign-up.",
    `The policy is linked in the footer of every page of our store, including checkout: ${f.site}/refund-policy`,
    `It states: ${POLICY_EXCERPTS.map(quote).join(" ")}`,
  ].join("\n\n");
}

export function refusalExplanation(f: EvidenceFacts): string {
  const o = f.order;
  if (!o.shippedAt) return `Order ${o.number} has not shipped. Under our Refund & Dispute Policy it can be cancelled for a full refund until it ships.`;
  return `Order ${o.number} shipped on ${longDate(o.shippedAt)}. Our Refund & Dispute Policy, which the cardholder agreed to at sign-up, allows a full refund until an order ships; once an order has shipped it cannot be cancelled, returned, or refunded, because research materials that have left our control can't be restocked or recertified. Loss or damage in transit is covered by shipping insurance with a replacement.`;
}

// buildEvidence(order, agreement, shipped lots, policy, reason) from the spec:
// every Stripe text field, before the owner's edits.
export function buildEvidence(f: EvidenceFacts): EvidenceText {
  const o = f.order;
  return {
    uncategorized_text: coverLetter(f),
    shipping_carrier: o.shippedAt ? carrierName(o.carrier) : "",
    shipping_tracking_number: o.shippedAt ? o.tracking ?? "" : "",
    shipping_date: o.shippedAt ? longDate(o.shippedAt) : "",
    shipping_address: addressText(o.ship),
    customer_name: f.customer.name,
    customer_email_address: f.customer.email,
    product_description: productDescription(f),
    billing_address: f.billingAddress ?? "",
    refund_policy_disclosure: policyDisclosure(f),
    refund_refusal_explanation: refusalExplanation(f),
    access_activity_log: activityLog(f),
  };
}

export const editable = (e: EvidenceText): EvidenceDraft => Object.fromEntries(EDITABLE_FIELDS.map((k) => [k, e[k]])) as EvidenceDraft;
export const evidenceChars = (e: EvidenceText): number => Object.values(e).reduce((s, v) => s + v.length, 0);

// The customer's own data, blanked before the compliance scan (their street
// name is not our copy).
export function customerStrings(f: EvidenceFacts): string[] {
  const s = f.order.ship;
  return [f.customer.name, f.customer.email, f.order.email, s.name, s.line1, s.line2 ?? "", s.city, addressText(s), f.billingAddress ?? ""]
    .filter((x) => x.trim().length > 0);
}

// The PDF goes in uncategorized_file, plus the field Stripe's reason guidance
// asks for. One upload per field, so no file id is used twice.
export function fileFields(reason: string, shipped: boolean): FileField[] {
  const k = letterKind(reason);
  if (k === "not_received" && shipped) return ["uncategorized_file", "shipping_documentation"];
  if (k === "fraud") return ["uncategorized_file", "receipt"];
  return ["uncategorized_file"];
}

export function toStripeEvidence(e: EvidenceText, files: Partial<Record<FileField, string>>): Stripe.DisputeUpdateParams.Evidence {
  const out: Stripe.DisputeUpdateParams.Evidence = {};
  for (const [k, v] of Object.entries(e) as Array<[keyof EvidenceText, string]>) if (v.trim()) out[k] = v;
  for (const [k, v] of Object.entries(files) as Array<[FileField, string | undefined]>) if (v) out[k] = v;
  return out;
}

export type PdfSection = { title: string; lines: string[] };
// The evidence PDF's sections (mock screen 2's preview shows each one's first line).
export function evidenceSections(f: EvidenceFacts): PdfSection[] {
  const o = f.order;
  const totals = [
    `Subtotal ${usd(o.subtotalCents)}`, o.discountCents ? `discount -${usd(o.discountCents)}` : null, `shipping ${usd(o.shippingCents)}`,
    `shipping insurance ${usd(o.insuranceCents)}`, `sales tax ${usd(o.taxCents)}`, `total ${usd(o.totalCents)}`,
    o.creditCents ? `paid with store credit ${usd(o.creditCents)}` : null,
  ].filter(Boolean).join(" · ");
  const lots = f.items.flatMap((i) => i.lots.map((l) => [
    l.lotNumber, `${i.name} ${i.strength}`, plural(l.vials, "vial"),
    l.purityPct != null ? `${l.purityPct}%${l.method ? ` ${l.method}` : ""}` : null,
    l.coaUrl ? `certificate: ${l.coaUrl}` : "certificate on request",
  ].filter(Boolean).join(" · ")));
  const track = trackingLine(f);
  return [
    { title: "Receipt", lines: [
      [`Order ${o.number}`, `placed ${utcStamp(o.createdAt)}`, o.paidAt ? `paid ${utcStamp(o.paidAt)}` : null, cardText(f)].filter(Boolean).join(" · "),
      ...f.items.map((i) => `${i.name} ${i.strength} · ${plural(i.vials, "vial")} · ${usd(i.lineTotalCents)}`),
      totals,
      [`Customer: ${f.customer.name}`, f.customer.email, f.billingAddress ? `billing address ${f.billingAddress}` : null].filter(Boolean).join(" · "),
    ] },
    { title: "Shipping and delivery", lines: o.shippedAt
      ? [
        [`Shipped ${utcStamp(o.shippedAt)}${o.carrier ? ` by ${carrierName(o.carrier)}` : ""}`, o.tracking ? `tracking ${o.tracking}` : null].filter(Boolean).join(" · "),
        `Ship to: ${addressText(o.ship)}`, ...(track ? [track] : []),
      ]
      : [`Not shipped yet. Ship to: ${addressText(o.ship)}`] },
    { title: o.shippedAt ? "Lots shipped" : "Lots held for this order", lines: lots.length ? lots : ["No lot recorded."] },
    { title: "Account agreement", lines: activityLog(f).split("\n") },
    { title: "Policy excerpts", lines: [
      `Terms of Service and Refund & Dispute Policy${f.agreement ? `, version ${f.agreement.termsVersion}` : ""}: ${f.site}/terms and ${f.site}/refund-policy`,
      ...POLICY_EXCERPTS.map(quote),
    ] },
  ];
}
