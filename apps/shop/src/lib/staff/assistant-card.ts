// "What the Assistant can do" card (Team page, mock Screen 1 of
// staff.html) — the five Can / six Can't lines are the mock's verbatim
// wording. The Permission[] on each line is data for the guard test
// (tests/lib/staff/assistant-card.test.ts), not what's rendered: it's
// what a future change to PERMISSIONS or the assistant role is checked
// against, so the card can't silently drift from the code it describes.
import type { Permission } from "@/lib/staff/permissions";

export type PermGroup = { text: string; perms: readonly Permission[] };

export const CAN_GROUPS: readonly PermGroup[] = [
  {
    text: "See Today, orders, customers, discounts, disputes, catalog & lots, email, inquiries, partners, payouts and Activity",
    perms: [
      "today.view", "orders.view", "customers.view", "discounts.view", "disputes.view", "catalog.view",
      "email.view", "inquiries.view", "partners.view", "payouts.view", "activity.view",
    ],
  },
  { text: "Save a reply draft on an inquiry — you send it", perms: ["inquiries.draft"] },
  { text: "Write campaign drafts — you send or schedule them", perms: ["email.draft"] },
  { text: "Save dispute evidence drafts — you submit them", perms: ["disputes.draft"] },
  { text: "Mark alerts done, with a note", perms: ["alerts.resolve"] },
];

export const CANT_GROUPS: readonly PermGroup[] = [
  { text: "Send email, replies or campaigns", perms: ["email.send", "email.pause", "inquiries.reply", "inquiries.saved_replies"] },
  { text: "Ship, refund, cancel or create orders", perms: ["orders.ship", "orders.refund_credit", "orders.no_charge"] },
  {
    text: "Change store credit, prices, stock, lots or discount codes",
    perms: ["credit.adjust", "catalog.edit", "stock.correct", "stock.owner_withdrawal", "lots.receive", "lots.put_live", "discounts.edit", "discounts.settings"],
  },
  { text: "Block customers or submit dispute evidence", perms: ["customers.block", "customers.resend_verify", "disputes.submit", "disputes.warnings"] },
  { text: "Approve partners, mark payouts paid, see bank/Zelle details or W-9s", perms: ["partners.manage", "payouts.mark_paid", "partners.payout_details", "w9.open"] },
  { text: "Change the team", perms: ["staff.manage"] },
];
