import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted: the mock factory runs before the static import below, so the
// mock fn must be created in the hoisted block, not as a plain top-level const.
const { getStaff } = vi.hoisted(() => ({ getStaff: vi.fn() }));
vi.mock("@/lib/dal", () => ({ getStaff }));
import { GET } from "@/app/api/me/owner/route";

describe("GET /api/me/owner", () => {
  beforeEach(() => { getStaff.mockReset(); vi.spyOn(console, "error").mockImplementation(() => {}); });

  it("says owner: true for any active staff login (Owner or Assistant)", async () => {
    getStaff.mockResolvedValue({ id: "s1", role: "assistant", status: "active", isAssistant: true, permissions: new Set() });
    const res = await GET();
    expect(await res.json()).toEqual({ owner: true });
    expect(res.headers.get("cache-control")).toBe("private, no-store");
  });

  it("says owner: false for a customer with no staff row, and for signed-out visitors", async () => {
    getStaff.mockResolvedValue(null);
    expect(await (await GET()).json()).toEqual({ owner: false });
  });

  it("a staff read error is never shown to the visitor: owner: false, logged, never thrown", async () => {
    getStaff.mockRejectedValue(new Error("db down"));
    const res = await GET();
    expect(await res.json()).toEqual({ owner: false });
    expect(res.status).toBe(200);
    expect(console.error).toHaveBeenCalledWith("staff check for Admin link failed:", expect.any(Error));
  });
});
