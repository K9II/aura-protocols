import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

vi.mock("@/lib/email/admin-data", () => ({ AUTOMATION_LABEL: { welcome: "Welcome series", cart: "Cart reminders" } }));

const base = { at: "2026-10-06T17:00:00Z", actorId: "u1", actorName: "Kearney Adams", href: null } as const;

describe("ActivityLine", () => {
  it("words owner actions with who and what they were about", async () => {
    const { default: ActivityLine } = await import("@/components/admin/activity/ActivityLine");
    const text = (i: object) => render(<ActivityLine i={{ ...base, ...i } as never} />).container.textContent;
    expect(text({ key: "1", area: "orders", source: "admin", e: { id: "1", area: "orders", action: "order_shipped", target_id: "o1", label: "AP-1031", detail: "USPS 9400" } }))
      .toBe("Kearney marked AP-1031 shipped · USPS 9400");
    expect(text({ key: "2", area: "payouts", source: "admin", e: { id: "2", area: "payouts", action: "w9_opened", target_id: "p1", label: "SMITHLAB", detail: null } }))
      .toBe("Kearney opened SMITHLAB's W-9");
    expect(text({ key: "3", area: "alerts", source: "alert", e: { id: "3", title: "Chargeback opened", note: "handled" } }))
      .toBe("Kearney marked alert Chargeback opened done · “handled”");
    expect(text({ key: "4", area: "email", source: "email", campaignName: null, e: { id: "4", action: "paused", target: "cart", actor: "u1", note: null, at: base.at, actorName: null } }))
      .toBe("Kearney paused Cart reminders");
    expect(text({ key: "5", area: "discounts", source: "discount", codeLabel: "SPRING20", e: { id: 5, kind: "paused", detail: null, at: base.at, actor: "u1", actorName: null } }))
      .toBe("Kearney · Paused · SPRING20");
  });
});
