import { describe, it, expect, vi, beforeEach } from "vitest";
import { query, fromQueue, callArgs } from "../../helpers/supabase-mock";

let from: ReturnType<typeof fromQueue>;
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdminClient: () => ({ from: (t: string) => from(t) }) }));

describe("saveResearchVerification", () => {
  beforeEach(() => { vi.resetModules(); });

  it("saves field, company and time once (only while unset)", async () => {
    const q = query({});
    from = fromQueue({ customers: [q] });
    const { saveResearchVerification } = await import("@/lib/account/research-data");
    await saveResearchVerification("u1", { field: "independent", org: "Halden Labs" });
    const [patch] = callArgs(q, "update") as [Record<string, unknown>];
    expect(patch).toMatchObject({ research_field: "independent", research_org: "Halden Labs" });
    expect(typeof patch.research_verified_at).toBe("string");
    expect(callArgs(q, "eq")).toEqual(["id", "u1"]);
    expect(callArgs(q, "is")).toEqual(["research_verified_at", null]);
  });

  it("throws when the save fails", async () => {
    from = fromQueue({ customers: [query({ error: { message: "down" } })] });
    const { saveResearchVerification } = await import("@/lib/account/research-data");
    await expect(saveResearchVerification("u1", { field: "other", org: "X" })).rejects.toThrow(/down/);
  });
});
