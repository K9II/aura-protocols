import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { getUserMock, createSessionMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  createSessionMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: async () => ({ auth: { getUser: getUserMock } }),
}));

vi.mock("@/lib/terra/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/terra/client")>();
  return { ...actual, createTerraWidgetSession: createSessionMock };
});

import { POST } from "@/app/api/terra/connect/route";

function request() {
  return new Request("http://localhost/api/terra/connect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
}

describe("POST /api/terra/connect", () => {
  const prevDev = process.env.TERRA_DEV_ID;
  const prevKey = process.env.TERRA_API_KEY;

  beforeEach(() => { getUserMock.mockReset(); createSessionMock.mockReset(); });
  afterEach(() => { process.env.TERRA_DEV_ID = prevDev; process.env.TERRA_API_KEY = prevKey; });

  it("rejects unauthenticated requests", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const res = await POST(request());
    expect(res.status).toBe(401);
    expect(createSessionMock).not.toHaveBeenCalled();
  });

  it("returns 503 (handled) when Terra is not configured, without calling Terra", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u-1" } } });
    process.env.TERRA_DEV_ID = "";
    process.env.TERRA_API_KEY = "";
    const res = await POST(request());
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ error: "terra_unavailable" });
    expect(createSessionMock).not.toHaveBeenCalled();
  });

  it("returns the widget url when configured", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u-1" } } });
    process.env.TERRA_DEV_ID = "dev-123";
    process.env.TERRA_API_KEY = "key-123";
    createSessionMock.mockResolvedValue({ url: "https://widget.tryterra.co/abc" });
    const res = await POST(request());
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ url: "https://widget.tryterra.co/abc" });
    expect(createSessionMock).toHaveBeenCalledOnce();
  });
});

describe("isTerraConfigured", () => {
  const prevDev = process.env.TERRA_DEV_ID;
  const prevKey = process.env.TERRA_API_KEY;
  afterEach(() => { process.env.TERRA_DEV_ID = prevDev; process.env.TERRA_API_KEY = prevKey; });

  it("is false when either credential is empty or missing", async () => {
    const { isTerraConfigured } = await import("@/lib/terra/client");
    process.env.TERRA_DEV_ID = ""; process.env.TERRA_API_KEY = "key";
    expect(isTerraConfigured()).toBe(false);
    process.env.TERRA_DEV_ID = "dev"; process.env.TERRA_API_KEY = "";
    expect(isTerraConfigured()).toBe(false);
    delete process.env.TERRA_DEV_ID; delete process.env.TERRA_API_KEY;
    expect(isTerraConfigured()).toBe(false);
  });

  it("is true only when both credentials are present", async () => {
    const { isTerraConfigured } = await import("@/lib/terra/client");
    process.env.TERRA_DEV_ID = "dev"; process.env.TERRA_API_KEY = "key";
    expect(isTerraConfigured()).toBe(true);
  });
});
