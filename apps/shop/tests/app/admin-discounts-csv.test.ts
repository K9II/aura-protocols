import { describe, it, expect, vi, beforeEach } from "vitest";

const requireOwner = vi.fn();
const listBatchCodes = vi.fn();
const getBatch = vi.fn();
vi.mock("@/lib/dal", () => ({ requireOwner }));
vi.mock("@/lib/discounts/data", () => ({ listBatchCodes, getBatch }));

const BATCH = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

describe("batch CSV", () => {
  beforeEach(() => {
    vi.resetModules();
    requireOwner.mockReset(); requireOwner.mockResolvedValue({ id: "owner" });
    getBatch.mockReset(); listBatchCodes.mockReset();
  });

  it("is owner-only", async () => {
    requireOwner.mockRejectedValue(new Error("NOT_FOUND"));
    const { GET } = await import("@/app/admin/discounts/batch/[id]/codes.csv/route");
    await expect(GET(new Request("http://x"), ctx(BATCH))).rejects.toThrow("NOT_FOUND");
    expect(getBatch).not.toHaveBeenCalled();
  });

  it("404s on a malformed id without reading data", async () => {
    const { GET } = await import("@/app/admin/discounts/batch/[id]/codes.csv/route");
    const res = await GET(new Request("http://x"), ctx("b1"));
    expect(res.status).toBe(404);
    expect(getBatch).not.toHaveBeenCalled();
  });

  it("lists every code with its state and order", async () => {
    getBatch.mockResolvedValue({ id: BATCH, prefix: "VIP-OCT-", size: 2, note: null, created_at: "" });
    listBatchCodes.mockResolvedValue([
      { id: "1", code: "VIP-OCT-7KQ2M", status: "active", redemption: { state: "used", order_number: "AP-10342" } },
      { id: "2", code: "VIP-OCT-H3XWA", status: "active", redemption: null },
    ]);
    const { GET } = await import("@/app/admin/discounts/batch/[id]/codes.csv/route");
    const res = await GET(new Request("http://x"), ctx(BATCH));
    expect(res.headers.get("content-type")).toMatch(/text\/csv/);
    expect(res.headers.get("content-disposition")).toContain("VIP-OCT-codes.csv");
    expect(await res.text()).toBe("code,state,order\nVIP-OCT-7KQ2M,used,AP-10342\nVIP-OCT-H3XWA,unused,\n");
  });

  it("neutralises spreadsheet formulas and quotes commas", async () => {
    getBatch.mockResolvedValue({ id: BATCH, prefix: "X-", size: 1, note: null, created_at: "" });
    listBatchCodes.mockResolvedValue([{ id: "1", code: "=HYPERLINK(1)", status: "active", redemption: { state: "used", order_number: "a,b" } }]);
    const { GET } = await import("@/app/admin/discounts/batch/[id]/codes.csv/route");
    const res = await GET(new Request("http://x"), ctx(BATCH));
    expect(await res.text()).toBe("code,state,order\n'=HYPERLINK(1),used,\"a,b\"\n");
  });
});
