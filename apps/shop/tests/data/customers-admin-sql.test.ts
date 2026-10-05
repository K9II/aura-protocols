import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const sql = readFileSync(join(__dirname, "..", "..", "supabase", "customers-admin.sql"), "utf8");
const fn = (name: string) => new RegExp(`create or replace function ${name}[\\s\\S]*?\\$\\$;`).exec(sql)![0];

describe("customers-admin.sql", () => {
  it("adds block columns, the events table (RLS on) and a ledger note", () => {
    expect(sql).toContain("alter table customers add column if not exists blocked_at timestamptz;");
    expect(sql).toContain("alter table customers add column if not exists blocked_reason text;");
    expect(sql).toContain("create table if not exists customer_events");
    expect(sql).toContain("alter table customer_events enable row level security;");
    expect(sql).toContain("check (kind in ('blocked', 'unblocked', 'credit_added', 'credit_removed', 'verify_resent'))");
    expect(sql).toContain("alter table store_credit_ledger add column if not exists note text;");
  });

  it("credit adjustments lock like spend_store_credit and never go below zero", () => {
    const f = fn("admin_adjust_credit");
    expect(f).toContain("pg_advisory_xact_lock(hashtext(p_customer::text))"); // same key as spend_store_credit
    expect(f).toContain("if v_bal + p_amount < 0 then raise exception 'insufficient_credit'");
    expect(f).toContain("'owner_adjust'");
  });

  it("the list joins auth.users for emails and filters every tab", () => {
    const f = fn("admin_customer_list");
    expect(f).toContain("join auth.users u on u.id = c.id");
    for (const t of ["'ordered'", "'none'", "'unverified'", "'blocked'"]) expect(f).toContain(`p_tab = ${t}`);
    expect(f).toContain("status in ('paid', 'shipped')");
    expect(f).toContain("count(*) over ()");
  });

  it("every function is security definer, pinned search_path, server-only", () => {
    for (const [name, sig] of [["admin_customer_list", "(text, text, integer, integer)"], ["admin_customer_stats", "()"], ["admin_adjust_credit", "(uuid, integer, text, text, uuid)"]]) {
      expect(fn(name)).toMatch(/security definer set search_path = public, pg_temp/);
      expect(sql).toContain(`revoke all on function ${name}${sig} from public, anon, authenticated;`);
      expect(sql).toContain(`grant execute on function ${name}${sig} to service_role;`);
    }
  });
});
