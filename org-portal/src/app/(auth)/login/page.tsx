"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/auth.store";

const inputCls =
  "w-full h-12 px-4 rounded-lg border border-sand-300 bg-white text-ink-900 placeholder:text-sand-500 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all text-sm";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await login(email, password);
      router.replace("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed. Check your credentials.";
      toast.error(msg);
    }
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-ink-900 tracking-tight mb-1">Welcome back</h1>
        <p className="text-sm text-sand-500">Sign in to your organization portal</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wide">
            Email Address
          </label>
          <input
            className={inputCls}
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wide">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-semibold text-teal-600 hover:text-teal-500 transition-colors no-underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              className={`${inputCls} pr-12`}
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
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sand-400 hover:text-ink-600 transition-colors p-1"
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-12 rounded-lg font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all shadow-teal disabled:opacity-60 bg-teal-500 hover:bg-teal-400 disabled:bg-ink-400"
        >
          {isLoading
            ? <><Loader2 size={16} className="animate-spin" /> Signing in…</>
            : <>Sign In <ArrowRight size={16} /></>}
        </button>
      </form>

      <p className="text-center text-xs text-sand-500 mt-8">
        Don&apos;t have organization access yet? Contact your PAII account manager.
      </p>
    </>
  );
}
