"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Mail, ArrowLeft, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="text-center">
        <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={28} className="text-emerald-600" />
        </div>
        <h2 className="text-xl font-display font-black text-navy-900 mb-2">Check your email</h2>
        <p className="text-slate-500 text-sm mb-6">
          We sent a password reset link to <strong>{email}</strong>
        </p>
        <Link href="/login" className="btn-outline w-full justify-center">
          <ArrowLeft size={15} /> Back to Sign In
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-display font-black text-navy-900 mb-1">Reset Password</h1>
      <p className="text-slate-500 text-sm mb-7">Enter your email and we&apos;ll send you a reset link</p>

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
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full !py-3">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
          {loading ? "Sending…" : "Send Reset Link"}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-slate-100 text-center">
        <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-navy-600 hover:text-navy-800 font-medium">
          <ArrowLeft size={14} /> Back to Sign In
        </Link>
      </div>
    </>
  );
}
