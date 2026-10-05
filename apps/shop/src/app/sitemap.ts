import type { MetadataRoute } from "next";
import { getLiveCatalog } from "@/lib/catalog-live";

const BASE_URL = "https://auraprotocols.com";

const STATIC: Array<[string, MetadataRoute.Sitemap[number]["changeFrequency"], number]> = [
  ["", "weekly", 1.0],
  ["/products", "weekly", 0.9],
  ["/coa", "weekly", 0.7],
  ["/quality-standards", "monthly", 0.6],
  ["/wholesale", "monthly", 0.5],
  ["/affiliates", "monthly", 0.4],
  ["/partner-agreement", "yearly", 0.3],
  ["/about", "monthly", 0.5],
  ["/terms", "yearly", 0.3],
  ["/privacy", "yearly", 0.3],
  ["/shipping", "yearly", 0.3],
  ["/refund-policy", "yearly", 0.3],
  ["/ruo", "yearly", 0.3],
];

// Product URLs come from the live shown catalog. A read error fails the
// sitemap request — it never lists hidden products. Rendered per request
// (data still comes through the cached live catalog) so a build never
// depends on reaching Aura Store.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const compounds = (await getLiveCatalog()).shown;
  return [
    ...STATIC.map(([path, changeFrequency, priority]) => ({ url: `${BASE_URL}${path || "/"}`, lastModified: now, changeFrequency, priority })),
    ...compounds.map((c) => ({ url: `${BASE_URL}/products/${c.slug}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
