"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle, ArrowRight, BookOpen, Award } from "lucide-react";

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [show, setShow] = useState(false);

  useEffect(() => { setTimeout(() => setShow(true), 100); }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
      <div className={`max-w-md w-full text-center transition-all duration-500 ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} className="text-emerald-600" />
        </div>

        <h1 className="text-2xl font-display font-black text-navy-900 mb-2">Payment Successful!</h1>
        <p className="text-slate-500 mb-8">
          You're enrolled. Your course access is now active — start learning right away.
        </p>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <Link
            href="/learn"
            className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl border border-slate-200 hover:border-navy-300 hover:shadow-sm transition-all text-center"
          >
            <BookOpen size={20} className="text-navy-600" />
            <span className="text-sm font-semibold text-navy-900">My Courses</span>
            <span className="text-xs text-slate-400">Start learning</span>
          </Link>
          <Link
            href="/certificates"
            className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl border border-slate-200 hover:border-navy-300 hover:shadow-sm transition-all text-center"
          >
            <Award size={20} className="text-gold-600" />
            <span className="text-sm font-semibold text-navy-900">Certifications</span>
            <span className="text-xs text-slate-400">Track progress</span>
          </Link>
        </div>

        <Link
          href="/tools"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-navy-700 transition-colors"
        >
          Browse more courses <ArrowRight size={13} />
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
