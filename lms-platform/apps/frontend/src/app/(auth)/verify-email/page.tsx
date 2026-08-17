"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { api, ApiError } from "@/lib/api";

function VerifyEmailContent() {
  const t = useTranslations("VerifyEmail");
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
        setMessage(err instanceof ApiError ? err.message : t("genericError"));
        setStatus("error");
      });
  }, [token]);

  if (status === "loading") {
    return (
      <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
        <Loader2 size={36} className="animate-spin text-navy-400 mx-auto mb-4" />
        <p className="text-slate-500 text-sm">{t("verifying")}</p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
        <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={28} className="text-emerald-500" />
        </div>
        <h2 className="text-xl font-display font-black text-navy-900 mb-2">{t("successHeading")}</h2>
        <p className="text-slate-500 text-sm mb-6">
          {t("successBody")}
        </p>
        <Link href="/login" className="btn-primary !py-3 w-full justify-center">
          {t("signIn")}
        </Link>
      </div>
    );
  }

  if (status === "missing") {
    return (
      <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
        <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={28} className="text-amber-500" />
        </div>
        <h2 className="text-xl font-display font-black text-navy-900 mb-2">{t("missingHeading")}</h2>
        <p className="text-slate-500 text-sm mb-6">
          {t("missingBody")}
        </p>
        <Link href="/login" className="btn-primary !py-3 w-full justify-center">
          {t("backToSignIn")}
        </Link>
      </div>
    );
  }

  // error
  return (
    <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
      <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <AlertCircle size={28} className="text-red-400" />
      </div>
      <h2 className="text-xl font-display font-black text-navy-900 mb-2">{t("failedHeading")}</h2>
      <p className="text-slate-500 text-sm mb-6">{message || t("failedBodyFallback")}</p>
      <Link href="/login" className="btn-primary !py-3 w-full justify-center">
        {t("backToSignIn")}
      </Link>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
