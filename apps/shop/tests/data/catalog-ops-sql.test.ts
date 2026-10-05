import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { allCompounds } from "../../src/data/catalog";

const sql = readFileSync(join(__dirname, "..", "..", "supabase", "catalog-ops.sql"), "utf8");

describe("catalog-ops.sql", () => {
  const tables = [...sql.matchAll(/create table if not exists (\w+)/g)].map((m) => m[1]);

  it("creates the catalog tables, each locked with RLS", () => {
    expect(tables.sort()).toEqual(["catalog_events", "catalog_products", "catalog_variants", "lot_holds", "lots", "shipped_lots"]);
    for (const t of tables) expect(sql, t).toContain(`alter table ${t} enable row level security;`);
  });

  it("derives stock in a server-only view", () => {
    expect(sql).toContain("create or replace view lot_stock with (security_invoker = true)");
    expect(sql).toContain("revoke all on lot_stock from public, anon, authenticated;");
  });

  it("every function is server-only", () => {
    const fns = [...sql.matchAll(/create or replace function (\w+)\(/g)].map((m) => m[1]).filter((f) => f !== "settle_holds_on_order_status");
    expect(fns.sort()).toEqual(["admin_correct_count", "admin_lot_live", "admin_retire_lot", "hold_vials", "lot_integrity", "order_hold_shortfall", "record_shipped_lots"]);
    for (const f of fns) expect(sql, f).toMatch(new RegExp(`revoke all on function ${f}\\([^)]*\\) from public, anon, authenticated;`));
  });

  it("serialises stock per strength with one advisory lock key", () => {
    expect(sql.match(/pg_advisory_xact_lock\(hashtext\('stock:' \|\|/g)?.length).toBeGreaterThanOrEqual(4);
  });

  it("settles holds on order status: paid/shipped → sold, cancelled → released, refund from paid → returned", () => {
    expect(sql).toContain("create trigger settle_holds_on_order_status after update of status on orders");
    expect(sql).toMatch(/new\.status in \('paid', 'shipped'\)[\s\S]+state = 'sold'/);
    expect(sql).toMatch(/new\.status = 'cancelled'[\s\S]+state = 'released'/);
    expect(sql).toMatch(/new\.status = 'refunded' and old\.status = 'paid'[\s\S]+state = 'returned'/);
  });

  it("creates the public coa bucket (PDF only)", () => {
    expect(sql).toMatch(/insert into storage\.buckets[^;]+'coa'[^;]+true[^;]+application\/pdf[^;]+on conflict/);
  });

  it("seeds a product row for every code product (the six incretin & amylin analogs hidden) and a variant row for every strength", () => {
    for (const c of allCompounds) {
      expect(sql, c.slug).toContain(`('${c.slug}', ${c.unlisted ? "false" : "true"})`);
      for (const v of c.variants) expect(sql, `${c.slug} ${v.id}`).toContain(`('${c.slug}', '${v.id}', ${Math.round(v.priceUsd * 100)})`);
    }
  });
});
