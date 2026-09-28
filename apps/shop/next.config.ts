import type { NextConfig } from "next";
import { buildAffiliateRedirects } from "./src/lib/affiliate";
import { BLOG_PUBLISHED } from "./src/lib/constants";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "shop.auraprotocols.com" }],
        destination: "https://auraprotocols.com/:path*",
        permanent: true,
      },
      // Temporary (307) — the guides come back after the rewrite.
      ...(BLOG_PUBLISHED
        ? []
        : [
            { source: "/blog", destination: "/", permanent: false },
            { source: "/blog/:path*", destination: "/", permanent: false },
          ]),
      ...buildAffiliateRedirects(),
    ];
  },
};

export default nextConfig;
