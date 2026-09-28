import type { NextConfig } from "next";
import { buildRedirects } from "./src/lib/redirects";
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
      ...buildRedirects({ blogPublished: BLOG_PUBLISHED }),
    ];
  },
};

export default nextConfig;
