import type { MetadataRoute } from "next";
import { BASE_URL, SITE_INDEXABLE } from "@/lib/site";

// Pre-launch (SITE_INDEXABLE false): disallow all crawling and don't advertise a
// sitemap, so nothing gets indexed under the provisional domain. At launch, flip
// NEXT_PUBLIC_SITE_INDEXABLE=true and crawlers are allowed + pointed at the sitemap.
export default function robots(): MetadataRoute.Robots {
  if (!SITE_INDEXABLE) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/go/"] }],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
