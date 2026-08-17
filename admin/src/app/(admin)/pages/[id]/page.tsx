"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import Link from "next/link";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";
import { ArrowLeft, ChevronRight, Save, Loader2, Globe, EyeOff, Code2, Eye, ExternalLink, Type, AlignLeft, AlignCenter, AlignRight, Image as ImageIcon, Sparkles } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { HeroImageFrame, deleteOldUpload, uploadHeroImage } from "@/components/HeroImageFrame";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MonacoEditor = dynamic(
  () => import("@monaco-editor/react"),
  { ssr: false, loading: () => <div className="bg-slate-900 rounded-xl animate-pulse" style={{ height: 560 }} /> },
) as any;

const LMS_URL = process.env.NEXT_PUBLIC_LMS_URL || "https://learn.paii.ca";

type Page = {
  id: string;
  slug: string;
  title: string;
  content: string;
  meta_description: string;
  is_published: boolean;
  updated_at: string;
  hero_enabled: boolean;
  hero_badge: string;
  hero_headline: string;
  hero_subheadline: string;
  hero_align: string;
  hero_image_url: string;
  hero_image_position: string;
  hero_image_zoom: number;
  hero_overlay: boolean;
  hero_cta_label: string;
  hero_cta_href: string;
  translations: Record<string, Record<string, any>>;
};

type Language = { code: string; name: string; native_name: string; is_rtl: boolean };

