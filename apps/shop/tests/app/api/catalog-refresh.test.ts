import { describe, it, expect, vi, beforeEach } from "vitest";

const revalidateTag = vi.fn();
vi.mock("next/cache", () => ({ revalidateTag }));
vi.mock("@/lib/catalog-live", () => ({ CATALOG_TAG: "catalog" }));

const post = (s?: string) => new Request("http://localhost/api/catalog/refresh", { method: "POST", headers: s ? { authorization: `Bearer ${s}` } : {} });

describe("POST /api/catalog/refresh", () => {
  beforeEach(() => { revalidateTag.mockReset(); process.env.CRON_SECRET = "cron-s"; });

  it("401s without the secret and refreshes nothing", async () => {
    const { POST } = await import("@/app/api/catalog/refresh/route");
    expect((await POST(post())).status).toBe(401);
    expect((await POST(post("wrong"))).status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("401s when CRON_SECRET isn't set", async () => {
    delete process.env.CRON_SECRET;
    const { POST } = await import("@/app/api/catalog/refresh/route");
    expect((await POST(post("undefined"))).status).toBe(401);
  });

  it("expires the catalog cache now", async () => {
    const { POST } = await import("@/app/api/catalog/refresh/route");
    const res = await POST(post("cron-s"));
    expect(res.status).toBe(200);
    expect(revalidateTag).toHaveBeenCalledWith("catalog", { expire: 0 });
  });
});
