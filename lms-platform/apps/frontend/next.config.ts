import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Required for the Dockerfile's production stage, which copies .next/standalone
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../.."),
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.paii.ca" },
      { protocol: "https", hostname: "**.amazonaws.com" },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1"}/:path*`,
      },
    ];
  },
};

export default nextConfig;
