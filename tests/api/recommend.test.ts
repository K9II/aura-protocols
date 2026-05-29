import { describe, it, expect, vi, beforeEach } from "vitest";

const { recommendMock, getUserMock, insertMock, selectMock, orderMock, eqMock, fromMock } = vi.hoisted(() => {
  const insertMock = vi.fn().mockResolvedValue({ data: [{ id: "rec-1" }], error: null });
  const biometricRow = { source: "WHOOP", captured_at: "2026-05-23T07:00:00Z", recovery_score: 40, hrv_ms: 30, resting_hr_bpm: 55, sleep_hours: 6 };
  const selectMock = vi.fn().mockReturnValue(biometricRow);
  const orderMock = vi.fn().mockReturnValue({ limit: () => ({ data: [biometricRow] }) });
  const maybeSingleMock = vi.fn().mockResolvedValue({ data: null, error: null });
  const eqMock = vi.fn().mockReturnValue({ order: orderMock, maybeSingle: maybeSingleMock });
  const fromMock = vi.fn(() => ({
    select: () => ({ eq: eqMock }),
    insert: () => ({ select: () => ({ single: insertMock }) }),
  }));
  return { recommendMock: vi.fn(), getUserMock: vi.fn(), insertMock, selectMock, orderMock, eqMock, fromMock };
});

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: async () => ({ auth: { getUser: getUserMock }, from: fromMock }),
}));
vi.mock("@/lib/recommend", () => ({ recommend: recommendMock }));

import { POST } from "@/app/api/recommend/route";

describe("POST /api/recommend", () => {
  beforeEach(() => { recommendMock.mockReset(); getUserMock.mockReset(); });

  it("rejects unauthenticated requests", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const res = await POST(new Request("http://localhost/api/recommend", { method: "POST" }));
    expect(res.status).toBe(401);
  });

  it("returns the orchestrator output for authenticated users", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u-1" } } });
    recommendMock.mockResolvedValue({
      rules: { template: "RECOVERY", triggers: [], contraindications: [], doseCeilings: {} },
      output: { template: "RECOVERY", headline: "h", steps: [{ compound: "c", dose: "d", timing: "t", rationale: "r" }], lifestyle: [], cycle: "c", caveats: ["x"] },
    });
    const res = await POST(new Request("http://localhost/api/recommend", { method: "POST" }));
    expect(res.status).toBe(200);
    expect((await res.json()).output.template).toBe("RECOVERY");
    expect(recommendMock).toHaveBeenCalledOnce();
  });
});
