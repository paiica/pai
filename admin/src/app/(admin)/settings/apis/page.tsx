"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import toast from "react-hot-toast";
import { Save, Loader2, Mail, HardDrive, Eye, EyeOff, CheckCircle2, Key, Database, ExternalLink, CreditCard } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r: any) => r.data ?? r);
}

export default function ApiSettingsPage() {
  const { accessToken } = useAuthStore();

  const { data, mutate } = useSWR(
    accessToken ? ["/site-settings/api-settings", accessToken] : null,
    ([url, t]) => fetcher(url, t)
  );

  const { data: payData, mutate: mutatePayment } = useSWR(
    accessToken ? ["/site-settings/payment-settings", accessToken] : null,
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

  useEffect(() => {
    if (data) {
      setEmailFrom(data.email_from             ?? "");
      setEmailFromName(data.email_from_name    ?? "");
      setSupabaseUrl(data.supabase_project_url ?? "");
      setSupabaseAnonKey(data.supabase_anon_key ?? "");
      setS3Endpoint(data.s3_endpoint           ?? "");
      setS3Region(data.s3_region               ?? "us-east-1");
      setS3Bucket(data.s3_bucket_name          ?? "");
    }
  }, [data]);

  useEffect(() => {
    if (payData) {
      setStripeMode((payData.stripe_mode as "test" | "live") ?? "test");
      setStripePubKey(payData.stripe_publishable_key ?? "");
    }
  }, [payData]);

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

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-10">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Key size={20} className="text-navy-600" />
          <h1 className="text-2xl font-display font-black text-navy-900">API Integrations</h1>
        </div>
        <p className="text-slate-500 text-sm">Configure third-party API connections used by the platform.</p>
      </div>

      {/* Database — Supabase */}
      <form onSubmit={saveSupabase} className="space-y-6">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Database size={16} className="text-navy-600" />
              <h2 className="font-semibold text-navy-900">Database — Supabase</h2>
            </div>
            <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-navy-600 hover:text-navy-800 font-medium">
              Supabase Dashboard <ExternalLink size={11} />
            </a>
          </div>

          {/* DATABASE_URL notice */}
          <div className="mb-4 flex items-start gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
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
          Save Supabase Settings
        </button>
      </form>

      {/* Email — Resend */}
      <form onSubmit={saveEmail} className="space-y-6">
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Mail size={16} className="text-navy-600" />
            <h2 className="font-semibold text-navy-900">Email — Resend</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">API Key</label>
              {data?.resend_key_set && (
                <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-green-50 rounded-xl border border-green-200">
                  <CheckCircle2 size={14} className="text-green-600 shrink-0" />
                  <span className="text-xs text-green-700 font-medium">Key saved — enter a new one to replace it</span>
                </div>
              )}
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
              <p className="text-xs text-slate-400 mt-1.5">Verified domain in your Resend account.</p>
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

      {/* File Storage — S3 */}
      <form onSubmit={saveS3} className="space-y-6">
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-5">
            <HardDrive size={16} className="text-navy-600" />
            <h2 className="font-semibold text-navy-900">File Storage — S3</h2>
          </div>
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
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Access Key ID</label>
              {data?.s3_access_key_id_set && (
                <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-green-50 rounded-xl border border-green-200">
                  <CheckCircle2 size={14} className="text-green-600 shrink-0" />
                  <span className="text-xs text-green-700 font-medium">Key saved — enter a new one to replace it</span>
                </div>
              )}
              <input type="text" value={s3AccessKey} onChange={(e) => setS3AccessKey(e.target.value)}
                placeholder={data?.s3_access_key_id_set ? "Enter new key to replace…" : "AKIA..."}
                className="input-base" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Secret Access Key</label>
              {data?.s3_secret_access_key_set && (
                <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-green-50 rounded-xl border border-green-200">
                  <CheckCircle2 size={14} className="text-green-600 shrink-0" />
                  <span className="text-xs text-green-700 font-medium">Key saved — enter a new one to replace it</span>
                </div>
              )}
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

      {/* Payment — Stripe */}
      <form onSubmit={saveStripe} className="space-y-6">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <CreditCard size={16} className="text-navy-600" />
              <h2 className="font-semibold text-navy-900">Payment — Stripe</h2>
            </div>
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
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Secret Key</label>
              {payData?.stripe_secret_key_set && (
                <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-green-50 rounded-xl border border-green-200">
                  <CheckCircle2 size={14} className="text-green-600 shrink-0" />
                  <span className="text-xs text-green-700 font-medium">Key saved — enter a new one to replace it</span>
                </div>
              )}
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
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Webhook Secret</label>
              {payData?.stripe_webhook_secret_set && (
                <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-green-50 rounded-xl border border-green-200">
                  <CheckCircle2 size={14} className="text-green-600 shrink-0" />
                  <span className="text-xs text-green-700 font-medium">Secret saved — enter a new one to replace it</span>
                </div>
              )}
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

    </div>
  );
}
