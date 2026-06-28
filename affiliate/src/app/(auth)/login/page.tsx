"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, ArrowRight, MailCheck } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setNeedsVerification(false);
    try {
      await login(email, password);
      const user = useAuthStore.getState().user;
      if (user?.status === "pending") {
        router.replace("/pending-approval");
      } else if (user?.status === "suspended") {
        toast.error("Your account has been suspended. Contact support.");
        await useAuthStore.getState().logout();
      } else {
        router.replace("/dashboard");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed. Check your credentials.";
      if (msg.toLowerCase().includes("verify")) {
        setNeedsVerification(true);
      } else {
        toast.error(msg);
      }
    }
  }

  async function handleResend() {
    if (!email) { toast.error("Enter your email address first."); return; }
    setResending(true);
    try {
      await api.post("/auth/resend-verification", { email });
      toast.success("Verification email sent! Check your inbox.");
    } catch {
      toast.error("Could not send verification email. Try again later.");
    } finally {
      setResending(false);
    }
  }

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-navy-900 tracking-tight mb-1">Welcome back</h1>
        <p className="text-sm text-slate-500">Sign in to your affiliate dashboard</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Email */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
            Email Address
          </label>
          <div className="relative">
            <input
              className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-navy-500 focus:bg-white focus:ring-4 focus:ring-navy-500/10 transition-all"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
              Password
            </label>
            <Link href="/forgot-password"
              className="text-xs font-semibold text-navy-600 hover:text-navy-800 transition-colors">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              className="w-full h-12 px-4 pr-12 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-navy-500 focus:bg-white focus:ring-4 focus:ring-navy-500/10 transition-all"
              type={showPw ? "text" : "password"}
              placeholder="••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Verification warning */}
        {needsVerification && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
            <div className="flex items-start gap-3">
              <MailCheck size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-900 mb-0.5">Email not verified</p>
                <p className="text-xs text-amber-700 mb-3">Check your inbox and click the verification link before signing in.</p>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 hover:underline disabled:opacity-50 transition-opacity"
                >
                  {resending ? <Loader2 size={11} className="animate-spin" /> : null}
                  {resending ? "Sending…" : "Resend verification email →"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-12 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all disabled:opacity-70"
          style={{ background: isLoading ? "#374151" : "linear-gradient(135deg, #0f2347, #1a3a6b)" }}
        >
          {isLoading
            ? <><Loader2 size={16} className="animate-spin" /> Signing in…</>
            : <>Sign In <ArrowRight size={16} /></>}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-slate-100" />
        <span className="text-xs text-slate-400 font-medium">New to PAI?</span>
        <div className="flex-1 h-px bg-slate-100" />
      </div>

      {/* Register CTA */}
      <Link
        href="/register"
        className="w-full h-12 rounded-xl font-bold text-sm text-navy-800 border-2 border-slate-200 flex items-center justify-center gap-2 hover:border-navy-300 hover:bg-navy-50 transition-all"
      >
        Apply as Sales Affiliate
      </Link>
    </>
  );
}
