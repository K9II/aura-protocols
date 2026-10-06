import { describe, it, expect, vi, beforeEach } from "vitest";
import { zonedToIso } from "@/lib/discounts/time";

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

  it("rejects a batch prefix that can't start a valid code", async () => {
    const { saveCodeAction } = await import("@/app/admin/discounts/actions");
    expect(await saveCodeAction(null, fd({ ...spring, mode: "batch", kind: "item_pct", value: "25", prefix: "---", count: "10" })))
      .toMatchObject({ fieldErrors: { prefix: "Start with a letter or number; letters, numbers and dashes only." } });
    expect(data.insertBatch).not.toHaveBeenCalled();
  });

  it("handles a batch-rule edit before the new-batch branch (id wins over mode=batch)", async () => {
    const batchId = "33333333-3333-4333-8333-333333333333";
    const codeId = "44444444-4444-4444-8444-444444444444";
    data.getCodeById.mockResolvedValue({ id: codeId, batch_id: batchId, ends_at: null, starts_at: null });
    const { saveCodeAction } = await import("@/app/admin/discounts/actions");
    // Task 17's batch-edit form submits mode="batch" with id set and no prefix/count.
    await expect(saveCodeAction(null, fd({ ...spring, mode: "batch", id: codeId })))
      .rejects.toThrow(`REDIRECT /admin/discounts/batch/${batchId}`);
    expect(data.insertBatch).not.toHaveBeenCalled();
    expect(data.updateBatch).toHaveBeenCalledTimes(1);
    const [calledBatchId, patch] = data.updateBatch.mock.calls[0];
    expect(calledBatchId).toBe(batchId);
    expect(patch).not.toHaveProperty("max_uses");
    expect(patch).not.toHaveProperty("locked_email");
  });

  it("a malformed id returns 'no longer exists' without a lookup", async () => {
    const { saveCodeAction } = await import("@/app/admin/discounts/actions");
    expect(await saveCodeAction(null, fd({ ...spring, id: "not-a-uuid" }))).toMatchObject({ error: "That code no longer exists." });
    expect(data.getCodeById).not.toHaveBeenCalled();
  });

  it("an id that no longer exists returns the same message", async () => {
    data.getCodeById.mockResolvedValue(null);
    const { saveCodeAction } = await import("@/app/admin/discounts/actions");
    expect(await saveCodeAction(null, fd({ ...spring, id: "55555555-5555-4555-8555-555555555555" })))
      .toMatchObject({ error: "That code no longer exists." });
  });

  it("editing an already-ended code doesn't require a new future end date", async () => {
    const codeId = "66666666-6666-4666-8666-666666666666";
    const startsLocal = "2026-08-01T00:00";
    const endsLocal = "2026-08-31T23:59";
    const startsIso = zonedToIso(startsLocal);
    const endsIso = zonedToIso(endsLocal);
    // Supabase's timestamp format, not zonedToIso's.
    const asStored = (iso: string) => iso.replace(".000Z", "+00:00");
    data.getCodeById.mockResolvedValue({ id: codeId, batch_id: null, starts_at: asStored(startsIso), ends_at: asStored(endsIso) });
    const { saveCodeAction } = await import("@/app/admin/discounts/actions");
    await expect(saveCodeAction(null, fd({ ...spring, id: codeId, startsAt: startsLocal, endsAt: endsLocal })))
      .rejects.toThrow(`REDIRECT /admin/discounts/${codeId}`);
    expect(data.updateCode).toHaveBeenCalledTimes(1);
    const [, patch] = data.updateCode.mock.calls[0];
    expect(patch.ends_at).toBe(endsIso);
  });

  it("editing a code still requires the end to be after the start", async () => {
    const codeId = "77777777-7777-4777-8777-777777777777";
    const endsLocal = "2026-08-31T23:59";
    const endsIso = zonedToIso(endsLocal);
    data.getCodeById.mockResolvedValue({ id: codeId, batch_id: null, starts_at: null, ends_at: endsIso });
    const { saveCodeAction } = await import("@/app/admin/discounts/actions");
    // startsAt moved to after the (unchanged) endsAt — still rejected.
    expect(await saveCodeAction(null, fd({ ...spring, id: codeId, startsAt: "2026-09-01T00:00", endsAt: endsLocal })))
      .toMatchObject({ fieldErrors: { endsAt: expect.any(String) } });
    expect(data.updateCode).not.toHaveBeenCalled();
  });

  it("enforces per-field bounds", async () => {
    const { saveCodeAction } = await import("@/app/admin/discounts/actions");
    expect(await saveCodeAction(null, fd({ ...spring, note: "x".repeat(121) }))).toMatchObject({ fieldErrors: { note: expect.any(String) } });
    expect(await saveCodeAction(null, fd({ ...spring, kind: "order_amount", value: "10000.01" }))).toMatchObject({ fieldErrors: { value: expect.any(String) } });
    expect(await saveCodeAction(null, fd({ ...spring, minOrder: "100000.01" }))).toMatchObject({ fieldErrors: { minOrder: expect.any(String) } });
    expect(await saveCodeAction(null, fd({ ...spring, maxUses: "1000001" }))).toMatchObject({ fieldErrors: { maxUses: expect.any(String) } });
    expect(data.insertCode).not.toHaveBeenCalled();
    // $10,000 exactly is still allowed — it clears parseRule and reaches the redirect.
    await expect(saveCodeAction(null, fd({ ...spring, kind: "order_amount", value: "10000" }))).rejects.toThrow("REDIRECT");
    expect(data.insertCode).toHaveBeenCalledTimes(1);
  });

  it("rejects an unknown scope", async () => {
    const { saveCodeAction } = await import("@/app/admin/discounts/actions");
    expect(await saveCodeAction(null, fd({ ...spring, scope: "bogus" }))).toMatchObject({ fieldErrors: { scope: "Pick which products." } });
    expect(data.insertCode).not.toHaveBeenCalled();
  });

  it("free shipping ignores the product scope (a stale 'only' with no items doesn't block or leak)", async () => {
    const { saveCodeAction } = await import("@/app/admin/discounts/actions");
    await expect(saveCodeAction(null, fd({ ...spring, kind: "ship_only", value: "", scope: "only", scopeItems: "[]" }))).rejects.toThrow("REDIRECT");
    expect(data.insertCode.mock.calls[0][1]).toMatchObject({
      kind: "ship_only", value: 0, include_slugs: [], exclude_slugs: [], include_classes: [], exclude_classes: [],
    });
    data.insertCode.mockClear();
    await expect(saveCodeAction(null, fd({ ...spring, kind: "ship_only", value: "", scope: "bogus", scopeItems: "not json" }))).rejects.toThrow("REDIRECT");
    expect(data.insertCode.mock.calls[0][1]).toMatchObject({ include_slugs: [], exclude_slugs: [], include_classes: [], exclude_classes: [] });
  });

  it("pause / resume / end move only from the expected state", async () => {
    data.setCodeState.mockResolvedValue(true);
    const { setCodeStateAction } = await import("@/app/admin/discounts/actions");
    await setCodeStateAction(fd({ codeId: "11111111-1111-4111-8111-111111111111", from: "active", to: "paused" }));
    expect(data.setCodeState).toHaveBeenCalledWith({ codeId: "11111111-1111-4111-8111-111111111111" }, "active", "paused", "owner");
    await expect(setCodeStateAction(fd({ codeId: "11111111-1111-4111-8111-111111111111", from: "ended", to: "active" })))
      .rejects.toThrow("That code changed since the page loaded — reload and try again.");
    expect(data.setCodeState).toHaveBeenCalledTimes(1); // ended is final
  });

  it("setCodeStateAction throws loudly when the move no longer applies", async () => {
    data.setCodeState.mockResolvedValue(false);
    const { setCodeStateAction } = await import("@/app/admin/discounts/actions");
    await expect(setCodeStateAction(fd({ codeId: "11111111-1111-4111-8111-111111111111", from: "active", to: "paused" })))
      .rejects.toThrow("That code changed since the page loaded — reload and try again.");
  });

  it("resetUseAction throws loudly on a bad id or a reset that doesn't apply", async () => {
    const { resetUseAction } = await import("@/app/admin/discounts/actions");
    await expect(resetUseAction(fd({ redemptionId: "nope" }))).rejects.toThrow("Only a used code on a refunded order can be reset.");
    data.resetUse.mockResolvedValue(false);
    await expect(resetUseAction(fd({ redemptionId: "11111111-1111-4111-8111-111111111111" })))
      .rejects.toThrow("Only a used code on a refunded order can be reset.");
    data.resetUse.mockResolvedValue(true);
    await expect(resetUseAction(fd({ redemptionId: "11111111-1111-4111-8111-111111111111" }))).resolves.toBeUndefined();
  });

  it("the cap must be from the new-account percent (so the advertised offer is never trimmed) to 60", async () => {
    const { setCapAction } = await import("@/app/admin/discounts/actions");
    const { CAP_MIN_PCT, CAP_MAX_PCT } = await import("@/lib/discounts/rules");
    const { NEW_ACCOUNT_PCT } = await import("@/lib/account/offer");
    expect(CAP_MIN_PCT).toBe(NEW_ACCOUNT_PCT);
    expect(CAP_MAX_PCT).toBe(60);
    expect(await setCapAction(null, fd({ cap: String(CAP_MIN_PCT - 1) }))).toEqual({ error: `Use a whole percent from ${CAP_MIN_PCT} to 60.` });
    expect(await setCapAction(null, fd({ cap: "10" }))).toMatchObject({ error: expect.any(String) });
    expect(await setCapAction(null, fd({ cap: "90" }))).toMatchObject({ error: expect.any(String) });
    expect(await setCapAction(null, fd({ cap: "25" }))).toEqual({ ok: true });
    expect(data.setDiscountCap).toHaveBeenCalledWith(25, "owner");
  });
});
