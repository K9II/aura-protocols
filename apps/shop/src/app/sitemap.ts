import type { MetadataRoute } from "next";
import { compounds } from "@/data/catalog";

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

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    ...STATIC.map(([path, changeFrequency, priority]) => ({ url: `${BASE_URL}${path || "/"}`, lastModified: now, changeFrequency, priority })),
    ...compounds.map((c) => ({ url: `${BASE_URL}/products/${c.slug}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
