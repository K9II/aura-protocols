import { describe, it, expect, vi, beforeEach } from "vitest";

describe("getSupabaseAdminClient", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
  });

  it("throws a clear error if SUPABASE_URL is missing", async () => {
    delete process.env.SUPABASE_URL;
    const { getSupabaseAdminClient } = await import("@/lib/supabaseAdmin");
    expect(() => getSupabaseAdminClient()).toThrow("SUPABASE_URL");
  });

  it("throws a clear error if SUPABASE_SERVICE_ROLE_KEY is missing", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const { getSupabaseAdminClient } = await import("@/lib/supabaseAdmin");
    expect(() => getSupabaseAdminClient()).toThrow("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("returns a client when both env vars are present", async () => {
    const { getSupabaseAdminClient } = await import("@/lib/supabaseAdmin");
    const client = getSupabaseAdminClient();
    expect(client).toBeTruthy();
    expect(typeof client.from).toBe("function");
  });
});
