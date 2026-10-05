import { describe, it, expect, vi, beforeEach } from "vitest";
import { query, fromQueue } from "../helpers/supabase-mock";

const getUser = vi.fn();
const getPartnerForCustomer = vi.fn();
let from: ReturnType<typeof fromQueue>;
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({ auth: { getUser } }) }));
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdminClient: () => ({ from: (t: string) => from(t) }) }));
vi.mock("@/lib/partners/data", () => ({ getPartnerForCustomer }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); },
  notFound: () => { throw new Error("NOT_FOUND"); },
}));

const row = { id: "u1", full_name: "Jane", organization: null, is_owner: false, stripe_customer_id: null,
  ship_name: "Jane", ship_line1: "1 A St", ship_line2: null, ship_city: "Austin", ship_state: "TX", ship_zip: "78701", created_at: "2026-10-01T00:00:00Z",
  email_verified_at: "2026-09-28T00:00:00Z", verify_required: false, blocked_at: null };

describe("DAL", () => {
  beforeEach(() => { vi.resetModules(); getUser.mockReset(); });

  it("verifySession returns null when signed out", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    const { verifySession } = await import("@/lib/dal");
    expect(await verifySession()).toBeNull();
  });

  it("getCustomer maps the customers row and email-confirmed state", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1", email: "j@lab.org", email_confirmed_at: "2026-09-28" } }, error: null });
    from = fromQueue({ customers: [query({ data: row })] });
    const { getCustomer } = await import("@/lib/dal");
    expect(await getCustomer()).toEqual({
      id: "u1", email: "j@lab.org", emailConfirmed: true, fullName: "Jane", organization: null, isOwner: false,
      stripeCustomerId: null, ship: { name: "Jane", line1: "1 A St", line2: null, city: "Austin", state: "TX", zip: "78701" },
      createdAt: "2026-10-01T00:00:00Z", verifyRequired: false,
    });
  });

  it("emailConfirmed comes from our own verification, not Supabase's (which confirms everyone)", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1", email: "j@lab.org", email_confirmed_at: "2026-10-04" } }, error: null });
    from = fromQueue({ customers: [query({ data: { ...row, email_verified_at: null, verify_required: true } })] });
    const { getCustomer } = await import("@/lib/dal");
    expect(await getCustomer()).toMatchObject({ emailConfirmed: false, verifyRequired: true });
  });

  it("a blocked account has no customer, and getAccountState says blocked", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1", email: "j@lab.org" } }, error: null });
    const blockedRow = { ...row, blocked_at: "2026-10-04T00:00:00Z" };
    // React's cache() may not memoize outside a request, so queue a read per call.
    from = fromQueue({ customers: [query({ data: blockedRow }), query({ data: blockedRow })] });
    const { getCustomer, getAccountState } = await import("@/lib/dal");
    expect(await getAccountState()).toEqual({ customer: null, blocked: true });
    expect(await getCustomer()).toBeNull();
  });

  it("a session Supabase refuses as banned is blocked, not just signed out (the gate says closed)", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: { code: "user_banned", status: 403, message: "User is banned" } });
    const { verifySession, getAccountState } = await import("@/lib/dal");
    expect(await verifySession()).toBeNull();
    expect(await getAccountState()).toEqual({ customer: null, blocked: true });
  });

  it("any other auth error is signed out, not blocked", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: { code: "session_not_found", status: 403, message: "x" } });
    const { getAccountState } = await import("@/lib/dal");
    expect(await getAccountState()).toEqual({ customer: null, blocked: false });
  });

  it("requireCustomer redirects signed-out visitors to sign-in with a safe next path", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    const { requireCustomer } = await import("@/lib/dal");
    await expect(requireCustomer("/checkout")).rejects.toThrow("REDIRECT:/sign-in?next=%2Fcheckout");
  });

  it("requireOwner 404s for non-owners", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1", email: "j@lab.org", email_confirmed_at: null } }, error: null });
    from = fromQueue({ customers: [query({ data: row })] });
    const { requireOwner } = await import("@/lib/dal");
    await expect(requireOwner()).rejects.toThrow("NOT_FOUND");
  });

  it("safeNext only allows same-site relative paths", async () => {
    const { safeNext } = await import("@/lib/dal");
    expect(safeNext("/checkout")).toBe("/checkout");
    expect(safeNext("//evil.example")).toBe("/account");
    expect(safeNext("https://evil.example")).toBe("/account");
    expect(safeNext(null)).toBe("/account");
  });

  it("requirePartner sends customers without a partner record to the application", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1", email: "j@lab.org", email_confirmed_at: "x" } }, error: null });
    from = fromQueue({ customers: [query({ data: row })] });
    getPartnerForCustomer.mockResolvedValue(null);
    const { requirePartner } = await import("@/lib/dal");
    await expect(requirePartner()).rejects.toThrow("REDIRECT:/partners/apply");
  });

  it("requireApprovedPartner 404s for partners who aren't approved", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1", email: "j@lab.org", email_confirmed_at: "x" } }, error: null });
    from = fromQueue({ customers: [query({ data: row })] });
    getPartnerForCustomer.mockResolvedValue({ id: "p1", status: "applied" });
    const { requireApprovedPartner } = await import("@/lib/dal");
    await expect(requireApprovedPartner()).rejects.toThrow("NOT_FOUND");
  });
});
