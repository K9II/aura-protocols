import { describe, it, expect, vi, beforeEach } from "vitest";

const requireOwner = vi.fn();
const data = {
  insertCode: vi.fn(), insertBatch: vi.fn(), isDiscountCodeTaken: vi.fn(), getCodeById: vi.fn(), updateCode: vi.fn(), updateBatch: vi.fn(),
  setCodeState: vi.fn(), resetUse: vi.fn(), setDiscountCap: vi.fn(), getBatch: vi.fn(),
};
const redirect = vi.fn((url: string) => { throw new Error(`REDIRECT ${url}`); });
vi.mock("@/lib/dal", () => ({ requireOwner }));
vi.mock("@/lib/discounts/data", () => data);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect }));

function fd(v: Record<string, string>) { const f = new FormData(); for (const [k, x] of Object.entries(v)) f.set(k, x); return f; }
// Far-future dates: the action refuses an end date in the past.
const spring = { mode: "single", code: "spring20", note: "Spring email list", kind: "order_pct", value: "20", stackOnTop: "on", freeShipping: "on",
  startsAt: "2030-10-05T00:00", endsAt: "2030-10-31T23:59", maxUses: "200", oncePerCustomer: "on", minOrder: "150", scope: "except",
  scopeItems: JSON.stringify([{ type: "class", value: "Blends" }, { type: "product", value: "nad-plus" }]), intent: "create" };

describe("discount admin actions", () => {
  beforeEach(() => {
    vi.resetModules();
    requireOwner.mockReset(); requireOwner.mockResolvedValue({ id: "owner" });
    for (const f of Object.values(data)) f.mockReset();
    data.isDiscountCodeTaken.mockResolvedValue(false);
    data.insertCode.mockResolvedValue({ id: "c1" });
  });

  it("is owner-only", async () => {
    requireOwner.mockRejectedValue(new Error("NOT_FOUND"));
    const { saveCodeAction } = await import("@/app/admin/discounts/actions");
    await expect(saveCodeAction(null, fd(spring))).rejects.toThrow("NOT_FOUND");
    expect(data.insertCode).not.toHaveBeenCalled();
  });

  it("creates the code from the form and opens its page", async () => {
    const { saveCodeAction } = await import("@/app/admin/discounts/actions");
    await expect(saveCodeAction(null, fd(spring))).rejects.toThrow("REDIRECT /admin/discounts/c1");
    expect(data.insertCode).toHaveBeenCalledWith("SPRING20", {
      note: "Spring email list", kind: "order_pct", value: 20, stack_on_top: true, free_shipping: true,
      starts_at: "2030-10-05T06:00:00.000Z", ends_at: "2030-11-01T05:59:00.000Z", max_uses: 200, once_per_customer: true, locked_email: null,
      min_order_cents: 15000, include_slugs: [], exclude_slugs: ["nad-plus"], include_classes: [], exclude_classes: ["Blends"], status: "active",
    }, "owner");
  });

  it("order $ values are stored in cents; 'Save paused' stores paused", async () => {
    const { saveCodeAction } = await import("@/app/admin/discounts/actions");
    await expect(saveCodeAction(null, fd({ ...spring, kind: "order_amount", value: "10.50", intent: "paused" }))).rejects.toThrow("REDIRECT");
    expect(data.insertCode.mock.calls[0][1]).toMatchObject({ kind: "order_amount", value: 1050, status: "paused" });
  });

  it("returns field errors instead of saving bad input", async () => {
    const { saveCodeAction } = await import("@/app/admin/discounts/actions");
    expect(await saveCodeAction(null, fd({ ...spring, code: "a" }))).toMatchObject({ fieldErrors: { code: expect.any(String) } });
    expect(await saveCodeAction(null, fd({ ...spring, value: "0" }))).toMatchObject({ fieldErrors: { value: expect.any(String) } });
    expect(await saveCodeAction(null, fd({ ...spring, endsAt: "2026-10-01T00:00" }))).toMatchObject({ fieldErrors: { endsAt: expect.any(String) } });
    expect(await saveCodeAction(null, fd({ ...spring, lockEmail: "on", lockedEmail: "nope" }))).toMatchObject({ fieldErrors: { lockedEmail: expect.any(String) } });
    expect(data.insertCode).not.toHaveBeenCalled();
  });

  it("refuses a code that's taken", async () => {
    data.isDiscountCodeTaken.mockResolvedValue(true);
    const { saveCodeAction } = await import("@/app/admin/discounts/actions");
    expect(await saveCodeAction(null, fd(spring))).toMatchObject({ fieldErrors: { code: "That code is already used by another discount or a partner." } });
  });

  it("creates a batch of single-use codes", async () => {
    data.insertBatch.mockResolvedValue({ id: "b1" });
    const { saveCodeAction } = await import("@/app/admin/discounts/actions");
    await expect(saveCodeAction(null, fd({ ...spring, mode: "batch", kind: "item_pct", value: "25", prefix: "vip-oct-", count: "50" }))).rejects.toThrow("REDIRECT /admin/discounts/batch/b1?created=1");
    const [prefix, codes] = data.insertBatch.mock.calls[0];
    expect(prefix).toBe("VIP-OCT-");
    expect(codes).toHaveLength(50);
  });

  it("pause / resume / end move only from the expected state", async () => {
    data.setCodeState.mockResolvedValue(true);
    const { setCodeStateAction } = await import("@/app/admin/discounts/actions");
    await setCodeStateAction(fd({ codeId: "11111111-1111-4111-8111-111111111111", from: "active", to: "paused" }));
    expect(data.setCodeState).toHaveBeenCalledWith({ codeId: "11111111-1111-4111-8111-111111111111" }, "active", "paused", "owner");
    await setCodeStateAction(fd({ codeId: "11111111-1111-4111-8111-111111111111", from: "ended", to: "active" }));
    expect(data.setCodeState).toHaveBeenCalledTimes(1); // ended is final
  });

  it("the cap must be 5–60", async () => {
    const { setCapAction } = await import("@/app/admin/discounts/actions");
    expect(await setCapAction(null, fd({ cap: "90" }))).toMatchObject({ error: expect.any(String) });
    expect(await setCapAction(null, fd({ cap: "25" }))).toEqual({ ok: true });
    expect(data.setDiscountCap).toHaveBeenCalledWith(25, "owner");
  });
});
