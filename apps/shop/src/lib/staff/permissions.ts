// Named abilities in the command center (spec 2026-10-06-admin-staff-logins-design.md).
// Pure: imported by server pages, the client AdminShell and tests. Every admin
// page, route and action asks for one of these through requirePermission().
export const PERMISSIONS = [
  "today.view", "alerts.resolve",
  "orders.view", "orders.ship", "orders.refund", "orders.no_charge",
  "customers.view", "customers.resend_verify", "credit.adjust", "customers.block",
  "discounts.view", "discounts.edit", "discounts.settings",
  "disputes.view", "disputes.draft", "disputes.submit", "disputes.warnings",
  "catalog.view", "catalog.edit", "lots.receive", "lots.put_live", "stock.correct", "stock.owner_withdrawal",
  "email.view", "email.draft", "email.send", "email.pause",
  "inquiries.view", "inquiries.draft", "inquiries.reply", "inquiries.saved_replies",
  "partners.view", "partners.manage", "partners.payout_details", "w9.open",
  "payouts.view", "payouts.mark_paid",
  "wholesale.view", "wholesale.manage", "wholesale.margins",
  "activity.view", "staff.manage",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

// What the Team page shows for the Assistant ("Can" / "Can't"), in plain words.
export const PERMISSION_LABEL: Record<Permission, string> = {
  "today.view": "See Today", "alerts.resolve": "Mark alerts done",
  "orders.view": "See orders", "orders.ship": "Ship orders", "orders.refund": "Refund orders", "orders.no_charge": "Create no-charge orders",
  "customers.view": "See customers", "customers.resend_verify": "Resend verification emails", "credit.adjust": "Change store credit", "customers.block": "Block customers",
  "discounts.view": "See discount codes", "discounts.edit": "Create and change discount codes", "discounts.settings": "Change the store-wide cap",
  "disputes.view": "See disputes", "disputes.draft": "Save dispute evidence drafts", "disputes.submit": "Submit dispute evidence", "disputes.warnings": "Act on early fraud warnings",
  "catalog.view": "See the catalog and lots", "catalog.edit": "Change prices, strengths and what's shown", "lots.receive": "Receive lots and add certificates", "lots.put_live": "Put lots live or retire them", "stock.correct": "Correct stock counts", "stock.owner_withdrawal": "Record owner withdrawals",
  "email.view": "See email", "email.draft": "Write campaign drafts", "email.send": "Send, schedule and stop campaigns", "email.pause": "Pause and resume automations",
  "inquiries.view": "See inquiries", "inquiries.draft": "Save reply drafts", "inquiries.reply": "Reply to, close and sort inquiries", "inquiries.saved_replies": "Edit saved replies",
  "partners.view": "See partners", "partners.manage": "Approve, decline and suspend partners", "partners.payout_details": "See partner bank/Zelle details", "w9.open": "Open W-9s",
  "payouts.view": "See payouts", "payouts.mark_paid": "Mark payouts paid",
  "wholesale.view": "See wholesale runs and settings", "wholesale.manage": "Run production runs and change wholesale settings", "wholesale.margins": "See wholesale kit costs and margins",
  "activity.view": "See Activity", "staff.manage": "Change the team",
};
