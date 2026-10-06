// The evidence fields the owner edits on a chargeback. Pure and browser-safe:
// the compliance scanner lives in lib/disputes/checks.ts (server only).
export const EDITABLE_FIELDS = [
  "uncategorized_text", "shipping_carrier", "shipping_tracking_number", "shipping_date", "shipping_address",
  "customer_name", "customer_email_address", "product_description",
] as const;
export type EditableField = (typeof EDITABLE_FIELDS)[number];
export type EvidenceDraft = Record<EditableField, string>;

export const FIELD_LABEL: Record<EditableField, string> = {
  uncategorized_text: "Cover letter", shipping_carrier: "Carrier", shipping_tracking_number: "Tracking number",
  shipping_date: "Shipped", shipping_address: "Ship to", customer_name: "Name", customer_email_address: "Email",
  product_description: "Product description",
};

// Stripe caps the long text fields at 20,000 characters; the short ones stay short.
export const FIELD_MAX: Record<EditableField, number> = {
  uncategorized_text: 20_000, product_description: 20_000, shipping_address: 500,
  shipping_carrier: 100, shipping_tracking_number: 100, shipping_date: 100, customer_name: 200, customer_email_address: 254,
};

const REQUIRED: readonly EditableField[] = ["uncategorized_text", "customer_name", "customer_email_address", "product_description"];

// `get` reads one posted field (FormData.get). Shipping fields may be empty:
// an order that hasn't shipped has none.
export function parseDraft(get: (k: string) => unknown): { ok: true; value: EvidenceDraft } | { ok: false; fieldErrors: Record<string, string> } {
  const value = {} as EvidenceDraft;
  const fieldErrors: Record<string, string> = {};
  for (const k of EDITABLE_FIELDS) {
    const v = String(get(k) ?? "").replace(/\r\n?/g, "\n").trim();
    if (!v && REQUIRED.includes(k)) fieldErrors[k] = "Required.";
    else if (v.length > FIELD_MAX[k]) fieldErrors[k] = `Too long: ${FIELD_MAX[k].toLocaleString("en-US")} characters at most.`;
    value[k] = v;
  }
  return Object.keys(fieldErrors).length ? { ok: false, fieldErrors } : { ok: true, value };
}
