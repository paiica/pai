"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import Link from "next/link";
import toast from "react-hot-toast";
import { ArrowLeft, ChevronRight, Save, Loader2, Globe, EyeOff, Share2, Copy, Check, ExternalLink, Star } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

type Post = {
  id: string; slug: string; title: string; excerpt: string; content: string;
  cover_image_url: string; category: string; tags: string[];
  author_name: string; author_avatar: string; reading_time: string;
  is_published: boolean; published_at: string | null;
};

const CATEGORIES = ["Career", "Learning", "Management", "Industry", "Tools", "Certifications", "Compliance", "Other"];

const SITE_URL = process.env.NEXT_PUBLIC_MARKETING_URL || "https://paii.ca";

export default function BlogEditorPage() {
  const { id } = useParams<{ id: string }>();
  const { accessToken, refreshTokens } = useAuthStore();

  const { data, error, isLoading } = useSWR(
    accessToken && id ? [`/blog-posts/${id}`, accessToken] : null,
    async ([url, token]) => {
      try {
        return await api.get<any>(url, token);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          const ok = await refreshTokens();
          if (ok) return api.get<any>(url, useAuthStore.getState().accessToken!);
        }
        throw err;
      }
    }
  );

  const post: Post | null = data?.data ?? data ?? null;

  const [title,         setTitle]         = useState("");
  const [slug,          setSlug]          = useState("");
  const [excerpt,       setExcerpt]       = useState("");
  const [content,       setContent]       = useState("");
  const [coverImage,    setCoverImage]    = useState("");
  const [category,      setCategory]      = useState("");
  const [tagsInput,     setTagsInput]     = useState("");
  const [authorName,    setAuthorName]    = useState("");
  const [authorAvatar,  setAuthorAvatar]  = useState("");
  const [readingTime,   setReadingTime]   = useState("");
  const [isPublished,   setIsPublished]   = useState(false);
  const [isFeatured,    setIsFeatured]    = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [initialized,   setInitialized]   = useState(false);
  const [copied,        setCopied]        = useState(false);
  const [shareOpen,     setShareOpen]     = useState(false);
  const [activeTab,     setActiveTab]     = useState<"content" | "meta" | "author">("content");

  useEffect(() => {
    if (post && !initialized) {
      setTitle(post.title);
      setSlug(post.slug);
      setExcerpt(post.excerpt ?? "");
      setContent(post.content ?? "");
      setCoverImage(post.cover_image_url ?? "");
      setCategory(post.category ?? "");
      setTagsInput((post.tags ?? []).join(", "));
      setAuthorName(post.author_name ?? "");
      setAuthorAvatar(post.author_avatar ?? "");
      setReadingTime(post.reading_time ?? "");
      setIsPublished(post.is_published);
      setIsFeatured((post as any).is_featured ?? false);
      setInitialized(true);
    }
  }, [post, initialized]);

  async function save() {
    if (!title.trim() || !slug.trim()) return;
    setSaving(true);
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
    const body = { title, slug, excerpt, content, cover_image_url: coverImage, category, tags, author_name: authorName, author_avatar: authorAvatar, reading_time: readingTime, is_published: isPublished, is_featured: isFeatured };
    try {
      let token = accessToken!;
      try {
        await api.patch(`/blog-posts/${id}`, body, token);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          const ok = await refreshTokens();
          if (!ok) throw err;
          token = useAuthStore.getState().accessToken!;
          await api.patch(`/blog-posts/${id}`, body, token);
        } else throw err;
      }
      toast.success("Post saved");
    } catch {
      toast.error("Failed to save post");
    } finally {
      setSaving(false);
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(`${SITE_URL}/blog/${slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const postUrl = encodeURIComponent(`${SITE_URL}/blog/${slug}`);
  const postTitle = encodeURIComponent(title);
  const xShareUrl = `https://x.com/intent/tweet?url=${postUrl}&text=${postTitle}`;
  const linkedInShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${postUrl}`;

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[300px]">
        <Loader2 size={28} className="animate-spin text-slate-300" />
      </div>
    );
  }

  if (error || (!isLoading && !post)) {
    return (
      <div className="p-6 lg:p-8">
        <div className="card p-10 text-center">
          <p className="text-red-500 text-sm font-semibold">Post not found.</p>
          <Link href="/blog" className="btn-outline !py-1.5 !px-4 !text-xs mt-4 inline-flex">Back to Blog</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-3">
        <Link href="/blog" className="hover:text-slate-600">Blog</Link>
        <ChevronRight size={12} />
        <span className="text-slate-700 font-semibold truncate max-w-xs">{title || "Untitled Post"}</span>
      </div>
      <div className="mb-6 flex items-center gap-3">
        <Link href="/blog" className="p-2 text-slate-400 hover:text-navy-700 hover:bg-slate-100 rounded-lg transition-colors">
          <ArrowLeft size={17} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-display font-black text-navy-900 truncate">{title || "Untitled Post"}</h1>
          <p className="text-slate-400 text-xs font-mono mt-0.5">/blog/{slug}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Share */}
          <div className="relative">
            <button
              onClick={() => setShareOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-colors"
            >
              <Share2 size={12} /> Share
            </button>
            {shareOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-card-hover border border-slate-200 py-2 z-20">
                <button onClick={copyLink} className="flex items-center gap-2.5 w-full px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
                  {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                  {copied ? "Copied!" : "Copy link"}
                </button>
                <a href={xShareUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 w-full px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
                  <svg width={13} height={13} viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  Share on X
                </a>
                <a href={linkedInShareUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 w-full px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
                  <svg width={13} height={13} viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                  Share on LinkedIn
                </a>
                {isPublished && (
                  <a href={`${SITE_URL}/blog/${slug}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 w-full px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors border-t border-slate-100 mt-1 pt-2">
                    <ExternalLink size={13} /> View live post
                  </a>
                )}
              </div>
            )}
          </div>
          {/* Featured toggle */}
          <button
            onClick={() => setIsFeatured((v) => !v)}
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
              isFeatured
                ? "text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100"
                : "text-slate-500 bg-slate-100 border-slate-200 hover:bg-slate-200"
            }`}
          >
            <Star size={11} className={isFeatured ? "fill-amber-500 text-amber-500" : ""} />
            {isFeatured ? "Featured" : "Not featured"}
          </button>

          {/* Published toggle */}
          <button
            onClick={() => setIsPublished((v) => !v)}
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
              isPublished
                ? "text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                : "text-slate-500 bg-slate-100 border-slate-200 hover:bg-slate-200"
            }`}
          >
            {isPublished ? <Globe size={11} /> : <EyeOff size={11} />}
            {isPublished ? "Published" : "Draft"}
          </button>
          <button onClick={save} disabled={saving || !title.trim() || !slug.trim()} className="btn-primary !py-2 !px-4 !text-xs">
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-slate-200">
        {(["content", "meta", "author"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 text-xs font-semibold capitalize border-b-2 -mb-px transition-colors",
              activeTab === tab ? "border-navy-700 text-navy-900" : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            {tab === "meta" ? "SEO & Cover" : tab}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {activeTab === "content" && (
          <>
            <div className="card p-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Title</label>
                  <input className="input-base text-base font-semibold" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Post title" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Slug</label>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-400 flex-shrink-0">/blog/</span>
                    <input className="input-base" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="post-slug" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Excerpt</label>
                  <textarea className="input-base resize-none h-20 text-sm" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="Short summary shown in the blog listing..." />
                </div>
              </div>
            </div>

            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold text-navy-900 uppercase tracking-widest">Content</p>
                <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-1 rounded font-mono">HTML</span>
              </div>
              <textarea
                className="input-base font-mono text-xs leading-relaxed resize-none"
                rows={28}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="<p>Write your blog post content here...</p>"
              />
            </div>
          </>
        )}

        {activeTab === "meta" && (
          <div className="card p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Cover Image URL</label>
              <input className="input-base" value={coverImage} onChange={(e) => setCoverImage(e.target.value)} placeholder="https://..." />
              {coverImage && (
                <div className="mt-2 rounded-xl overflow-hidden border border-slate-100 bg-slate-50">
                  <img src={coverImage} alt="Cover preview" className="w-full h-40 object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Category</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat === category ? "" : cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      category === cat ? "bg-navy-900 text-white border-navy-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tags <span className="font-normal text-slate-400">(comma-separated)</span></label>
              <input className="input-base" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="ai, certification, career" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Reading Time</label>
              <input className="input-base" value={readingTime} onChange={(e) => setReadingTime(e.target.value)} placeholder="e.g. 6 min read" />
            </div>
          </div>
        )}

        {activeTab === "author" && (
          <div className="card p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Author Name</label>
              <input className="input-base" value={authorName} onChange={(e) => setAuthorName(e.target.value)} placeholder="e.g. PAI Editorial Team" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Author Avatar Initials</label>
              <input className="input-base !w-24" value={authorAvatar} onChange={(e) => setAuthorAvatar(e.target.value.slice(0, 3).toUpperCase())} placeholder="PE" maxLength={3} />
              <p className="text-xs text-slate-400 mt-1.5">2–3 characters shown in the avatar circle when no photo is used.</p>
              {authorAvatar && (
                <div className="mt-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-ink-700 text-white flex items-center justify-center text-sm font-bold">
                    {authorAvatar}
                  </div>
                  <span className="text-sm font-semibold text-slate-700">{authorName || "Author Name"}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button onClick={save} disabled={saving || !title.trim() || !slug.trim()} className="btn-primary !py-2 !px-6 !text-sm">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Post
          </button>
        </div>
      </div>
    </div>
  );
}
