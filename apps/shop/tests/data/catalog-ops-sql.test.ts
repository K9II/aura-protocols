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

  it("takes the sorted stock locks in an explicit loop", () => {
    expect(sql).toMatch(/for lk in select distinct compound_slug \|\| ':' \|\| variant_id as k\s+from order_items where order_id = p_order order by 1 loop\s+perform pg_advisory_xact_lock\(hashtext\('stock:' \|\| lk\.k\)\);\s+end loop;/);
    expect(sql).not.toMatch(/perform pg_advisory_xact_lock\([^;]*\)\s+from /);
  });

  it("hold_vials fails loudly if a line is left unheld", () => {
    expect(sql).toMatch(/end loop;\s+if need > 0 then raise exception 'hold_vials:/);
  });

  const shipped = sql.slice(sql.indexOf("create or replace function record_shipped_lots("), sql.indexOf("revoke all on function record_shipped_lots("));

  it("record_shipped_lots refuses empty input and sums repeated lot numbers", () => {
    expect(shipped).toMatch(/if p_entries is null or json_typeof\(p_entries\) <> 'array' or json_array_length\(p_entries\) = 0 then\s+raise exception/);
    expect(shipped).toMatch(/where r\.lot_number is null or r\.qty is null or r\.qty <= 0\) then\s+raise exception/);
    expect(shipped.indexOf("r.qty <= 0")).toBeLessThan(shipped.indexOf("sum(qty)::int as qty"));
    expect(shipped).toMatch(/select lot_number, sum\(qty\)::int as qty\s+from json_to_recordset\(p_entries\)[^;]+group by lot_number\) x/);
  });

  it("record_shipped_lots re-compares on retry instead of returning ok blindly", () => {
    expect(shipped).not.toMatch(/if exists \(select 1 from shipped_lots where order_item_id = p_item\) then return 'ok'/);
    expect(shipped).toMatch(/if same then return 'ok'; end if;\s+if not v_first then return 'alert'; end if;/);
  });

  it("record_shipped_lots never moves vials onto a draft lot and logs the order number", () => {
    expect(shipped).toMatch(/if not found or lt\.status = 'draft' or/);
    expect(shipped).toMatch(/json_build_object\('order_number', v_order, 'order_item_id', p_item,/);
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
