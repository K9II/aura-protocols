import "server-only";
import { revalidateTag, unstable_cache, updateTag } from "next/cache";
import { catalogContent, type ChemicalClass } from "@/data/catalog";
import { mergeCatalog, type LiveCatalog } from "@/lib/catalog-merge";
import { fetchCatalogOps } from "@/lib/catalog-ops/data";
import { alertOwner } from "@/lib/notify";
import { publicSupabaseEnv } from "@/lib/supabase/env";

// One tag for the whole live catalog (prices, visibility, lots, stock). Owner
// saves call catalogChangedByOwner (server actions: read-your-own-writes);
// orders call catalogStockChanged (route handlers and actions: expire now).
export const CATALOG_TAG = "catalog";

const cachedOps = unstable_cache(fetchCatalogOps, ["catalog-ops-v1"], { tags: [CATALOG_TAG], revalidate: 3600 });

export function coaPublicUrl(path: string): string {
  return `${publicSupabaseEnv().url}/storage/v1/object/public/coa/${path}`;
}

export async function getLiveCatalog(): Promise<LiveCatalog<ChemicalClass>> {
  return mergeCatalog(catalogContent, await cachedOps(), coaPublicUrl);
}

// Storefront pages: null means "show Unavailable" — never fall back to code
// prices. Alerts at most every 15 minutes per server instance.
// During `next build` it never emails: a local build without the DB renders
// "Unavailable" quietly; a Vercel build rethrows, so a deploy fails loudly
// instead of baking "Unavailable" into static pages.
let lastAlertAt = 0;
export async function getLiveCatalogOrNull(): Promise<LiveCatalog<ChemicalClass> | null> {
  try {
    return await getLiveCatalog();
  } catch (err) {
    console.error("live catalog read failed:", err);
    if (process.env.NEXT_PHASE === "phase-production-build") {
      if (process.env.VERCEL) throw err;
      return null;
    }
    if (Date.now() - lastAlertAt > 15 * 60 * 1000) {
      lastAlertAt = Date.now();
      await alertOwner("The store can't read the catalog", `Product pages show "Unavailable right now" and checkout refuses until this clears: ${String(err)}`);
    }
    return null;
  }
}

export function catalogChangedByOwner(): void {
  updateTag(CATALOG_TAG);
}

export function catalogStockChanged(): void {
  try {
    revalidateTag(CATALOG_TAG, { expire: 0 });
  } catch (err) {
    // The hourly revalidate still catches up; checkout re-checks stock itself.
    console.error("catalog revalidate failed:", err);
  }
}
