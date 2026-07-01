"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, GraduationCap } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";

export default function ProfessorLoginPage() {
  const router = useRouter();
  const { login, isLoading, accessToken, _hasHydrated } = useAuthStore();
  const [showPw, setShowPw] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (_hasHydrated && accessToken) {
      router.replace("/dashboard");
    }
  }, [_hasHydrated, accessToken, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    }
  }

  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 bg-gold-500 rounded-xl flex items-center justify-center">
            <GraduationCap size={20} className="text-white" />
          </div>
          <div>
            <div className="text-white font-display font-black text-lg leading-tight">PAII Professor Portal</div>
            <div className="text-gold-400 text-[10px] uppercase tracking-widest">Professional Artificial Intelligence Institute</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h1 className="text-xl font-display font-black text-navy-900 mb-1">Professor Sign In</h1>
          <p className="text-slate-500 text-sm mb-6">Access your courses and gradebook.</p>

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
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <input
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

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary !py-3 !text-base justify-center disabled:opacity-60"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : "Sign In"}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-slate-100 text-center">
            <a href="/forgot-password" className="text-xs text-slate-500 hover:text-navy-700">
              Forgot your password?
            </a>
          </div>
        </div>

        <p className="text-center text-navy-400 text-xs mt-6">
          Not a professor?{" "}
          <a
            href={process.env.NEXT_PUBLIC_LMS_URL || "http://localhost:3001"}
            className="text-gold-400 hover:text-gold-300 font-medium"
          >
            Go to Learning Portal
          </a>
        </p>
      </div>
    </div>
  );
}
