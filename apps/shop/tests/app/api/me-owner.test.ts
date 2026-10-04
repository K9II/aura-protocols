import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted: the mock factory runs before the static import below, so the
// mock fn must be created in the hoisted block, not as a plain top-level const.
const { getCustomer } = vi.hoisted(() => ({ getCustomer: vi.fn() }));
vi.mock("@/lib/dal", () => ({ getCustomer }));
import { GET } from "@/app/api/me/owner/route";

describe("GET /api/me/owner", () => {
  beforeEach(() => getCustomer.mockReset());

  it("says owner: true only for the owner account, and is never cached", async () => {
    getCustomer.mockResolvedValue({ id: "u1", isOwner: true });
    const res = await GET();
    expect(await res.json()).toEqual({ owner: true });
    expect(res.headers.get("cache-control")).toBe("private, no-store");
  });

  it("says owner: false for other customers and for signed-out visitors", async () => {
    getCustomer.mockResolvedValue({ id: "u2", isOwner: false });
    expect(await (await GET()).json()).toEqual({ owner: false });
    getCustomer.mockResolvedValue(null);
    expect(await (await GET()).json()).toEqual({ owner: false });
  });
});
