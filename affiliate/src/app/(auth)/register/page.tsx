"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/auth.store";

const inputCls = "w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-navy-500 focus:bg-white focus:ring-4 focus:ring-navy-500/10 transition-all";

export default function RegisterPage() {
  const router = useRouter();
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
        role: "sales_rep",
      } as any);
      setDone(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Registration failed. Please try again.");
    }
  }

  if (done) {
    return (
      <div className="text-center py-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ background: "linear-gradient(135deg, #d1fae5, #a7f3d0)" }}>
          <CheckCircle2 size={32} className="text-emerald-600" />
        </div>
        <h2 className="text-xl font-black text-navy-900 mb-2">Application Submitted!</h2>
        <p className="text-sm text-slate-500 mb-2">
          We've sent a verification email to <strong className="text-slate-700">{form.email}</strong>.
        </p>
        <p className="text-sm text-slate-500 mb-8">
          Once verified, our team will review your application and notify you upon approval.
        </p>
        <Link
          href="/login"
          className="w-full h-12 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all"
          style={{ background: "linear-gradient(135deg, #0f2347, #1a3a6b)" }}
        >
          Go to Sign In <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-navy-900 tracking-tight mb-1">Become an Affiliate</h1>
        <p className="text-sm text-slate-500">Apply to join the PAI sales partner program</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Name row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">First Name</label>
            <input className={inputCls} placeholder="John" value={form.first_name} onChange={(e) => setField("first_name", e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">Last Name</label>
            <input className={inputCls} placeholder="Smith" value={form.last_name} onChange={(e) => setField("last_name", e.target.value)} required />
          </div>
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">Email Address</label>
          <input className={inputCls} type="email" placeholder="you@example.com" value={form.email} onChange={(e) => setField("email", e.target.value)} required autoComplete="email" />
        </div>

        {/* Phone */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
            Phone <span className="normal-case font-normal text-slate-400">(optional)</span>
          </label>
          <input className={inputCls} type="tel" placeholder="+1 (555) 000-0000" value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">Password</label>
          <div className="relative">
            <input className={`${inputCls} pr-12`} type={showPw ? "text" : "password"} placeholder="Min. 8 characters" value={form.password} onChange={(e) => setField("password", e.target.value)} required autoComplete="new-password" />
            <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1">
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Confirm password */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">Confirm Password</label>
          <input className={inputCls} type={showPw ? "text" : "password"} placeholder="Re-enter password" value={form.confirm_password} onChange={(e) => setField("confirm_password", e.target.value)} required autoComplete="new-password" />
          {form.confirm_password && form.password !== form.confirm_password && (
            <p className="text-xs text-red-500 font-medium">Passwords do not match</p>
          )}
        </div>

        {/* Review notice */}
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-navy-50 border border-navy-100">
          <ShieldCheck size={16} className="text-navy-500 shrink-0 mt-0.5" />
          <p className="text-xs text-navy-700 leading-relaxed">
            Your application will be reviewed by our team. You'll receive an email once approved — typically within 1–2 business days.
          </p>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-12 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all disabled:opacity-70"
          style={{ background: isLoading ? "#374151" : "linear-gradient(135deg, #0f2347, #1a3a6b)" }}
        >
          {isLoading
            ? <><Loader2 size={16} className="animate-spin" /> Submitting…</>
            : <>Submit Application <ArrowRight size={16} /></>}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-slate-100" />
        <span className="text-xs text-slate-400 font-medium">Already a member?</span>
        <div className="flex-1 h-px bg-slate-100" />
      </div>

      <Link
        href="/login"
        className="w-full h-12 rounded-xl font-bold text-sm text-navy-800 border-2 border-slate-200 flex items-center justify-center gap-2 hover:border-navy-300 hover:bg-navy-50 transition-all"
      >
        Sign In to Dashboard
      </Link>
    </>
  );
}
