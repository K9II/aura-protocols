import type { MetadataRoute } from "next";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { BASE_URL } from "@/lib/site";

// Route-derived sitemap: walks src/app for `page.tsx` files and emits one entry
// per real content route. New leaves (and whole new lanes) self-register the
// moment their page.tsx exists — nothing here needs editing when the roster grows.
//
// Excluded: /api, the /go redirect endpoint, dynamic segments ([param]) and route
// groups ((group)) — none of which are indexable content URLs.

// Force static generation so the filesystem walk runs at BUILD time (where
// src/app exists) and is baked into a static sitemap.xml — the deployed runtime
// lambda doesn't ship source files, so a request-time readdir would 500.
export const dynamic = "force-static";

const APP_DIR = join(process.cwd(), "src", "app");
const EXCLUDED_TOP_SEGMENTS = new Set(["api", "go"]);

type Route = { path: string; lastModified: Date };

function walk(dir: string, segments: string[], out: Route[]): void {
  const entries = readdirSync(dir, { withFileTypes: true });

  // Record this directory as a route if it has a page.tsx and isn't excluded.
  if (entries.some((e) => e.isFile() && /^page\.(tsx|ts|jsx|js)$/.test(e.name))) {
    const path = "/" + segments.join("/");
    out.push({ path: path === "/" ? "/" : path, lastModified: statSync(join(dir, "page.tsx")).mtime });
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const name = entry.name;
    // Skip route groups (group), dynamic segments [param], private _folders,
    // and excluded top-level branches (api, go).
    if (name.startsWith("(") || name.startsWith("[") || name.startsWith("_")) continue;
    if (segments.length === 0 && EXCLUDED_TOP_SEGMENTS.has(name)) continue;
    walk(join(dir, name), [...segments, name], out);
  }
}

// Depth drives priority/changefreq: home > lane hubs > leaves > legal.
function weightFor(path: string): { priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] } {
  if (path === "/") return { priority: 1, changeFrequency: "weekly" };
  const depth = path.split("/").filter(Boolean).length;
  if (path === "/disclosures") return { priority: 0.3, changeFrequency: "yearly" };
  if (depth === 1) return { priority: 0.8, changeFrequency: "weekly" }; // lane hubs
  return { priority: 0.7, changeFrequency: "monthly" }; // leaves
}

export default function sitemap(): MetadataRoute.Sitemap {
  const routes: Route[] = [];
  walk(APP_DIR, [], routes);

  return routes
    .sort((a, b) => a.path.localeCompare(b.path))
    .map(({ path, lastModified }) => ({
      url: `${BASE_URL}${path === "/" ? "" : path}`,
      lastModified,
      ...weightFor(path),
    }));
}
