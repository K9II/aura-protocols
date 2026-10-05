import { describe, it, expect, vi } from "vitest";
const lotChoices = vi.fn(), codeForCampaign = vi.fn();
vi.mock("@/lib/email/campaigns/data", () => ({ lotChoices, codeForCampaign }));
vi.mock("@/lib/email/stats", () => ({ audienceCounts: vi.fn(async () => ({ all: 2310, ordered: 486, never_ordered: 1824 })) }));

const base = { id: "k1", kind: "new_lots", subject: "S", preview_text: "", content: { headline: "H", body: "", buttonLabel: "", buttonPath: "" }, audience: "ordered", discount_code_id: null, lots_snapshot: [{ lot: "AP-1" }, { lot: "AP-2" }] };

describe("checksFor", () => {
  it("marks lots that are no longer choosable", async () => {
    lotChoices.mockResolvedValue([{ lot: "AP-1" }]);
    const { checksFor } = await import("@/lib/email/campaigns/checks-server");
    const c = await checksFor(base as never, Date.now());
    expect(lotChoices).toHaveBeenCalledWith("k1");
    expect(c).toContainEqual(expect.objectContaining({ level: "block", field: "lots", text: expect.stringContaining("AP-2") }));
  });
  it("uses the campaign's audience count for code-use warnings", async () => {
    codeForCampaign.mockResolvedValue({ facts: { code: "OCT10", status: "active", startsAt: null, endsAt: null, maxUses: 100, uses: 0 }, render: {} });
    const { checksFor } = await import("@/lib/email/campaigns/checks-server");
    const c = await checksFor({ ...base, kind: "promotion", discount_code_id: "c1", lots_snapshot: [] } as never, Date.now());
    expect(c.find((x) => x.level === "warn")?.text).toContain("486 people");
  });
});
