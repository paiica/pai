"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Shield, Link2, CalendarClock, ExternalLink } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";

const PORTAL_URL = process.env.NEXT_PUBLIC_STUDENT_PORTAL_URL || "https://learn.paii.ca";

export default function LandingPage() {
  return (
    <Suspense>
      <LandingPageInner />
    </Suspense>
  );
}

function LandingPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { setSession, accessToken } = useAuthStore();

  const [tab, setTab] = useState<"link" | "schedule">("link");
  const [error, setError] = useState("");
  const [exchanging, setExchanging] = useState(false);

  const examToken = params.get("token");
  const attemptId = params.get("attempt") ?? params.get("attemptId");

  // Auto-exchange SSO token from student portal
  useEffect(() => {
    if (!examToken) return;
    setExchanging(true);
    api.post<any>("/auth/exchange-exam-token", { exam_token: examToken })
      .then((res) => {
        const data = res?.data ?? res;
        setSession(data.access_token, data.user);
        if (attemptId) {
          router.replace(`/exam/${attemptId}`);
        } else {
          router.replace("/no-attempt");
        }
      })
      .catch((e) => {
        setError(e?.message ?? "Your exam link has expired. Please contact your administrator.");
        setExchanging(false);
      });
  }, []);

  // Already authenticated with an attemptId — go straight in
  useEffect(() => {
    if (accessToken && attemptId && !examToken) {
      router.replace(`/exam/${attemptId}`);
    }
  }, [accessToken, attemptId]);

  if (exchanging) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center space-y-4">
          <Loader2 size={36} className="animate-spin text-navy-400 mx-auto" />
          <p className="text-slate-300 text-sm">Authenticating your session…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-navy-900 border border-navy-700 mb-4">
            <Shield size={28} className="text-navy-300" />
          </div>
          <h1 className="text-2xl font-black text-white">paiiexams</h1>
          <p className="text-slate-400 text-sm mt-1">Proctored Certification Exam Platform</p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="px-4 py-4 rounded-xl bg-red-900/30 border border-red-700 text-red-300 text-sm mb-5">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex rounded-xl bg-slate-900 border border-slate-800 p-1 mb-4">
          <button
            onClick={() => setTab("link")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === "link"
                ? "bg-slate-800 text-white"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Link2 size={14} />
            Exam Link
          </button>
          <button
            onClick={() => setTab("schedule")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === "schedule"
                ? "bg-slate-800 text-white"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <CalendarClock size={14} />
            My Schedule
          </button>
        </div>

        {/* Tab content */}
        {tab === "link" ? (
          <div className="card p-5 space-y-3">
            <div className="flex items-start gap-3">
              <Link2 size={16} className="text-navy-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-white font-semibold text-sm">You need an exam link</p>
                <p className="text-slate-400 text-sm mt-1 leading-relaxed">
                  Access is only through a unique link sent by your administrator, or by
                  launching the exam from your student portal when your session is open.
                </p>
              </div>
            </div>
            <p className="text-slate-600 text-xs pl-7">
              If you received a link, click it directly — do not navigate here manually.
            </p>
          </div>
        ) : (
          <div className="card p-5 space-y-4">
            <div className="flex items-start gap-3">
              <CalendarClock size={16} className="text-navy-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-white font-semibold text-sm">Find your scheduled exam</p>
                <p className="text-slate-400 text-sm mt-1 leading-relaxed">
                  Your exam schedule and countdown are in your student portal, under
                  the certification you are enrolled in.
                </p>
              </div>
            </div>
            <ol className="text-slate-400 text-xs space-y-2 pl-7 list-decimal list-inside">
              <li>Go to the student portal</li>
              <li>Open your certification</li>
              <li>Click <span className="text-white font-medium">Book &amp; Take Your Exam</span></li>
              <li>When the countdown reaches zero, click <span className="text-white font-medium">Launch Exam</span></li>
            </ol>
            <a
              href={PORTAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-navy-600 hover:bg-navy-500 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Go to Student Portal
              <ExternalLink size={14} />
            </a>
          </div>
        )}

        <p className="text-center mt-5">
          <a href="/demo" className="text-xs text-slate-600 hover:text-slate-400 underline underline-offset-2 transition-colors">
            Try the demo exam →
          </a>
        </p>
      </div>
    </div>
  );
}
