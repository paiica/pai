"use client";

import { useState } from "react";
import { Eye, EyeOff, Loader2, CheckCircle2, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/auth.store";

export default function ProfessorRegisterPage() {
  const register = useAuthStore((s) => s.register);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "",
    phone: "", password: "", confirm_password: "",
  });
  const [showPw, setShowPw] = useState(false);
  const [done, setDone] = useState(false);

  function setField(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirm_password) {
      toast.error("Passwords do not match");
      return;
    }
    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    try {
      await register({
        email: form.email,
        password: form.password,
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone || undefined,
      });
      setDone(true);
    } catch (err: any) {
      toast.error(err.message || "Registration failed. Please try again.");
    }
  }

  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-2 mb-8">
          <img src="/paii.logo.png" alt="Professional Artificial Intelligence Institute" className="h-14 w-auto object-contain" style={{ filter: "brightness(0) invert(1)" }} />
          <div className="text-gold-400 text-xs uppercase tracking-widest font-semibold">Professor Portal</div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {done ? (
            <div className="text-center py-2">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 bg-emerald-50 border border-emerald-100">
                <CheckCircle2 size={32} className="text-emerald-500" />
              </div>
              <h2 className="text-xl font-display font-black text-navy-900 mb-2">Application Submitted!</h2>
              <p className="text-sm text-slate-500 mb-8">
                Our team will review your application and email you once you&rsquo;re approved to start managing courses.
              </p>
              <a
                href="/login"
                className="w-full btn-primary !py-3 !text-base justify-center inline-flex items-center gap-2"
              >
                Go to Sign In <ArrowRight size={16} />
              </a>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-display font-black text-navy-900 mb-1">Apply to Teach</h1>
              <p className="text-slate-500 text-sm mb-6">Join PAII as an instructor and manage your own courses.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">First Name</label>
                    <input className="input-base" placeholder="Jane" required value={form.first_name} onChange={(e) => setField("first_name", e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Last Name</label>
                    <input className="input-base" placeholder="Doe" required value={form.last_name} onChange={(e) => setField("last_name", e.target.value)} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    className="input-base"
                    placeholder="professor@example.com"
                    required
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Phone <span className="normal-case font-normal text-slate-400">(optional)</span>
                  </label>
                  <input
                    type="tel"
                    className="input-base"
                    placeholder="+1 (555) 000-0000"
                    value={form.phone}
                    onChange={(e) => setField("phone", e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showPw ? "text" : "password"}
                      className="input-base pr-11"
                      placeholder="Min. 8 characters"
                      required
                      autoComplete="new-password"
                      value={form.password}
                      onChange={(e) => setField("password", e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Confirm Password</label>
                  <input
                    type={showPw ? "text" : "password"}
                    className="input-base"
                    placeholder="Re-enter password"
                    required
                    autoComplete="new-password"
                    value={form.confirm_password}
                    onChange={(e) => setField("confirm_password", e.target.value)}
                  />
                  {form.confirm_password && form.password !== form.confirm_password && (
                    <p className="text-xs text-red-500 font-medium mt-1">Passwords do not match</p>
                  )}
                </div>

                <div className="p-3.5 rounded-xl bg-navy-50 border border-navy-100">
                  <p className="text-xs text-navy-700 leading-relaxed">
                    Your application will be reviewed by our team before you can sign in — typically within 1–2 business days.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn-primary !py-3 !text-base justify-center disabled:opacity-60"
                >
                  {isLoading ? <Loader2 size={18} className="animate-spin" /> : "Submit Application"}
                </button>
              </form>

              <div className="mt-5 pt-5 border-t border-slate-100 text-center">
                <a href="/login" className="text-xs text-slate-500 hover:text-navy-700">
                  Already approved? Sign in
                </a>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-navy-400 text-xs mt-6">
          Not applying to teach?{" "}
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
