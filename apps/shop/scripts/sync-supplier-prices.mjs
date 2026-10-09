// Copies supplier box prices from AIOS (vault/business/shop-economics.json,
// where prices are maintained) into Aura Store's supplier_prices table, which
// Admin → Wholesale → Record order uses to fill in the supplier total.
// Replaces the whole AIOS-sourced set: rows not in this sync are removed.
//
// Run: node apps/shop/scripts/sync-supplier-prices.mjs [path/to/shop-economics.json] [--dry-run]
// Default path: ../aura-aios/vault/business/shop-economics.json next to this repo.
// Reads SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY from apps/shop/.env.local.
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mapSupplierPrices } from "./supplier-prices-map.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const jsonPath = resolve(args.find((a) => !a.startsWith("--")) ?? join(here, "..", "..", "..", "..", "aura-aios", "vault", "business", "shop-economics.json"));

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
  const products = JSON.parse(readFileSync(jsonPath, "utf8")).products ?? [];
  const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data: variants, error: vErr } = await db.from("catalog_variants").select("slug, variant_id");
  if (vErr) throw new Error(`catalog read failed: ${vErr.message}`);

  const { rows, skipped } = mapSupplierPrices(products, variants ?? []);
  const strengths = new Set(rows.map((r) => `${r.slug}/${r.variant_id}`)).size;
  console.log(`${rows.length} prices for ${strengths} strengths (AIOS rows not in the store: ${skipped.notInStore}, duplicates ignored: ${skipped.duplicate})`);
  if (dryRun) { console.log("dry run — nothing written"); return; }
  if (rows.length === 0) throw new Error("nothing to sync — refusing to clear the table");

  const syncedAt = new Date().toISOString();
  const { error: upErr } = await db.from("supplier_prices").upsert(rows.map((r) => ({ ...r, source: "aios", synced_at: syncedAt })), { onConflict: "supplier,slug,variant_id" });
  if (upErr) throw new Error(`upsert failed: ${upErr.message}`);
  const { error: delErr, count } = await db.from("supplier_prices").delete({ count: "exact" }).eq("source", "aios").lt("synced_at", syncedAt);
  if (delErr) throw new Error(`removing old prices failed: ${delErr.message}`);
  console.log(`synced at ${syncedAt}; removed ${count ?? 0} old price(s)`);
}

main().catch((e) => { console.error(e.message ?? e); process.exitCode = 1; });
