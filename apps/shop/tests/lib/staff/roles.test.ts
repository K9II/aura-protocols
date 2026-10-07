import { describe, it, expect } from "vitest";
import { PERMISSIONS } from "@/lib/staff/permissions";
import { ROLES, rolePermissions, NEVER_FOR_ASSISTANT, can, type Staff } from "@/lib/staff/roles";

const base = { id: "u1", email: "a@b.co", fullName: "X", isAssistant: false } as const;

describe("roles", () => {
  it("owner has every permission", () => {
    expect([...rolePermissions("owner")].sort()).toEqual([...PERMISSIONS].sort());
  });
  it("assistant can view every module except partner payout details and W-9s", () => {
    const a = rolePermissions("assistant");
    for (const p of PERMISSIONS.filter((x) => x.endsWith(".view"))) expect(a.has(p)).toBe(true);
    expect(a.has("partners.payout_details")).toBe(false);
    expect(a.has("w9.open")).toBe(false);
  });
  it("assistant drafts but never sends, moves money or stock", () => {
    const a = rolePermissions("assistant");
    for (const p of ["activity.view", "alerts.resolve", "email.draft", "inquiries.draft", "disputes.draft"] as const) expect(a.has(p)).toBe(true);
    for (const p of NEVER_FOR_ASSISTANT) expect(a.has(p)).toBe(false);
    for (const p of ["email.send", "inquiries.reply", "orders.ship", "catalog.edit", "discounts.edit", "lots.receive", "stock.correct", "partners.manage"] as const) expect(a.has(p)).toBe(false);
  });
  it("the never list covers money, people and secrets", () => {
    expect([...NEVER_FOR_ASSISTANT].sort()).toEqual([
      "credit.adjust", "customers.block", "disputes.submit", "disputes.warnings", "orders.refund_credit",
      "partners.payout_details", "payouts.mark_paid", "staff.manage", "stock.owner_withdrawal", "w9.open",
    ]);
  });
  it("can() is false for a disabled login and for an unknown permission set", () => {
    const owner: Staff = { ...base, role: "owner", status: "active", permissions: rolePermissions("owner") };
    expect(can(owner, "orders.ship")).toBe(true);
    expect(can({ ...owner, status: "disabled" }, "orders.ship")).toBe(false);
    expect(can({ ...owner, role: "assistant", permissions: rolePermissions("assistant") }, "orders.ship")).toBe(false);
  });
  it("every role is listed with a label", () => {
    expect(ROLES.map((r) => r.id)).toEqual(["owner", "assistant"]);
    expect(ROLES.every((r) => r.label.length > 0)).toBe(true);
  });
});
