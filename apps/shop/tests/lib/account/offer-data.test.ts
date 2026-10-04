import { describe, it, expect, vi, beforeEach } from "vitest";
import { query, fromQueue } from "../../helpers/supabase-mock";

let from: ReturnType<typeof fromQueue>;
const hasPaidOrder = vi.fn(), accountIdByEmail = vi.fn();
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdminClient: () => ({ from: (t: string) => from(t) }) }));
vi.mock("@/lib/email/data", () => ({ hasPaidOrder }));
vi.mock("@/lib/account/data", () => ({ accountIdByEmail }));

describe("offer data", () => {
  beforeEach(() => { vi.resetModules(); hasPaidOrder.mockReset(); accountIdByEmail.mockReset(); });

  it("offerForCustomer is live for a fresh account with no paid order", async () => {
    hasPaidOrder.mockResolvedValue(false);
    const { offerForCustomer } = await import("@/lib/account/offer-data");
    const r = await offerForCustomer({ id: "u1", createdAt: new Date().toISOString() });
    expect(r).not.toBeNull();
    expect(hasPaidOrder).toHaveBeenCalledWith("u1");
  });

  it("offerForEmail is null for an email with no account", async () => {
    accountIdByEmail.mockResolvedValue(null);
    const { offerForEmail } = await import("@/lib/account/offer-data");
    expect(await offerForEmail("a@b.co")).toBeNull();
  });

  it("offerForEmail reads the account's created_at", async () => {
    accountIdByEmail.mockResolvedValue("u1");
    hasPaidOrder.mockResolvedValue(false);
    from = fromQueue({ customers: [query({ data: { created_at: new Date().toISOString() } })] });
    const { offerForEmail } = await import("@/lib/account/offer-data");
    expect(await offerForEmail("a@b.co")).not.toBeNull();
  });
});
