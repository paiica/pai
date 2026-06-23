"use client";

import { useState, useEffect } from "react";
import { Award, ShoppingCart, Clock, Loader2, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useCart } from "@/contexts/cart-context";
import LoginModal from "@/components/LoginModal";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
const LMS = process.env.NEXT_PUBLIC_LMS_URL  || "https://learn.paii.ca";

type AppStatus = "pending_payment" | "pending_review" | "approved" | "rejected" | "withdrawn";

export default function CertCTAButton({
  certId,
  certSlug,
  title,
  price,
  className,
}: {
  certId: string;
  certSlug: string;
  title: string;
  price: number;
  className?: string;
}) {
  const { user, accessToken, hydrated, ssoLink } = useAuth();
  const { addItem, hasItem }            = useCart();
  const [showLogin, setShowLogin]       = useState(false);
  const [appStatus, setAppStatus]       = useState<AppStatus | null>(null);
  const [checking,  setChecking]        = useState(false);

  const inCart    = hasItem(certId);
  const applyUrl  = ssoLink(`/apply/${certSlug}`);
  const base      = className ?? "w-full btn-primary !py-4 !text-base justify-center flex items-center gap-2 mb-3";

  useEffect(() => {
    if (!user || !accessToken) return;
    setChecking(true);
    fetch(`${API}/applications/my`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((json) => {
        const items: any[] = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
        const match = items.find((a: any) => a.certification_id === certId);
        setAppStatus(match?.status ?? null);
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [user, accessToken, certId]);

  function handleGetCertified() {
    if (!inCart) {
      addItem({ id: certId, type: "certification", slug: certSlug, title, price });
    }
    window.location.href = ssoLink("/cart");
  }

  if (!hydrated) {
    return (
      <div className={`${base} opacity-50 pointer-events-none`}>
        <Award size={18} /> Apply Now
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <button onClick={() => setShowLogin(true)} className={base}>
          <Award size={18} /> Sign In to Apply
        </button>
        {showLogin && (
          <LoginModal onClose={() => setShowLogin(false)} />
        )}
      </>
    );
  }

  if (checking) {
    return (
      <div className={`${base} opacity-60 pointer-events-none`}>
        <Loader2 size={18} className="animate-spin" /> Checking status…
      </div>
    );
  }

  if (appStatus === "pending_review") {
    return (
      <div className={`${base} !bg-amber-500 pointer-events-none`}>
        <Clock size={18} /> Application Under Review
      </div>
    );
  }

  if (appStatus === "approved") {
    if (inCart) {
      return (
        <button onClick={() => { window.location.href = ssoLink("/cart"); }} className={base}>
          <CheckCircle2 size={18} /> In Cart — View Cart
        </button>
      );
    }
    return (
      <button onClick={handleGetCertified} className={base}>
        <ShoppingCart size={18} /> Get Certified
      </button>
    );
  }

  if (appStatus === "pending_payment") {
    return (
      <a href={applyUrl} className={base}>
        <Award size={18} /> Complete Payment
      </a>
    );
  }

  return (
    <a href={applyUrl} className={base}>
      <Award size={18} />
      {appStatus === "rejected" || appStatus === "withdrawn" ? "Apply Again" : "Complete Application"}
    </a>
  );
}
