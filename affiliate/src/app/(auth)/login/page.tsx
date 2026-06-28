"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, LogIn } from "lucide-react";
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
      <h1 className="text-2xl font-display font-black text-navy-900 mb-1">Welcome back</h1>
      <p className="text-slate-500 text-sm mb-7">Sign in to your affiliate dashboard</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email address</label>
          <input
            className="input-base"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-700">Password</label>
            <Link href="/forgot-password" className="text-xs text-navy-600 hover:text-navy-800 font-medium">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              className="input-base pr-12"
              type={showPw ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {needsVerification && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
            <p className="font-semibold mb-1">Email not verified</p>
            <p className="text-amber-700 mb-3">Please verify your email before signing in.</p>
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-900 hover:underline disabled:opacity-50"
            >
              {resending ? <Loader2 size={12} className="animate-spin" /> : null}
              {resending ? "Sending…" : "Resend verification email"}
            </button>
          </div>
        )}

        <button type="submit" disabled={isLoading} className="btn-primary w-full !py-3">
          {isLoading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
          {isLoading ? "Signing in…" : "Sign In"}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-slate-100 text-center">
        <p className="text-sm text-slate-500">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-navy-700 font-semibold hover:text-navy-900">
            Apply as Affiliate
          </Link>
        </p>
      </div>
    </>
  );
}
