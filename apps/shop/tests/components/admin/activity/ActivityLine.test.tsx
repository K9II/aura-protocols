import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

vi.mock("@/lib/email/admin-data", () => ({ AUTOMATION_LABEL: { welcome: "Welcome series", cart: "Cart reminders" } }));

const base = { at: "2026-10-06T17:00:00Z", actorId: "u1", actorName: "Kearney Adams", href: null } as const;

describe("ActivityLine", () => {
  it("inquiry lines", async () => {
    const { default: ActivityLine } = await import("@/components/admin/activity/ActivityLine");
    const base2 = { key: "q", at: "2026-10-06T21:00:00Z", area: "inquiries" as const, actorId: "o1", actorName: "Kearney Adams", href: null, source: "inquiry" as const };
    const { container, rerender } = render(<ActivityLine i={{ ...base2, e: { id: "e1", action: "replied", detail: null }, label: "Q-1047 · Dana Whitfield" }} />);
    expect(container).toHaveTextContent("Kearney replied to Q-1047 · Dana Whitfield");
    rerender(<ActivityLine i={{ ...base2, e: { id: "e2", action: "reply_saved", detail: "Finding a COA" }, label: null }} />);
    expect(container).toHaveTextContent("Kearney saved the reply Finding a COA");
    rerender(<ActivityLine i={{ ...base2, e: { id: "e3", action: "draft_saved", detail: null }, label: "Q-1002 · k9 Test" }} />);
    expect(container).toHaveTextContent("Kearney saved a reply draft on Q-1002 · k9 Test");
    rerender(<ActivityLine i={{ ...base2, e: { id: "e4", action: "draft_discarded", detail: null }, label: "Q-1002 · k9 Test" }} />);
    expect(container).toHaveTextContent("Kearney discarded the reply draft on Q-1002 · k9 Test");
    rerender(<ActivityLine i={{ ...base2, e: { id: "e5", action: "replied", detail: "drafted by Assistant" }, label: "Q-1002 · k9 Test" }} />);
    expect(container).toHaveTextContent("Kearney replied to Q-1002 · k9 Test · drafted by Assistant");
  });

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

  it("words Team actions with the actor, on the disabled/enabled/signed-out person, with the reason if one was given", async () => {
    const { default: ActivityLine } = await import("@/components/admin/activity/ActivityLine");
    const text = (i: object) => render(<ActivityLine i={{ ...base, ...i } as never} />).container.textContent;
    expect(text({ key: "t1", area: "team", source: "admin", e: { id: "t1", area: "staff", action: "staff_disabled", target_id: "s1", label: "Assistant (Claude)", detail: "Pausing while I review last week's drafts" } }))
      .toBe("Kearney disabled Assistant (Claude) · Pausing while I review last week's drafts");
    expect(text({ key: "t2", area: "team", source: "admin", e: { id: "t2", area: "staff", action: "staff_enabled", target_id: "s1", label: "Assistant (Claude)", detail: null } }))
      .toBe("Kearney enabled Assistant (Claude)");
    expect(text({ key: "t3", area: "team", source: "admin", e: { id: "t3", area: "staff", action: "staff_signed_out", target_id: "s1", label: "Assistant (Claude)", detail: null } }))
      .toBe("Kearney signed Assistant (Claude) out everywhere");
  });

  it("falls back to 'a team login' when the person behind a Team action is gone", async () => {
    const { default: ActivityLine } = await import("@/components/admin/activity/ActivityLine");
    const text = (i: object) => render(<ActivityLine i={{ ...base, ...i } as never} />).container.textContent;
    expect(text({ key: "t4", area: "team", source: "admin", e: { id: "t4", area: "staff", action: "staff_disabled", target_id: "s1", label: null, detail: null } }))
      .toBe("Kearney disabled a team login");
    expect(text({ key: "t5", area: "team", source: "admin", e: { id: "t5", area: "staff", action: "staff_signed_out", target_id: "s1", label: null, detail: null } }))
      .toBe("Kearney signed a team login out everywhere");
  });
});
