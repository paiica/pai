"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, Shield } from "lucide-react";
import { api, ApiError } from "@/lib/api";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(false);
  const [error, setError]       = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, new_password: password });
      setDone(true);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 bg-gold-500 rounded-xl flex items-center justify-center">
            <Shield size={20} className="text-white" />
          </div>
          <div>
            <div className="text-white font-display font-black text-lg leading-tight">PAII Admin Portal</div>
            <div className="text-gold-400 text-[10px] uppercase tracking-widest">Professional Artificial Intelligence Institute</div>
          </div>
        </div>

        {!token ? (
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={28} className="text-red-400" />
            </div>
            <h2 className="text-xl font-display font-black text-navy-900 mb-2">Invalid link</h2>
            <p className="text-slate-500 text-sm mb-6">This password reset link is missing or malformed.</p>
            <Link href="/forgot-password" className="btn-primary !py-3 w-full justify-center">
              Request a new link
            </Link>
          </div>
        ) : done ? (
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={28} className="text-emerald-500" />
            </div>
            <h2 className="text-xl font-display font-black text-navy-900 mb-2">Password updated</h2>
            <p className="text-slate-500 text-sm mb-6">Your password has been reset. You can now sign in.</p>
            <Link href="/login" className="btn-primary !py-3 w-full justify-center">
              Sign In
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <h1 className="text-xl font-display font-black text-navy-900 mb-1">Set new password</h1>
            <p className="text-slate-500 text-sm mb-6">Choose a strong password for your admin account.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 chars, include uppercase, number"
                    required
                    minLength={8}
                    className="input-base pr-11"
                    autoComplete="new-password"
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

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary !py-3 !text-base justify-center disabled:opacity-60"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : "Reset Password"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordContent />
    </Suspense>
  );
}
