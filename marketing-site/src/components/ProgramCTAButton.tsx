"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { GraduationCap, ShoppingCart, Loader2, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import LoginModal from "@/components/LoginModal";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

export default function ProgramCTAButton({
  programId,
  title,
  price,
  className,
}: {
  programId: string;
  title: string;
  price: number;
  className?: string;
}) {
  const t = useTranslations("ProgramDetail");
  const { user, accessToken, hydrated, ssoLink } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [enrolled, setEnrolled]   = useState(false);
  const [checking, setChecking]   = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  const base = className ?? "w-full btn-primary !py-4 !text-base justify-center flex items-center gap-2 mb-3";

  useEffect(() => {
    if (!user || !accessToken) return;
    setChecking(true);
    fetch(`${API}/programs/my`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        const items: any[] = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
        setEnrolled(items.some((e: any) => e.program?.id === programId));
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [user, accessToken, programId]);

  // Must await the checkout call before redirecting — a full page unload
  // (different origin, the LMS/Stripe) before the POST resolves would abort
  // the in-flight request, same reasoning as CertCTAButton's addItem call.
  async function handleEnroll() {
    if (!accessToken) return;
    setPurchasing(true);
    try {
      const res = await fetch(`${API}/payments/program-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ program_id: programId }),
      });
      if (!res.ok) throw new Error("Checkout failed");
      const json = await res.json();
      const data = json?.data ?? json;
      window.location.href = data.checkout_url || ssoLink("/dashboard");
    } catch {
      setPurchasing(false);
    }
  }

  if (!hydrated) {
    return (
      <div className={`${base} opacity-50 pointer-events-none`}>
        <GraduationCap size={18} /> {t("enrollNow")}
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <button onClick={() => setShowLogin(true)} className={base}>
          <GraduationCap size={18} /> {t("signInToEnroll")}
        </button>
        {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
      </>
    );
  }

  if (checking) {
    return (
      <div className={`${base} opacity-60 pointer-events-none`}>
        <Loader2 size={18} className="animate-spin" /> {t("checkingStatus")}
      </div>
    );
  }

  if (enrolled) {
    return (
      <a href={ssoLink("/dashboard")} className={base}>
        <CheckCircle2 size={18} /> {t("continueProgram")}
      </a>
    );
  }

  return (
    <button onClick={handleEnroll} disabled={purchasing} className={`${base} disabled:opacity-60`}>
      {purchasing ? <Loader2 size={18} className="animate-spin" /> : <ShoppingCart size={18} />}
      {purchasing ? t("redirecting") : price === 0 ? t("enrollFree") : t("enrollNowPrice", { price: price.toLocaleString() })}
    </button>
  );
}
