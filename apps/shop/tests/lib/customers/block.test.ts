import { describe, it, expect, vi, beforeEach } from "vitest";

const order: string[] = [];
const setBlockedFields = vi.fn(async (_id: string, v: unknown) => { order.push(v ? "flag" : "unflag"); });
const logCustomerEvent = vi.fn(async (e: { kind: string }) => { order.push(`event:${e.kind}`); });
const updateUserById = vi.fn(async (_id: string, attrs: { ban_duration: string }) => { order.push(`ban:${attrs.ban_duration}`); return { data: {}, error: null }; });
const closeOpenCheckouts = vi.fn(async () => { order.push("close"); return { closed: ["AP-1095"], failed: [] as unknown[] }; });
const alertOwner = vi.fn();
vi.mock("@/lib/customers/data", () => ({ setBlockedFields, logCustomerEvent }));
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdminClient: () => ({ auth: { admin: { updateUserById } } }) }));
vi.mock("@/lib/checkout-close", () => ({ closeOpenCheckouts }));
vi.mock("@/lib/commerce", () => ({ getCommerceAdapter: () => ({}) }));
vi.mock("@/lib/notify", () => ({ alertOwner }));

describe("blockCustomer", () => {
  beforeEach(() => { order.length = 0; for (const f of [setBlockedFields, logCustomerEvent, updateUserById, closeOpenCheckouts, alertOwner]) f.mockClear(); });

  it("flag → ban → close checkouts → log, and reports what it closed", async () => {
    const { blockCustomer } = await import("@/lib/customers/block");
    expect(await blockCustomer("u1", "two chargebacks", "owner")).toEqual({ closed: ["AP-1095"] });
    expect(order).toEqual(["flag", "ban:876000h", "close", "event:blocked"]);
    expect(closeOpenCheckouts).toHaveBeenCalledWith("u1", {}, { all: true });
    expect(logCustomerEvent).toHaveBeenCalledWith({ customerId: "u1", kind: "blocked", reason: "two chargebacks", note: "1 open checkout cancelled (AP-1095)", actorId: "owner" });
  });

  it("a failed ban throws and alerts, and nothing after it runs", async () => {
    updateUserById.mockResolvedValueOnce({ data: null, error: { message: "auth down" } } as never);
    const { blockCustomer } = await import("@/lib/customers/block");
    await expect(blockCustomer("u1", "x", "owner")).rejects.toThrow(/ban/);
    expect(alertOwner).toHaveBeenCalledWith(expect.stringMatching(/Block didn't finish/), expect.stringMatching(/sign-in lock/));
    expect(closeOpenCheckouts).not.toHaveBeenCalled();
  });

  it("a checkout that can't be closed throws after logging nothing", async () => {
    closeOpenCheckouts.mockResolvedValueOnce({ closed: [], failed: [{ orderNumber: "AP-9", error: "stripe down" }] });
    const { blockCustomer } = await import("@/lib/customers/block");
    await expect(blockCustomer("u1", "x", "owner")).rejects.toThrow(/AP-9/);
    expect(logCustomerEvent).not.toHaveBeenCalled();
  });

  it("unblock: lift the ban, clear the flag, log", async () => {
    const { unblockCustomer } = await import("@/lib/customers/block");
    await unblockCustomer("u1", "owner");
    expect(order).toEqual(["ban:none", "unflag", "event:unblocked"]);
  });
});
