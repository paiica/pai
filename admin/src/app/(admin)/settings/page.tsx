"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import toast from "react-hot-toast";
import { Save, Loader2, Settings, Globe, ImageIcon, Bot, Key, Zap, CheckCircle2, XCircle, Eye, EyeOff } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api, ApiError } from "@/lib/api";

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r) => r.data);
}

// ── AI config constants ────────────────────────────────────────────────────────

type Provider = "openai" | "groq" | "gemini";

const PROVIDERS: { value: Provider; label: string; color: string; desc: string; keyLabel: string; keyPlaceholder: string }[] = [
  {
    value: "openai",
    label: "OpenAI",
    color: "bg-emerald-600",
    desc: "GPT-4o, GPT-4o Mini — best quality",
    keyLabel: "OpenAI API Key",
    keyPlaceholder: "sk-...",
  },
  {
    value: "groq",
    label: "Groq",
    color: "bg-orange-500",
    desc: "Llama, Mixtral — ultra-fast inference",
    keyLabel: "Groq API Key",
    keyPlaceholder: "gsk_...",
  },
  {
    value: "gemini",
    label: "Gemini",
    color: "bg-blue-600",
    desc: "Gemini 2.0 Flash, Pro — Google AI",
    keyLabel: "Gemini API Key",
    keyPlaceholder: "AIza...",
  },
];

