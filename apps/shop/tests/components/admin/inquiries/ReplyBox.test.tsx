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
});
