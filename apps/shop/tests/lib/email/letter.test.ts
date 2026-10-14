import { describe, it, expect, vi, beforeEach } from "vitest";
import { query, fromQueue, callArgs } from "../../helpers/supabase-mock";
import type { Customer } from "@/lib/dal";

let from: ReturnType<typeof fromQueue>;
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdminClient: () => ({ from: (t: string) => from(t) }) }));
const { getSubscriber, recordOptIn, listVerifiedOptIn } = vi.hoisted(() => ({ getSubscriber: vi.fn(), recordOptIn: vi.fn(), listVerifiedOptIn: vi.fn() }));
vi.mock("@/lib/email/data", () => ({ getSubscriber, recordOptIn }));
vi.mock("@/lib/account/welcome", () => ({ listVerifiedOptIn }));

import { letterState, subscribeToLetter } from "@/lib/email/letter";

const customer = (emailConfirmed: boolean) => ({ id: "c1", email: "a@lab.org", emailConfirmed } as Customer);

describe("The Aura letter", () => {
  beforeEach(() => { getSubscriber.mockReset(); recordOptIn.mockReset(); listVerifiedOptIn.mockReset(); });

  it("reads the list state of an address", async () => {
    getSubscriber.mockResolvedValueOnce(null);
    expect(await letterState("a@lab.org")).toBe("none");
    getSubscriber.mockResolvedValueOnce({ status: "unsubscribed" });
    expect(await letterState("a@lab.org")).toBe("unsubscribed");
  });

  it("does nothing for an address already on the list", async () => {
    getSubscriber.mockResolvedValue({ status: "confirmed" });
    expect(await subscribeToLetter(customer(true))).toBe("confirmed");
    expect(recordOptIn).not.toHaveBeenCalled();
  });

  it("lists a verified account at once (welcome flow) and flags the account", async () => {
    getSubscriber.mockResolvedValue(null);
    listVerifiedOptIn.mockResolvedValue(true);
    const q = query({});
    from = fromQueue({ customers: [q] });
    expect(await subscribeToLetter(customer(true))).toBe("confirmed");
    expect(recordOptIn).toHaveBeenCalledWith("a@lab.org", null);
    expect(callArgs(q, "update")).toEqual([{ marketing_opt_in: true }]);
    expect(listVerifiedOptIn).toHaveBeenCalledWith("a@lab.org");
  });

  it("leaves an unverified account pending until it verifies", async () => {
    getSubscriber.mockResolvedValue({ status: "unsubscribed" });
    from = fromQueue({ customers: [query({})] });
    expect(await subscribeToLetter(customer(false))).toBe("pending");
    expect(recordOptIn).toHaveBeenCalled();
    expect(listVerifiedOptIn).not.toHaveBeenCalled();
  });

  it("throws when the account flag can't be saved", async () => {
    getSubscriber.mockResolvedValue(null);
    from = fromQueue({ customers: [query({ error: { message: "down" } })] });
    await expect(subscribeToLetter(customer(true))).rejects.toThrow(/down/);
  });
});
