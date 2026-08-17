"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Award, BookOpen, ArrowRight, Clock } from "lucide-react";

function ApplySuccessContent() {
  const t = useTranslations("ApplySuccess");
  const searchParams = useSearchParams();
  // session_id is present but we only use it for display — actual processing is done by the webhook
  const sessionId = searchParams.get("session_id");
  const [show, setShow] = useState(false);

  useEffect(() => { setTimeout(() => setShow(true), 100); }, []);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-8">
      <div
        className={`max-w-md w-full text-center transition-all duration-500 ${
          show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        {/* Icon */}
        <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-6">
          <Award size={40} className="text-blue-600" />
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-display font-black text-navy-900 mb-2">
          {t("heading")}
        </h1>
        <p className="text-slate-500 mb-3">
          {t("body")}
        </p>

        {/* Review timeline badge */}
        <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-8">
          <Clock size={12} />
          {t("reviewTimeline")}
        </div>

        {/* What happens next */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 text-left mb-6 space-y-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t("whatHappensNext")}</p>
          {[
            { step: "1", text: t("step1") },
            { step: "2", text: t("step2") },
            { step: "3", text: t("step3") },
          ].map(({ step, text }) => (
            <div key={step} className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-navy-900 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">
                {step}
              </span>
              <p className="text-sm text-slate-600">{text}</p>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3 mb-6">
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
        </div>

        <Link
          href="/learn"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-navy-700 transition-colors"
        >
          {t("goToDashboard")} <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
}

export default function ApplySuccessPage() {
  return (
    <Suspense>
      <ApplySuccessContent />
    </Suspense>
  );
}
