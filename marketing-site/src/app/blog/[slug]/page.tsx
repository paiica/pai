import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ShareButtons from "./ShareButtons";
import { Calendar, Clock, ArrowLeft, Tag } from "lucide-react";

type Post = {
  id: string; slug: string; title: string; excerpt: string; content: string;
  cover_image_url: string; category: string; tags: string[];
  author_name: string; author_avatar: string; reading_time: string;
  is_published: boolean; published_at: string | null; created_at: string;
};

const API      = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://paii.ca";

async function getPost(slug: string): Promise<Post | null> {
  try {
    const res = await fetch(`${API}/blog-posts/public/${slug}`, { next: { revalidate: 120 } });
    if (!res.ok) return null;
    const json = await res.json();
    const p = json?.data ?? json;
    return p?.slug ? p : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Not Found" };
  return {
    title: post.title,
    description: post.excerpt || undefined,
    openGraph: {
      title: post.title,
      description: post.excerpt || undefined,
      images: post.cover_image_url ? [post.cover_image_url] : [],
    },
  };
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const postUrl = `${SITE_URL}/blog/${post.slug}`;

  return (
    <>
      <Navbar />
      <main className="bg-white">
        {/* Hero */}
        <div className="pt-24 pb-10 bg-hero-dark">
          <div className="container-md text-center">
            {post.category && (
              <span className="inline-block text-xs font-bold px-3 py-1 rounded-full bg-white/10 text-white mb-4">
                {post.category}
              </span>
            )}
            <h1 className="text-3xl sm:text-4xl font-display font-black text-white leading-tight mb-5 max-w-3xl mx-auto">
              {post.title}
            </h1>
            <div className="flex items-center justify-center gap-4 text-sm text-white/70 flex-wrap">
              {post.author_name && (
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold text-white">
                    {post.author_avatar || post.author_name.slice(0, 2).toUpperCase()}
                  </div>
                  <span>{post.author_name}</span>
                </div>
              )}
              {(post.published_at || post.created_at) && (
                <div className="flex items-center gap-1.5">
                  <Calendar size={13} />
                  {formatDate(post.published_at ?? post.created_at)}
                </div>
              )}
              {post.reading_time && (
                <div className="flex items-center gap-1.5">
                  <Clock size={13} />
                  {post.reading_time}
                </div>
              )}
            </div>
          </div>
        </div>

        {post.cover_image_url && (
          <div className="container-md -mt-6 mb-0 relative z-10">
            <img src={post.cover_image_url} alt={post.title} className="w-full h-64 sm:h-80 object-cover rounded-2xl shadow-lg" />
          </div>
        )}

        <div className="container-md py-12 lg:py-16">
          <div className="flex flex-col lg:flex-row gap-10">
            {/* Article */}
            <article className="flex-1 min-w-0">
              {post.excerpt && (
                <p className="text-lg text-ink-900 font-medium leading-relaxed mb-8 pb-8 border-b border-sand-200">
                  {post.excerpt}
                </p>
              )}
              {post.content ? (
                <div className="prose prose-slate max-w-none text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: post.content }} />
              ) : (
                <p className="text-slate-400 text-sm">No content yet.</p>
              )}
              {post.tags?.length > 0 && (
                <div className="mt-10 pt-6 border-t border-sand-200 flex items-center gap-2 flex-wrap">
                  <Tag size={13} className="text-slate-400" />
                  {post.tags.map((tag) => (
                    <span key={tag} className="text-xs font-semibold px-2.5 py-1 rounded-full bg-sand-100 text-ink-900">{tag}</span>
                  ))}
                </div>
              )}
            </article>

            {/* Sidebar */}
            <aside className="lg:w-56 flex-shrink-0">
              <div className="card p-5 sticky top-24">
                <p className="text-xs font-bold text-ink-900 uppercase tracking-widest mb-4">Share</p>
                <ShareButtons url={postUrl} title={post.title} />
                <div className="mt-5 pt-5 border-t border-sand-200">
                  <Link href="/blog" className="flex items-center gap-1.5 text-xs font-semibold text-ink-900 hover:text-ink-900 transition-colors">
                    <ArrowLeft size={12} /> All Posts
                  </Link>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
