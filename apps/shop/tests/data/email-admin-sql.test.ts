import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const sql = readFileSync(join(__dirname, "..", "..", "supabase", "email-admin.sql"), "utf8");
const fn = (name: string) => new RegExp(`create or replace function ${name}\\([\\s\\S]*?\\$\\$;`).exec(sql)![0];

describe("email-admin.sql", () => {
  const tables = [...sql.matchAll(/create table if not exists (\w+)/g)].map((m) => m[1]);

  it("creates the five tables with RLS on", () => {
    expect(tables.sort()).toEqual(["campaign_recipients", "campaigns", "email_admin_events", "email_events", "email_runs"]);
    for (const t of tables) expect(sql, t).toContain(`alter table ${t} enable row level security;`);
  });

  it("allows only one sending campaign and requires a time when scheduled", () => {
    expect(sql).toContain("create unique index if not exists campaigns_one_sending on campaigns ((true)) where status = 'sending';");
    expect(sql).toContain("check (status <> 'scheduled' or scheduled_for is not null)");
  });

  it("adds 'campaign' to the send kinds, a skipped flag, and the two pause switches", () => {
    expect(sql).toContain("alter table email_sends drop constraint if exists email_sends_kind_check;");
    expect(sql).toMatch(/add constraint email_sends_kind_check check \(kind in \([^)]*'lot_alert','campaign'\)\)/);
    expect(sql).toContain("alter table email_sends add column if not exists skipped boolean not null default false;");
    expect(sql).toContain("alter table shop_settings add column if not exists welcome_paused boolean not null default false;");
    expect(sql).toContain("alter table shop_settings add column if not exists cart_paused boolean not null default false;");
  });

  it("the audience is confirmed subscribers minus blocked accounts", () => {
    const f = fn("email_audience");
    expect(f).toContain("s.status = 'confirmed'");
    expect(f).toContain("c.blocked_at is not null");
    expect(f).toContain("o.status in ('paid','processing','shipped','refunded')");
  });

  it("starting a campaign is one locked transaction that freezes the list", () => {
    const f = fn("admin_start_campaign");
    expect(f).toContain("for update");
    expect(f).toContain("raise exception 'stale_campaign'");
    expect(f).toContain("raise exception 'campaign_busy'");
    expect(f).toContain("insert into campaign_recipients (campaign_id, email) select p_id, a.email from email_audience(v_aud) a");
  });

  it("orders after email: paid or shipped, goods after discounts, most recent send wins, tests excluded", () => {
    const f = fn("admin_email_attribution");
    expect(f).toContain("o.status in ('paid','shipped')");
    expect(f).toContain("o.subtotal_cents - o.partner_discount_cents");
    expect(f).toContain("order by es.sent_at desc limit 1");
    expect(f).toContain("not like 'test-%'");
    expect(f).toContain("not es.skipped");
  });

  it("every function is security definer, pinned search_path, server-only", () => {
    const sigs: Array<[string, string]> = [
      ["email_audience", "(text)"], ["admin_email_audience_counts", "()"], ["admin_start_campaign", "(uuid, uuid, text)"],
      ["admin_email_overview", "()"], ["admin_email_send_stats", "(timestamptz)"],
      ["admin_email_attribution", "(timestamptz, integer)"], ["admin_cart_recovery", "(timestamptz, integer)"],
    ];
    for (const [name, sig] of sigs) {
      expect(fn(name), name).toMatch(/security definer set search_path = public, pg_temp/);
      expect(sql).toContain(`revoke all on function ${name}${sig} from public, anon, authenticated;`);
      expect(sql).toContain(`grant execute on function ${name}${sig} to service_role;`);
    }
  });
});
