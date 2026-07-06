"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import toast from "react-hot-toast";
import { Save, Loader2, Settings, Globe, ImageIcon } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api, ApiError } from "@/lib/api";

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r) => r.data);
}

// ── Page ────────────────────────────────────────────────────────────────────────

export default function SiteSettingsPage() {
  const { accessToken, refreshTokens } = useAuthStore();

  // ── Site settings ────────────────────────────────────────────────────────────

  const { data, mutate } = useSWR(
    accessToken ? ["/site-settings", accessToken] : null,
    ([url, t]) => fetcher(url, t)
  );

  const [siteTitle,  setSiteTitle]  = useState("");
  const [siteDesc,   setSiteDesc]   = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [logoUrl,    setLogoUrl]    = useState("");
  const [logoHeight, setLogoHeight] = useState("48");
  const [saving,     setSaving]     = useState(false);

  useEffect(() => {
    if (data) {
      setSiteTitle(data.site_title       ?? "");
      setSiteDesc(data.site_description  ?? "");
      setFaviconUrl(data.favicon_url     ?? "");
      setLogoUrl(data.site_logo_url      ?? "");
      setLogoHeight(data.logo_height     ?? "48");
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
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Favicon URL</label>
                <input type="url" value={faviconUrl} onChange={(e) => setFaviconUrl(e.target.value)}
                  placeholder="https://yourdomain.com/favicon.ico" className="input-base" />
                <p className="text-xs text-slate-400 mt-1.5">ICO, PNG, or SVG. 32×32 px recommended.</p>
                {faviconUrl && (
                  <div className="mt-3 flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <img src={faviconUrl} alt="Favicon" className="w-8 h-8 object-contain rounded"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    <span className="text-xs text-slate-500 truncate">{faviconUrl}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Site Logo URL</label>
                <input type="url" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://yourdomain.com/logo.png" className="input-base" />
                <p className="text-xs text-slate-400 mt-1.5">PNG or SVG with transparent background.</p>
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

          <button type="submit" disabled={saving} className="btn-primary w-full justify-center disabled:opacity-60">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Save Settings
          </button>
        </form>
      </div>

    </div>
  );
}
