"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, CheckCircle2, ArrowLeft } from "lucide-react";
import { api, ApiError } from "@/lib/api";

export default function ProfForgotPasswordPage() {
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);
  const [error, setError]     = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
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
        <div className="flex flex-col items-center gap-2 mb-8">
          <img src="/paii.logo.png" alt="Professional Artificial Intelligence Institute" className="h-14 w-auto object-contain" style={{ filter: "brightness(0) invert(1)" }} />
          <div className="text-gold-400 text-xs uppercase tracking-widest font-semibold">Professor Portal</div>
        </div>

        {done ? (
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={28} className="text-emerald-500" />
            </div>
            <h2 className="text-xl font-display font-black text-navy-900 mb-2">Check your inbox</h2>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
              If <strong>{email}</strong> is registered, we&apos;ve sent a reset link. It expires in 1 hour.
            </p>
            <Link href="/login" className="flex items-center justify-center gap-1.5 text-sm font-semibold text-navy-700 hover:text-navy-900">
              <ArrowLeft size={14} /> Back to sign in
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <h1 className="text-xl font-display font-black text-navy-900 mb-1">Forgot password?</h1>
            <p className="text-slate-500 text-sm mb-6">Enter your professor email and we&apos;ll send a reset link.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="professor@paii.ca"
                  required
                  className="input-base"
                  autoComplete="email"
                />
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
                {loading ? <Loader2 size={18} className="animate-spin" /> : "Send Reset Link"}
              </button>
            </form>

            <div className="mt-5 pt-5 border-t border-slate-100 text-center">
              <Link href="/login" className="flex items-center justify-center gap-1.5 text-sm font-semibold text-navy-700 hover:text-navy-900">
                <ArrowLeft size={14} /> Back to sign in
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
