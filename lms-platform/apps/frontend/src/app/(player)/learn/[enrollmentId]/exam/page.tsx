"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { Calendar, Clock, Users, CheckCircle, AlertCircle, ArrowLeft, ExternalLink, Loader2, BookOpen, X } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const PAII_EXAMS_URL = process.env.NEXT_PUBLIC_PAIIEXAMS_URL || "http://localhost:3004";

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r) => r.data ?? r);
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-CA", { dateStyle: "long" });
}
function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" });
}
function fmtDateTime(d: string) {
  return `${fmt(d)} at ${fmtTime(d)}`;
}

// ── Countdown ──────────────────────────────────────────────────────────────────

function useCountdown(target: string | null) {
  const [diff, setDiff] = useState<number | null>(null);

  useEffect(() => {
    if (!target) { setDiff(null); return; }
    const targetMs = new Date(target).getTime();
    function tick() { setDiff(targetMs - Date.now()); }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  return diff;
}

function CountdownDisplay({ ms }: { ms: number }) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  const parts = d > 0
    ? [{ label: "days", v: d }, { label: "hrs", v: h }, { label: "min", v: m }, { label: "sec", v: s }]
    : [{ label: "hrs", v: h }, { label: "min", v: m }, { label: "sec", v: s }];

  return (
    <div className="flex items-center gap-3 justify-center">
      {parts.map(({ label, v }) => (
        <div key={label} className="text-center">
          <div className="w-14 h-14 bg-navy-900 rounded-xl flex items-center justify-center">
            <span className="text-2xl font-black text-white font-mono tabular-nums">{String(v).padStart(2, "0")}</span>
          </div>
          <p className="text-[10px] text-slate-400 uppercase tracking-wide mt-1">{label}</p>
        </div>
      ))}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ExamPage() {
  const { enrollmentId } = useParams<{ enrollmentId: string }>();
  const token = useAuthStore((s) => s.accessToken)!;
  const router = useRouter();

  const [launching, setLaunching] = useState(false);
  const [booking, setBooking] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Enrollment + certification info
  const { data: learnData } = useSWR(
    token ? [`/learn/${enrollmentId}`, token] : null,
    ([url, t]) => fetcher(url, t),
  );
  const enrollment = learnData?.enrollment;
  const cert = learnData?.certification;

  // Sessions + my booking
  const { data: sessionData, mutate: mutateSessions } = useSWR(
    token && cert?.id ? [`/exam-sessions?certification_id=${cert.id}`, token] : null,
    ([url, t]) => fetcher(url, t),
    { refreshInterval: 30_000 },
  );
  const sessions: any[] = sessionData?.sessions ?? [];
  const myBooking: any = sessionData?.myBooking ?? null;

  // My exam attempts
  const { data: attemptsRaw } = useSWR(
    token ? [`/exams/enrollments/${enrollmentId}/attempts`, token] : null,
    ([url, t]) => fetcher(url, t),
    { refreshInterval: 60_000 },
  );
  const attempts: any[] = Array.isArray(attemptsRaw) ? attemptsRaw : attemptsRaw?.data ?? [];

  const lastPassed = attempts.find((a) => a.passed);
  const inProgress = attempts.find((a) => a.status === "in_progress");

  // Countdown to booked session
  const bookedAt = myBooking?.exam_session?.scheduled_at ?? null;
  const countdownMs = useCountdown(bookedAt);
  const unlockMs = countdownMs !== null ? countdownMs - 3 * 60 * 1000 : null;
  const isUnlocked = unlockMs !== null && unlockMs <= 0;

  // If they have an in-progress attempt, we can resume directly
  const canResume = !!inProgress;
  const canLaunch = (isUnlocked || canResume) && (enrollment?.progress_percentage >= 100 || canResume);

  async function handleBook(sessionId: string) {
    setBooking(true);
    try {
      await api.post(`/exam-sessions/${sessionId}/book`, {}, token);
      mutateSessions();
    } catch (e: any) {
      alert(e?.message ?? "Booking failed");
    } finally {
      setBooking(false);
    }
  }

  async function handleCancel() {
    if (!myBooking) return;
    if (!confirm("Cancel your exam booking?")) return;
    setCancelling(true);
    try {
      await api.delete(`/exam-sessions/${myBooking.exam_session_id}/book`, token);
      mutateSessions();
    } catch (e: any) {
      alert(e?.message ?? "Cancel failed");
    } finally {
      setCancelling(false);
    }
  }

  async function handleLaunch() {
    setLaunching(true);
    try {
      let attemptId: string;

      if (inProgress) {
        attemptId = inProgress.id;
      } else {
        const startRes = await api.post<any>(
          `/exam-sessions/bookings/${myBooking.id}/start`, {}, token,
        );
        attemptId = (startRes?.data?.attemptId ?? startRes?.attemptId) as string;
      }

      // Generate SSO token
      const tokenRes = await api.post<any>("/auth/exam-token", {}, token);
      const examToken: string = tokenRes?.data?.exam_token ?? tokenRes?.exam_token;

      // Open paiiexams in a new tab
      const url = `${PAII_EXAMS_URL}/exam/${attemptId}?token=${encodeURIComponent(examToken)}`;
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      alert(e?.message ?? "Failed to launch exam");
    } finally {
      setLaunching(false);
    }
  }

  if (!learnData) {
    return (
      <div className="max-w-2xl mx-auto p-8 space-y-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-slate-100 animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      {/* Back */}
      <Link href={`/learn/${enrollmentId}`} className="flex items-center gap-2 text-sm text-slate-500 hover:text-navy-700 mb-6">
        <ArrowLeft size={14} /> Back to course
      </Link>

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <span className="text-5xl">{cert?.badge_icon}</span>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">{cert?.acronym}® Certification Exam</p>
          <h1 className="text-2xl font-display font-black text-navy-900 leading-tight">{cert?.title}</h1>
        </div>
      </div>

      {/* Prerequisite warning */}
      {(enrollment?.progress_percentage ?? 0) < 100 && !canResume && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
          <AlertCircle size={18} className="text-amber-500 flex-shrink-0" />
          <div>
            <p className="font-semibold text-amber-800 text-sm">Complete all lessons first</p>
            <p className="text-xs text-amber-600">You're at {enrollment?.progress_percentage ?? 0}% — finish all course lessons before booking the exam.</p>
          </div>
          <Link href={`/learn/${enrollmentId}`} className="ml-auto text-xs font-semibold text-amber-700 hover:text-amber-900 whitespace-nowrap">
            Continue →
          </Link>
        </div>
      )}

      {/* Passed certificate */}
      {lastPassed && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
          <CheckCircle size={18} className="text-emerald-500 flex-shrink-0" />
          <div>
            <p className="font-semibold text-emerald-800 text-sm">Exam Passed!</p>
            <p className="text-xs text-emerald-600">Score: {lastPassed.score_percentage}% on attempt #{lastPassed.attempt_number}</p>
          </div>
          <Link href="/certificates" className="ml-auto text-xs font-semibold text-emerald-700 hover:text-emerald-900">
            View Certificate →
          </Link>
        </div>
      )}

      {/* In-progress resume banner */}
      {inProgress && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3">
          <Clock size={18} className="text-blue-500 flex-shrink-0" />
          <div>
            <p className="font-semibold text-blue-800 text-sm">Exam in progress</p>
            <p className="text-xs text-blue-600">You have an active attempt — click Launch to re-enter the exam room.</p>
          </div>
          <button onClick={handleLaunch} disabled={launching} className="ml-auto flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors">
            {launching ? <Loader2 size={12} className="animate-spin" /> : <ExternalLink size={12} />} Resume
          </button>
        </div>
      )}

      {/* My booking + countdown */}
      {myBooking && !inProgress && (
        <div className="mb-8 rounded-2xl border border-navy-200 bg-navy-50 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-navy-500 mb-1">Your Booked Session</p>
              <p className="font-semibold text-navy-900">{myBooking.exam_session?.title || "Exam Session"}</p>
              <p className="text-sm text-navy-600 mt-0.5">{fmtDateTime(myBooking.exam_session?.scheduled_at)}</p>
              <p className="text-xs text-navy-500 mt-0.5">{myBooking.exam_session?.duration_minutes} minutes · {cert?.exam_questions_count} questions · Pass: {cert?.passing_score}%</p>
            </div>
            <button onClick={handleCancel} disabled={cancelling} className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors">
              {cancelling ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />} Cancel
            </button>
          </div>

          {countdownMs !== null && countdownMs > 0 ? (
            <div>
              <p className="text-xs text-navy-500 text-center mb-3">Exam starts in</p>
              <CountdownDisplay ms={countdownMs} />
              {unlockMs !== null && unlockMs > 0 && unlockMs < 30 * 60 * 1000 && (
                <p className="text-xs text-center text-navy-500 mt-3">
                  Launch button unlocks in {Math.ceil(unlockMs / 60000)} min
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-emerald-600 font-semibold text-center">Exam window is open!</p>
          )}

          <button
            onClick={handleLaunch}
            disabled={!canLaunch || launching}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all",
              canLaunch
                ? "bg-navy-900 hover:bg-navy-700 text-white"
                : "bg-slate-200 text-slate-400 cursor-not-allowed",
            )}
          >
            {launching ? <Loader2 size={16} className="animate-spin" /> : <ExternalLink size={16} />}
            {canLaunch ? "Launch Exam in paiiexams" : "Available 3 min before start"}
          </button>
        </div>
      )}

      {/* Exam info */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: "Questions", value: cert?.exam_questions_count ?? "—" },
          { label: "Duration", value: `${cert?.exam_duration_minutes ?? "—"} min` },
          { label: "Pass Score", value: `${cert?.passing_score ?? "—"}%` },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-center">
            <p className="text-lg font-black text-navy-900">{value}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</p>
          </div>
        ))}
      </div>

      {/* Attempt history */}
      {attempts.length > 0 && (
        <div className="mb-8">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Attempt History</p>
          <div className="space-y-2">
            {attempts.map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 bg-white">
                <div className={cn("w-2 h-2 rounded-full flex-shrink-0", a.passed ? "bg-emerald-500" : a.status === "in_progress" ? "bg-blue-400" : "bg-red-400")} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700">Attempt #{a.attempt_number}</p>
                  <p className="text-xs text-slate-400">{new Date(a.started_at).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className={cn("text-sm font-bold", a.passed ? "text-emerald-600" : a.status === "in_progress" ? "text-blue-600" : "text-red-500")}>
                    {a.status === "in_progress" ? "In Progress" : a.passed ? `Passed · ${a.score_percentage}%` : `Failed · ${a.score_percentage}%`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available sessions to book */}
      {!myBooking && (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Available Sessions</p>
          {sessions.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl">
              <Calendar size={28} className="mx-auto mb-2 opacity-40" />
              No upcoming sessions scheduled — check back soon.
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((s: any) => {
                const booked = s._count?.bookings ?? 0;
                const full = s.max_seats != null && booked >= s.max_seats;
                return (
                  <div key={s.id} className="rounded-xl border border-slate-200 bg-white p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex flex-col items-center justify-center flex-shrink-0">
                      <span className="text-xs font-black text-slate-600 leading-none">
                        {new Date(s.scheduled_at).toLocaleDateString("en-CA", { month: "short" }).toUpperCase()}
                      </span>
                      <span className="text-lg font-black text-navy-900 leading-none">
                        {new Date(s.scheduled_at).getDate()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-navy-900 text-sm">{s.title || "Exam Session"}</p>
                      <p className="text-xs text-slate-500">{fmtTime(s.scheduled_at)} · {s.duration_minutes} min</p>
                      {s.max_seats != null && (
                        <p className="text-xs text-slate-400">{s.max_seats - booked} seats left</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleBook(s.id)}
                      disabled={booking || full || (enrollment?.progress_percentage ?? 0) < 100}
                      className={cn(
                        "px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex-shrink-0",
                        full || (enrollment?.progress_percentage ?? 0) < 100
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                          : "bg-navy-900 hover:bg-navy-700 text-white",
                      )}
                    >
                      {booking ? <Loader2 size={12} className="animate-spin" /> : full ? "Full" : "Book"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
