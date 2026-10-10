import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const sql = readFileSync(join(__dirname, "../../supabase/supplier-prices.sql"), "utf8");

describe("supplier-prices.sql", () => {
  it("one price per supplier and strength, tied to the catalog, private", () => {
    expect(sql).toMatch(/create table if not exists supplier_prices/);
    expect(sql).toMatch(/primary key \(supplier, slug, variant_id\)/);
    expect(sql).toMatch(/box_cents\s+integer not null check \(box_cents > 0\)/);
    expect(sql).toMatch(/references catalog_variants\(slug, variant_id\) on delete cascade/);
    expect(sql).toContain("alter table supplier_prices enable row level security");
    expect(sql).not.toMatch(/create policy/);
  });
});
