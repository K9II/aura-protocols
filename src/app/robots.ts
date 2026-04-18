import { MetadataRoute } from "next";

const BASE_URL = "https://shop.auraprotocols.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
