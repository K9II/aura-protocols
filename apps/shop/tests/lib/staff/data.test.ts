import { describe, it, expect, vi, beforeEach } from "vitest";
import { query, fromQueue } from "../../helpers/supabase-mock";

const rpc = vi.fn();
const getUserById = vi.fn();
let from: ReturnType<typeof fromQueue>;
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdminClient: () => ({ from: (t: string) => from(t), rpc, auth: { admin: { getUserById } } }) }));

describe("staff data", () => {
  beforeEach(() => { vi.resetModules(); rpc.mockReset(); getUserById.mockReset(); });

  it("readStaffRow maps a row, returns null when absent, throws on error", async () => {
    from = fromQueue({ staff: [query({ data: { role: "assistant", status: "active" } }), query({ data: null }), query({ error: { message: "boom" } })] });
    const { readStaffRow } = await import("@/lib/staff/data");
    expect(await readStaffRow("u1")).toEqual({ role: "assistant", status: "active" });
    expect(await readStaffRow("u2")).toBeNull();
    await expect(readStaffRow("u3")).rejects.toThrow(/staff read failed/);
  });

  it("listTeam puts the owner first with email and last sign-in", async () => {
    from = fromQueue({ staff: [query({ data: [
      { customer_id: "a", role: "assistant", status: "active", disabled_at: null, disabled_reason: null, customers: { full_name: "Assistant (Claude)" } },
      { customer_id: "o", role: "owner", status: "active", disabled_at: null, disabled_reason: null, customers: { full_name: "Alvester" } },
    ] })] });
    getUserById.mockImplementation(async (id: string) => ({ data: { user: { id, email: `${id}@x.co`, last_sign_in_at: "2026-10-07T14:00:00Z", app_metadata: { provider: id === "o" ? "google" : "email" } } }, error: null }));
    const { listTeam } = await import("@/lib/staff/data");
    const t = await listTeam();
    expect(t.map((m) => m.id)).toEqual(["o", "a"]);
    expect(t[0]).toMatchObject({ name: "Alvester", email: "o@x.co", role: "owner", lastSignInAt: "2026-10-07T14:00:00Z", signIn: "Google" });
    expect(t[1]).toMatchObject({ signIn: "password" });
  });

  it("setStaffStatus and endSessions call their functions and throw on error", async () => {
    rpc.mockResolvedValueOnce({ data: "ok", error: null }).mockResolvedValueOnce({ data: 2, error: null }).mockResolvedValueOnce({ data: null, error: { message: "x" } });
    const { setStaffStatus, endSessions } = await import("@/lib/staff/data");
    expect(await setStaffStatus({ target: "a", status: "disabled", actorId: "o", reason: "r" })).toBe("ok");
    expect(rpc).toHaveBeenCalledWith("admin_set_staff_status", { p_target: "a", p_status: "disabled", p_actor: "o", p_reason: "r" });
    expect(await endSessions("a")).toBe(2);
    await expect(endSessions("a")).rejects.toThrow();
  });
});
