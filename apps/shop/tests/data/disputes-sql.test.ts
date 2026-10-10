import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const sql = readFileSync(join(__dirname, "..", "..", "supabase", "disputes.sql"), "utf8");
const fn = (name: string) => new RegExp(`create or replace function ${name}\\([\\s\\S]*?\\$\\$;`).exec(sql)![0];

describe("disputes.sql", () => {
  it("creates the three tables with RLS on, no policies, closed to the browser roles", () => {
    expect([...sql.matchAll(/create table if not exists (\w+)/g)].map((m) => m[1])).toEqual(["disputes", "early_fraud_warnings", "dispute_events"]);
    for (const t of ["disputes", "early_fraud_warnings", "dispute_events"]) {
      expect(sql).toContain(`alter table ${t} enable row level security;`);
      expect(sql).toContain(`revoke all on ${t} from anon, authenticated;`);
    }
    expect(sql).not.toMatch(/create policy/i);
  });

  it("one row per Stripe dispute and warning; one-time activity entries are keyed", () => {
    expect(sql).toMatch(/stripe_dispute_id\s+text not null unique/);
    expect(sql).toMatch(/stripe_efw_id\s+text not null unique/);
    expect(sql).toMatch(/event_key\s+text unique/);
    expect(sql).toMatch(/reminded\s+jsonb not null default '\{\}'::jsonb/);
    expect(sql).toMatch(/evidence_files\s+jsonb not null default '\{\}'::jsonb/);
    expect(sql).toContain("check (resolved_action in ('refunded', 'watching', 'disputed', 'closed'))");
    expect(sql).toContain("check (action in ('opened', 'funds_withdrawn', 'funds_reinstated', 'draft_saved', 'submitted', 'reminder', 'closed'))");
  });

  it("record_dispute upserts by Stripe id and never lets an older event overwrite a newer one", () => {
    const f = fn("record_dispute");
    expect(f).toContain("on conflict (stripe_dispute_id) do update set");
    expect(f).toContain("where d.last_event_at <= excluded.last_event_at");
    expect(f).toContain("evidence_submitted = d.evidence_submitted or excluded.evidence_submitted");
    expect(f).toContain("if v_id is null then select id into v_id from disputes where stripe_dispute_id = p_stripe_id; end if;");
  });

  it("admin_disputed_customers: customers with a dispute on any of their orders", () => {
    expect(fn("admin_disputed_customers")).toContain("join orders o on o.id = d.order_id where o.customer_id = any(p_ids)");
  });

  it("every function is security definer, pinned search_path, server-only", () => {
    for (const [name, sig] of [
      ["record_dispute", "(text, uuid, text, text, integer, text, text, text, timestamptz, boolean, integer, timestamptz, timestamptz)"],
      ["admin_disputed_customers", "(uuid[])"],
    ]) {
      expect(fn(name), name).toMatch(/security definer set search_path = public, pg_temp/);
      expect(sql).toContain(`revoke all on function ${name}${sig} from public, anon, authenticated;`);
      expect(sql).toContain(`grant execute on function ${name}${sig} to service_role;`);
    }
  });
});
