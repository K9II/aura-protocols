// Typed fixtures for the Disputes tests (tsconfig includes tests, so next
// build type-checks them). NOW = Wed Oct 7 2026, 9:42 am Mountain.
import type { DisputeListRow, DisputeRow, OrderBrief, WarningListRow, WarningRow } from "@/lib/disputes/rules";
import type { EvidenceFacts } from "@/lib/disputes/evidence";

export const NOW = Date.parse("2026-10-07T15:42:00Z");
export const DISPUTE_ID = "0b6f1c2e-1111-4222-8333-944455556666";
export const WARNING_ID = "7a1b2c3d-1111-4222-8333-944455556666";
export const CUSTOMER_ID = "3f1e2d4c-5b6a-4789-8abc-def012345678";

export function disputeRow(o: Partial<DisputeRow> = {}): DisputeRow {
  return {
    id: DISPUTE_ID, stripe_dispute_id: "dp_1Q7Xz", order_id: "o1", charge_id: "ch_1", payment_intent_id: "pi_1",
    amount_cents: 41200, currency: "usd", reason: "product_not_received", status: "needs_response", evidence_due_by: "2026-10-09T23:59:59Z",
    evidence_submitted: false, fee_cents: 1500, card_brand: "visa", card_last4: "4242", billing_address: null,
    draft: null, draft_saved_at: null, evidence_files: {}, evidence_file_sha: null, submitted_at: null, submitted_by: null,
    outcome: null, closed_at: null, funds_withdrawn_at: null, funds_reinstated_at: null, reminded: {},
    opened_at: "2026-10-01T22:12:00Z", last_event_at: "2026-10-01T22:12:00Z", created_at: "2026-10-01T22:12:05Z", updated_at: "2026-10-01T22:12:05Z",
    ...o,
  };
}

export function brief(o: Partial<OrderBrief> = {}): OrderBrief {
  return {
    number: "AP-1031", status: "shipped", email: "dana.w@example.com", customerId: CUSTOMER_ID, customerName: "Dana Whitfield",
    shippedAt: "2026-09-22T18:00:00Z", paidAt: "2026-09-21T16:02:00Z", totalCents: 41200, creditCents: 0, ...o,
  };
}

export const listRow = (o: Partial<DisputeRow> = {}, order: Partial<OrderBrief> = {}): DisputeListRow => ({ ...disputeRow(o), order: brief(order) });

export function warningRow(o: Partial<WarningRow> = {}, order: Partial<OrderBrief> = {}): WarningListRow {
  return {
    id: WARNING_ID, stripe_efw_id: "issfr_1", order_id: "o2", charge_id: "ch_2", fraud_type: "unauthorized_use_of_card", actionable: true,
    created_at: "2026-10-07T14:12:00Z", resolved_action: null, resolved_at: null, resolved_by: null, ...o,
    order: brief({ number: "AP-1044", status: "paid", shippedAt: null, customerName: "R. Alvarez", email: "r.alvarez@example.com", totalCents: 18450, ...order }),
  };
}

export const IPHONE_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

export function facts(o: Partial<EvidenceFacts> = {}, order: Partial<EvidenceFacts["order"]> = {}): EvidenceFacts {
  return {
    stripeDisputeId: "dp_1Q7Xz", reason: "product_not_received", amountCents: 41200, openedAt: "2026-10-01T22:12:00Z",
    cardBrand: "visa", cardLast4: "4242", billingAddress: "Dana Whitfield, 1420 Elm St, Boulder, CO 80302, US",
    items: [
      { name: "BPC-157", strength: "10 mg", vials: 3, lineTotalCents: 20700,
        lots: [{ lotNumber: "AP-BPC-2604", vials: 3, purityPct: 99.4, method: "HPLC", coaUrl: "https://x.supabase.co/storage/v1/object/public/coa/AP-BPC-2604/1.pdf" }] },
      { name: "TB-500", strength: "10 mg", vials: 2, lineTotalCents: 18400,
        lots: [{ lotNumber: "AP-TB5-2603", vials: 2, purityPct: 99.1, method: "HPLC", coaUrl: null }] },
    ],
    customer: { name: "Dana Whitfield", email: "dana.w@example.com", createdAt: "2026-09-15T01:02:00Z", lastSignInAt: "2026-09-21T15:58:00Z" },
    agreement: { agreedAt: "2026-09-15T01:02:41Z", termsVersion: "2026-09-27", age21: true, ruo: true, disputePolicy: true, ipHash: "9f3ce21a77b0", userAgent: IPHONE_UA },
    priorOrders: [{ number: "AP-1009", paidAt: "2026-09-15T17:00:00Z", disputed: false }],
    site: "https://auraprotocols.com",
    ...o,
    order: {
      number: "AP-1031", status: "shipped", email: "dana.w@example.com", createdAt: "2026-09-21T16:00:00Z", paidAt: "2026-09-21T16:02:00Z",
      ruoConfirmedAt: "2026-09-21T16:00:00Z", ship: { name: "Dana Whitfield", line1: "1420 Elm St", line2: "Apt 3", city: "Boulder", state: "CO", zip: "80302" },
      carrier: "usps", tracking: "9400111899223401552788", shippedAt: "2026-09-22T18:00:00Z",
      subtotalCents: 39100, discountCents: 0, shippingCents: 0, insuranceCents: 550, taxCents: 1550, totalCents: 41200, creditCents: 0,
      ...order,
    },
  };
}

// The same order before it shipped.
export const unshipped = (o: Partial<EvidenceFacts> = {}): EvidenceFacts =>
  facts(o, { status: "paid", carrier: null, tracking: null, shippedAt: null });
