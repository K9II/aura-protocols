import type { NextConfig } from "next";
import { buildAffiliateRedirects } from "./src/lib/affiliate";

const nextConfig: NextConfig = {
  async redirects() {
    return buildAffiliateRedirects();
  },
};

export default nextConfig;
