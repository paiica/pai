import { MetadataRoute } from "next";
import { CERTIFICATIONS } from "@/lib/certifications-data";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://professionalaiinstitute.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const certificationUrls = CERTIFICATIONS
    .filter(c => c.status === "active")
    .map(cert => ({
      url: `${BASE_URL}/certifications/${cert.slug}`,
      lastModified: new Date(cert.updated_at),
      changeFrequency: "monthly" as const,
      priority: 0.9,
    }));

  return [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE_URL}/certifications`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE_URL}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/learning-path`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/corporate`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/verify`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.6 },
    ...certificationUrls,
  ];
}
