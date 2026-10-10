import { describe, it, expect } from "vitest";
import { PERMISSIONS } from "@/lib/staff/permissions";
import { NEVER_FOR_ASSISTANT, rolePermissions } from "@/lib/staff/roles";
import { CAN_GROUPS, CANT_GROUPS } from "@/lib/staff/assistant-card";

describe("the Team page's Can/Can't card stays tied to the role", () => {
  it("Can lines cover exactly the Assistant's permissions — no more, no less", () => {
    const union = new Set(CAN_GROUPS.flatMap((g) => g.perms));
    expect(union).toEqual(rolePermissions("assistant"));
  });

  it("Can't lines cover every permission the Assistant doesn't have", () => {
    const assistant = rolePermissions("assistant");
    const ownerOnly = new Set(PERMISSIONS.filter((p) => !assistant.has(p)));
    const union = new Set(CANT_GROUPS.flatMap((g) => g.perms));
    expect(union).toEqual(ownerOnly);
  });

  it("every never-for-assistant permission shows up under Can't", () => {
    const union = new Set(CANT_GROUPS.flatMap((g) => g.perms));
    for (const p of NEVER_FOR_ASSISTANT) expect(union.has(p)).toBe(true);
  });

  it("no permission is listed twice, and every PERMISSIONS entry appears exactly once across both cards", () => {
    const all = [...CAN_GROUPS, ...CANT_GROUPS].flatMap((g) => g.perms);
    expect(new Set(all).size).toBe(all.length);
    expect([...all].sort()).toEqual([...PERMISSIONS].sort());
  });
});
