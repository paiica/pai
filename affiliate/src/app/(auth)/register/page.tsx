"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, UserPlus } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/auth.store";

export default function RegisterPage() {
  const router = useRouter();
  const register = useAuthStore((s) => s.register);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "",
    phone: "", password: "", confirm_password: "",
  });
  const [showPw, setShowPw] = useState(false);

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
      toast.success("Registration submitted! Please verify your email.");
      router.replace("/verify-email");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Registration failed. Please try again.");
    }
  }

  return (
    <>
      <h1 className="text-2xl font-display font-black text-navy-900 mb-1">Become an Affiliate</h1>
      <p className="text-slate-500 text-sm mb-7">Apply to join the PAI sales affiliate program</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">First Name</label>
            <input className="input-base" placeholder="John" value={form.first_name} onChange={(e) => setField("first_name", e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Last Name</label>
            <input className="input-base" placeholder="Smith" value={form.last_name} onChange={(e) => setField("last_name", e.target.value)} required />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email address</label>
          <input className="input-base" type="email" placeholder="you@example.com" value={form.email} onChange={(e) => setField("email", e.target.value)} required autoComplete="email" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Phone (optional)</label>
          <input className="input-base" type="tel" placeholder="+1 (555) 000-0000" value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
          <div className="relative">
            <input className="input-base pr-12" type={showPw ? "text" : "password"} placeholder="Min. 8 characters" value={form.password} onChange={(e) => setField("password", e.target.value)} required autoComplete="new-password" />
            <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Confirm Password</label>
          <input className="input-base" type={showPw ? "text" : "password"} placeholder="Re-enter password" value={form.confirm_password} onChange={(e) => setField("confirm_password", e.target.value)} required autoComplete="new-password" />
        </div>

        <div className="bg-navy-50 border border-navy-100 rounded-xl p-3 text-xs text-navy-700">
          After registration, your account will be reviewed and approved by our team. You will receive an email notification once approved.
        </div>

        <button type="submit" disabled={isLoading} className="btn-primary w-full !py-3">
          {isLoading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
          {isLoading ? "Submitting…" : "Submit Application"}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-slate-100 text-center">
        <p className="text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="text-navy-700 font-semibold hover:text-navy-900">Sign In</Link>
        </p>
      </div>
    </>
  );
}
