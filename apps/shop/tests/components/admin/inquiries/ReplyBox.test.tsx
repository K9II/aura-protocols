import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/app/admin/inquiries/actions", () => ({ replyAction: vi.fn(), saveDraftAction: vi.fn(), discardDraftAction: vi.fn() }));
import ReplyBox from "@/components/admin/inquiries/ReplyBox";

describe("ReplyBox", () => {
  it("starts with the signature and inserts a saved reply above it", () => {
    render(<ReplyBox inquiryId="i1" clientKey="k" to="dana@example.com" from="support@auraprotocols.com" signature="— Kearney, Aura Protocols"
      saved={[{ id: "s1", name: "Finding a COA", body: "Every lot's certificate is on auraprotocols.com/coa." }]} />);
    const ta = screen.getByRole("textbox", { name: "Reply" }) as HTMLTextAreaElement;
    expect(ta.value).toBe("\n\n— Kearney, Aura Protocols");
    fireEvent.click(screen.getByRole("button", { name: /Insert saved reply/ }));
    fireEvent.click(screen.getByRole("menuitem", { name: /Finding a COA/ }));
    expect(ta.value).toBe("Every lot's certificate is on auraprotocols.com/coa.\n\n— Kearney, Aura Protocols");
    expect(screen.getByRole("button", { name: "Send" })).toHaveAttribute("value", "send");
    expect(screen.getByRole("button", { name: "Send and close" })).toHaveAttribute("value", "close");
  });

  it("carries the loaded draft's draftAt as a hidden field, so a reply clears only that exact draft", () => {
    const { container } = render(<ReplyBox inquiryId="i1" clientKey="k" to="dana@example.com" from="support@auraprotocols.com" signature="— Kearney, Aura Protocols"
      saved={[]} draft={{ body: "Thanks —", byName: "Assistant (Claude)", at: "today 7:06 am", draftAt: "2026-10-06T14:06:00.000Z" }} />);
    const hidden = container.querySelector('input[name="draftAt"]') as HTMLInputElement;
    expect(hidden).not.toBeNull();
    expect(hidden.value).toBe("2026-10-06T14:06:00.000Z");
  });

  it("no hidden draftAt field when there's no draft to protect", () => {
    const { container } = render(<ReplyBox inquiryId="i1" clientKey="k" to="dana@example.com" from="support@auraprotocols.com" signature="— Kearney, Aura Protocols" saved={[]} />);
    expect(container.querySelector('input[name="draftAt"]')).toBeNull();
  });
});
