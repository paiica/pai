"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { ApiError } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const register = useAuthStore((s) => s.register);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", first_name: "", last_name: "" });

  function update(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await register(form);
      setDone(true);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Something went wrong. Please try again.");
    }
  }

  if (done) {
    return (
      <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
        <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={28} className="text-emerald-500" />
        </div>
        <h2 className="text-xl font-display font-black text-navy-900 mb-2">Account Created!</h2>
        <p className="text-slate-500 text-sm mb-5">
          We&apos;ve sent a verification email to <strong>{form.email}</strong>.
          Please verify your email to access your learning portal.
        </p>
        <Link href="/login" className="btn-primary !py-3 w-full justify-center">
          Go to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-8">
      <h1 className="text-2xl font-display font-black text-navy-900 mb-1">Create Account</h1>
      <p className="text-slate-500 text-sm mb-6">Join the PAI learning community</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">First Name</label>
            <input
              type="text"
              value={form.first_name}
              onChange={(e) => update("first_name", e.target.value)}
              placeholder="Sarah"
              required
              className="input-base"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Last Name</label>
            <input
              type="text"
              value={form.last_name}
              onChange={(e) => update("last_name", e.target.value)}
              placeholder="Chen"
              required
              className="input-base"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Address</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="sarah.chen@example.com"
            required
            className="input-base"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              placeholder="Min 8 chars, include uppercase, number"
              required
              minLength={8}
              className="input-base pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
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
          disabled={isLoading}
          className="w-full btn-primary !py-3 !text-base justify-center disabled:opacity-60"
        >
          {isLoading ? <Loader2 size={18} className="animate-spin" /> : "Create Account"}
        </button>

        <p className="text-xs text-slate-400 text-center">
          By creating an account you agree to our{" "}
          <Link href={`${process.env.NEXT_PUBLIC_MARKETING_URL}/terms`} className="text-navy-700 underline">Terms</Link>{" "}
          and{" "}
          <Link href={`${process.env.NEXT_PUBLIC_MARKETING_URL}/privacy`} className="text-navy-700 underline">Privacy Policy</Link>.
        </p>
      </form>

      <div className="mt-5 pt-5 border-t border-slate-100 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="text-navy-700 font-semibold hover:text-navy-900">Sign in</Link>
      </div>
    </div>
  );
}
