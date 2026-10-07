import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const m = vi.hoisted(() => ({ requireOwner: vi.fn(), listSavedReplies: vi.fn() }));
vi.mock("@/lib/dal", () => ({ requireOwner: m.requireOwner }));
vi.mock("@/lib/inquiries/data", () => ({ listSavedReplies: m.listSavedReplies }));
vi.mock("@/app/admin/inquiries/actions", () => ({ saveReplyAction: vi.fn(), deleteReplyAction: vi.fn() }));
import SavedRepliesPage from "@/app/admin/inquiries/replies/page";

describe("/admin/inquiries/replies", () => {
  beforeEach(() => {
    m.requireOwner.mockResolvedValue({ id: "o1" });
    m.listSavedReplies.mockResolvedValue([{ id: "s1", name: "Finding a COA", body: "Every lot's certificate is on auraprotocols.com/coa.", updated_at: "2026-10-06T15:00:00Z", updated_by: "o1", updatedByName: "Kearney" }]);
  });
  it("lists replies with who changed them last; new and edit open the dialog", async () => {
    render(await SavedRepliesPage());
    expect(screen.getByRole("heading", { level: 1, name: "Saved replies" })).toBeInTheDocument();
    expect(screen.getAllByText("Finding a COA").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Oct 6 · Kearney").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /New saved reply/ })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Edit/ }).length).toBeGreaterThan(0);
  });
});
