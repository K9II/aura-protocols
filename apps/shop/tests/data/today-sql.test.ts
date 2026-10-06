import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const sql = readFileSync(join(__dirname, "..", "..", "supabase", "today.sql"), "utf8");
const fn = (name: string) => new RegExp(`create or replace function ${name}\\([\\s\\S]*?\\$\\$;`).exec(sql)![0];

describe("today.sql", () => {
  it("creates owner_alerts with RLS on, no policies, closed to the browser roles", () => {
    expect([...sql.matchAll(/create table if not exists (\w+)/g)].map((m) => m[1])).toEqual(["owner_alerts"]);
    expect(sql).toContain("alter table owner_alerts enable row level security;");
    expect(sql).not.toMatch(/create policy/i);
    expect(sql).toContain("revoke all on owner_alerts from anon, authenticated;");
    expect(sql).toMatch(/resolved_by\s+uuid references customers\(id\) on delete set null/);
  });

  it("allows one open alert per title", () => {
    expect(sql).toContain("create unique index if not exists owner_alerts_open_title on owner_alerts (title) where resolved_at is null;");
  });

  it("adds the inquiries seen mark to shop_settings", () => {
    expect(sql).toContain("alter table shop_settings add column if not exists inquiries_seen_at timestamptz;");
  });

  it("record_owner_alert inserts, or counts up the open alert with the same title, newest detail on top", () => {
    const f = fn("record_owner_alert");
    expect(f).toContain("on conflict (title) where resolved_at is null do update set");
    expect(f).toContain("count = a.count + 1");
    expect(f).toContain("last_at = now()");
    expect(f).toContain("left(excluded.detail || E'\\n\\n— earlier —\\n' || a.detail, 4000)");
  });

  it("sales summary: goods after discounts of paid/shipped orders by paid_at, Mountain buckets, refunds by refunded_at", () => {
    const f = fn("admin_sales_summary");
    expect(f).toContain("if p_bucket not in ('hour', 'day') then raise exception 'bad_bucket'");
    expect(f).toContain("x.subtotal_cents - x.partner_discount_cents as goods");
    expect(f).toContain("x.total_cents - x.store_credit_cents as charged");
    expect(f).toContain("x.shipping_cents + x.insurance_cents as shipping");
    expect(f).toContain("x.status in ('paid', 'shipped') and x.paid_at >= p_from and x.paid_at < p_to");
    expect(f).toContain("status = 'refunded' and refunded_at >= p_from and refunded_at < p_to");
    expect(f).toContain("date_trunc(p_bucket, o.paid_at at time zone 'America/Denver')");
    expect(f).toContain("not exists (select 1 from orders e where e.customer_id = x.customer_id and e.paid_at < x.paid_at) as first_time");
    expect(f).toContain("c.created_at >= p_from and c.created_at < p_to");
    expect(f).toContain("limit 5");
  });

  it("every function is security definer, pinned search_path, server-only", () => {
    for (const [name, sig] of [["record_owner_alert", "(text, text)"], ["admin_sales_summary", "(timestamptz, timestamptz, text)"]]) {
      expect(fn(name), name).toMatch(/security definer set search_path = public, pg_temp/);
      expect(sql).toContain(`revoke all on function ${name}${sig} from public, anon, authenticated;`);
      expect(sql).toContain(`grant execute on function ${name}${sig} to service_role;`);
    }
  });
});
