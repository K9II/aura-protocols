import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const sql = readFileSync(join(__dirname, "..", "..", "supabase", "accounts-checkout.sql"), "utf8");

describe("accounts-checkout.sql", () => {
  const tables = [...sql.matchAll(/create table if not exists (\w+)/g)].map((m) => m[1]);

  it("creates the five tables", () => {
    expect(tables.sort()).toEqual(["account_agreements", "customers", "order_items", "orders", "stripe_events"]);
  });

  it("enables row level security on every table it creates", () => {
    for (const t of tables) expect(sql, t).toContain(`alter table ${t} enable row level security;`);
  });

  it("numbers orders AP-1001 upward and constrains status", () => {
    expect(sql).toContain("create sequence if not exists order_number_seq start 1001");
    expect(sql).toContain("default ('AP-' || nextval('order_number_seq'))");
    expect(sql).toContain("check (status in ('awaiting_payment','processing','paid','shipped','cancelled','refunded'))");
  });
});
