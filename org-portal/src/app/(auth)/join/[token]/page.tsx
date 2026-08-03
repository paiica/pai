"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import Link from "next/link";
import { Eye, EyeOff, Loader2, ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { api, ApiError } from "@/lib/api";
import { MultiSelectPicker } from "@/components/ui/MultiSelectPicker";
import type { Certification } from "@/types";

const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3001";

const inputCls =
  "w-full h-12 px-4 rounded-lg border border-sand-300 bg-white text-ink-900 placeholder:text-sand-500 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all text-sm";

interface JoinInfo {
  organization_name: string;
  is_expired: boolean;
  seats_available: number;
}

export default function JoinOrgPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const { data: info, isLoading, error } = useSWR(
    `/org/join/${token}`,
    (url) => api.get<JoinInfo>(url),
  );
  const { data: certs } = useSWR("/courses/catalog", (url) => api.get<Certification[]>(url));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [certIds, setCertIds] = useState<string[]>([]);
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (certIds.length === 0) { toast.error("Select at least one certification"); return; }
    setSubmitting(true);
    try {
      await api.post(`/org/join/${token}`, {
        email, password, first_name: firstName, last_name: lastName, certification_ids: certIds,
      });
      setDone(true);
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "Failed to create account";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return <div className="py-8 text-center text-sand-500 text-sm">Loading…</div>;
  }

  if (error || !info) {
    return (
      <div className="text-center py-4">
        <XCircle size={36} className="text-red-400 mx-auto mb-3" />
        <h1 className="text-lg font-bold text-ink-900 mb-1">Invalid invite link</h1>
        <p className="text-sm text-sand-500">
          {error instanceof ApiError ? error.message : "This link is invalid or has been deactivated. Ask your org admin for a new one."}
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center py-4">
        <CheckCircle2 size={36} className="text-teal-500 mx-auto mb-3" />
        <h1 className="text-lg font-bold text-ink-900 mb-1">Check your email</h1>
        <p className="text-sm text-sand-500 mb-6">
          We sent a verification link to <span className="font-semibold">{email}</span>. Verify your
          address, then sign in to start your certification{certIds.length > 1 ? "s" : ""}.
        </p>
        <a
          href={`${FRONTEND_URL}/login`}
          className="w-full h-12 rounded-lg font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all bg-teal-500 hover:bg-teal-400"
        >
          Go to Sign In <ArrowRight size={16} />
        </a>
      </div>
    );
  }

  if (info.is_expired) {
    return (
      <div className="text-center py-4">
        <XCircle size={36} className="text-amber-500 mx-auto mb-3" />
        <h1 className="text-lg font-bold text-ink-900 mb-1">{info.organization_name}&apos;s subscription has expired</h1>
        <p className="text-sm text-sand-500">Contact your org admin to renew before new employees can join.</p>
      </div>
    );
  }

  if (info.seats_available <= 0) {
    return (
      <div className="text-center py-4">
        <XCircle size={36} className="text-amber-500 mx-auto mb-3" />
        <h1 className="text-lg font-bold text-ink-900 mb-1">No seats available</h1>
        <p className="text-sm text-sand-500">{info.organization_name} has no open seats right now. Contact your org admin.</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-ink-900 tracking-tight mb-1">Join {info.organization_name}</h1>
        <p className="text-sm text-sand-500">Create your account to start your organization&apos;s certification(s).</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wide">First Name</label>
            <input className={inputCls} value={firstName} onChange={(e) => setFirstName(e.target.value)} required maxLength={50} />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wide">Last Name</label>
            <input className={inputCls} value={lastName} onChange={(e) => setLastName(e.target.value)} required maxLength={50} />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wide">Email Address</label>
          <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wide">Password</label>
          <div className="relative">
            <input
              className={`${inputCls} pr-12`}
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sand-400 hover:text-ink-600 transition-colors p-1"
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p className="text-[11px] text-sand-500">At least 8 characters, with an uppercase letter, lowercase letter, and a number.</p>
        </div>

        <MultiSelectPicker
          label="Certification(s)"
          items={certs ?? []}
          selected={certIds}
          onChange={setCertIds}
          getId={(c) => c.id}
          getLabel={(c: Certification) => `${c.acronym} — ${c.title}`}
        />

        <button
          type="submit"
          disabled={submitting}
          className="w-full h-12 rounded-lg font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all shadow-teal disabled:opacity-60 bg-teal-500 hover:bg-teal-400 disabled:bg-ink-400"
        >
          {submitting ? <><Loader2 size={16} className="animate-spin" /> Creating account…</> : <>Create Account <ArrowRight size={16} /></>}
        </button>
      </form>

      <p className="text-center text-xs text-sand-500 mt-6">
        Already have a PAII account? <Link href={`${FRONTEND_URL}/login`} className="font-semibold text-teal-600">Sign in</Link> and ask your org admin to add you.
      </p>
    </>
  );
}
