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
    const lmsPublicUrl = process.env.NEXT_PUBLIC_LMS_URL || "https://learn.paii.ca";
    return [
      {
        // Excludes /auth/logout-sync, /auth/login-sync, and everything under
        // /presentations (via the negative lookahead below) — those need to
        // be embeddable in an iframe (the auth routes from the student
        // portal's origin, the presentation decks from this same site's own
        // wrapper page at /presentations/[slug]) and get their own, narrower
        // frame policy instead, further down.
        source: "/((?!auth/(?:logout|login)-sync|presentations/).*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        // Modern browsers prefer CSP's frame-ancestors over X-Frame-Options
        // when both are present, and unlike X-Frame-Options it can allowlist
        // one specific origin instead of only DENY/SAMEORIGIN — deliberately
        // omitting X-Frame-Options here rather than setting it to DENY,
        // which would just override this and block the one origin that's
        // actually supposed to be able to frame these routes.
        source: "/auth/:kind(logout|login)-sync",
        headers: [
          { key: "Content-Security-Policy", value: `frame-ancestors 'self' ${lmsPublicUrl}` },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        // The static .html decks under public/presentations are embedded via
        // iframe by /presentations/[slug]/page.tsx on this same origin —
        // SAMEORIGIN (not the blanket DENY above) allows that self-embed
        // while still blocking any other site from framing them.
        source: "/presentations/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
