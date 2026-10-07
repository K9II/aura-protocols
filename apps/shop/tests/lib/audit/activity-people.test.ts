import { describe, it, expect, vi, beforeEach } from "vitest";
import { query, fromQueue } from "../../helpers/supabase-mock";

const db = vi.hoisted(() => ({ from: null as null | ((t: string) => unknown) }));
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdminClient: () => ({ from: (t: string) => db.from!(t) }) }));

const staffPeople = vi.hoisted(() => vi.fn());
vi.mock("@/lib/staff/data", () => ({ staffPeople }));

describe("activityPeople", () => {
  beforeEach(() => { vi.resetModules(); staffPeople.mockReset(); });

  it("comes from staffPeople(), plus anyone else who has acted — never customers.is_owner", async () => {
    staffPeople.mockResolvedValue([{ id: "owner", name: "Alvester" }, { id: "asst", name: "Assistant (Claude)" }]);
    // The feed (activityFeed with no filter) is read internally; give it one
    // row from an actor not in the staff list (a former owner, say).
    const admin = query({ data: [] });
    const customer = query({ data: [] });
    const catalog = query({ data: [] });
    const discount = query({ data: [] });
    const email = query({ data: [] });
    const inquiry = query({ data: [{ id: "q1", action: "replied", detail: null, at: "2026-10-06T21:00:00Z", actor: "former", inquiry_id: null, inquiries: null }] });
    const dispute = query({ data: [] });
    const alert = query({ data: [] });
    const names = query({ data: [{ id: "former", full_name: "Former Owner" }] });
    db.from = fromQueue({
      admin_events: [admin], customer_events: [customer], catalog_events: [catalog], discount_code_events: [discount],
      email_admin_events: [email], inquiry_events: [inquiry], dispute_events: [dispute], owner_alerts: [alert], customers: [names],
    });
    const { activityPeople } = await import("@/lib/audit/feed");
    const people = await activityPeople();
    expect(staffPeople).toHaveBeenCalled();
    expect(people).toEqual([
      { id: "owner", name: "Alvester" }, { id: "asst", name: "Assistant (Claude)" }, { id: "former", name: "Former Owner" },
    ]);
  });
});
