"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, MailCheck } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api, ApiError } from "@/lib/api";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [showPw, setShowPw] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendStatus, setResendStatus] = useState<"idle" | "sending" | "sent">("idle");

  const isVerificationError = needsVerification;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNeedsVerification(false);
    try {
      await login(email, password);
      router.push(redirectTo);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.message.toLowerCase().includes("verify your email")) {
          setNeedsVerification(true);
        }
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    }
  }

  async function handleResend() {
    setResendStatus("sending");
    try {
      await api.post("/auth/resend-verification", { email });
      setResendStatus("sent");
    } catch {
      setResendStatus("idle");
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-8">
      <h1 className="text-2xl font-display font-black text-navy-900 mb-1">Sign In</h1>
      <p className="text-slate-500 text-sm mb-6">Access your PAI learning portal</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="login-email" className="block text-xs font-semibold text-slate-700 mb-1.5">Email Address</label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="input-base"
            autoComplete="email"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="login-password" className="text-xs font-semibold text-slate-700">Password</label>
            <Link href="/forgot-password" className="text-xs text-navy-600 hover:text-navy-800 font-medium">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="login-password"
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="input-base pr-11"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
            {error}
          </div>
        )}

        {isVerificationError && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            {resendStatus === "sent" ? (
              <div className="flex items-center gap-2 text-emerald-700 text-sm">
                <MailCheck size={16} />
                <span>Verification email sent! Check your inbox.</span>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-amber-700">Didn&apos;t get the email?</p>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendStatus === "sending"}
                  className="text-xs font-semibold text-amber-800 underline underline-offset-2 disabled:opacity-60"
                >
                  {resendStatus === "sending" ? "Sending…" : "Resend verification email"}
                </button>
              </div>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full btn-primary !py-3 !text-base justify-center disabled:opacity-60"
        >
          {isLoading ? <Loader2 size={18} className="animate-spin" /> : "Sign In"}
        </button>
      </form>

      <div className="mt-5 pt-5 border-t border-slate-100 text-center text-sm text-slate-500">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-navy-700 font-semibold hover:text-navy-900">
          Create account
        </Link>
      </div>

      <div className="mt-3 text-center">
        <Link
          href={process.env.NEXT_PUBLIC_MARKETING_URL || "https://paii.ca"}
          className="text-xs text-slate-400 hover:text-slate-600"
        >
          ← Back to main website
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
