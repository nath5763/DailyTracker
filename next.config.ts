import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: { agentUpgrade: "security" },
  async rewrites() {
    const backend = (process.env.BACKEND_INTERNAL_URL ?? "http://localhost:8080").replace(/\/$/, "");
    return [{ source: "/api/:path*", destination: `${backend}/api/:path*` }];
  },
};

export default nextConfig;
