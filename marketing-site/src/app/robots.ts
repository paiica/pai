import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://paii.ca";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/auth/", "/transcript/"] },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
