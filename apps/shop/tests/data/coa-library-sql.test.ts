import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const sql = readFileSync(join(__dirname, "../../supabase/coa-library.sql"), "utf8");
const ops = readFileSync(join(__dirname, "../../supabase/catalog-ops.sql"), "utf8");
const daily = readFileSync(join(__dirname, "../../supabase/daily-check.sql"), "utf8");

describe("coa-library.sql", () => {
  it("runs in one transaction", () => {
    expect(sql.trimStart().startsWith("--")).toBe(true);
    expect(sql).toContain("begin;");
    expect(sql.trimEnd().endsWith("commit;")).toBe(true);
  });
  it("creates labs and lot_certificates locked with RLS", () => {
    for (const t of ["labs", "lot_certificates"]) {
      expect(sql).toContain(`create table if not exists ${t} (`);
      expect(sql).toContain(`alter table ${t} enable row level security;`);
    }
  });
  it("labs: unique name, https verify template with {report}, ISO flag, active", () => {
    expect(sql).toMatch(/name\s+text not null unique/);
    expect(sql).toContain("verify_url_template ~ '^https://' and position('{report}' in verify_url_template) > 0");
    expect(sql).toMatch(/iso17025\s+boolean not null default false/);
    expect(sql).toMatch(/active\s+boolean not null default true/);
  });
  it("seeds Vanguard and ILS as ISO labs, Freedom and BTLabs not, and an inactive Not recorded lab", () => {
    expect(sql).toMatch(/'Vanguard Laboratory', 'Olympia, WA', .*, true, true/);
    expect(sql).toMatch(/'ILS Laboratories', 'San Diego, CA', .*, true, true/);
    expect(sql).toMatch(/'Freedom Diagnostics', 'Franklin, TN', .*, false, true/);
    expect(sql).toMatch(/'BTLabs', null, null, false, true/);
    expect(sql).toMatch(/'Not recorded', null, null, false, false/);
  });
  it("certificates: one report per lab, tests are pass/fail/not_tested, the owner sets the result, a failed one needs a note", () => {
    expect(sql).toContain("unique (lab_id, report_number)");
    for (const t of ["identity", "endotoxin", "sterility", "heavy_metals", "fentanyl"]) {
      expect(sql).toContain(`${t} text not null default 'not_tested' check (${t} in ('pass', 'fail', 'not_tested'))`);
    }
    expect(sql).not.toContain("'fail' not in (identity");   // a failed test only flags; the owner sets the result
    expect(sql).toContain("check (result = 'pass' or length(trim(coalesce(note, ''))) > 0)");
    expect(sql).toContain("check ((purity_pct is null) = (method is null))");
  });
  it("locks certificates once the lot leaves draft: insert (re-test) and correction-only updates allowed", () => {
    expect(sql).toContain("create or replace function guard_lot_certificates()");
    expect(sql).toContain("raise exception 'certificate_locked'");
    expect(sql).toContain("before insert or update or delete on lot_certificates");
  });
  it("the lock trigger tolerates a cascade-deleted parent lot and reads old.lot_id for update/delete", () => {
    const fn = sql.slice(sql.indexOf("create or replace function guard_lot_certificates"), sql.indexOf("drop trigger if exists lot_certificates_guard"));
    expect(fn).toContain("v_status is null or v_status = 'draft'");
    expect(fn).toContain("case when tg_op = 'INSERT' then new.lot_id else old.lot_id end");
  });
  it("migrates each lot's certificate, then drops the columns from lots, guarded so a second run is a no-op", () => {
    expect(sql).toContain("column_name = 'purity_pct'");
    const insertAt = sql.indexOf("insert into lot_certificates");
    const doAt = sql.lastIndexOf("do $$ begin", insertAt);
    expect(doAt).toBeGreaterThan(-1);
    expect(sql.slice(doAt, insertAt)).toContain("execute");
    expect(sql).toMatch(/insert into lot_certificates[\s\S]*from lots l[\s\S]*where l\.purity_pct is not null/);
    for (const c of ["purity_pct", "method", "tested_on", "coa_path"]) expect(sql).toContain(`alter table lots drop column if exists ${c};`);
    expect(sql.indexOf("create or replace view lot_stock")).toBeLessThan(sql.indexOf("alter table lots drop column if exists purity_pct;"));
  });
  it("lot_stock keeps its column order and appends purity_ok, endotoxin_ok", () => {
    const view = sql.slice(sql.indexOf("create or replace view lot_stock"), sql.indexOf("revoke all on lot_stock"));
    const order = ["l.id", "l.lot_number", "l.slug", "l.variant_id", "hc.purity_pct", "hc.method", "hc.tested_on", "hc.coa_path", "l.status"];
    let at = 0;
    for (const c of order) { const i = view.indexOf(c, at); expect(i).toBeGreaterThan(-1); at = i; }
    expect(view.indexOf("as available")).toBeLessThan(view.indexOf("as purity_ok"));
    expect(view.indexOf("as purity_ok")).toBeLessThan(view.indexOf("as endotoxin_ok"));
  });
  it("admin_lot_live needs a passing purity certificate and a passing endotoxin result", () => {
    const fn = sql.slice(sql.indexOf("create or replace function admin_lot_live"), sql.indexOf("revoke all on function admin_lot_live"));
    expect(fn).toContain("return 'needs_purity'");
    expect(fn).toContain("return 'needs_endotoxin'");
    // and the lot's cost (2026-10-14), checked after the certificates
    expect(fn).toContain("if l.cost_cents is null or l.supplier is null then return 'needs_cost'; end if;");
    expect(fn.indexOf("needs_endotoxin")).toBeLessThan(fn.indexOf("needs_cost"));
    expect(sql).toContain("(l.cost_cents is not null and l.supplier is not null) as cost_ok");
    expect(fn).not.toContain("no_certificate");
    expect(sql).toContain("revoke all on function admin_lot_live(uuid, uuid) from public, anon, authenticated;");
  });
  it("adds the certificate event kinds and keeps the wholesale ones", () => {
    for (const k of ["certificate_added", "certificate_edited", "certificate_deleted", "certificate_corrected", "wholesale_on", "wholesale_off", "certificate_replaced"]) {
      expect(sql).toContain(`'${k}'`);
    }
  });
  it("adds the two store-wide switches, both off", () => {
    expect(sql).toContain("add column if not exists coa_show_all boolean not null default false");
    expect(sql).toContain("add column if not exists coa_show_measured boolean not null default false");
  });
  it("catalog-ops.sql no longer defines the cert columns, lot_stock or admin_lot_live", () => {
    const table = ops.slice(ops.indexOf("create table if not exists lots ("), ops.indexOf("create index if not exists lots_variant_idx"));
    for (const c of ["purity_pct", "method ", "tested_on", "coa_path"]) expect(table).not.toContain(c);
    expect(ops).not.toContain("create or replace view lot_stock");
    expect(ops).not.toContain("create or replace function admin_lot_live");
    expect(ops).toContain("coa-library.sql");
  });
  it("daily check reads certificates from lot_certificates", () => {
    expect(daily).not.toContain("coa_path");
    expect(daily).toContain("exists (select 1 from lot_certificates c where c.lot_id = lots.id)");
  });
  it("certificates carry an optional verify code; labs an optional verify hint (seeded)", () => {
    expect(sql).toContain("alter table lot_certificates add column if not exists verify_code text check (verify_code is null or length(trim(verify_code)) between 2 and 80);");
    expect(sql).toContain("alter table labs add column if not exists verify_hint text check (verify_hint is null or length(verify_hint) <= 200);");
    expect(sql).toMatch(/update labs set verify_hint = .*where name = 'Vanguard Laboratory' and verify_hint is null/);
    expect(sql).toMatch(/update labs set verify_hint = .*where name = 'ILS Laboratories' and verify_hint is null/);
    expect(sql).toMatch(/update labs set verify_hint = .*where name = 'Freedom Diagnostics' and verify_hint is null/);
  });
});
