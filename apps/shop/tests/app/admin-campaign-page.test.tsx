import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const { requirePermission, notFound, data, checksFor } = vi.hoisted(() => ({
  requirePermission: vi.fn(async () => (await import("../helpers/staff")).ownerStaff({ id: "owner", email: "o@a.co" })),
  notFound: vi.fn(() => { throw new Error("NOT_FOUND"); }),
  data: { getCampaign: vi.fn(), lotChoices: vi.fn(), codeForCampaign: vi.fn(), recipientCounts: vi.fn() },
  checksFor: vi.fn(async () => []),
}));
vi.mock("@/lib/dal", () => ({ requirePermission }));
vi.mock("next/navigation", () => ({ notFound }));
vi.mock("@/lib/email/campaigns/data", () => data);
vi.mock("@/lib/discounts/data", () => ({ listCodes: vi.fn(async () => []), codeStatsById: vi.fn(async () => new Map()) }));
vi.mock("@/lib/email/stats", () => ({ audienceCounts: vi.fn(async () => ({ all: 3, ordered: 1, never_ordered: 2 })), sendStats: vi.fn(async () => new Map()), attribution: vi.fn(async () => new Map()) }));
vi.mock("@/lib/email/admin-data", () => ({ listAdminEvents: vi.fn(async () => []) }));
vi.mock("@/lib/email/campaigns/checks-server", () => ({ checksFor }));
vi.mock("@/lib/supabase/env", () => ({ siteUrl: () => "https://auraprotocols.com" }));
vi.mock("@/components/admin/email/CampaignResults", () => ({ default: () => null }));
vi.mock("@/app/admin/email/actions", () => ({ saveCampaignAction: vi.fn(), sendTestAction: vi.fn(), scheduleAction: vi.fn(), sendNowAction: vi.fn(), unscheduleAction: vi.fn(), stopAction: vi.fn(), copyAction: vi.fn() }));
import CampaignPage from "@/app/admin/email/campaigns/[id]/page";

const K = "0b6f1c2e-1111-4222-8333-944455556666";
const row = { id: K, kind: "news", status: "draft", name: "How we read a spectrum", subject: "S", preview_text: "", content: { headline: "H", body: "", buttonLabel: "", buttonPath: "" }, audience: "all", discount_code_id: null, lots_snapshot: [], scheduled_for: null, started_at: null, finished_at: null, recipients: 0, created_by: null, created_at: "2026-10-05T00:00:00Z", updated_at: "2026-10-05T16:41:00Z" };

describe("/admin/email/campaigns/[id]", () => {
  beforeEach(() => { process.env.MAILING_ADDRESS = "Aura Protocols LLC · 1 A St"; data.getCampaign.mockResolvedValue(row); data.lotChoices.mockResolvedValue([]); });

  it("404s on a bad id", async () => {
    await expect(CampaignPage({ params: Promise.resolve({ id: "nope" }) })).rejects.toThrow("NOT_FOUND");
    data.getCampaign.mockResolvedValue(null);
    await expect(CampaignPage({ params: Promise.resolve({ id: K }) })).rejects.toThrow("NOT_FOUND");
  });

  it("a draft opens the editor", async () => {
    render(await CampaignPage({ params: Promise.resolve({ id: K }) }));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("How we read a spectrum");
    expect(screen.getByLabelText("Subject")).toHaveValue("S");
  });

  it("a scheduled campaign is read-only with Unschedule", async () => {
    data.getCampaign.mockResolvedValue({ ...row, status: "scheduled", scheduled_for: "2026-10-08T15:00:00Z" });
    render(await CampaignPage({ params: Promise.resolve({ id: K }) }));
    expect(screen.getByRole("button", { name: "Unschedule" })).toBeInTheDocument();
    expect(screen.getByText(/Scheduled for Oct 8/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Subject")).toBeNull();
  });

  it("Assistant: Save present; Send test, Schedule, Send now and Unschedule absent", async () => {
    requirePermission.mockResolvedValueOnce((await import("../helpers/staff")).assistantStaff());
    render(await CampaignPage({ params: Promise.resolve({ id: K }) }));
    expect(screen.getByRole("button", { name: "Save draft" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Send test to me/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Schedule/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Send now/ })).toBeNull();

    requirePermission.mockResolvedValueOnce((await import("../helpers/staff")).assistantStaff());
    data.getCampaign.mockResolvedValueOnce({ ...row, status: "scheduled", scheduled_for: "2026-10-08T15:00:00Z" });
    render(await CampaignPage({ params: Promise.resolve({ id: K }) }));
    expect(screen.queryByRole("button", { name: "Unschedule" })).toBeNull();
  });
});
