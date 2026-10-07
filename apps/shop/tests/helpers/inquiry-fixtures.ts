import type { InquiryRow } from "@/lib/inquiries/rules";

// Tue 2026-10-06 3:00 pm Mountain.
export const NOW = Date.parse("2026-10-06T21:00:00Z");

export function inquiry(over: Partial<InquiryRow> = {}): InquiryRow {
  return {
    id: "11111111-1111-4111-8111-111111111111", ref: 1047, topic: "order", status: "needs_reply",
    name: "Dana Whitfield", email: "dana.w@example.com", organization: null, order_number: "AP-1052", customer_id: null,
    subject: "Order question — AP-1052", created_at: "2026-10-03T20:48:00Z", last_activity_at: "2026-10-03T22:12:00Z",
    last_customer_at: "2026-10-03T22:12:00Z", waiting_since: null, closed_at: null,
    last_preview: "Here you go — both vials and the box.", last_from: "customer", message_count: 3, file_count: 3,
    ...over,
  };
}
