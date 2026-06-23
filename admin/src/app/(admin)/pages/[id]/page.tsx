"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import Link from "next/link";
import toast from "react-hot-toast";
import { ArrowLeft, Save, Loader2, Globe, EyeOff } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api, ApiError } from "@/lib/api";

type Page = {
  id: string;
  slug: string;
  title: string;
  content: string;
  meta_description: string;
  is_published: boolean;
  updated_at: string;
};

export default function PageEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { accessToken, refreshTokens } = useAuthStore();

  const { data, error, isLoading } = useSWR(
    accessToken ? ["/pages", accessToken] : null,
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

  const allPages: Page[] = data?.data ?? data ?? [];
  const page = allPages.find((p) => p.id === id);

  const [title,           setTitle]           = useState("");
  const [slug,            setSlug]            = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [content,         setContent]         = useState("");
  const [isPublished,     setIsPublished]     = useState(false);
  const [saving,          setSaving]          = useState(false);
  const [initialized,     setInitialized]     = useState(false);

  useEffect(() => {
    if (page && !initialized) {
      setTitle(page.title);
      setSlug(page.slug);
      setMetaDescription(page.meta_description ?? "");
      setContent(page.content ?? "");
      setIsPublished(page.is_published);
      setInitialized(true);
    }
  }, [page, initialized]);

  async function save() {
    if (!title.trim() || !slug.trim()) return;
    setSaving(true);
    try {
      let token = accessToken!;
      try {
        await api.patch(`/pages/${id}`, { title, slug, meta_description: metaDescription, content, is_published: isPublished }, token);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          const ok = await refreshTokens();
          if (!ok) throw err;
          token = useAuthStore.getState().accessToken!;
          await api.patch(`/pages/${id}`, { title, slug, meta_description: metaDescription, content, is_published: isPublished }, token);
        } else throw err;
      }
      toast.success("Page saved");
    } catch {
      toast.error("Failed to save page");
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[300px]">
        <Loader2 size={28} className="animate-spin text-slate-300" />
      </div>
    );
  }

  if (error || (!isLoading && !page)) {
    return (
      <div className="p-6 lg:p-8">
        <div className="card p-10 text-center">
          <p className="text-red-500 text-sm font-semibold">Page not found.</p>
          <Link href="/pages" className="btn-outline !py-1.5 !px-4 !text-xs mt-4 inline-flex">Back to Pages</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/pages" className="p-2 text-slate-400 hover:text-navy-700 hover:bg-slate-100 rounded-lg transition-colors">
          <ArrowLeft size={17} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-display font-black text-navy-900 truncate">{title || "Untitled Page"}</h1>
          <p className="text-slate-400 text-xs font-mono mt-0.5">/{slug}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
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

      <div className="space-y-4">
        <div className="card p-5">
          <p className="text-xs font-bold text-navy-900 uppercase tracking-widest mb-4">Page Details</p>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Title</label>
              <input
                className="input-base"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Page title"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Slug <span className="text-slate-400 font-normal">(URL path)</span>
              </label>
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-400 flex-shrink-0">/</span>
                <input
                  className="input-base"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder="page-slug"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Meta Description <span className="text-slate-400 font-normal">(SEO)</span>
              </label>
              <input
                className="input-base"
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                placeholder="Short description for search engines (150–160 chars recommended)"
                maxLength={200}
              />
              <p className="text-[10px] text-slate-400 mt-1">{metaDescription.length}/200</p>
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
            rows={24}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="<p>Write your page content here. You can use HTML tags for formatting.</p>"
          />
          <p className="text-[10px] text-slate-400 mt-2">Supports full HTML. Use &lt;h2&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;a&gt;, etc.</p>
        </div>

        <div className="flex justify-end pt-2">
          <button onClick={save} disabled={saving || !title.trim() || !slug.trim()} className="btn-primary !py-2 !px-6 !text-sm">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Page
          </button>
        </div>
      </div>
    </div>
  );
}
