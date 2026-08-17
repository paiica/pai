import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Calendar, Clock, ArrowRight } from "lucide-react";
import PageHero, { type PageHeroProps } from "@/components/sections/PageHero";

type Post = {
  id: string; slug: string; title: string; excerpt: string;
  cover_image_url: string; category: string; tags: string[];
  author_name: string; author_avatar: string; reading_time: string;
  published_at: string | null; created_at: string;
};

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

async function getPosts(locale: string): Promise<Post[]> {
  try {
    const res = await fetch(`${API}/blog-posts/public?lang=${locale}`, { next: { revalidate: 120 } });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data ?? json) as Post[];
  } catch {
    return [];
  }
}

type CmsPage = PageHeroProps & { hero_enabled: boolean; title?: string; meta_description?: string };

async function getCmsPage(locale: string): Promise<CmsPage | null> {
  try {
    const res = await fetch(`${API}/pages/public/blog?lang=${locale}`, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    return (json.data ?? json) as CmsPage;
  } catch {
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const cms = await getCmsPage(locale);
  return {
    title: cms?.title || "Blog & Insights",
    description: cms?.meta_description || "AI industry insights, certification guides, career advice, and thought leadership from the Professional Artificial Intelligence Institute.",
  };
}

const CATEGORY_COLORS: Record<string, string> = {
  Career:         "bg-sand-200 text-ink-900",
  Learning:       "bg-sand-200 text-ink-900",
  Management:     "bg-teal-50 text-ink-900",
  Industry:       "bg-sand-200 text-ink-900",
  Tools:          "bg-sand-200 text-ink-900",
  Certifications: "bg-sand-200 text-ink-900",
  Compliance:     "bg-teal-50 text-ink-900",
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default async function BlogPage() {
  const locale = await getLocale();
  const t = await getTranslations("BlogPage");
  const posts = await getPosts(locale);
  const cms = await getCmsPage(locale);
  const [featured, ...rest] = posts;

  return (
    <>
      <Navbar />
      <main>
        {/* Hero — CMS-controlled if enabled, otherwise the original hardcoded copy */}
        {cms?.hero_enabled ? (
          <PageHero {...cms} />
        ) : (
          <section className="pb-16 bg-hero-dark relative overflow-hidden" style={{ paddingTop: "calc(var(--header-height, 88px) + 48px)" }}>
            <div className="container-lg relative text-center">
              <span className="badge-dark mb-5">{t("badge")}</span>
              <h1 className="text-4xl sm:text-5xl font-display font-black text-white mb-5">{t("heroHeading")}</h1>
              <p className="text-lg text-white max-w-xl mx-auto">
                {t("heroBody")}
              </p>
            </div>
          </section>
        )}

        <section className="section-padding bg-white">
          <div className="container-lg">
            {posts.length === 0 ? (
              <div className="text-center py-20 text-slate-400 text-sm">{t("noPostsPublished")}</div>
            ) : (
              <>
                {featured && (
                  <div className="card-hover p-8 mb-10 flex flex-col sm:flex-row gap-6 items-start">
                    {featured.cover_image_url && (
                      <div className="w-full sm:w-80 flex-shrink-0 rounded-xl overflow-hidden">
                        <img src={featured.cover_image_url} alt={featured.title} className="w-full h-48 object-cover" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        {featured.category && (
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${CATEGORY_COLORS[featured.category] ?? "bg-sand-200 text-ink-900"}`}>
                            {featured.category}
                          </span>
                        )}
                        <span className="text-xs text-ink-900 font-bold">{t("featuredBadge")}</span>
                      </div>
                      <h2 className="text-2xl font-display font-bold text-ink-900 mb-3 leading-tight">{featured.title}</h2>
                      {featured.excerpt && <p className="text-ink-900 text-sm leading-relaxed mb-4">{featured.excerpt}</p>}
                      <Link href={`/blog/${featured.slug}`} className="btn-dark !py-2.5 !px-5 !text-sm">
                        {t("readArticle")} <ArrowRight size={13} />
                      </Link>
                      <div className="flex items-center gap-3 text-xs text-ink-900 mt-4">
                        {(featured.published_at || featured.created_at) && (
                          <div className="flex items-center gap-1"><Calendar size={11} /> {formatDate(featured.published_at ?? featured.created_at)}</div>
                        )}
                        {featured.reading_time && <div className="flex items-center gap-1"><Clock size={11} /> {featured.reading_time}</div>}
                      </div>
                    </div>
                  </div>
                )}

                {rest.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {rest.map((post) => (
                      <Link key={post.id} href={`/blog/${post.slug}`} className="card-hover group flex flex-col overflow-hidden">
                        {post.cover_image_url && (
                          <div className="h-44 overflow-hidden">
                            <img src={post.cover_image_url} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          </div>
                        )}
                        <div className="p-6 flex flex-col flex-1">
                          {post.category && (
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full w-fit mb-3 ${CATEGORY_COLORS[post.category] ?? "bg-sand-200 text-ink-900"}`}>
                              {post.category}
                            </span>
                          )}
                          <h3 className="font-display font-bold text-ink-900 text-base mb-2 leading-snug group-hover:text-ink-900 transition-colors flex-1">
                            {post.title}
                          </h3>
                          {post.excerpt && <p className="text-ink-900 text-xs leading-relaxed mb-4">{post.excerpt}</p>}
                          <div className="flex items-center gap-3 text-xs text-ink-900 mt-auto">
                            {(post.published_at || post.created_at) && (
                              <div className="flex items-center gap-1"><Calendar size={10} /> {formatDate(post.published_at ?? post.created_at)}</div>
                            )}
                            {post.reading_time && <div className="flex items-center gap-1"><Clock size={10} /> {post.reading_time}</div>}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

