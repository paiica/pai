"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { CheckCircle, ArrowRight, BookOpen, Award } from "lucide-react";
import { useCartStore } from "@/store/cart.store";

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const isCertification = searchParams.get("type") === "certification";
  const [show, setShow] = useState(false);
  const fetchCart = useCartStore((s) => s.fetchCart);
  const t = useTranslations("CartSuccess");

  useEffect(() => { setTimeout(() => setShow(true), 100); }, []);
  // The webhook that fulfilled this purchase already removed the item from
  // the account cart server-side — refresh so the cart badge/page reflect
  // that immediately instead of showing stale pre-purchase state.
  useEffect(() => { fetchCart(); }, [fetchCart]);

  return (
    <div className="min-h-screen bg-[#f7f8fa] flex items-center justify-center p-8">
      <div className={`max-w-md w-full text-center transition-all duration-500 ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${isCertification ? "bg-blue-100" : "bg-emerald-100"}`}>
          {isCertification
            ? <Award size={40} className="text-blue-600" />
            : <CheckCircle size={40} className="text-emerald-600" />}
        </div>

        <h1 className="text-2xl font-display font-black text-navy-900 mb-2">
          {isCertification ? t("certHeading") : t("courseHeading")}
        </h1>
        <p className="text-slate-500 mb-8">
          {isCertification ? t("certBody") : t("courseBody")}
        </p>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {isCertification ? (
            <>
              <Link
                href="/certificates"
                className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl border border-slate-200 hover:border-navy-300 hover:shadow-sm transition-all text-center"
              >
                <Award size={20} className="text-gold-600" />
                <span className="text-sm font-semibold text-navy-900">{t("myCertifications")}</span>
                <span className="text-xs text-slate-400">{t("trackApplication")}</span>
              </Link>
              <Link
                href="/tools"
                className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl border border-slate-200 hover:border-navy-300 hover:shadow-sm transition-all text-center"
              >
                <BookOpen size={20} className="text-navy-600" />
                <span className="text-sm font-semibold text-navy-900">{t("browseCourses")}</span>
                <span className="text-xs text-slate-400">{t("prepareWhileYouWait")}</span>
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/learn"
                className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl border border-slate-200 hover:border-navy-300 hover:shadow-sm transition-all text-center"
              >
                <BookOpen size={20} className="text-navy-600" />
                <span className="text-sm font-semibold text-navy-900">{t("myCourses")}</span>
                <span className="text-xs text-slate-400">{t("startLearning")}</span>
              </Link>
              <Link
                href="/certificates"
                className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl border border-slate-200 hover:border-navy-300 hover:shadow-sm transition-all text-center"
              >
                <Award size={20} className="text-gold-600" />
                <span className="text-sm font-semibold text-navy-900">{t("certifications")}</span>
                <span className="text-xs text-slate-400">{t("trackProgress")}</span>
              </Link>
            </>
          )}
        </div>

        <Link
          href="/tools"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-navy-700 transition-colors"
        >
          {t("browseMoreCourses")} <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
