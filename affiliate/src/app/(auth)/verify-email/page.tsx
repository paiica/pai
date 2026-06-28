"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, CheckCircle, XCircle, Mail } from "lucide-react";
import { api } from "@/lib/api";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  useEffect(() => {
    if (!token) return;
    setStatus("loading");
    api.post("/auth/verify-email", { token })
      .then(() => setStatus("success"))
      .catch(() => setStatus("error"));
  }, [token]);

  if (!token) {
    return (
      <div className="text-center">
        <div className="w-14 h-14 bg-navy-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Mail size={28} className="text-navy-600" />
        </div>
        <h2 className="text-xl font-display font-black text-navy-900 mb-2">Check your inbox</h2>
        <p className="text-slate-500 text-sm">
          We sent a verification email to your address. Click the link in the email to continue.
        </p>
        <p className="text-xs text-slate-400 mt-4">After verification, an admin will review and approve your account.</p>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="text-center">
        <Loader2 size={36} className="animate-spin text-navy-600 mx-auto mb-4" />
        <p className="text-slate-600 font-medium">Verifying your email…</p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="text-center">
        <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={28} className="text-emerald-600" />
        </div>
        <h2 className="text-xl font-display font-black text-navy-900 mb-2">Email verified!</h2>
        <p className="text-slate-500 text-sm mb-6">Your email is verified. Our team will review your application and notify you once approved.</p>
        <Link href="/login" className="btn-primary w-full justify-center">Go to Sign In</Link>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <XCircle size={28} className="text-red-600" />
      </div>
      <h2 className="text-xl font-display font-black text-navy-900 mb-2">Verification failed</h2>
      <p className="text-slate-500 text-sm mb-6">This link may have expired or already been used.</p>
      <Link href="/login" className="btn-outline w-full justify-center">Back to Sign In</Link>
    </div>
  );
}

export default function VerifyEmailPage() {
  return <Suspense><VerifyEmailContent /></Suspense>;
}
