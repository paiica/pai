"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, CheckCircle2, ArrowLeft } from "lucide-react";
import { api, ApiError } from "@/lib/api";

const cardCls = { borderRadius: "20px", border: "1px solid #ddd8d0", boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.06)" };

export default function ForgotPasswordPage() {
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

  if (done) {
    return (
      <div className="bg-white p-8 text-center" style={cardCls}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "#f0fdfa", border: "1px solid #ccfbf1" }}>
          <CheckCircle2 size={28} style={{ color: "#14b8a6" }} />
        </div>
        <h2 className="text-xl font-display font-black text-ink-900 mb-2">Check your inbox</h2>
        <p className="text-slate-500 text-sm mb-6 leading-relaxed">
          If <strong>{email}</strong> is registered, we&apos;ve sent a password reset link.
          It expires in 1 hour.
        </p>
        <Link href="/login" className="text-sm font-semibold text-ink-700 hover:text-ink-900 flex items-center justify-center gap-1.5">
          <ArrowLeft size={14} /> Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white p-8" style={cardCls}>
      <h1 className="text-2xl font-display font-black text-ink-900 mb-1">Forgot password?</h1>
      <p className="text-slate-500 text-sm mb-6">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
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
        <Link href="/login" className="text-sm font-semibold text-ink-700 hover:text-ink-900 flex items-center justify-center gap-1.5">
          <ArrowLeft size={14} /> Back to sign in
        </Link>
      </div>
    </div>
  );
}
