"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import toast from "react-hot-toast";
import { Save, Loader2, Mail, HardDrive, Eye, EyeOff, CheckCircle2, XCircle, Key, Database, ExternalLink, CreditCard, BarChart3, Bot, Zap } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r: any) => r.data ?? r);
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

type ConnStatus = "connected" | "attention" | "disconnected" | "loading";

const STATUS_STYLES: Record<ConnStatus, { dot: string; pill: string; label: string }> = {
  connected:    { dot: "bg-emerald-500",             pill: "text-emerald-700 bg-emerald-50 border-emerald-200", label: "Connected" },
  attention:    { dot: "bg-amber-500",               pill: "text-amber-700 bg-amber-50 border-amber-200",       label: "Needs setup" },
  disconnected: { dot: "bg-slate-300",               pill: "text-slate-500 bg-slate-50 border-slate-200",       label: "Not connected" },
  loading:      { dot: "bg-slate-200 animate-pulse", pill: "text-slate-400 bg-slate-50 border-slate-100",       label: "Checking…" },
};

function StatusPill({ status }: { status: ConnStatus }) {
  const cfg = STATUS_STYLES[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border shrink-0 ${cfg.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function SavedChip() {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
      <CheckCircle2 size={11} /> Saved
    </span>
  );
}

function SectionHeader({
  id, icon: Icon, tile, title, blurb, status,
}: { id: string; icon: any; tile: string; title: string; blurb: string; status: ConnStatus }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-9 h-9 rounded-xl ${tile} flex items-center justify-center text-white shrink-0`}>
          <Icon size={16} />
        </div>
        <div className="min-w-0">
          <h2 className="font-semibold text-navy-900 leading-tight">{title}</h2>
          <p className="text-xs text-slate-400 mt-0.5">{blurb}</p>
        </div>
      </div>
      <StatusPill status={status} />
    </div>
  );
}

type SectionId = "database" | "email" | "storage" | "payments" | "analytics" | "ai";

export default function ApiSettingsPage() {
  const { accessToken } = useAuthStore();
  const [activeSection, setActiveSection] = useState<SectionId>("database");

  const { data, mutate } = useSWR(
    accessToken ? ["/site-settings/api-settings", accessToken] : null,
    ([url, t]) => fetcher(url, t)
  );

  const { data: payData, mutate: mutatePayment } = useSWR(
    accessToken ? ["/site-settings/payment-settings", accessToken] : null,
    ([url, t]) => fetcher(url, t)
  );

  const { data: aiData, mutate: mutateAi } = useSWR(
    accessToken ? ["/ai/settings", accessToken] : null,
    ([url, t]) => fetcher(url, t)
  );

  // Email
  const [resendKey,     setResendKey]     = useState("");
  const [emailFrom,     setEmailFrom]     = useState("");
  const [emailFromName, setEmailFromName] = useState("");
  const [showResend,    setShowResend]    = useState(false);
  const [savingEmail,   setSavingEmail]   = useState(false);
  const [testingEmail,  setTestingEmail]  = useState(false);

  // Supabase
  const [supabaseUrl,     setSupabaseUrl]     = useState("");
  const [supabaseAnonKey, setSupabaseAnonKey] = useState("");
  const [savingSupabase,  setSavingSupabase]  = useState(false);

  // Stripe
  const [stripeMode,       setStripeMode]       = useState<"test" | "live">("test");
  const [stripePubKey,     setStripePubKey]      = useState("");
  const [stripeSecretKey,  setStripeSecretKey]   = useState("");
  const [stripeWebhook,    setStripeWebhook]     = useState("");
  const [showStripeSecret, setShowStripeSecret]  = useState(false);
  const [showStripeWebhook,setShowStripeWebhook] = useState(false);
  const [savingStripe,     setSavingStripe]      = useState(false);

  // Storage
  const [s3Endpoint,  setS3Endpoint]  = useState("");
  const [s3Region,    setS3Region]    = useState("us-east-1");
  const [s3Bucket,    setS3Bucket]    = useState("");
  const [s3AccessKey, setS3AccessKey] = useState("");
  const [s3SecretKey, setS3SecretKey] = useState("");
  const [showS3Secret, setShowS3Secret] = useState(false);
  const [savingS3,    setSavingS3]    = useState(false);

  // Analytics — Google Analytics
  const [gaId,      setGaId]      = useState("");
  const [savingGa,  setSavingGa]  = useState(false);

  // AI — Provider
  const [aiProvider, setAiProvider] = useState<Provider>("openai");
  const [aiModel,    setAiModel]    = useState("");
  const [openaiKey,  setOpenaiKey]  = useState("");
  const [groqKey,    setGroqKey]    = useState("");
  const [geminiKey,  setGeminiKey]  = useState("");
  const [showAiKey,  setShowAiKey]  = useState<Record<Provider, boolean>>({ openai: false, groq: false, gemini: false });
  const [savingAi,   setSavingAi]   = useState(false);
  const [testingAi,  setTestingAi]  = useState(false);
  const [aiTestResult, setAiTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    if (data) {
      setEmailFrom(data.email_from             ?? "");
      setEmailFromName(data.email_from_name    ?? "");
      setSupabaseUrl(data.supabase_project_url ?? "");
      setSupabaseAnonKey(data.supabase_anon_key ?? "");
      setS3Endpoint(data.s3_endpoint           ?? "");
      setS3Region(data.s3_region               ?? "us-east-1");
      setS3Bucket(data.s3_bucket_name          ?? "");
      setGaId(data.google_analytics_id         ?? "");
    }
  }, [data]);

  useEffect(() => {
    if (payData) {
      setStripeMode((payData.stripe_mode as "test" | "live") ?? "test");
      setStripePubKey(payData.stripe_publishable_key ?? "");
    }
  }, [payData]);

  useEffect(() => {
    if (aiData) {
      const p = (aiData.provider || "openai") as Provider;
      setAiProvider(p);
      setAiModel(aiData.model || PROVIDER_MODELS[p]?.[0]?.value || "");
    }
  }, [aiData]);

  function handleProviderChange(p: Provider) {
    setAiProvider(p);
    setAiModel(PROVIDER_MODELS[p]?.[0]?.value || "");
    setAiTestResult(null);
  }

  // ── Connection status, derived from persisted data (not in-progress edits) ────
  const dbStatus: ConnStatus = !data ? "loading"
    : data.supabase_project_url && data.supabase_anon_key ? "connected"
    : data.supabase_project_url || data.supabase_anon_key ? "attention"
    : "disconnected";

  const emailStatus: ConnStatus = !data ? "loading"
    : data.resend_key_set && data.email_from ? "connected"
    : data.resend_key_set || data.email_from ? "attention"
    : "disconnected";

  const storageStatus: ConnStatus = !data ? "loading"
    : data.s3_access_key_id_set && data.s3_secret_access_key_set && data.s3_bucket_name ? "connected"
    : data.s3_access_key_id_set || data.s3_secret_access_key_set ? "attention"
    : "disconnected";

  const paymentsStatus: ConnStatus = !payData ? "loading"
    : payData.stripe_secret_key_set && (payData.stripe_mode !== "live" || payData.stripe_webhook_secret_set) ? "connected"
    : payData.stripe_secret_key_set ? "attention"
    : "disconnected";

  const gaStatus: ConnStatus = !data ? "loading"
    : data.google_analytics_id ? "connected"
    : "disconnected";

  const aiKeyIsSet = aiData ? (
    aiProvider === "openai" ? aiData.openai_key_set :
    aiProvider === "groq"   ? aiData.groq_key_set :
                              aiData.gemini_key_set
  ) : false;

  const aiStatus: ConnStatus = !aiData ? "loading"
    : aiKeyIsSet ? "connected"
    : "disconnected";

  const STATUS_STRIP = [
    { id: "database",  label: "Database",  icon: Database,   tile: "bg-navy-800",   status: dbStatus },
    { id: "email",     label: "Email",     icon: Mail,       tile: "bg-gold-600",   status: emailStatus },
    { id: "storage",   label: "Storage",   icon: HardDrive,  tile: "bg-sky-600",    status: storageStatus },
    { id: "payments",  label: "Payments",  icon: CreditCard, tile: "bg-violet-600", status: paymentsStatus },
    { id: "analytics", label: "Analytics", icon: BarChart3,  tile: "bg-teal-600",   status: gaStatus },
    { id: "ai",        label: "AI",        icon: Bot,        tile: "bg-indigo-600", status: aiStatus },
  ] as const;

  const activeProviderDef = PROVIDERS.find((p) => p.value === aiProvider)!;

  async function sendTestEmail() {
    setTestingEmail(true);
    try {
      const r = await api.post<{ sent: boolean; reason?: string }>("/mail/test-send", {}, accessToken!);
      const result = (r as any).data ?? r;
      if (result.sent) toast.success("Test email sent — check your inbox");
      else toast.error(`Email not sent: ${result.reason ?? "unknown error"}`);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to send test email");
    } finally {
      setTestingEmail(false);
    }
  }

  async function saveEmail(e: React.FormEvent) {
    e.preventDefault();
    setSavingEmail(true);
    try {
      const body: Record<string, string> = {
        email_from:      emailFrom,
        email_from_name: emailFromName,
      };
      if (resendKey.trim()) body.resend_api_key = resendKey.trim();
      await api.patch("/site-settings", body, accessToken!);
      await mutate();
      setResendKey("");
      toast.success("Email settings saved");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save");
    } finally {
      setSavingEmail(false);
    }
  }

  async function saveStripe(e: React.FormEvent) {
    e.preventDefault();
    setSavingStripe(true);
    try {
      const body: Record<string, string> = {
        stripe_mode:            stripeMode,
        stripe_publishable_key: stripePubKey.trim(),
      };
      if (stripeSecretKey.trim()) body.stripe_secret_key     = stripeSecretKey.trim();
      if (stripeWebhook.trim())   body.stripe_webhook_secret = stripeWebhook.trim();
      await api.patch("/site-settings", body, accessToken!);
      await mutatePayment();
      setStripeSecretKey(""); setStripeWebhook("");
      toast.success("Stripe settings saved");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save");
    } finally {
      setSavingStripe(false);
    }
  }

  async function saveSupabase(e: React.FormEvent) {
    e.preventDefault();
    setSavingSupabase(true);
    try {
      await api.patch("/site-settings", {
        supabase_project_url: supabaseUrl.trim(),
        supabase_anon_key:    supabaseAnonKey.trim(),
      }, accessToken!);
      await mutate();
      toast.success("Supabase settings saved");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save");
    } finally {
      setSavingSupabase(false);
    }
  }

  async function saveS3(e: React.FormEvent) {
    e.preventDefault();
    setSavingS3(true);
    try {
      const body: Record<string, string> = {
        s3_endpoint:   s3Endpoint,
        s3_region:     s3Region,
        s3_bucket_name: s3Bucket,
      };
      if (s3AccessKey.trim()) body.s3_access_key_id     = s3AccessKey.trim();
      if (s3SecretKey.trim()) body.s3_secret_access_key = s3SecretKey.trim();
      await api.patch("/site-settings", body, accessToken!);
      await mutate();
      setS3AccessKey(""); setS3SecretKey("");
      toast.success("Storage settings saved");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save");
    } finally {
      setSavingS3(false);
    }
  }

  async function saveGa(e: React.FormEvent) {
    e.preventDefault();
    setSavingGa(true);
    try {
      await api.patch("/site-settings", {
        google_analytics_id: gaId.trim(),
      }, accessToken!);
      await mutate();
      toast.success("Analytics settings saved");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save");
    } finally {
      setSavingGa(false);
    }
  }

  async function saveAiSettings(e: React.FormEvent) {
    e.preventDefault();
    setSavingAi(true);
    setAiTestResult(null);
    try {
      const body: Record<string, string> = { provider: aiProvider, model: aiModel };
      if (openaiKey.trim()) body.openai_key = openaiKey.trim();
      if (groqKey.trim())   body.groq_key   = groqKey.trim();
      if (geminiKey.trim()) body.gemini_key = geminiKey.trim();
      await api.patch<any>("/ai/settings", body, accessToken!);
      await mutateAi();
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
    setAiTestResult(null);
    try {
      const res = await api.post<any>("/ai/test", {}, accessToken!);
      const d = res.data ?? res;
      setAiTestResult({ ok: true, msg: `Connected — ${d.provider} / ${d.model}` });
    } catch (err: any) {
      setAiTestResult({ ok: false, msg: err.message ?? "Connection failed" });
    } finally {
      setTestingAi(false);
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Key size={20} className="text-navy-600" />
          <h1 className="text-2xl font-display font-black text-navy-900 tracking-tight">API Integrations</h1>
        </div>
        <p className="text-slate-500 text-sm">Credentials for the external services this platform depends on.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">

        {/* Nav — status at a glance for every integration, doubles as the section switcher */}
        <nav className="w-full lg:w-72 shrink-0 lg:sticky lg:top-8">
          <div className="card overflow-x-auto lg:overflow-visible">
            <div className="flex lg:flex-col divide-x lg:divide-x-0 lg:divide-y divide-slate-100">
              {STATUS_STRIP.map((item) => {
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveSection(item.id)}
                    className={`flex items-center gap-3 px-4 py-3.5 text-left shrink-0 lg:shrink transition-colors border-l-2 ${
                      isActive ? "bg-navy-50 border-navy-700" : "border-transparent hover:bg-slate-50"
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl ${item.tile} flex items-center justify-center text-white shrink-0`}>
                      <item.icon size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold mb-1 whitespace-nowrap ${isActive ? "text-navy-900" : "text-slate-600"}`}>
                        {item.label}
                      </p>
                      <StatusPill status={item.status} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Content pane — only the selected integration's form */}
        <div className="flex-1 min-w-0 w-full space-y-4">

      {activeSection === "database" && (
      /* Database — Supabase */
      <form onSubmit={saveSupabase} className="space-y-4">
        <div className="card p-6">
          <SectionHeader
            id="database" icon={Database} tile="bg-navy-800"
            title="Database — Supabase" blurb="Backs every table in the platform." status={dbStatus}
          />
          <div className="flex items-center justify-end -mt-3 mb-4">
            <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-navy-600 hover:text-navy-800 font-medium">
              Supabase Dashboard <ExternalLink size={11} />
            </a>
          </div>

          {/* DATABASE_URL notice */}
          <div className="mb-5 flex items-start gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
            <span className="text-amber-500 text-base leading-none mt-0.5">⚠️</span>
            <p className="text-xs text-amber-800">
              <strong>DATABASE_URL</strong> (the Postgres connection string) cannot be stored here — it is required to connect to this database in the first place. Set it directly as an environment variable on <strong>Render</strong>.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Project URL</label>
              <input type="url" value={supabaseUrl} onChange={(e) => setSupabaseUrl(e.target.value)}
                placeholder="https://xxxxxxxxxxxx.supabase.co" className="input-base" />
              <p className="text-xs text-slate-400 mt-1.5">Found in Supabase → Project Settings → API.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Anon / Public Key
                <span className="ml-1.5 text-[10px] font-normal text-slate-400">(safe to expose)</span>
              </label>
              <input type="text" value={supabaseAnonKey} onChange={(e) => setSupabaseAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." className="input-base font-mono text-xs" />
              <p className="text-xs text-slate-400 mt-1.5">Used for client-side Supabase access (Storage, Realtime, etc.).</p>
            </div>
          </div>
        </div>
        <button type="submit" disabled={savingSupabase} className="btn-primary w-full justify-center disabled:opacity-60">
          {savingSupabase ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          Save Database Settings
        </button>
      </form>
      )}

      {activeSection === "email" && (
      /* Email — Resend */
      <form onSubmit={saveEmail} className="space-y-4">
        <div className="card p-6">
          <SectionHeader
            id="email" icon={Mail} tile="bg-gold-600"
            title="Email — Resend" blurb="Sends verification, password reset, and receipt emails." status={emailStatus}
          />
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">API Key</label>
                {data?.resend_key_set && <SavedChip />}
              </div>
              <div className="relative">
                <input
                  type={showResend ? "text" : "password"}
                  value={resendKey}
                  onChange={(e) => setResendKey(e.target.value)}
                  placeholder={data?.resend_key_set ? "Enter new key to replace…" : "re_..."}
                  className="input-base pr-10"
                />
                <button type="button" onClick={() => setShowResend(!showResend)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  {showResend ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-1.5">Get your key from <span className="font-mono">resend.com/api-keys</span></p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">From Address</label>
              <input type="email" value={emailFrom} onChange={(e) => setEmailFrom(e.target.value)}
                placeholder="noreply@paii.ca" className="input-base" />
              <p className="text-xs text-slate-400 mt-1.5">Must be on a domain verified in your Resend account.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">From Name</label>
              <input type="text" value={emailFromName} onChange={(e) => setEmailFromName(e.target.value)}
                placeholder="Professional Artificial Intelligence Institute" className="input-base" />
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button type="submit" disabled={savingEmail} className="btn-primary flex-1 justify-center disabled:opacity-60">
            {savingEmail ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Save Email Settings
          </button>
          <button type="button" onClick={sendTestEmail} disabled={testingEmail || !data?.resend_key_set}
            title={!data?.resend_key_set ? "Save a Resend API key first" : "Send a test email to your admin address"}
            className="btn-outline px-4 disabled:opacity-50">
            {testingEmail ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}
            Test
          </button>
        </div>
      </form>
      )}

      {activeSection === "storage" && (
      /* File Storage — S3 */
      <form onSubmit={saveS3} className="space-y-4">
        <div className="card p-6">
          <SectionHeader
            id="storage" icon={HardDrive} tile="bg-sky-600"
            title="File Storage — S3" blurb="Stores uploaded lesson files, documents, and images." status={storageStatus}
          />
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Endpoint URL</label>
              <input type="url" value={s3Endpoint} onChange={(e) => setS3Endpoint(e.target.value)}
                placeholder="https://s3.us-east-1.amazonaws.com" className="input-base" />
              <p className="text-xs text-slate-400 mt-1.5">Leave blank for AWS default. Required for R2, Backblaze, etc.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Region</label>
                <input type="text" value={s3Region} onChange={(e) => setS3Region(e.target.value)}
                  placeholder="us-east-1" className="input-base" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Bucket Name</label>
                <input type="text" value={s3Bucket} onChange={(e) => setS3Bucket(e.target.value)}
                  placeholder="pai-lms-assets" className="input-base" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">Access Key ID</label>
                {data?.s3_access_key_id_set && <SavedChip />}
              </div>
              <input type="text" value={s3AccessKey} onChange={(e) => setS3AccessKey(e.target.value)}
                placeholder={data?.s3_access_key_id_set ? "Enter new key to replace…" : "AKIA..."}
                className="input-base" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">Secret Access Key</label>
                {data?.s3_secret_access_key_set && <SavedChip />}
              </div>
              <div className="relative">
                <input
                  type={showS3Secret ? "text" : "password"}
                  value={s3SecretKey}
                  onChange={(e) => setS3SecretKey(e.target.value)}
                  placeholder={data?.s3_secret_access_key_set ? "Enter new key to replace…" : "Secret key..."}
                  className="input-base pr-10"
                />
                <button type="button" onClick={() => setShowS3Secret(!showS3Secret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  {showS3Secret ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          </div>
        </div>
        <button type="submit" disabled={savingS3} className="btn-primary w-full justify-center disabled:opacity-60">
          {savingS3 ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          Save Storage Settings
        </button>
      </form>
      )}

      {activeSection === "payments" && (
      /* Payment — Stripe */
      <form onSubmit={saveStripe} className="space-y-4">
        <div className="card p-6">
          <SectionHeader
            id="payments" icon={CreditCard} tile="bg-violet-600"
            title="Payments — Stripe" blurb="Processes enrollment, retake, and event checkout payments." status={paymentsStatus}
          />
          <div className="flex items-center justify-end -mt-3 mb-5">
            <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-navy-600 hover:text-navy-800 font-medium">
              Stripe Dashboard <ExternalLink size={11} />
            </a>
          </div>

          {/* Mode toggle */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            {(["test", "live"] as const).map((m) => (
              <button key={m} type="button" onClick={() => setStripeMode(m)}
                className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                  stripeMode === m
                    ? m === "live" ? "border-green-600 bg-green-50" : "border-navy-700 bg-navy-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}>
                <div className={`w-2 h-2 rounded-full ${m === "live" ? "bg-green-500" : "bg-amber-400"}`} />
                <span className={`text-sm font-semibold capitalize ${stripeMode === m ? (m === "live" ? "text-green-800" : "text-navy-900") : "text-slate-600"}`}>
                  {m === "live" ? "Live" : "Test"}
                </span>
              </button>
            ))}
          </div>

          {stripeMode === "live" && (
            <div className="mb-4 flex items-start gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
              <span className="text-amber-500 text-base leading-none mt-0.5">⚠️</span>
              <p className="text-xs text-amber-800"><strong>Live mode</strong> — real charges will be made. Use production keys from the Stripe dashboard.</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Publishable Key <span className="text-[10px] font-normal text-slate-400">(safe to expose)</span></label>
              <input type="text" value={stripePubKey} onChange={(e) => setStripePubKey(e.target.value)}
                placeholder={stripeMode === "live" ? "pk_live_..." : "pk_test_..."} className="input-base" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">Secret Key</label>
                {payData?.stripe_secret_key_set && <SavedChip />}
              </div>
              <div className="relative">
                <input type={showStripeSecret ? "text" : "password"} value={stripeSecretKey}
                  onChange={(e) => setStripeSecretKey(e.target.value)}
                  placeholder={payData?.stripe_secret_key_set ? "Enter new key to replace…" : (stripeMode === "live" ? "sk_live_..." : "sk_test_...")}
                  className="input-base pr-10" />
                <button type="button" onClick={() => setShowStripeSecret(!showStripeSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  {showStripeSecret ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">Webhook Secret</label>
                {payData?.stripe_webhook_secret_set && <SavedChip />}
              </div>
              <div className="relative">
                <input type={showStripeWebhook ? "text" : "password"} value={stripeWebhook}
                  onChange={(e) => setStripeWebhook(e.target.value)}
                  placeholder={payData?.stripe_webhook_secret_set ? "Enter new secret to replace…" : "whsec_..."}
                  className="input-base pr-10" />
                <button type="button" onClick={() => setShowStripeWebhook(!showStripeWebhook)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  {showStripeWebhook ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-1">Register this URL in Stripe → Webhooks</p>
                <p className="text-xs font-mono text-slate-700 break-all select-all">
                  {(process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1").replace(/\/api\/v1$/, "")}/api/v1/payments/webhook
                </p>
              </div>
            </div>
          </div>
        </div>
        <button type="submit" disabled={savingStripe} className="btn-primary w-full justify-center disabled:opacity-60">
          {savingStripe ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          Save Stripe Settings
        </button>
      </form>
      )}

      {activeSection === "analytics" && (
      /* Analytics — Google Analytics */
      <form onSubmit={saveGa} className="space-y-4">
        <div className="card p-6">
          <SectionHeader
            id="analytics" icon={BarChart3} tile="bg-teal-600"
            title="Analytics — Google Analytics" blurb="Tracks visitor traffic and behavior across the marketing site." status={gaStatus}
          />
          <div className="flex items-center justify-end -mt-3 mb-4">
            <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-navy-600 hover:text-navy-800 font-medium">
              Google Analytics <ExternalLink size={11} />
            </a>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Measurement ID
                <span className="ml-1.5 text-[10px] font-normal text-slate-400">(safe to expose)</span>
              </label>
              <input type="text" value={gaId} onChange={(e) => setGaId(e.target.value)}
                placeholder="G-XXXXXXXXXX" className="input-base font-mono text-xs" />
              <p className="text-xs text-slate-400 mt-1.5">
                Found in Google Analytics → Admin → Data Streams → your web stream. Leave blank to stop tracking.
              </p>
            </div>
          </div>
        </div>
        <button type="submit" disabled={savingGa} className="btn-primary w-full justify-center disabled:opacity-60">
          {savingGa ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          Save Analytics Settings
        </button>
      </form>
      )}

      {activeSection === "ai" && (
      /* AI — Provider */
      <form onSubmit={saveAiSettings} className="space-y-4">
        <div className="card p-6">
          <SectionHeader
            id="ai" icon={Bot} tile="bg-indigo-600"
            title="AI — Provider" blurb="Powers automatic exam generation and question improvement." status={aiStatus}
          />

          {/* Provider selector */}
          <div className="grid grid-cols-3 gap-3 mb-5">
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

          {/* Model selector */}
          <div className="mb-5">
            <label className="block text-xs font-semibold text-slate-700 mb-2">Model</label>
            <div className="space-y-2">
              {PROVIDER_MODELS[aiProvider].map((m) => (
                <label key={m.value}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${aiModel === m.value ? "border-navy-700 bg-navy-50" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                  <input type="radio" name="aiModel" value={m.value} checked={aiModel === m.value}
                    onChange={() => setAiModel(m.value)} className="accent-navy-700 shrink-0" />
                  <p className={`text-sm font-medium ${aiModel === m.value ? "text-navy-900" : "text-slate-700"}`}>{m.label}</p>
                </label>
              ))}
            </div>
          </div>

          {/* API key */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">{activeProviderDef.keyLabel}</label>
              {aiKeyIsSet && <SavedChip />}
            </div>
            <div className="relative">
              <input
                type={showAiKey[aiProvider] ? "text" : "password"}
                value={aiProvider === "openai" ? openaiKey : aiProvider === "groq" ? groqKey : geminiKey}
                onChange={(e) => {
                  if (aiProvider === "openai") setOpenaiKey(e.target.value);
                  else if (aiProvider === "groq") setGroqKey(e.target.value);
                  else setGeminiKey(e.target.value);
                }}
                placeholder={aiKeyIsSet ? "Enter new key to replace…" : activeProviderDef.keyPlaceholder}
                className="input-base pr-10"
              />
              <button type="button"
                onClick={() => setShowAiKey((prev) => ({ ...prev, [aiProvider]: !prev[aiProvider] }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                {showAiKey[aiProvider] ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1.5">
              {aiProvider === "openai" && <>Get your key from <span className="font-mono">platform.openai.com/api-keys</span></>}
              {aiProvider === "groq"   && <>Get your key from <span className="font-mono">console.groq.com/keys</span></>}
              {aiProvider === "gemini" && <>Get your key from <span className="font-mono">aistudio.google.com/apikey</span></>}
            </p>
          </div>

          {aiTestResult && (
            <div className={`mt-4 flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm ${aiTestResult.ok ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
              {aiTestResult.ok ? <CheckCircle2 size={15} className="shrink-0" /> : <XCircle size={15} className="shrink-0" />}
              {aiTestResult.msg}
            </div>
          )}
        </div>
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
      )}

        </div>
      </div>
    </div>
  );
}
