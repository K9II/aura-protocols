import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const sql = readFileSync(join(__dirname, "..", "..", "supabase", "email.sql"), "utf8");

describe("email.sql", () => {
  const tables = [...sql.matchAll(/create table if not exists (\w+)/g)].map((m) => m[1]);

  it("creates email_sends and lot_announcements with RLS on", () => {
    expect(tables.sort()).toEqual(["email_sends", "lot_announcements"]);
    for (const t of tables) expect(sql, t).toContain(`alter table ${t} enable row level security;`);
  });

  it("makes every send unique per email, kind and ref", () => {
    expect(sql).toContain("unique nulls not distinct (email, kind, ref)");
  });

  it("adds subscriber status, confirm token, partner ref and welcome code columns", () => {
    for (const col of ["status", "confirm_token_hash", "confirmed_at", "partner_ref", "welcome_code", "welcome_code_expires_at", "welcome_code_used_order_id"]) {
      expect(sql, col).toMatch(new RegExp(`alter table subscribers add column if not exists ${col}\\b`));
    }
    expect(sql).toContain("add column if not exists status text not null default 'pending'");
    expect(sql).toContain("check (status in ('pending','confirmed','unsubscribed'))");
    expect(sql).toContain("create unique index if not exists subscribers_welcome_code_idx on subscribers (welcome_code)");
  });

  it("records the welcome code on orders", () => {
    expect(sql).toContain("alter table orders add column if not exists welcome_code text");
  });

  it("sets foreign keys to not block account deletion", () => {
    expect(sql).toContain("references orders(id) on delete set null");
    expect(sql).toContain("references customers(id) on delete set null");
  });

  it("snapshots the lot list on lot_announcements and allows only one open announcement at a time", () => {
    expect(sql).toMatch(/alter table lot_announcements add column if not exists lots_snapshot jsonb/);
    expect(sql).toContain("create unique index if not exists lot_announcements_one_open on lot_announcements ((true)) where finished_at is null;");
  });
});
