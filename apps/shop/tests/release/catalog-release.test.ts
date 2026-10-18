import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { catalogContent } from "../../src/data/catalog";
import { catalogReleaseProblems, type CatalogOps } from "../../src/lib/catalog-merge";
import { MADE_BY_PLACEHOLDER } from "../../src/lib/catalog";
import { SEVEN_TEST_PANEL } from "../../src/lib/constants";
import { DEMO_LOT } from "../../src/lib/demo-lots";

// Run before unpausing Vercel:  RELEASE_CHECK=1 pnpm --filter @aura/shop test
// Reads Aura Store with the service key from .env.local (or the environment).
// With no RELEASE_CHECK, the suite stays green without any Supabase access.
function env(): Record<string, string> {
  const file = join(__dirname, "..", "..", ".env.local");
  const fromFile = existsSync(file) ? Object.fromEntries(readFileSync(file, "utf8").split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")]; })) : {};
  return { ...fromFile, ...process.env } as Record<string, string>;
}

describe.skipIf(!process.env.RELEASE_CHECK)("release check", () => {
  it("every shown strength has a price and a live lot with a certificate; every product has a row", async () => {
    const e = env();
    if (!e.SUPABASE_URL || !e.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("RELEASE_CHECK=1 requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (.env.local or the environment)");
    }
    const db = createClient(e.SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const [p, v, l] = await Promise.all([
      db.from("catalog_products").select("slug, shown"),
      db.from("catalog_variants").select("slug, variant_id, strength, price_cents, low_at, threepl_sku, shown, archived_at"),
      db.from("lot_stock").select("id, lot_number, slug, variant_id, purity_pct, method, tested_on, coa_path, status, live_at, sellable, held, sold, available").in("status", ["live", "retired"]),
    ]);
    expect(p.error ?? v.error ?? l.error).toBeNull();
    const ops = { products: p.data, variants: v.data, lots: l.data } as unknown as CatalogOps;
    expect(catalogReleaseProblems(catalogContent, ops, (path) => path)).toEqual([]);
  });

  // The demo server shows DEMO-/TEST- lots as fully tested (lib/demo-lots.ts); none may be live at launch.
  it("no demo or test lot is live", async () => {
    const e = env();
    const db = createClient(e.SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const lots = await db.from("lots").select("lot_number").eq("status", "live");
    expect(lots.error).toBeNull();
    expect((lots.data ?? []).map((l) => l.lot_number).filter((n) => DEMO_LOT.test(n)), "retire the demo and test lots before unpausing").toEqual([]);
  });

  // The home hero's 7-test panel says every lot passes all seven. While it's on, each
  // live lot needs passing certificates covering them: purity, measured mg (quantity),
  // identity, endotoxin, sterility, heavy metals and fentanyl.
  it.skipIf(!SEVEN_TEST_PANEL)("every live lot passed the seven tests the home page lists", async () => {
    const e = env();
    const db = createClient(e.SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const lots = await db.from("lots").select("id, lot_number").eq("status", "live");
    expect(lots.error).toBeNull();
    const certs = await db.from("lot_certificates")
      .select("lot_id, result, purity_pct, measured_mg, identity, endotoxin, sterility, heavy_metals, fentanyl")
      .in("lot_id", (lots.data ?? []).map((l) => l.id)).eq("result", "pass");
    expect(certs.error).toBeNull();
    const missing = (lots.data ?? []).flatMap((l) => {
      const mine = (certs.data ?? []).filter((c) => c.lot_id === l.id);
      const has = {
        purity: mine.some((c) => c.purity_pct !== null),
        quantity: mine.some((c) => c.measured_mg !== null),
        ...Object.fromEntries((["identity", "endotoxin", "sterility", "heavy_metals", "fentanyl"] as const)
          .map((t) => [t, mine.some((c) => c[t] === "pass")])),
      };
      const lacking = Object.entries(has).filter(([, ok]) => !ok).map(([t]) => t);
      return lacking.length ? [`${l.lot_number}: ${lacking.join(", ")}`] : [];
    });
    expect(missing, "test these lots for every row of the panel, or set SEVEN_TEST_PANEL to false in lib/constants.ts").toEqual([]);
  });

  it("\"Made by\" values are confirmed by sourcing (not placeholders)", () => {
    expect(MADE_BY_PLACEHOLDER, "confirm each supplier's process, then set MADE_BY_PLACEHOLDER to false in lib/catalog.ts").toBe(false);
  });
});
