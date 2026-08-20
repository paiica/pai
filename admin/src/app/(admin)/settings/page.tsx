"use client";

import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import toast from "react-hot-toast";
import { Save, Loader2, Settings, Globe, ImageIcon, Upload, Magnet, Languages as LanguagesIcon, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api, ApiError } from "@/lib/api";

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r) => r.data);
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

// Uploads the file to storage and returns its public URL — same
// presign-free endpoint the block builder uses for content images, reused
// here so a branding asset can be dropped in as a file instead of only
// ever pasting a URL to somewhere else it's already hosted.
async function uploadImage(file: File, token: string, refreshTokens: () => Promise<boolean>): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  let activeToken = token;
  let res = await fetch(`${API_BASE}/uploads/content-image?purpose=branding`, {
    method: "POST",
    headers: { Authorization: `Bearer ${activeToken}` },
    body: formData,
  });
  if (res.status === 401) {
    const refreshed = await refreshTokens();
    if (!refreshed) throw new Error("Session expired — please sign in again");
    activeToken = useAuthStore.getState().accessToken!;
    res = await fetch(`${API_BASE}/uploads/content-image?purpose=branding`, {
      method: "POST",
      headers: { Authorization: `Bearer ${activeToken}` },
      body: formData,
    });
  }
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.message ?? "Upload failed");
  const url = json?.data?.url ?? json?.url;
  if (!url) throw new Error("Upload succeeded but no URL was returned");
  return url;
}

// ── Languages ─────────────────────────────────────────────────────────────────

type Language = {
  code: string; name: string; native_name: string; is_rtl: boolean; enabled: boolean;
};

