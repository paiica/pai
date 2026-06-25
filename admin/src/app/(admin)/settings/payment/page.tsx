"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import toast from "react-hot-toast";
import { Save, Loader2, CreditCard, Eye, EyeOff, CheckCircle2, ExternalLink } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r: any) => r.data ?? r);
}

export default function PaymentSettingsPage() {
  const { accessToken } = useAuthStore();

  const { data, mutate } = useSWR(
    accessToken ? ["/site-settings/payment-settings", accessToken] : null,
    ([url, t]) => fetcher(url, t)
  );

  const [mode,            setMode]           = useState<"test" | "live">("test");
  const [publishableKey,  setPublishableKey]  = useState("");
  const [secretKey,       setSecretKey]       = useState("");
  const [webhookSecret,   setWebhookSecret]   = useState("");
  const [showSecret,      setShowSecret]      = useState(false);
  const [showWebhook,     setShowWebhook]     = useState(false);
  const [saving,          setSaving]          = useState(false);

  useEffect(() => {
    if (data) {
      setMode((data.stripe_mode as "test" | "live") ?? "test");
      setPublishableKey(data.stripe_publishable_key ?? "");
    }
  }, [data]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body: Record<string, string> = {
        stripe_mode:            mode,
        stripe_publishable_key: publishableKey.trim(),
      };
      if (secretKey.trim())     body.stripe_secret_key     = secretKey.trim();
      if (webhookSecret.trim()) body.stripe_webhook_secret = webhookSecret.trim();
      await api.patch("/site-settings", body, accessToken!);
      await mutate();
      setSecretKey(""); setWebhookSecret("");
      toast.success("Payment settings saved");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const isLive = mode === "live";

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-10">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <CreditCard size={20} className="text-navy-600" />
          <h1 className="text-2xl font-display font-black text-navy-900">Payment Settings</h1>
        </div>
        <p className="text-slate-500 text-sm">Manage Stripe credentials used for certification and course purchases.</p>
      </div>

      <form onSubmit={save} className="space-y-6">

        {/* Mode toggle */}
        <div className="card p-6">
          <h2 className="font-semibold text-navy-900 mb-4">Environment</h2>
          <div className="grid grid-cols-2 gap-3">
            {(["test", "live"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex flex-col items-start gap-1 p-4 rounded-xl border-2 transition-all text-left ${
                  mode === m
                    ? m === "live"
                      ? "border-green-600 bg-green-50"
                      : "border-navy-700 bg-navy-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${m === "live" ? "bg-green-500" : "bg-amber-400"}`} />
                  <span className={`text-sm font-semibold capitalize ${mode === m ? (m === "live" ? "text-green-800" : "text-navy-900") : "text-slate-600"}`}>
                    {m === "live" ? "Live" : "Test"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  {m === "live" ? "Real payments — use production keys" : "No real charges — use test keys from Stripe dashboard"}
                </p>
              </button>
            ))}
          </div>

          {isLive && (
            <div className="mt-4 flex items-start gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
              <span className="text-amber-500 text-base leading-none mt-0.5">⚠️</span>
              <p className="text-xs text-amber-800">
                <strong>Live mode</strong> — real charges will be made. Make sure your Stripe account is fully activated and keys are from the <strong>Live</strong> section of the Stripe dashboard.
              </p>
            </div>
          )}
        </div>

        {/* Stripe keys */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-navy-900">Stripe API Keys</h2>
            <a
              href="https://dashboard.stripe.com/apikeys"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-navy-600 hover:text-navy-800 font-medium"
            >
              Stripe Dashboard <ExternalLink size={11} />
            </a>
          </div>

          <div className="space-y-4">
            {/* Publishable key */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Publishable Key
                <span className="ml-1.5 text-[10px] font-normal text-slate-400">(safe to expose to browser)</span>
              </label>
              <input
                type="text"
                value={publishableKey}
                onChange={(e) => setPublishableKey(e.target.value)}
                placeholder={isLive ? "pk_live_..." : "pk_test_..."}
                className="input-base"
              />
            </div>

            {/* Secret key */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Secret Key</label>
              {data?.stripe_secret_key_set && (
                <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-green-50 rounded-xl border border-green-200">
                  <CheckCircle2 size={14} className="text-green-600 shrink-0" />
                  <span className="text-xs text-green-700 font-medium">Key saved — enter a new one to replace it</span>
                </div>
              )}
              <div className="relative">
                <input
                  type={showSecret ? "text" : "password"}
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  placeholder={data?.stripe_secret_key_set ? "Enter new key to replace…" : (isLive ? "sk_live_..." : "sk_test_...")}
                  className="input-base pr-10"
                />
                <button type="button" onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  {showSecret ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Webhook secret */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Webhook Secret
                <span className="ml-1.5 text-[10px] font-normal text-slate-400">(from Stripe → Webhooks → your endpoint)</span>
              </label>
              {data?.stripe_webhook_secret_set && (
                <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-green-50 rounded-xl border border-green-200">
                  <CheckCircle2 size={14} className="text-green-600 shrink-0" />
                  <span className="text-xs text-green-700 font-medium">Secret saved — enter a new one to replace it</span>
                </div>
              )}
              <div className="relative">
                <input
                  type={showWebhook ? "text" : "password"}
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  placeholder={data?.stripe_webhook_secret_set ? "Enter new secret to replace…" : "whsec_..."}
                  className="input-base pr-10"
                />
                <button type="button" onClick={() => setShowWebhook(!showWebhook)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  {showWebhook ? <EyeOff size={15} /> : <Eye size={15} />}
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

        <button type="submit" disabled={saving} className="btn-primary w-full justify-center disabled:opacity-60">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          Save Payment Settings
        </button>
      </form>

    </div>
  );
}
