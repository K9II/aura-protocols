import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const sql = readFileSync(join(__dirname, "..", "..", "supabase", "account-gate.sql"), "utf8");

describe("account-gate.sql", () => {
  it("adds our own verification and opt-in columns to customers", () => {
    for (const col of ["email_verified_at timestamptz", "verify_required boolean not null default false", "verify_token_hash text", "verify_sent_at timestamptz", "marketing_opt_in boolean not null default false"]) {
      expect(sql, col).toContain(`alter table customers add column if not exists ${col}`);
    }
    expect(sql).toContain("create unique index if not exists customers_verify_token_idx on customers (verify_token_hash) where verify_token_hash is not null;");
  });

  it("backfills verification only for accounts created before the switch (re-running is safe)", () => {
    expect(sql).toMatch(/update customers c set email_verified_at = u\.email_confirmed_at[\s\S]*u\.created_at < '2026-10-05'/);
  });

  it("records the new-account discount on orders", () => {
    expect(sql).toContain("alter table orders add column if not exists new_account_discount boolean not null default false");
  });

  it("creates gate_lookups with RLS on and an (ip_hash, at) index", () => {
    expect(sql).toContain("create table if not exists gate_lookups");
    expect(sql).toContain("alter table gate_lookups enable row level security;");
    expect(sql).toContain("create index if not exists gate_lookups_ip_at_idx on gate_lookups (ip_hash, at);");
  });

  it("exposes account_id_by_email to the service role only", () => {
    expect(sql).toContain("create or replace function public.account_id_by_email(p_email text) returns uuid");
    expect(sql).toContain("security definer set search_path = ''");
    expect(sql).toContain("revoke all on function public.account_id_by_email(text) from public, anon, authenticated;");
    expect(sql).toContain("grant execute on function public.account_id_by_email(text) to service_role;");
  });
});
