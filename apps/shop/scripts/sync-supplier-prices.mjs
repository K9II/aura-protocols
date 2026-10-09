// Two-way price sync between AIOS (vault/business/shop-economics.json) and Aura Store:
//   AIOS → store: supplier box prices (supplier_prices; replaces the AIOS-sourced
//     set) and the default lab fee (shop_settings.lot_test_cents) — Record order
//     and Receive lot pre-fill from them.
//   store → AIOS: retail price per vial for every product the store sells,
//     written to store-prices.json next to the AIOS file; AIOS overlays it on
//     read and shows those prices read-only (they're changed in Admin → Catalog).
//
// Run: node apps/shop/scripts/sync-supplier-prices.mjs [path/to/shop-economics.json] [--dry-run]
// Default path: business/shop-economics.json in the AIOS vault — AIOS_VAULT_PATH from
// ../aura-aios/.env (OneDrive\Aura AIOS\vault, shared with the laptop), else ../aura-aios/vault.
// Reads SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY from apps/shop/.env.local.
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname as dirOf } from "node:path";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defaultLabFeeCents, landedDefaultsCents, mapSupplierPrices, storePricesFor } from "./supplier-prices-map.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
function aiosVault() {
  const aios = join(here, "..", "..", "..", "..", "aura-aios");
  const envPath = join(aios, ".env");
  const m = existsSync(envPath) ? /^\s*AIOS_VAULT_PATH\s*=\s*(.+?)\s*$/m.exec(readFileSync(envPath, "utf8")) : null;
  return m ? m[1].replace(/^["']|["']$/g, "") : join(aios, "vault");
}
const jsonPath = resolve(args.find((a) => !a.startsWith("--")) ?? join(aiosVault(), "business", "shop-economics.json"));

function readEnvLocal() {
  const out = {};
  const envPath = join(here, "..", ".env.local");
  if (!existsSync(envPath)) return out;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = { ...readEnvLocal(), ...process.env };
if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing");
if (!existsSync(jsonPath)) throw new Error(`AIOS file not found: ${jsonPath}`);

// Runs as a function and sets process.exitCode (no process.exit mid-request:
// Node on Windows asserts when a fetch handle is still closing).
async function main() {
  const sheet = JSON.parse(readFileSync(jsonPath, "utf8"));
  const products = sheet.products ?? [];
  const labCents = defaultLabFeeCents(sheet);
  const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data: variants, error: vErr } = await db.from("catalog_variants").select("slug, variant_id, price_cents, archived_at");
  if (vErr) throw new Error(`catalog read failed: ${vErr.message}`);

  const { rows, skipped } = mapSupplierPrices(products, variants ?? []);
  const strengths = new Set(rows.map((r) => `${r.slug}/${r.variant_id}`)).size;
  console.log(`${rows.length} prices for ${strengths} strengths (AIOS rows not in the store: ${skipped.notInStore}, duplicates ignored: ${skipped.duplicate})`);
  const retail = storePricesFor(products, (variants ?? []).filter((v) => !v.archived_at));
  console.log(`store → AIOS: ${Object.keys(retail.prices).length} retail prices from the store, ${retail.changes.length} differ from AIOS's own`);
  for (const c of retail.changes) console.log(`  ${c.id}: ${c.from == null ? "—" : "$" + c.from} → $${c.to}`);
  console.log(labCents == null ? "default lab: no flat fee in AIOS — lab fee pre-fill unchanged" : `default lab (${sheet.defaults.lab}): $${(labCents / 100).toFixed(2)} per lot`);
  if (dryRun) { console.log("dry run — nothing written"); return; }
  if (rows.length === 0) throw new Error("nothing to sync — refusing to clear the table");

  const syncedAt = new Date().toISOString();
  const { error: upErr } = await db.from("supplier_prices").upsert(rows.map((r) => ({ ...r, source: "aios", synced_at: syncedAt })), { onConflict: "supplier,slug,variant_id" });
  if (upErr) throw new Error(`upsert failed: ${upErr.message}`);
  const { error: delErr, count } = await db.from("supplier_prices").delete({ count: "exact" }).eq("source", "aios").lt("synced_at", syncedAt);
  if (delErr) throw new Error(`removing old prices failed: ${delErr.message}`);
  console.log(`synced at ${syncedAt}; removed ${count ?? 0} old price(s)`);
  const landed = landedDefaultsCents(sheet);
  const settings = {
    ...(labCents != null ? { lot_test_cents: labCents } : {}),
    ...(landed.inboundPerBoxCents != null ? { inbound_per_box_cents: landed.inboundPerBoxCents } : {}),
    ...(landed.labelPerVialCents != null ? { label_per_vial_cents: landed.labelPerVialCents } : {}),
    ...(landed.kitBoxCents != null ? { wholesale_kit_box_cents: landed.kitBoxCents } : {}),
  };
  if (Object.keys(settings).length) {
    const { error: setErr } = await db.from("shop_settings").update(settings).eq("id", true);
    if (setErr) throw new Error(`receive-lot defaults update failed: ${setErr.message}`);
    console.log(`receive-lot defaults: ${JSON.stringify(settings)}`);
  }
  // Written to a temp file then renamed, so AIOS never reads half a file.
  const out = join(dirOf(jsonPath), "store-prices.json");
  const body = { synced_at: syncedAt, about: "Retail price per vial from the shop (Admin → Catalog), by AIOS product id. Written by the shop's sync-supplier-prices.mjs; AIOS shows these read-only.", prices: retail.prices };
  writeFileSync(`${out}.tmp`, `${JSON.stringify(body, null, 1)}\n`, "utf8");
  renameSync(`${out}.tmp`, out);
  console.log(`AIOS store prices written: ${out}`);
}

main().catch((e) => { console.error(e.message ?? e); process.exitCode = 1; });
