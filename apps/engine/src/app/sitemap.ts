import type { MetadataRoute } from "next";
import { BASE_URL } from "@/lib/constants";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { path: "/", priority: 1.0 },
    { path: "/connect", priority: 0.8 },
    { path: "/upload", priority: 0.6 },
  ].map((r) => ({ url: `${BASE_URL}${r.path}`, lastModified: now, changeFrequency: "weekly" as const, priority: r.priority }));
}
