// Optional shipping protection (2026-10-13): included at checkout unless the
// customer unticks it (PROTECTION_DEFAULT; Alvester's call — InsureShip advises
// opt-in, so revisit when signing a provider). A protected order lost or
// damaged in transit gets one replacement (we self-insure until a provider
// such as InsureShip is signed). An
// unprotected order ships at the customer's risk once the carrier has it.
// Every customer-facing sentence about it lives here, so checkout, emails,
// the order page and dispute evidence say the same thing. Pure.
import { SHIPPING_PROTECTION_USD, formatUsd } from "@/lib/cart";

// Bump when any wording below changes; each order records the version it showed.
export const PROTECTION_TERMS_VERSION = "2026-10-19";
export type ProtectionChoice = "accepted" | "declined";

export const PROTECTION_LABEL = "Shipping protection";
export const PROTECTION_PRICE_TEXT = formatUsd(SHIPPING_PROTECTION_USD);
export const DAMAGE_REPORT_HOURS = 48;
// The checkout box starts ticked; unticking it is the decline.
export const PROTECTION_DEFAULT = true;

export const PROTECTION_OFFER =
  "Covers loss or damage in transit. If a protected order is confirmed lost by the carrier or arrives damaged, we send one replacement at no charge.";

export const PROTECTION_DECLINED_NOTICE =
  "Your order will ship without shipping protection. Once the carrier has your package, Aura Protocols is not responsible for loss, theft or damage in transit, including packages marked delivered. We can't replace or refund unprotected orders; we'll share tracking and carrier details to help you contact the carrier.";

// Product page, Before ordering (2026-10-19): wrong items are always put right; transit damage
// only on a protected order — it used to promise a replacement for any damaged item.
export const PROTECTION_PDP_NOTE =
  `Wrong item? We send the correct one. Damaged in transit? Covered when your order has shipping protection. Either way, photograph the packaging and vial labels and email support within ${DAMAGE_REPORT_HOURS} hours of delivery.`;

export const PROTECTION_DECLINED_SHORT = "Declined. This order is not covered for loss, theft or damage in transit.";

// orders.protection is null for orders without a choice (before 2026-10-13, when
// every order carried the charge; no-charge and wholesale orders): show the amount only.
export function protectionDeclined(o: { protection?: ProtectionChoice | null }): boolean {
  return o.protection === "declined";
}
