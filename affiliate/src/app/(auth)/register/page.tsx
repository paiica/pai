"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/auth.store";

const inputCls =
  "w-full h-12 px-4 rounded-lg border border-sand-300 bg-white text-ink-900 placeholder:text-sand-500 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all text-sm";

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
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 bg-teal-50 border border-teal-100">
          <CheckCircle2 size={32} className="text-teal-500" />
        </div>
        <h2 className="text-xl font-extrabold text-ink-900 mb-2">Application Submitted!</h2>
        <p className="text-sm text-sand-500 mb-2">
          We&rsquo;ve sent a verification email to <strong className="text-ink-700">{form.email}</strong>.
        </p>
        <p className="text-sm text-sand-500 mb-8">
          Once verified, our team will review your application and notify you upon approval.
        </p>
        <Link
          href="/login"
          className="w-full h-12 rounded-lg font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all bg-teal-500 hover:bg-teal-400 shadow-teal no-underline"
        >
          Go to Sign In <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-ink-900 tracking-tight mb-1">Become an Affiliate</h1>
        <p className="text-sm text-sand-500">Apply to join the PAII sales partner program</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wide">First Name</label>
            <input className={inputCls} placeholder="John" value={form.first_name} onChange={(e) => setField("first_name", e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wide">Last Name</label>
            <input className={inputCls} placeholder="Smith" value={form.last_name} onChange={(e) => setField("last_name", e.target.value)} required />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wide">Email Address</label>
          <input className={inputCls} type="email" placeholder="you@example.com" value={form.email} onChange={(e) => setField("email", e.target.value)} required autoComplete="email" />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wide">
            Phone <span className="normal-case font-normal text-sand-400">(optional)</span>
          </label>
          <input className={inputCls} type="tel" placeholder="+1 (555) 000-0000" value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wide">Password</label>
          <div className="relative">
            <input className={`${inputCls} pr-12`} type={showPw ? "text" : "password"} placeholder="Min. 8 characters" value={form.password} onChange={(e) => setField("password", e.target.value)} required autoComplete="new-password" />
            <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sand-400 hover:text-ink-600 transition-colors p-1">
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wide">Confirm Password</label>
          <input className={inputCls} type={showPw ? "text" : "password"} placeholder="Re-enter password" value={form.confirm_password} onChange={(e) => setField("confirm_password", e.target.value)} required autoComplete="new-password" />
          {form.confirm_password && form.password !== form.confirm_password && (
            <p className="text-xs text-red-500 font-medium">Passwords do not match</p>
          )}
        </div>

        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-teal-50 border border-teal-100">
          <ShieldCheck size={16} className="text-teal-500 shrink-0 mt-0.5" />
          <p className="text-xs text-teal-800 leading-relaxed">
            Your application will be reviewed by our team. You&rsquo;ll receive an email once approved — typically within 1–2 business days.
          </p>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-12 rounded-lg font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all shadow-teal disabled:opacity-60 bg-teal-500 hover:bg-teal-400 disabled:bg-ink-400"
        >
          {isLoading
            ? <><Loader2 size={16} className="animate-spin" /> Submitting…</>
            : <>Submit Application <ArrowRight size={16} /></>}
        </button>
      </form>

      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-sand-200" />
        <span className="text-xs text-sand-400 font-medium">Already a member?</span>
        <div className="flex-1 h-px bg-sand-200" />
      </div>

      <Link
        href="/login"
        className="w-full h-12 rounded-lg font-semibold text-sm text-ink-800 border-2 border-sand-300 flex items-center justify-center gap-2 hover:border-teal-400 hover:text-teal-700 transition-all no-underline"
      >
        Sign In to Dashboard
      </Link>
    </>
  );
}
