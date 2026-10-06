import { describe, it, expect, vi, beforeEach } from "vitest";
import { DISPUTE_ID, disputeCase } from "../helpers/dispute-fixtures";

const m = vi.hoisted(() => ({ requireOwner: vi.fn(), getDisputeCase: vi.fn() }));
vi.mock("@/lib/dal", () => ({ requireOwner: m.requireOwner }));
vi.mock("@/lib/disputes/data", () => ({ getDisputeCase: m.getDisputeCase }));

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

describe("evidence PDF download", () => {
  beforeEach(() => {
    vi.resetModules();
    m.requireOwner.mockReset().mockResolvedValue({ id: "owner1" });
    m.getDisputeCase.mockReset().mockResolvedValue(disputeCase());
  });

  it("is owner-only", async () => {
    m.requireOwner.mockRejectedValue(new Error("NOT_FOUND"));
    const { GET } = await import("@/app/admin/disputes/[id]/evidence.pdf/route");
    await expect(GET(new Request("http://x"), ctx(DISPUTE_ID))).rejects.toThrow("NOT_FOUND");
    expect(m.getDisputeCase).not.toHaveBeenCalled();
  });

  it("404s a malformed id or a missing chargeback", async () => {
    const { GET } = await import("@/app/admin/disputes/[id]/evidence.pdf/route");
    expect((await GET(new Request("http://x"), ctx("nope"))).status).toBe(404);
    m.getDisputeCase.mockResolvedValue(null);
    expect((await GET(new Request("http://x"), ctx(DISPUTE_ID))).status).toBe(404);
  });

  it("returns the PDF as a download, the same bytes attached in Stripe", async () => {
    const { GET } = await import("@/app/admin/disputes/[id]/evidence.pdf/route");
    const { buildEvidencePdf } = await import("@/lib/disputes/pdf");
    const res = await GET(new Request("http://x"), ctx(DISPUTE_ID));
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("content-disposition")).toBe('attachment; filename="AP-1031-dispute-evidence.pdf"');
    const body = new Uint8Array(await res.arrayBuffer());
    expect(Buffer.from(body).equals(Buffer.from((await buildEvidencePdf(disputeCase().facts)).bytes))).toBe(true);
  });
});
