import { describe, it, expect, vi, beforeEach } from "vitest";

const insertMock = vi.fn().mockResolvedValue({ error: null });
const fromMock = vi.fn(() => ({ insert: insertMock }));
const getUserMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: async () => ({ auth: { getUser: getUserMock }, from: fromMock }),
}));

import { POST } from "@/app/api/feedback/route";

function req(body: unknown) {
  return new Request("http://localhost/api/feedback", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
}

describe("POST /api/feedback", () => {
  beforeEach(() => { insertMock.mockClear(); fromMock.mockClear(); getUserMock.mockReset(); });

  it("rejects unauthenticated requests", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    expect((await POST(req({ recommendationId: "rec-1", thumbs: "UP" }))).status).toBe(401);
  });

  it("rejects invalid thumbs values", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u-1" } } });
    expect((await POST(req({ recommendationId: "rec-1", thumbs: "MEH" }))).status).toBe(400);
  });

  it("inserts a feedback row", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u-1" } } });
    const res = await POST(req({ recommendationId: "rec-1", thumbs: "UP", freeText: "ok" }));
    expect(res.status).toBe(200);
    expect(fromMock).toHaveBeenCalledWith("recommendation_feedback");
    expect(insertMock).toHaveBeenCalledOnce();
  });
});
