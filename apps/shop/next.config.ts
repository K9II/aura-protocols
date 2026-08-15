import type { NextConfig } from "next";
import { buildAffiliateRedirects } from "./src/lib/affiliate";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "shop.auraprotocols.com" }],
        destination: "https://auraprotocols.com/:path*",
        permanent: true,
      },
      ...buildAffiliateRedirects(),
    ];
  },
};

export default nextConfig;