function LanguagesSection() {
  const { accessToken, refreshTokens } = useAuthStore();
  const { data: languages, mutate: mutateLanguages } = useSWR<Language[]>(
    accessToken ? ["/languages/all", accessToken] : null,
    ([url, t]: [string, string]) => fetcher(url, t)
  );
  const { data: available, mutate: mutateAvailable } = useSWR<Language[]>(
    accessToken ? ["/languages/available", accessToken] : null,
    ([url, t]: [string, string]) => fetcher(url, t)
  );

  const [addOpen, setAddOpen] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const addRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (addRef.current && !addRef.current.contains(e.target as Node)) setAddOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function callWithRefresh<T>(fn: (token: string) => Promise<T>): Promise<T> {
    let token = accessToken!;
    try {
      return await fn(token);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        const ok = await refreshTokens();
        if (!ok) throw new Error("Session expired — please sign in again");
        token = useAuthStore.getState().accessToken!;
        return await fn(token);
      }
      throw err;
    }
  }

  async function handleAdd(lang: Language) {
    setAdding(lang.code);
    setAddOpen(false);
    try {
      await callWithRefresh((token) => api.post<any>("/languages", { code: lang.code }, token));
      toast.success(
        `${lang.name} added — translating existing content in the background. This can take several minutes for large catalogs; the content fills in as each item finishes.`,
        { duration: 6000 }
      );
      await Promise.all([mutateLanguages(), mutateAvailable()]);
    } catch (err: any) {
      toast.error(err.message ?? `Failed to add ${lang.name}`);
    } finally {
      setAdding(null);
    }
  }

  async function handleToggle(lang: Language) {
    setToggling(lang.code);
    try {
      await callWithRefresh((token) => api.patch<any>(`/languages/${lang.code}`, { enabled: !lang.enabled }, token));
      await mutateLanguages();
    } catch (err: any) {
      toast.error(err.message ?? `Failed to update ${lang.name}`);
    } finally {
      setToggling(null);
    }
  }

  // Swaps a language with its neighbor and sends the whole resulting order —
  // this is what drives display order everywhere: the public /languages
  // endpoint returns languages sort_order-ascending, and both the
  // marketing-site and student-portal language switchers render in that
  // same order (filtered down to whichever ones are enabled).
  async function handleMove(index: number, direction: -1 | 1) {
    if (!languages) return;
    const target = index + direction;
    if (target < 0 || target >= languages.length) return;
    const reordered = [...languages];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setReordering(true);
    try {
      await mutateLanguages(reordered, false);
      await callWithRefresh((token) => api.patch<any>("/languages/reorder", { codes: reordered.map((l) => l.code) }, token));
      await mutateLanguages();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to reorder languages");
      await mutateLanguages();
    } finally {
      setReordering(false);
    }
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-1">
        <LanguagesIcon size={16} className="text-navy-600" />
        <h2 className="font-semibold text-navy-900">Languages</h2>
      </div>
      <p className="text-xs text-slate-400 mb-5">
        Pages, courses, certifications, navigation, and footer content are automatically translated by AI into every language enabled here — both existing content when a language is first added, and new/edited content going forward. Use the arrows to set the order languages appear in the site's language switcher.
      </p>

      <div className="space-y-2 mb-4">
        {(languages ?? []).map((lang, index) => (
          <div key={lang.code} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/60">
            <div className="flex flex-col -my-1">
              <button
                type="button"
                onClick={() => handleMove(index, -1)}
                disabled={reordering || index === 0}
                aria-label={`Move ${lang.name} up`}
                className="text-slate-400 hover:text-navy-700 disabled:opacity-25 disabled:hover:text-slate-400 transition-colors"
              >
                <ChevronUp size={14} />
              </button>
              <button
                type="button"
                onClick={() => handleMove(index, 1)}
                disabled={reordering || index === languages!.length - 1}
                aria-label={`Move ${lang.name} down`}
                className="text-slate-400 hover:text-navy-700 disabled:opacity-25 disabled:hover:text-slate-400 transition-colors"
              >
                <ChevronDown size={14} />
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold text-slate-800">{lang.name}</span>
              <span className="text-xs text-slate-400 ms-2">{lang.native_name}</span>
              {lang.is_rtl && <span className="ms-2 text-[10px] font-bold text-navy-500 bg-navy-50 px-1.5 py-0.5 rounded">RTL</span>}
              {lang.code === "en" && <span className="ms-2 text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">SOURCE</span>}
            </div>
            {lang.code === "en" ? (
              <span className="text-xs text-slate-400">Always enabled</span>
            ) : (
              <button
                type="button"
                onClick={() => handleToggle(lang)}
                disabled={toggling === lang.code}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-50 ${
                  lang.enabled ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-500"
                }`}
              >
                {toggling === lang.code ? <Loader2 size={12} className="animate-spin" /> : lang.enabled ? "Enabled" : "Disabled"}
              </button>
            )}
          </div>
        ))}
        {!languages && <p className="text-xs text-slate-400">Loading…</p>}
      </div>

      <div className="relative" ref={addRef}>
        <button
          type="button"
          onClick={() => setAddOpen((v) => !v)}
          disabled={!available || available.length === 0}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:border-navy-300 hover:text-navy-700 transition-colors disabled:opacity-50"
        >
          <Plus size={13} /> Add a language <ChevronDown size={12} className={addOpen ? "rotate-180 transition-transform" : "transition-transform"} />
        </button>
        {addOpen && available && available.length > 0 && (
          <div className="absolute start-0 top-full mt-1.5 w-64 max-h-72 overflow-y-auto bg-white rounded-xl shadow-xl border border-slate-200 z-10 py-1">
            {available.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleAdd(lang)}
                disabled={adding === lang.code}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-start disabled:opacity-50"
              >
                <span>{lang.name} <span className="text-xs text-slate-400">{lang.native_name}</span></span>
                {adding === lang.code && <Loader2 size={12} className="animate-spin flex-shrink-0" />}
              </button>
            ))}
          </div>
        )}
        {available && available.length === 0 && (
          <p className="text-xs text-slate-400 mt-2">Every supported language has been added.</p>
        )}
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────────

export default function SiteSettingsPage() {
  const { accessToken, refreshTokens } = useAuthStore();

  // ── Site settings ────────────────────────────────────────────────────────────

  const { data, mutate } = useSWR(
    accessToken ? ["/site-settings", accessToken] : null,
    ([url, t]: [string, string]) => fetcher(url, t)
  );
  // Pages an admin can choose to show the lead-capture popup on — Homepage
  // and Blog are fixed built-in surfaces, every CMS Page is fetched so newly
  // created pages (e.g. the resource-hub pages) are selectable too, without
  // any code change per page.
  const { data: cmsPages } = useSWR(
    accessToken ? ["/pages", accessToken] : null,
    ([url, t]: [string, string]) => fetcher(url, t)
  );

  const [siteTitle,  setSiteTitle]  = useState("");
  const [siteDesc,   setSiteDesc]   = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [logoUrl,    setLogoUrl]    = useState("");
  const [logoHeight, setLogoHeight] = useState("48");
  const [leadPopupPages, setLeadPopupPages] = useState<string[]>([]);
  const [saving,     setSaving]     = useState(false);

  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [uploadingLogo,    setUploadingLogo]    = useState(false);
  const faviconFileRef = useRef<HTMLInputElement>(null);
  const logoFileRef    = useRef<HTMLInputElement>(null);

  async function handleFaviconFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !accessToken) return;
    setUploadingFavicon(true);
    try {
      const url = await uploadImage(file, accessToken, refreshTokens);
      setFaviconUrl(url);
      toast.success("Favicon uploaded — click Save to publish it");
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setUploadingFavicon(false);
    }
  }

  async function handleLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !accessToken) return;
    setUploadingLogo(true);
    try {
      const url = await uploadImage(file, accessToken, refreshTokens);
      setLogoUrl(url);
      toast.success("Logo uploaded — click Save to publish it");
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setUploadingLogo(false);
    }
  }

  useEffect(() => {
    if (data) {
      setSiteTitle(data.site_title       ?? "");
      setSiteDesc(data.site_description  ?? "");
      setFaviconUrl(data.favicon_url     ?? "");
      setLogoUrl(data.site_logo_url      ?? "");
      setLogoHeight(data.logo_height     ?? "48");
      try { setLeadPopupPages(data.lead_popup_pages ? JSON.parse(data.lead_popup_pages) : []); }
      catch { setLeadPopupPages([]); }
    }
  }, [data]);

  async function saveSiteSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const body = {
      site_title:       siteTitle,
      site_description: siteDesc,
      favicon_url:      faviconUrl,
      site_logo_url:    logoUrl,
      logo_height:      String(parseInt(logoHeight, 10) || 48),
      lead_popup_pages: JSON.stringify(leadPopupPages),
    };
    try {
      let token = accessToken!;
      try {
        await api.patch<any>("/site-settings", body, token);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          const ok = await refreshTokens();
          if (!ok) { toast.error("Session expired — please sign in again"); return; }
          token = useAuthStore.getState().accessToken!;
          await api.patch<any>("/site-settings", body, token);
        } else {
          throw err;
        }
      }
      await mutate();
      toast.success("Settings saved");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="p-8 max-w-2xl mx-auto">

      {/* ── Site Settings ──────────────────────────────────────────────────────── */}
      <div>
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Settings size={20} className="text-navy-600" />
            <h1 className="text-2xl font-display font-black text-navy-900">Site Settings</h1>
          </div>
          <p className="text-slate-500 text-sm">Manage global branding and metadata for the marketing site.</p>
        </div>

        <form onSubmit={saveSiteSettings} className="space-y-6">
          {/* Branding */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-5">
              <ImageIcon size={16} className="text-navy-600" />
              <h2 className="font-semibold text-navy-900">Branding</h2>
            </div>
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Favicon</label>
                <div className="flex items-center gap-2">
                  <input type="url" value={faviconUrl} onChange={(e) => setFaviconUrl(e.target.value)}
                    placeholder="https://yourdomain.com/favicon.ico" className="input-base flex-1" />
                  <input ref={faviconFileRef} type="file" accept="image/*,.ico" className="hidden" onChange={handleFaviconFile} />
                  <button type="button" onClick={() => faviconFileRef.current?.click()} disabled={uploadingFavicon}
                    className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:border-slate-300 hover:text-navy-700 transition-colors disabled:opacity-50">
                    {uploadingFavicon ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                    Upload
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-1.5">Paste a URL or upload a file. ICO, PNG, or SVG. 32×32 px recommended.</p>
                {faviconUrl && (
                  <div className="mt-3 flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <img src={faviconUrl} alt="Favicon" className="w-8 h-8 object-contain rounded"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    <span className="text-xs text-slate-500 truncate">{faviconUrl}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Site Logo</label>
                <div className="flex items-center gap-2">
                  <input type="url" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://yourdomain.com/logo.png" className="input-base flex-1" />
                  <input ref={logoFileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoFile} />
                  <button type="button" onClick={() => logoFileRef.current?.click()} disabled={uploadingLogo}
                    className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:border-slate-300 hover:text-navy-700 transition-colors disabled:opacity-50">
                    {uploadingLogo ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                    Upload
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-1.5">Paste a URL or upload a file. PNG or SVG with transparent background.</p>
                {logoUrl && (
                  <div className="mt-3 flex items-center justify-center p-4 bg-slate-50 rounded-xl border border-slate-100" style={{ minHeight: `${parseInt(logoHeight) + 32}px` }}>
                    <img src={logoUrl} alt="Logo" style={{ height: `${logoHeight}px` }} className="w-auto object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Logo Size</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {[{ label: "XS", value: "28" }, { label: "S", value: "36" }, { label: "M", value: "48" }, { label: "L", value: "60" }, { label: "XL", value: "72" }].map(({ label, value }) => (
                    <button key={value} type="button" onClick={() => setLogoHeight(value)}
                      className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${logoHeight === value ? "border-navy-700 bg-navy-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}>
                      {label}
                    </button>
                  ))}
                  <div className="flex items-center gap-1.5 ml-2">
                    <span className="text-xs text-slate-400">or</span>
                    <input type="number" min={16} max={120} value={logoHeight} onChange={(e) => setLogoHeight(e.target.value)}
                      className="input-base !w-20 !py-1.5 text-center text-xs" />
                    <span className="text-xs text-slate-400">px</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* General */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-5">
              <Globe size={16} className="text-navy-600" />
              <h2 className="font-semibold text-navy-900">General</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Site Title</label>
                <input type="text" value={siteTitle} onChange={(e) => setSiteTitle(e.target.value)}
                  placeholder="Professional Artificial Intelligence Institute" className="input-base" />
                <p className="text-xs text-slate-400 mt-1.5">Used in browser tab titles and search results.</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Site Description</label>
                <textarea value={siteDesc} onChange={(e) => setSiteDesc(e.target.value)}
                  placeholder="The leading AI certification body..." className="input-base h-24 resize-none" />
                <p className="text-xs text-slate-400 mt-1.5">Meta description shown in search results (160 chars recommended).</p>
              </div>
            </div>
          </div>

          {/* Lead Capture */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-1.5">
              <Magnet size={16} className="text-navy-600" />
              <h2 className="font-semibold text-navy-900">Lead Capture</h2>
            </div>
            <p className="text-xs text-slate-400 mb-5">
              Choose which pages show the subscribe popup. It appears 5 seconds after a visitor lands, once per visitor.
            </p>
            <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
              {([{ path: "/", label: "Homepage" }, { path: "/blog", label: "Blog (every post)" }] as { path: string; label: string }[])
                .concat((cmsPages ?? []).map((p: any) => ({ path: `/${p.slug}`, label: p.title || p.slug })))
                .map(({ path, label }) => (
                  <label key={path} className="flex items-center gap-3 cursor-pointer py-1.5 px-2 rounded-lg hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={leadPopupPages.includes(path)}
                      onChange={(e) => setLeadPopupPages((prev) => e.target.checked ? [...prev, path] : prev.filter((p) => p !== path))}
                      className="w-4 h-4 rounded border-slate-300 text-navy-700 accent-navy-700 cursor-pointer flex-shrink-0"
                    />
                    <span className="text-sm font-medium text-slate-700 truncate">{label}</span>
                    <span className="text-xs text-slate-400 font-mono ml-auto flex-shrink-0">{path}</span>
                  </label>
                ))}
            </div>
            <p className="text-xs text-slate-400 mt-4">Captured emails show up under the Leads tab.</p>
          </div>

          <button type="submit" disabled={saving} className="btn-primary w-full justify-center disabled:opacity-60">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Save Settings
          </button>
        </form>

        <div className="mt-6">
          <LanguagesSection />
        </div>
      </div>

    </div>
  );
}
