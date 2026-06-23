import Link from "next/link";
import { ArrowRight, Calendar, Clock } from "lucide-react";

type Post = {
  id: string; slug: string; title: string; excerpt: string;
  cover_image_url: string; category: string; reading_time: string;
  is_featured: boolean; published_at: string | null; created_at: string;
};

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

async function getPosts(): Promise<Post[]> {
  try {
    const res = await fetch(`${API}/blog-posts/public`, { next: { revalidate: 120 } });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data ?? json) as Post[];
  } catch {
    return [];
  }
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function BlogSection({ cmsContent = {} }: { cmsContent?: Record<string, any> }) {
  const badge = cmsContent.badge || "Blog & Insights";
  const title = cmsContent.title || "From the Blog";

  const allPosts = await getPosts();
  const featured = allPosts.filter((p) => p.is_featured);
  const posts = (featured.length > 0 ? featured : allPosts).slice(0, 3);

  if (posts.length === 0) return null;

  return (
    <section className="section-padding bg-sand-100">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10">

        <div className="flex items-end justify-between mb-12">
          <div>
            <span className="badge-gold mb-4">{badge}</span>
            <h2 className="section-title">{title}</h2>
          </div>
          <Link
            href="/blog"
            className="hidden sm:inline-flex items-center gap-1.5 text-sm font-bold text-ink-900 hover:text-ink-900 border-b border-ink-300 pb-0.5 transition-colors"
          >
            View all articles <ArrowRight size={13} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="group card-hover flex flex-col overflow-hidden"
            >
              {post.cover_image_url && (
                <div className="h-44 overflow-hidden">
                  <img
                    src={post.cover_image_url}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              )}
              <div className="p-6 flex flex-col flex-1">
                {post.category && (
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full w-fit mb-4 bg-sand-200 text-ink-900">
                    {post.category}
                  </span>
                )}
                <h3 className="font-display font-bold text-ink-900 text-base leading-snug mb-3 group-hover:text-ink-900 transition-colors flex-1">
                  {post.title}
                </h3>
                {post.excerpt && (
                  <p className="text-ink-900 text-sm leading-relaxed mb-5 line-clamp-3">{post.excerpt}</p>
                )}
                <div className="flex items-center gap-3 text-xs text-ink-900 mt-auto pt-4 border-t border-sand-200">
                  {(post.published_at || post.created_at) && (
                    <div className="flex items-center gap-1">
                      <Calendar size={11} /> {formatDate(post.published_at ?? post.created_at)}
                    </div>
                  )}
                  {post.reading_time && (
                    <div className="flex items-center gap-1">
                      <Clock size={11} /> {post.reading_time}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="sm:hidden text-center mt-8">
          <Link href="/blog" className="btn-dark !py-3 !px-6 !text-sm">
            View All Articles <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}
