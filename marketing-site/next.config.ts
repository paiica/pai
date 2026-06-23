import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, ".."),
  async rewrites() {
    const lmsOrigin = process.env.LMS_INTERNAL_URL || "http://localhost:3001";
    return [
      // Proxy all student-portal traffic (pages + assets) through the marketing site.
      // This makes both apps share the same origin so localStorage is automatically synced.
      { source: "/lms/:path*", destination: `${lmsOrigin}/lms/:path*` },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.paii.ca" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
