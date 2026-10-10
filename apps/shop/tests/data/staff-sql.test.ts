import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const sql = readFileSync(join(__dirname, "../../supabase/staff.sql"), "utf8");

describe("staff.sql", () => {
  it("creates staff with the two roles and RLS on, no grants to anon/authenticated", () => {
    expect(sql).toMatch(/create table if not exists staff/);
    expect(sql).toMatch(/role\s+text not null check \(role in \('owner', 'assistant'\)\)/);
    expect(sql).toMatch(/alter table staff enable row level security/);
    expect(sql).toMatch(/revoke all on staff from anon, authenticated/);
  });
  it("migrates every current owner to an owner staff row", () => {
    expect(sql).toMatch(/insert into staff \(customer_id, role, status\)\s+select id, 'owner', 'active' from customers where is_owner/);
  });
  it("status changes refuse the last owner and yourself, and are service-role only", () => {
    expect(sql).toMatch(/create or replace function admin_set_staff_status/);
    expect(sql).toMatch(/'last_owner'/);
    expect(sql).toMatch(/'self'/);
    expect(sql).toMatch(/revoke all on function admin_set_staff_status\(uuid, text, uuid, text\) from public, anon, authenticated/);
    expect(sql).toMatch(/revoke all on function admin_end_sessions\(uuid\) from public, anon, authenticated/);
  });
  it("keeps customers.is_owner in step with the staff table", () => {
    expect(sql).toMatch(/create or replace function sync_is_owner/);
    expect(sql).toMatch(/create trigger sync_is_owner after insert or update or delete on staff/);
  });
  it("adds the staff area, inquiry drafts and draft events", () => {
    expect(sql).toMatch(/'staff_disabled', 'staff_enabled', 'staff_signed_out'/);
    expect(sql).toMatch(/alter table inquiries add column if not exists draft_body text/);
    expect(sql).toMatch(/'draft_saved', 'draft_discarded'/);
  });
});