function previewDoc(content: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 15px; color: #0f172a; background: #f8fafc; }
    h1 { font-size: 2rem; font-weight: 900; margin: 0 0 8px; }
    h2 { font-size: 1.25rem; font-weight: 700; margin: 32px 0 12px; }
    h3 { font-size: 1rem; font-weight: 700; margin: 0 0 8px; }
    p  { line-height: 1.7; margin: 0 0 16px; }
    a  { color: #0f172a; }
    ul, ol { padding-left: 20px; }
    li { margin-bottom: 6px; font-size: 14px; line-height: 1.6; }
    section { overflow: hidden; }
  </style>
</head>
<body>${content}</body>
</html>`;
}

export default function PageEditorPage() {
  const { id } = useParams<{ id: string }>();
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

  const { data: languagesData } = useSWR<Language[]>(
    accessToken ? ["/languages", accessToken] : null,
    ([url, token]: [string, string]) => api.get<any>(url, token).then((r: any) => r.data ?? r)
  );
  const languages = languagesData ?? [];

  const [activeLocale, setActiveLocale] = useState("en");
  const [translationDrafts, setTranslationDrafts] = useState<Record<string, Record<string, any>>>({});
  const [translationsInitialized, setTranslationsInitialized] = useState(false);
  const [savingTranslation, setSavingTranslation] = useState<string | null>(null);
  const [retranslating, setRetranslating] = useState<string | null>(null);

  useEffect(() => {
    if (page && !translationsInitialized) {
      setTranslationDrafts(page.translations ?? {});
      setTranslationsInitialized(true);
    }
  }, [page, translationsInitialized]);

  function getTranslatedField(locale: string, field: string): string {
    return translationDrafts[locale]?.[field] ?? "";
  }

  function setTranslatedField(locale: string, field: string, value: string) {
    setTranslationDrafts((prev) => ({ ...prev, [locale]: { ...prev[locale], [field]: value } }));
  }

  async function saveTranslation(locale: string) {
    setSavingTranslation(locale);
    try {
      let token = accessToken!;
      const fields = translationDrafts[locale] ?? {};
      try {
        await api.patch(`/translations/page/${id}?locale=${locale}`, { fields }, token);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          const ok = await refreshTokens();
          if (!ok) throw err;
          token = useAuthStore.getState().accessToken!;
          await api.patch(`/translations/page/${id}?locale=${locale}`, { fields }, token);
        } else throw err;
      }
      toast.success("Translation saved");
    } catch {
      toast.error("Failed to save translation");
    } finally {
      setSavingTranslation(null);
    }
  }

  async function retranslate(locale: string) {
    setRetranslating(locale);
    try {
      let token = accessToken!;
      let res: any;
      try {
        res = await api.post<any>(`/translations/page/${id}?locale=${locale}`, {}, token);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          const ok = await refreshTokens();
          if (!ok) throw err;
          token = useAuthStore.getState().accessToken!;
          res = await api.post<any>(`/translations/page/${id}?locale=${locale}`, {}, token);
        } else throw err;
      }
      const updated = res?.data ?? res;
      setTranslationDrafts((prev) => ({ ...prev, [locale]: updated?.translations?.[locale] ?? {} }));
      toast.success("Translated with AI — review and save");
    } catch {
      toast.error("Translation failed");
    } finally {
      setRetranslating(null);
    }
  }

  const [title,           setTitle]           = useState("");
  const [slug,            setSlug]            = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [content,         setContent]         = useState("");
  const [isPublished,     setIsPublished]     = useState(false);
  const [saving,          setSaving]          = useState(false);
  const [initialized,     setInitialized]     = useState(false);
  const [activeTab,       setActiveTab]       = useState<"editor" | "edit" | "preview">("editor");
  const editableRef = useRef<HTMLDivElement>(null);

  // ── Hero ──────────────────────────────────────────────
  const [heroEnabled,     setHeroEnabled]     = useState(false);
  const [heroBadge,       setHeroBadge]       = useState("");
  const [heroHeadline,    setHeroHeadline]    = useState("");
  const [heroSubheadline, setHeroSubheadline] = useState("");
  const [heroAlign,       setHeroAlign]       = useState<"left" | "center" | "right">("center");
  const [heroImageUrl,    setHeroImageUrl]    = useState("");
  const [heroImagePos,    setHeroImagePos]    = useState("50% 50%");
  const [heroImageZoom,   setHeroImageZoom]   = useState(100);
  const [heroOverlay,     setHeroOverlay]     = useState(true);
  const [heroCtaLabel,    setHeroCtaLabel]    = useState("");
  const [heroCtaHref,     setHeroCtaHref]     = useState("");
  const [heroUploading,   setHeroUploading]   = useState(false);
  const [savingHero,      setSavingHero]      = useState(false);
  // Tracks the last *persisted* hero image URL (not the in-progress edit) —
  // cleanup only fires once a save actually replaces it, mirroring the
  // homepage hero editor's save-time diff. A ref, not state, since it must
  // survive multiple uploads between saves without triggering re-renders.
  const lastSavedImageUrlRef = useRef<string>("");

  // Sync the live `content` string into the editable surface only when switching
  // into this tab — never while it's mounted and being typed in, or every
  // keystroke's setContent() would re-render dangerouslySetInnerHTML underneath
  // the user's cursor and reset their selection.
  useEffect(() => {
    if (activeTab === "edit" && editableRef.current) {
      editableRef.current.innerHTML = content;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  function syncEditableContent() {
    if (editableRef.current) setContent(editableRef.current.innerHTML);
  }

  useEffect(() => {
    if (page && !initialized) {
      setTitle(page.title);
      setSlug(page.slug);
      setMetaDescription(page.meta_description ?? "");
      setContent(page.content ?? "");
      setIsPublished(page.is_published);
      setHeroEnabled(page.hero_enabled ?? false);
      setHeroBadge(page.hero_badge ?? "");
      setHeroHeadline(page.hero_headline ?? "");
      setHeroSubheadline(page.hero_subheadline ?? "");
      setHeroAlign((page.hero_align as "left" | "center" | "right") ?? "center");
      setHeroImageUrl(page.hero_image_url ?? "");
      setHeroImagePos(page.hero_image_position ?? "50% 50%");
      setHeroImageZoom(page.hero_image_zoom ?? 100);
      setHeroOverlay(page.hero_overlay ?? true);
      setHeroCtaLabel(page.hero_cta_label ?? "");
      setHeroCtaHref(page.hero_cta_href ?? "");
      lastSavedImageUrlRef.current = page.hero_image_url ?? "";
      setInitialized(true);
    }
  }, [page, initialized]);

  function heroPayload() {
    return {
      hero_enabled: heroEnabled,
      hero_badge: heroBadge,
      hero_headline: heroHeadline,
      hero_subheadline: heroSubheadline,
      hero_align: heroAlign,
      hero_image_url: heroImageUrl,
      hero_image_position: heroImagePos,
      hero_image_zoom: heroImageZoom,
      hero_overlay: heroOverlay,
      hero_cta_label: heroCtaLabel,
      hero_cta_href: heroCtaHref,
    };
  }

  async function uploadHero(file: File) {
    setHeroUploading(true);
    try {
      const url = await uploadHeroImage(file, accessToken!, "page_hero");
      if (!url) { toast.error("Upload failed"); return; }
      // Deliberately does NOT delete the previous image here — this is just an
      // in-progress edit that might never be saved. Cleanup of the actually-
      // replaced file happens in saveHero()/save() once the new state is
      // confirmed persisted (see lastSavedImageUrlRef).
      setHeroImageUrl(url);
      setHeroImagePos("50% 50%");
      setHeroImageZoom(100);
    } finally {
      setHeroUploading(false);
    }
  }

  function cleanUpReplacedHeroImage(token: string) {
    if (lastSavedImageUrlRef.current && lastSavedImageUrlRef.current !== heroImageUrl) {
      deleteOldUpload(lastSavedImageUrlRef.current, token);
    }
    lastSavedImageUrlRef.current = heroImageUrl;
  }

  async function saveHero() {
    setSavingHero(true);
    try {
      let token = accessToken!;
      const payload = heroPayload();
      try {
        await api.patch(`/pages/${id}`, payload, token);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          const ok = await refreshTokens();
          if (!ok) throw err;
          token = useAuthStore.getState().accessToken!;
          await api.patch(`/pages/${id}`, payload, token);
        } else throw err;
      }
      cleanUpReplacedHeroImage(token);
      toast.success("Hero saved");
    } catch {
      toast.error("Failed to save hero");
    } finally {
      setSavingHero(false);
    }
  }

  async function save() {
    if (!title.trim() || !slug.trim()) return;
    setSaving(true);
    try {
      let token = accessToken!;
      const payload = { title, slug, meta_description: metaDescription, content, is_published: isPublished, ...heroPayload() };
      try {
        await api.patch(`/pages/${id}`, payload, token);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          const ok = await refreshTokens();
          if (!ok) throw err;
          token = useAuthStore.getState().accessToken!;
          await api.patch(`/pages/${id}`, payload, token);
        } else throw err;
      }
      cleanUpReplacedHeroImage(token);
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
    <div className="p-6 lg:p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-3">
        <Link href="/pages" className="hover:text-slate-600">Pages</Link>
        <ChevronRight size={12} />
        <span className="text-slate-700 font-semibold truncate max-w-xs">{title || "Untitled Page"}</span>
      </div>
      <div className="mb-6 flex items-center gap-3">
        <Link href="/pages" className="p-2 text-slate-400 hover:text-navy-700 hover:bg-slate-100 rounded-lg transition-colors">
          <ArrowLeft size={17} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-display font-black text-navy-900 truncate">{title || "Untitled Page"}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-slate-400 text-xs font-mono">/{slug}</p>
            <a
              href={`${LMS_URL}/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-navy-700 transition-colors"
            >
              <ExternalLink size={10} /> View on site
            </a>
          </div>
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

      {/* Language tabs */}
      {languages.length > 1 && (
        <div className="flex items-center gap-1 mb-4 bg-slate-100 p-1 rounded-xl w-fit">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setActiveLocale(lang.code)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeLocale === lang.code ? "bg-white text-navy-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {lang.code === "en" ? "English" : lang.native_name}
            </button>
          ))}
        </div>
      )}

      {activeLocale !== "en" && (() => {
        const lang = languages.find((l) => l.code === activeLocale);
        return (
          <div className="card p-5 space-y-4" dir={lang?.is_rtl ? "rtl" : "ltr"}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-navy-900 uppercase tracking-widest">{lang?.name} Translation</p>
              <button
                onClick={() => retranslate(activeLocale)}
                disabled={retranslating === activeLocale}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-navy-200 text-navy-700 hover:bg-navy-50 transition-colors disabled:opacity-50"
              >
                {retranslating === activeLocale ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                Re-translate from English
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Auto-translated by AI when this page is saved or when {lang?.name} is enabled. Edit directly here, or re-translate to overwrite with a fresh AI pass — English stays the source of truth.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Title</label>
              <input className="input-base" value={getTranslatedField(activeLocale, "title")} onChange={(e) => setTranslatedField(activeLocale, "title", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Meta Description</label>
              <input className="input-base" value={getTranslatedField(activeLocale, "meta_description")} onChange={(e) => setTranslatedField(activeLocale, "meta_description", e.target.value)} />
            </div>
            {heroEnabled && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Hero Badge</label>
                  <input className="input-base" value={getTranslatedField(activeLocale, "hero_badge")} onChange={(e) => setTranslatedField(activeLocale, "hero_badge", e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Hero Headline</label>
                  <input className="input-base" value={getTranslatedField(activeLocale, "hero_headline")} onChange={(e) => setTranslatedField(activeLocale, "hero_headline", e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Hero Subheadline</label>
                  <textarea className="input-base h-20 resize-none" value={getTranslatedField(activeLocale, "hero_subheadline")} onChange={(e) => setTranslatedField(activeLocale, "hero_subheadline", e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Hero Button Label</label>
                  <input className="input-base" value={getTranslatedField(activeLocale, "hero_cta_label")} onChange={(e) => setTranslatedField(activeLocale, "hero_cta_label", e.target.value)} />
                </div>
              </>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Content (HTML)</label>
              <textarea
                className="input-base h-64 resize-y font-mono text-xs"
                value={getTranslatedField(activeLocale, "content")}
                onChange={(e) => setTranslatedField(activeLocale, "content", e.target.value)}
                dir="ltr"
              />
            </div>
            <div className="flex justify-end">
              <button onClick={() => saveTranslation(activeLocale)} disabled={savingTranslation === activeLocale} className="btn-primary !py-2 !px-4 !text-xs">
                {savingTranslation === activeLocale ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save Translation
              </button>
            </div>
          </div>
        );
      })()}

      {activeLocale === "en" && (
      <div className="space-y-4">
        {/* Page Details */}
        <div className="card p-5">
          <p className="text-xs font-bold text-navy-900 uppercase tracking-widest mb-4">Page Details</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Meta Description <span className="text-slate-400 font-normal">(SEO — 150–160 chars)</span>
              </label>
              <input
                className="input-base"
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                placeholder="Short description for search engines"
                maxLength={200}
              />
              <p className="text-[10px] text-slate-400 mt-1">{metaDescription.length}/200</p>
            </div>
          </div>
        </div>

        {/* Hero */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold text-navy-900 uppercase tracking-widest">Hero Banner</p>
            <button
              onClick={() => setHeroEnabled((v) => !v)}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                heroEnabled
                  ? "text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                  : "text-slate-500 bg-slate-100 border-slate-200 hover:bg-slate-200"
              }`}
            >
              {heroEnabled ? <Eye size={11} /> : <EyeOff size={11} />}
              {heroEnabled ? "Enabled" : "Disabled"}
            </button>
          </div>

          {!heroEnabled ? (
            <p className="text-xs text-slate-400">
              No hero banner shows above this page's content. Enable it to add a headline, background image, and alignment.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Badge <span className="text-slate-400 font-normal">(small eyebrow label, optional)</span>
                  </label>
                  <input className="input-base" value={heroBadge} onChange={(e) => setHeroBadge(e.target.value)} placeholder="e.g. About PAII" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Text Alignment</label>
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg w-fit">
                    {([
                      ["left", AlignLeft],
                      ["center", AlignCenter],
                      ["right", AlignRight],
                    ] as const).map(([val, Icon]) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setHeroAlign(val)}
                        title={`Align ${val}`}
                        className={cn(
                          "px-3 py-1.5 rounded-md transition-colors",
                          heroAlign === val ? "bg-white text-navy-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                        )}
                      >
                        <Icon size={14} />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Headline</label>
                  <input className="input-base" value={heroHeadline} onChange={(e) => setHeroHeadline(e.target.value)} placeholder="Big headline shown in the hero" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Subheadline</label>
                  <textarea
                    className="input-base h-20 resize-none"
                    value={heroSubheadline}
                    onChange={(e) => setHeroSubheadline(e.target.value)}
                    placeholder="A sentence or two under the headline"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Button Label <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <input className="input-base" value={heroCtaLabel} onChange={(e) => setHeroCtaLabel(e.target.value)} placeholder="e.g. Explore Certifications" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Button Link <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <input className="input-base" value={heroCtaHref} onChange={(e) => setHeroCtaHref(e.target.value)} placeholder="/certifications" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <ImageIcon size={12} /> Background Image <span className="text-slate-400 font-normal">(optional — leave blank for the default dark gradient)</span>
                  </label>
                  {heroImageUrl && (
                    <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 cursor-pointer">
                      <input type="checkbox" checked={heroOverlay} onChange={(e) => setHeroOverlay(e.target.checked)} className="rounded border-slate-300" />
                      Dark overlay
                    </label>
                  )}
                </div>
                <HeroImageFrame
                  imageUrl={heroImageUrl}
                  position={heroImagePos}
                  zoom={heroImageZoom}
                  uploading={heroUploading}
                  onUpload={uploadHero}
                  onPositionChange={setHeroImagePos}
                  onZoomChange={setHeroImageZoom}
                  aspectClassName="aspect-[1920/620]"
                />
                {heroImageUrl && (
                  <button type="button" onClick={() => setHeroImageUrl("")} className="text-[11px] font-semibold text-red-500 hover:text-red-700 mt-1.5">
                    Remove image (use gradient instead)
                  </button>
                )}
              </div>

              {/* Live preview */}
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Preview</p>
                <div
                  className={cn("relative overflow-hidden rounded-xl py-14 px-6", !heroImageUrl && "bg-gradient-to-br from-[#171527] via-[#1f1d38] to-[#2d1b69]")}
                >
                  {heroImageUrl && (
                    <>
                      <div
                        className="absolute inset-0 bg-cover bg-no-repeat"
                        style={{
                          backgroundImage: `url("${heroImageUrl}")`,
                          backgroundPosition: heroImagePos,
                          transform: `scale(${heroImageZoom / 100})`,
                          transformOrigin: heroImagePos,
                        }}
                      />
                      {heroOverlay && <div className="absolute inset-0 bg-black/60" />}
                    </>
                  )}
                  <div className={cn("relative max-w-lg", heroAlign === "left" ? "text-left mr-auto" : heroAlign === "right" ? "text-right ml-auto" : "text-center mx-auto")}>
                    {heroBadge.trim() && (
                      <span className="inline-flex items-center gap-2 text-[10px] font-mono font-semibold text-white uppercase tracking-[0.15em] pl-2.5 border-l-2 border-teal-400 mb-3">
                        {heroBadge}
                      </span>
                    )}
                    <h2 className="text-2xl font-display font-black text-white mb-2">{heroHeadline || "Headline"}</h2>
                    {heroSubheadline.trim() && <p className="text-sm text-white/90">{heroSubheadline}</p>}
                    {heroCtaLabel.trim() && (
                      <span className="inline-flex mt-4 bg-teal-500 text-white text-xs font-semibold px-4 py-2 rounded-lg">{heroCtaLabel}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button onClick={saveHero} disabled={savingHero} className="btn-primary !py-2 !px-4 !text-xs">
                  {savingHero ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save Hero
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Content Editor */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold text-navy-900 uppercase tracking-widest">Content</p>
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
              <button
                onClick={() => setActiveTab("editor")}
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-colors ${
                  activeTab === "editor" ? "bg-white text-navy-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Code2 size={11} /> HTML
              </button>
              <button
                onClick={() => setActiveTab("edit")}
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-colors ${
                  activeTab === "edit" ? "bg-white text-navy-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Type size={11} /> Edit Text
              </button>
              <button
                onClick={() => setActiveTab("preview")}
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-colors ${
                  activeTab === "preview" ? "bg-white text-navy-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Eye size={11} /> Preview
              </button>
            </div>
          </div>

          {activeTab === "editor" ? (
            <div className="rounded-xl overflow-hidden border border-slate-200">
              <MonacoEditor
                height="560px"
                language="html"
                theme="vs-dark"
                value={content}
                onChange={(v: string | undefined) => setContent(v ?? "")}
                options={{
                  minimap: { enabled: false },
                  lineNumbers: "on",
                  wordWrap: "on",
                  scrollBeyondLastLine: false,
                  fontSize: 13,
                  tabSize: 2,
                  folding: true,
                  formatOnPaste: true,
                }}
              />
            </div>
          ) : activeTab === "edit" ? (
            <div
              ref={editableRef}
              contentEditable
              suppressContentEditableWarning
              onInput={syncEditableContent}
              onBlur={syncEditableContent}
              className="cms-editable w-full rounded-xl border border-slate-200 bg-white overflow-y-auto p-6 focus:outline-none focus:ring-2 focus:ring-teal-400"
              style={{ height: 560, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", fontSize: 15, color: "#171527" }}
            />
          ) : (
            <iframe
              srcDoc={previewDoc(content)}
              className="w-full rounded-xl border border-slate-200 bg-white"
              style={{ height: 560 }}
              title="Page preview"
            />
          )}

          <style jsx global>{`
            .cms-editable h1 { font-size: 2rem; font-weight: 900; margin: 0 0 8px; }
            .cms-editable h2 { font-size: 1.25rem; font-weight: 700; margin: 32px 0 12px; }
            .cms-editable h3 { font-size: 1rem; font-weight: 700; margin: 0 0 8px; }
            .cms-editable p { line-height: 1.7; margin: 0 0 16px; }
            .cms-editable a { color: #171527; }
            .cms-editable ul, .cms-editable ol { padding-left: 20px; }
            .cms-editable li { margin-bottom: 6px; font-size: 14px; line-height: 1.6; }
            .cms-editable section { overflow: hidden; }
          `}</style>

          <p className="text-[10px] text-slate-400 mt-2">
            {activeTab === "edit"
              ? "Click directly into the text to edit it — layout, colors, and structure stay exactly as designed. Switch to HTML for structural changes."
              : "HTML editor — use inline styles or Tailwind classes (rendered on the marketing site). Preview shows an approximation."}
          </p>
        </div>

        <div className="flex justify-end pt-2">
          <button onClick={save} disabled={saving || !title.trim() || !slug.trim()} className="btn-primary !py-2 !px-6 !text-sm">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Page
          </button>
        </div>
      </div>
      )}
    </div>
  );
}
