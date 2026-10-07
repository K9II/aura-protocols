import { describe, it, expect, vi, beforeEach } from "vitest";
import { query, fromQueue, callArgs } from "../../helpers/supabase-mock";

const db = vi.hoisted(() => ({ from: null as null | ((t: string) => unknown) }));
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdminClient: () => ({ from: (t: string) => db.from!(t) }) }));

describe("activityFeed: inquiries area", () => {
  beforeEach(() => { vi.resetModules(); });

  it("Inquiries area: owner actions from inquiry_events (opened excluded), linked to the thread or the module page", async () => {
    const ev = query({ data: [
      { id: "e1", action: "replied", detail: null, at: "2026-10-06T21:00:00Z", actor: "o1", inquiry_id: "i1", inquiries: { ref: 1047, name: "Dana Whitfield" } },
      { id: "e2", action: "reply_saved", detail: "Finding a COA", at: "2026-10-06T20:00:00Z", actor: "o1", inquiry_id: null, inquiries: null },
      { id: "e3", action: "unmatched_dismissed", detail: "x@spam.example", at: "2026-10-06T19:00:00Z", actor: "o1", inquiry_id: null, inquiries: null },
    ] });
    db.from = fromQueue({ inquiry_events: [ev], customers: [query({ data: [{ id: "o1", full_name: "Kearney Adams" }] })] });
    const { activityFeed } = await import("@/lib/audit/feed");
    const { items } = await activityFeed({ area: "inquiries" }, () => "");
    expect(callArgs(ev, "neq")).toEqual(["action", "opened"]);
    expect(items.map((i) => [i.area, i.href])).toEqual([
      ["inquiries", "/admin/inquiries/Q-1047"], ["inquiries", "/admin/inquiries/replies"], ["inquiries", "/admin/inquiries?tab=unmatched"],
    ]);
  });
});

describe("activityFeed: team area", () => {
  beforeEach(() => { vi.resetModules(); });

  it("reads admin_events area \"staff\" as the \"team\" area, linked to /admin/team", async () => {
    const ev = query({ data: [
      { id: "e1", area: "staff", action: "staff_disabled", target_id: "s1", label: "Assistant (Claude)", detail: "Pausing for review", actor_id: "o1", at: "2026-10-07T14:00:00Z" },
    ] });
    db.from = fromQueue({ admin_events: [ev], customers: [query({ data: [{ id: "o1", full_name: "Alvester" }] })] });
    const { activityFeed } = await import("@/lib/audit/feed");
    const { items } = await activityFeed({ area: "team" }, () => "");
    expect(callArgs(ev, "in")).toEqual(["area", ["staff"]]);
    expect(items.map((i) => [i.area, i.href, i.source])).toEqual([["team", "/admin/team", "admin"]]);
  });
});
