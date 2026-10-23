import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/app/admin/email/actions", () => ({ setUpPrelaunchAction: vi.fn() }));
import PrelaunchBox from "@/components/admin/email/PrelaunchBox";
import type { CampaignRow } from "@/lib/email/campaigns/data";

const counts = { all: 300, ordered: 0, never_ordered: 300, waitlist: 214, waitlist_never_ordered: 214 };
const sent = { id: "c1", kind: "first_look", status: "sent", recipients: 212, finished_at: "2026-11-02T18:00:00Z" } as CampaignRow;

describe("PrelaunchBox", () => {
  it("lists the four emails in order: #1 on, #2 and #4 openable with their audience, #3 coming next", () => {
    render(<PrelaunchBox rows={{}} counts={counts} canDraft />);
    expect(screen.getAllByText(/^[1-4]$/).map((e) => e.textContent)).toEqual(["1", "2", "3", "4"]);
    expect(screen.getByText("You're on the list")).toBeInTheDocument();
    expect(screen.getByText(/To: Waitlist \(214\)/)).toBeInTheDocument();
    expect(screen.getByText(/To: Waitlist, no order yet \(214\)/)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Open" })).toHaveLength(2);
    expect(screen.getByText("Coming next")).toBeInTheDocument();
  });

  it("a sent email shows when and how many, and links to its results", () => {
    render(<PrelaunchBox rows={{ first_look: sent }} counts={counts} canDraft />);
    expect(screen.getByText("Sent Nov 2 · 212 people")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Results" })).toHaveAttribute("href", "/admin/email/campaigns/c1");
    expect(screen.getAllByRole("button", { name: "Open" })).toHaveLength(1);
  });

  it("without email.draft there is nothing to open", () => {
    render(<PrelaunchBox rows={{}} counts={counts} canDraft={false} />);
    expect(screen.queryByRole("button", { name: "Open" })).toBeNull();
  });
});
