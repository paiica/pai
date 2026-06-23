"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

const LMS = process.env.NEXT_PUBLIC_LMS_URL || "https://learn.paii.ca";

export default function LoginModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const { login } = useAuth();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await login(email, password);
      if (onSuccess) {
        onSuccess();
        onClose();
      } else {
        // Login wrote to localStorage at localhost:3000 — the student portal (proxied at
        // /lms/*) shares this origin, so navigating there is sufficient; no SSO needed.
        window.location.href = `${LMS}/dashboard`;
      }
    } catch (err: any) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-ink-900/60 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="mb-6">
          <h2 className="font-display font-black text-xl text-ink-900 mb-1">Welcome back</h2>
          <p className="text-sm text-slate-500">Sign in to your PAI account</p>
        </div>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-sand-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-ink-900 transition-colors"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-sand-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-ink-900 transition-colors"
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary !py-3 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : "Sign In"}
          </button>
        </form>

        <p className="text-xs text-center text-slate-500 mt-5">
          Don't have an account?{" "}
          <a
            href={`${LMS}/register`}
            className="text-ink-900 font-semibold hover:underline"
          >
            Sign up at the portal
          </a>
        </p>
      </div>
    </div>
  );
}
