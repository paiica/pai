"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { api, ApiError } from "@/lib/api";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [status, setStatus] = useState<"loading" | "success" | "error" | "missing">(
    token ? "loading" : "missing"
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) return;
    api.post("/auth/verify-email", { token })
      .then(() => setStatus("success"))
      .catch((err) => {
        setMessage(err instanceof ApiError ? err.message : "Verification failed. The link may have expired.");
        setStatus("error");
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-2 mb-8">
          <img src="/paii.logo.png" alt="Professional Artificial Intelligence Institute" className="h-14 w-auto object-contain" style={{ filter: "brightness(0) invert(1)" }} />
          <div className="text-gold-400 text-xs uppercase tracking-widest font-semibold">Professor Portal</div>
        </div>

        {status === "loading" && (
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <Loader2 size={36} className="animate-spin text-navy-400 mx-auto mb-4" />
            <p className="text-slate-500 text-sm">Verifying your email address…</p>
          </div>
        )}

        {status === "success" && (
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={28} className="text-emerald-500" />
            </div>
            <h2 className="text-xl font-display font-black text-navy-900 mb-2">Email verified!</h2>
            <p className="text-slate-500 text-sm mb-6">Your email has been confirmed. You can now sign in to the professor portal.</p>
            <Link href="/login" className="btn-primary !py-3 w-full justify-center">Sign In</Link>
          </div>
        )}

        {status === "missing" && (
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={28} className="text-amber-500" />
            </div>
            <h2 className="text-xl font-display font-black text-navy-900 mb-2">No token found</h2>
            <p className="text-slate-500 text-sm mb-6">This link is invalid. Please use the link from your verification email.</p>
            <Link href="/login" className="btn-primary !py-3 w-full justify-center">Back to Sign In</Link>
          </div>
        )}

        {status === "error" && (
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={28} className="text-red-400" />
            </div>
            <h2 className="text-xl font-display font-black text-navy-900 mb-2">Verification failed</h2>
            <p className="text-slate-500 text-sm mb-6">{message || "This link may have expired or already been used."}</p>
            <Link href="/login" className="btn-primary !py-3 w-full justify-center">Back to Sign In</Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProfVerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
