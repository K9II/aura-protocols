import { describe, it, expect, vi, beforeEach } from "vitest";

const insertMock = vi.fn().mockResolvedValue({ error: null });
const fromMock = vi.fn(() => ({ insert: insertMock }));
const getUserMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: async () => ({ auth: { getUser: getUserMock }, from: fromMock }),
}));

import { POST } from "@/app/api/upload/route";

function request(body: unknown) {
  return new Request("http://localhost/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/upload", () => {
  beforeEach(() => { insertMock.mockClear(); fromMock.mockClear(); getUserMock.mockReset(); });

  it("rejects unauthenticated requests", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const res = await POST(request({ capturedAt: "2026-05-23T07:00:00Z", recoveryScore: 60 }));
    expect(res.status).toBe(401);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("rejects malformed payloads", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u-1" } } });
    const res = await POST(request({ recoveryScore: 9999 }));
    expect(res.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("inserts a snapshot for valid auth + valid payload", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u-1" } } });
    const res = await POST(request({ capturedAt: "2026-05-23T07:00:00Z", recoveryScore: 60, hrvMs: 50, sleepHours: 7 }));
    expect(res.status).toBe(200);
    expect(fromMock).toHaveBeenCalledWith("biometric_snapshots");
    expect(insertMock).toHaveBeenCalledOnce();
    expect(insertMock.mock.calls[0][0].user_id).toBe("u-1");
    expect(insertMock.mock.calls[0][0].recovery_score).toBe(60);
  });
});
