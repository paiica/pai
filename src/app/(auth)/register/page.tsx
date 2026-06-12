"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Award, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

function RegisterForm() {
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const certification = searchParams.get("certification");

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: { full_name: form.fullName },
          emailRedirectTo: `${window.location.origin}/api/auth/callback${certification ? `?certification=${certification}` : ""}`,
        },
      });

      if (error) {
        toast.error(error.message);
      } else {
        setSuccess(true);
      }
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignUp() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback${certification ? `?certification=${certification}` : ""}`,
      },
    });
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="bg-white rounded-3xl shadow-card border border-slate-100 p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={32} className="text-emerald-500" />
          </div>
          <h2 className="text-2xl font-display font-bold text-navy-900 mb-3">Check Your Email</h2>
          <p className="text-slate-600 text-sm leading-relaxed mb-6">
            We sent a confirmation link to <strong>{form.email}</strong>.
            Click the link to activate your account.
          </p>
          <Link href="/login" className="btn-primary w-full justify-center text-sm">
            Back to Sign In
          </Link>
        </div>
      </div>
    );
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
            Join 3,200+ PAI Certified Professionals
          </h2>
          <p className="text-white/70 leading-relaxed mb-8">
            Create your account to start your AI certification journey.
          </p>
          {certification && (
            <div className="bg-gold-500/20 border border-gold-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gold-300 font-semibold text-sm">
                <Award size={16} />
                You&apos;re enrolling in:
              </div>
              <div className="text-white font-bold mt-1 capitalize">
                {certification.replace(/-/g, " ")}
              </div>
            </div>
          )}
        </div>
        <div className="relative z-10 text-white/40 text-xs">
          © {new Date().getFullYear()} Professional AI Institute
        </div>
      </div>

      {/* Right panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-display font-black text-navy-900 mb-1">Create Your Account</h1>
          <p className="text-slate-500 text-sm mb-8">
            Already have an account?{" "}
            <Link href="/login" className="text-navy-700 font-semibold hover:text-navy-900">
              Sign in →
            </Link>
          </p>

          <button
            onClick={handleGoogleSignUp}
            className="w-full flex items-center justify-center gap-3 border-2 border-slate-200 hover:border-slate-300 bg-white text-slate-700 font-semibold py-3 rounded-xl transition-all text-sm mb-6 hover:shadow-sm"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400 font-medium">or register with email</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name</label>
              <input
                type="text"
                value={form.fullName}
                onChange={e => update("fullName", e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-navy-400 focus:ring-4 focus:ring-navy-100 outline-none text-slate-900 text-sm transition-all"
                placeholder="Your full name"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => update("email", e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-navy-400 focus:ring-4 focus:ring-navy-100 outline-none text-slate-900 text-sm transition-all"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={e => update("password", e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-4 py-3 pr-12 rounded-xl border-2 border-slate-200 focus:border-navy-400 focus:ring-4 focus:ring-navy-100 outline-none text-slate-900 text-sm transition-all"
                  placeholder="Min. 8 characters"
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
              className="w-full flex items-center justify-center gap-2 bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all text-sm shadow-gold"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-navy-900/30 border-t-navy-900 rounded-full animate-spin" />
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-4">
            By registering, you agree to our{" "}
            <Link href="/terms" className="underline">Terms</Link> and{" "}
            <Link href="/privacy" className="underline">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="w-6 h-6 border-2 border-navy-800/30 border-t-navy-800 rounded-full animate-spin" /></div>}>
      <RegisterForm />
    </Suspense>
  );
}
