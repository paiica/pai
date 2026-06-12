"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Award, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        toast.error(error.message);
      } else {
        router.push(redirectTo);
        router.refresh();
      }
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?redirect=${redirectTo}`,
      },
    });
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-hero-pattern flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(201,168,76,0.8) 1px, transparent 0)", backgroundSize: "40px 40px" }}
        />
        <Link href="/" className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 bg-gradient-to-br from-gold-400 to-gold-600 rounded-xl flex items-center justify-center">
            <span className="text-navy-900 font-display font-black text-sm">PAI</span>
          </div>
          <div className="font-display font-bold text-white">
            <div className="text-base font-black">Professional AI</div>
            <div className="text-xs font-semibold tracking-widest uppercase opacity-80">Institute</div>
          </div>
        </Link>

        <div className="relative z-10">
          <h2 className="text-3xl font-display font-black text-white mb-4 leading-tight">
            Welcome back to PAI
          </h2>
          <p className="text-white/70 leading-relaxed mb-8">
            Access your certification programs, track your progress, and download your credentials.
          </p>
          <div className="space-y-3">
            {[
              "Continue your CAIP program",
              "View and download your certificates",
              "Track exam preparation progress",
              "Access study materials and resources",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-white/70 text-sm">
                <Award size={14} className="text-gold-400" />
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-white/40 text-xs">
          © {new Date().getFullYear()} Professional AI Institute
        </div>
      </div>

      {/* Right panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link href="/" className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-gradient-to-br from-gold-400 to-gold-600 rounded-xl flex items-center justify-center">
              <span className="text-navy-900 font-display font-black text-xs">PAI</span>
            </div>
            <span className="font-display font-bold text-navy-900">Professional AI Institute</span>
          </Link>

          <h1 className="text-2xl font-display font-black text-navy-900 mb-1">Sign In</h1>
          <p className="text-slate-500 text-sm mb-8">
            New to PAI?{" "}
            <Link href="/register" className="text-navy-700 font-semibold hover:text-navy-900">
              Create an account →
            </Link>
          </p>


          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-navy-400 focus:ring-4 focus:ring-navy-100 outline-none text-slate-900 text-sm transition-all"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold text-slate-700">Password</label>
                <Link href="/forgot-password" className="text-xs text-navy-600 hover:text-navy-800 font-medium">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 pr-12 rounded-xl border-2 border-slate-200 focus:border-navy-400 focus:ring-4 focus:ring-navy-100 outline-none text-slate-900 text-sm transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-navy-800 hover:bg-navy-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all text-sm"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Sign In <ArrowRight size={15} /></>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-6">
            By signing in, you agree to our{" "}
            <Link href="/terms" className="underline hover:text-slate-600">Terms of Service</Link>
            {" "}and{" "}
            <Link href="/privacy" className="underline hover:text-slate-600">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="w-6 h-6 border-2 border-navy-800/30 border-t-navy-800 rounded-full animate-spin" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
