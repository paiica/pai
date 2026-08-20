import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://paii.ca";

// Regenerate at most once an hour — a sitemap doesn't need to be as fresh as
// the pages themselves, and this keeps crawler hits from adding load to the
// backend on every request.
export const revalidate = 3600;

// Static, hardcoded routes that aren't backed by a listable CMS/DB collection
// — either fixed legal/info pages or listing pages whose own detail rows are
// added separately below.
const STATIC_PATHS = [
  "/", "/about", "/certifications", "/courses", "/programs", "/events",
  "/blog", "/faq", "/verify", "/employers", "/corporate", "/educator",
  "/presentations", "/support", "/privacy", "/terms",
];

// The 3 real presentation decks are static data (marketing-site/src/app/[locale]/presentations/data.ts),
// not a DB-backed collection — hardcoded here to match.
const PRESENTATION_SLUGS = ["student-guide", "educator-affiliate-program", "affiliate-portal-walkthrough"];

function localizedUrls(path: string): { url: string; languages: Record<string, string> } {
  const languages: Record<string, string> = {};
  for (const locale of routing.locales) {
    const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;
    languages[locale] = `${SITE_URL}${prefix}${path}`;
  }
  return { url: languages[routing.defaultLocale], languages };
}

async function fetchList(path: string): Promise<any[]> {
  try {
    const res = await fetch(`${API}${path}`, { next: { revalidate } });
    if (!res.ok) return [];
    const json = await res.json();
    const data = json?.data ?? json;
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [pages, certifications, programs, events, blogPosts] = await Promise.all([
    fetchList("/pages/public"),
    fetchList("/courses"),
    fetchList("/programs"),
    fetchList("/events"),
    fetchList("/blog-posts/public"),
  ]);

  const entries: MetadataRoute.Sitemap = [];

  for (const path of STATIC_PATHS) {
    const { url, languages } = localizedUrls(path);
    entries.push({ url, lastModified: new Date(), changeFrequency: "weekly", priority: path === "/" ? 1 : 0.7, alternates: { languages } });
  }

  for (const slug of PRESENTATION_SLUGS) {
    const { url, languages } = localizedUrls(`/presentations/${slug}`);
    entries.push({ url, changeFrequency: "monthly", priority: 0.4, alternates: { languages } });
  }

  // CMS-driven pages served via the generic [locale]/[slug] catch-all —
  // covers every page built this session (FAQ resource pages, Connect/Learn/
  // Career hub pages) plus any future page an admin publishes, with no
  // hardcoded slug list to keep in sync.
  for (const page of pages) {
    if (STATIC_PATHS.includes(`/${page.slug}`)) continue;
    const { url, languages } = localizedUrls(`/${page.slug}`);
    entries.push({ url, lastModified: page.updated_at ? new Date(page.updated_at) : undefined, changeFrequency: "monthly", priority: 0.6, alternates: { languages } });
  }

  for (const cert of certifications) {
    if (cert.status === "archived" || !cert.slug) continue;
    for (const base of ["/certifications", "/courses"]) {
      const { url, languages } = localizedUrls(`${base}/${cert.slug}`);
      entries.push({ url, lastModified: cert.updated_at ? new Date(cert.updated_at) : undefined, changeFrequency: "monthly", priority: 0.8, alternates: { languages } });
    }
  }

  for (const program of programs) {
    if (!program.slug) continue;
    const { url, languages } = localizedUrls(`/programs/${program.slug}`);
    entries.push({ url, lastModified: program.updated_at ? new Date(program.updated_at) : undefined, changeFrequency: "monthly", priority: 0.7, alternates: { languages } });
  }

  for (const event of events) {
    if (!event.slug) continue;
    const { url, languages } = localizedUrls(`/events/${event.slug}`);
    entries.push({ url, lastModified: event.updated_at ? new Date(event.updated_at) : undefined, changeFrequency: "weekly", priority: 0.5, alternates: { languages } });
  }

  for (const post of blogPosts) {
    if (!post.slug) continue;
    const { url, languages } = localizedUrls(`/blog/${post.slug}`);
    entries.push({ url, lastModified: post.published_at ?? post.created_at ? new Date(post.published_at ?? post.created_at) : undefined, changeFrequency: "monthly", priority: 0.6, alternates: { languages } });
  }

  return entries;
}
