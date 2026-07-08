"use client";

import { Shield, ArrowLeft, BookOpen } from "lucide-react";

const STUDENT_PORTAL = process.env.NEXT_PUBLIC_STUDENT_PORTAL_URL || "https://learn.paii.ca";

export default function NoAttemptPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="max-w-sm w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-navy-900 border border-navy-700 mb-2">
          <Shield size={28} className="text-navy-300" />
        </div>

        <div>
          <h1 className="text-xl font-black text-white mb-2">No active exam</h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            You're logged in, but there's no exam attempt linked to this session.
            Launch your exam from the student portal — the exam room will open automatically.
          </p>
        </div>

        <div className="space-y-3">
          <a
            href={`${STUDENT_PORTAL}/dashboard`}
            className="flex items-center justify-center gap-2 w-full py-3 bg-navy-700 hover:bg-navy-600 text-white rounded-xl font-semibold text-sm transition-colors"
          >
            <BookOpen size={15} /> Go to Student Portal
          </a>
          <a
            href="/"
            className="flex items-center justify-center gap-2 w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold text-sm transition-colors"
          >
            <ArrowLeft size={15} /> Back to Login
          </a>
        </div>

        <a href="/demo" className="text-xs text-slate-500 hover:text-slate-300 underline underline-offset-2 transition-colors">
          Try the demo exam instead →
        </a>
      </div>
    </div>
  );
}
