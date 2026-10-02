import { MetadataRoute } from "next";

const BASE_URL = "https://auraprotocols.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/account", "/checkout", "/order/", "/admin/", "/sign-in", "/forgot-password", "/reset-password", "/auth/", "/api/", "/partners"],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
