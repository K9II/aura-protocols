import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { shapeWaitlist, type WaitlistDbRow } from "@/lib/waitlist/admin";
import { ownerStaff } from "../helpers/staff";

const m = vi.hoisted(() => ({ requirePermission: vi.fn(), listWaitlist: vi.fn() }));
vi.mock("@/lib/dal", () => ({ requirePermission: m.requirePermission }));
vi.mock("@/lib/waitlist/admin-data", () => ({ listWaitlist: m.listWaitlist }));
vi.mock("@/lib/clock", () => ({ currentMs: () => Date.parse("2026-10-23T16:00:00Z") }));
import WaitlistPage from "@/app/admin/waitlist/page";

const db: WaitlistDbRow[] = [
  { email: "kanine@mac.com", status: "confirmed", waitlist_at: "2026-10-23T14:00:00Z", referral_code: "M55DFQ", referred_by: null },
  { email: "colleague@lab.edu", status: "confirmed", waitlist_at: "2026-10-23T15:00:00Z", referral_code: "MDFUPW", referred_by: "M55DFQ" },
];
const props = (q?: string) => ({ searchParams: Promise.resolve(q ? { q } : {}) });

describe("/admin/waitlist", () => {
  beforeEach(() => {
    m.requirePermission.mockReset().mockResolvedValue(ownerStaff({ id: "owner1" }));
    m.listWaitlist.mockReset().mockResolvedValue(shapeWaitlist(db, "https://auraprotocols.com"));
  });

  it("asks for waitlist.view before reading", async () => {
    m.requirePermission.mockRejectedValue(new Error("NOT_FOUND"));
    await expect(WaitlistPage(props())).rejects.toThrow("NOT_FOUND");
    expect(m.listWaitlist).not.toHaveBeenCalled();
  });

  it("shows counts, top referrers, the list and the CSV link", async () => {
    render(await WaitlistPage(props()));
    expect(m.requirePermission).toHaveBeenCalledWith("waitlist.view");
    expect(screen.getByRole("heading", { level: 1, name: "Waitlist" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Download CSV" })).toHaveAttribute("href", "/admin/waitlist/waitlist.csv");
    expect(screen.getByText("Top referrers")).toBeInTheDocument();
    expect(screen.getAllByText("auraprotocols.com/?r=M55DFQ").length).toBeGreaterThan(0);
    const table = screen.getAllByRole("table")[1];
    expect(within(table).getAllByRole("row")).toHaveLength(3);
    expect(within(table).getAllByText("kanine@mac.com")).toHaveLength(2); // own row + "came through" on the colleague's
  });

  it("searches and says so when nothing matches", async () => {
    render(await WaitlistPage(props("nobody")));
    expect(screen.getByText("Nothing matches.")).toBeInTheDocument();
  });
});
