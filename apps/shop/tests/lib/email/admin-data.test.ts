import { describe, it, expect, vi, beforeEach } from "vitest";
import { query, fromQueue, callArgs } from "../../helpers/supabase-mock";

let from: ReturnType<typeof fromQueue>;
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdminClient: () => ({ from: (t: string) => from(t) }) }));

describe("email admin data", () => {
  beforeEach(() => { vi.resetModules(); });

  it("reads the pause switches", async () => {
    from = fromQueue({ shop_settings: [query({ data: { welcome_paused: false, cart_paused: true } })] });
    const { getEmailSettings } = await import("@/lib/email/admin-data");
    expect(await getEmailSettings()).toEqual({ welcomePaused: false, cartPaused: true });
  });

  it("pausing writes the switch only if it changes, and logs it", async () => {
    const upd = query({ data: [{ id: true }] }), log = query({});
    from = fromQueue({ shop_settings: [upd], email_admin_events: [log] });
    const { setAutomationPaused } = await import("@/lib/email/admin-data");
    expect(await setAutomationPaused("cart", true, "owner1", "fixing a link")).toBe(true);
    expect(callArgs(upd, "update")?.[0]).toMatchObject({ cart_paused: true });
    expect(callArgs(upd, "eq")).toEqual(["cart_paused", false]);
    expect(callArgs(log, "insert")?.[0]).toEqual({ action: "paused", target: "cart", actor: "owner1", note: "fixing a link" });
  });

  it("a stale pause (already paused) changes nothing and logs nothing", async () => {
    from = fromQueue({ shop_settings: [query({ data: [] })] });
    const { setAutomationPaused } = await import("@/lib/email/admin-data");
    expect(await setAutomationPaused("welcome", false, "owner1", null)).toBe(false);
  });

  it("runs: start then finish", async () => {
    const ins = query({ data: { id: "r1" } }), fin = query({});
    from = fromQueue({ email_runs: [ins, fin] });
    const { startRun, finishRun } = await import("@/lib/email/admin-data");
    expect(await startRun()).toBe("r1");
    await finishRun("r1", { welcome: 4, cart: 2, cartSkipped: 1, campaign: 0, failures: ["x"] });
    expect(callArgs(fin, "update")?.[0]).toMatchObject({ welcome_sent: 4, cart_sent: 2, cart_skipped: 1, campaign_sent: 0, failures: 1, error_text: "x" });
  });

  it("throws on write errors", async () => {
    from = fromQueue({ email_admin_events: [query({ error: { message: "down" } })] });
    const { logEmailAdminEvent } = await import("@/lib/email/admin-data");
    await expect(logEmailAdminEvent({ action: "stopped", target: "k1", actor: null })).rejects.toThrow();
  });
});

describe("markSkipped", () => {
  beforeEach(() => { vi.resetModules(); });
  it("claims the send as skipped, never sending", async () => {
    const ins = query({ data: { id: "s1" } });
    from = fromQueue({ email_sends: [ins] });
    const { markSkipped } = await import("@/lib/email/data");
    expect(await markSkipped("A@b.co", "cart_2", "o1")).toBe(true);
    expect(callArgs(ins, "insert")?.[0]).toEqual({ email: "a@b.co", kind: "cart_2", ref: "o1", skipped: true });
  });
  it("an existing claim is fine (false)", async () => {
    from = fromQueue({ email_sends: [query({ error: { code: "23505" } })] });
    const { markSkipped } = await import("@/lib/email/data");
    expect(await markSkipped("a@b.co", "cart_2", "o1")).toBe(false);
  });
});