const PROVIDER_MODELS: Record<Provider, { value: string; label: string }[]> = {
  openai: [
    { value: "gpt-4o",      label: "GPT-4o (recommended)" },
    { value: "gpt-4o-mini", label: "GPT-4o Mini (faster, cheaper)" },
    { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
  ],
  groq: [
    { value: "llama-3.3-70b-versatile", label: "Llama 3.3 70B Versatile (recommended)" },
    { value: "llama-3.1-70b-versatile", label: "Llama 3.1 70B Versatile" },
    { value: "gemma2-9b-it",            label: "Gemma 2 9B" },
    { value: "mixtral-8x7b-32768",      label: "Mixtral 8x7B" },
  ],
  gemini: [
    { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash (recommended)" },
    { value: "gemini-1.5-pro",   label: "Gemini 1.5 Pro" },
    { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash (faster)" },
  ],
};

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

  // ── AI settings ──────────────────────────────────────────────────────────────

  const { data: aiData, mutate: mutateAi } = useSWR(
    accessToken ? ["/ai/settings", accessToken] : null,
    ([url, t]) => fetcher(url, t)
  );

  const [aiProvider,    setAiProvider]    = useState<Provider>("openai");
  const [aiModel,       setAiModel]       = useState("");
  const [openaiKey,     setOpenaiKey]     = useState("");
  const [groqKey,       setGroqKey]       = useState("");
  const [geminiKey,     setGeminiKey]     = useState("");
  const [showKey,       setShowKey]       = useState<Record<Provider, boolean>>({ openai: false, groq: false, gemini: false });
  const [savingAi,      setSavingAi]      = useState(false);
  const [testingAi,     setTestingAi]     = useState(false);
  const [testResult,    setTestResult]    = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    if (aiData) {
      const p = (aiData.provider || "openai") as Provider;
      setAiProvider(p);
      setAiModel(aiData.model || PROVIDER_MODELS[p]?.[0]?.value || "");
    }
  }, [aiData]);

  // Reset model to provider default when provider changes
  function handleProviderChange(p: Provider) {
    setAiProvider(p);
    setAiModel(PROVIDER_MODELS[p]?.[0]?.value || "");
    setTestResult(null);
  }

  async function saveAiSettings(e: React.FormEvent) {
    e.preventDefault();
    setSavingAi(true);
    setTestResult(null);
    try {
      const body: Record<string, string> = { provider: aiProvider, model: aiModel };
      if (openaiKey.trim()) body.openai_key = openaiKey.trim();
      if (groqKey.trim())   body.groq_key   = groqKey.trim();
      if (geminiKey.trim()) body.gemini_key  = geminiKey.trim();
      const res = await api.patch<any>("/ai/settings", body, accessToken!);
      await mutateAi();
      // Clear key inputs after save (keys are write-only)
      setOpenaiKey(""); setGroqKey(""); setGeminiKey("");
      toast.success("AI settings saved");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save AI settings");
    } finally {
      setSavingAi(false);
    }
  }

  async function testAiConnection() {
    setTestingAi(true);
    setTestResult(null);
    try {
      const res = await api.post<any>("/ai/test", {}, accessToken!);
      const d = res.data ?? res;
      setTestResult({ ok: true, msg: `Connected — ${d.provider} / ${d.model}` });
    } catch (err: any) {
      setTestResult({ ok: false, msg: err.message ?? "Connection failed" });
    } finally {
      setTestingAi(false);
    }
  }

  const activeProviderDef = PROVIDERS.find((p) => p.value === aiProvider)!;
  const keyIsSet = aiData ? (
    aiProvider === "openai" ? aiData.openai_key_set :
    aiProvider === "groq"   ? aiData.groq_key_set :
                              aiData.gemini_key_set
  ) : false;

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-10">

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
                  placeholder="Professional AI Institute" className="input-base" />
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

      {/* ── AI Configuration ───────────────────────────────────────────────────── */}
      <div>
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Bot size={20} className="text-navy-600" />
            <h1 className="text-2xl font-display font-black text-navy-900">AI Configuration</h1>
          </div>
          <p className="text-slate-500 text-sm">
            Choose the AI provider and model used for automatic exam generation and question improvement.
          </p>
        </div>

        <form onSubmit={saveAiSettings} className="space-y-6">

          {/* Provider selector */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-5">
              <Zap size={16} className="text-navy-600" />
              <h2 className="font-semibold text-navy-900">AI Provider</h2>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {PROVIDERS.map((p) => {
                const selected = aiProvider === p.value;
                return (
                  <button key={p.value} type="button" onClick={() => handleProviderChange(p.value)}
                    className={`flex flex-col items-start gap-2.5 p-4 rounded-xl border-2 transition-all text-left ${selected ? "border-navy-700 bg-navy-50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold ${p.color}`}>
                      {p.label.slice(0, 2)}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${selected ? "text-navy-900" : "text-slate-700"}`}>{p.label}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">{p.desc}</p>
                    </div>
                    {selected && (
                      <span className="ml-auto mt-auto w-4 h-4 rounded-full bg-navy-700 flex items-center justify-center self-end">
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 12 12">
                          <path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                        </svg>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Model selector */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Bot size={16} className="text-navy-600" />
              <h2 className="font-semibold text-navy-900">Model</h2>
            </div>
            <div className="space-y-2">
              {PROVIDER_MODELS[aiProvider].map((m) => (
                <label key={m.value}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${aiModel === m.value ? "border-navy-700 bg-navy-50" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                  <input type="radio" name="aiModel" value={m.value} checked={aiModel === m.value}
                    onChange={() => setAiModel(m.value)} className="accent-navy-700 shrink-0" />
                  <div>
                    <p className={`text-sm font-medium ${aiModel === m.value ? "text-navy-900" : "text-slate-700"}`}>{m.label}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* API key input */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Key size={16} className="text-navy-600" />
              <h2 className="font-semibold text-navy-900">{activeProviderDef.keyLabel}</h2>
            </div>

            {keyIsSet && (
              <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-green-50 rounded-xl border border-green-200">
                <CheckCircle2 size={14} className="text-green-600 shrink-0" />
                <span className="text-xs text-green-700 font-medium">API key saved — enter a new one below to replace it</span>
              </div>
            )}

            <div className="relative">
              <input
                type={showKey[aiProvider] ? "text" : "password"}
                value={aiProvider === "openai" ? openaiKey : aiProvider === "groq" ? groqKey : geminiKey}
                onChange={(e) => {
                  if (aiProvider === "openai") setOpenaiKey(e.target.value);
                  else if (aiProvider === "groq") setGroqKey(e.target.value);
                  else setGeminiKey(e.target.value);
                }}
                placeholder={keyIsSet ? "Enter new key to replace…" : activeProviderDef.keyPlaceholder}
                className="input-base pr-10"
              />
              <button type="button"
                onClick={() => setShowKey((prev) => ({ ...prev, [aiProvider]: !prev[aiProvider] }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                {showKey[aiProvider] ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {aiProvider === "openai" && <>Get your key from <span className="font-mono">platform.openai.com/api-keys</span></>}
              {aiProvider === "groq"   && <>Get your key from <span className="font-mono">console.groq.com/keys</span></>}
              {aiProvider === "gemini" && <>Get your key from <span className="font-mono">aistudio.google.com/apikey</span></>}
            </p>
          </div>

          {/* Test connection */}
          {testResult && (
            <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm ${testResult.ok ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
              {testResult.ok ? <CheckCircle2 size={15} className="shrink-0" /> : <XCircle size={15} className="shrink-0" />}
              {testResult.msg}
            </div>
          )}

          <div className="flex gap-3">
            <button type="submit" disabled={savingAi} className="btn-primary flex-1 justify-center disabled:opacity-60">
              {savingAi ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              Save AI Settings
            </button>
            <button type="button" onClick={testAiConnection} disabled={testingAi}
              className="btn-outline flex items-center gap-2 px-5 disabled:opacity-60">
              {testingAi ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />}
              Test
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}
