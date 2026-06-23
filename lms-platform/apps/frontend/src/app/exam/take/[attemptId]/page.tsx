"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import {
  Clock, ChevronLeft, ChevronRight, Check, AlertTriangle,
  Loader2, CheckCircle2, XCircle, Flag,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

// ── Exam timer ────────────────────────────────────────────────────────────────
function useExamTimer(timeLimitSeconds: number | null, startedAt: string | null, serverOffsetMs: number) {
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  useEffect(() => {
    if (!timeLimitSeconds || !startedAt) return;
    const endTime = new Date(startedAt).getTime() + timeLimitSeconds * 1000;
    const tick = () => {
      const serverNow = Date.now() + serverOffsetMs;
      setRemainingMs(Math.max(0, endTime - serverNow));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timeLimitSeconds, startedAt, serverOffsetMs]);

  return remainingMs;
}

function formatTimer(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

// ── Results screen ────────────────────────────────────────────────────────────
function ResultsScreen({ result, certTitle, onBack }: { result: any; certTitle: string; onBack: () => void }) {
  const { passed, score, correct_answers, total_questions } = result;
  return (
    <div className="min-h-screen bg-navy-900 flex flex-col items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className={cn(
          "w-20 h-20 rounded-full flex items-center justify-center mx-auto",
          passed ? "bg-emerald-500" : "bg-red-500"
        )}>
          {passed
            ? <CheckCircle2 size={40} className="text-white" />
            : <XCircle size={40} className="text-white" />}
        </div>

        <div>
          <h1 className={cn("text-3xl font-display font-black", passed ? "text-emerald-400" : "text-red-400")}>
            {passed ? "Congratulations!" : "Not Passed"}
          </h1>
          <p className="text-white/60 text-sm mt-2">{certTitle}</p>
        </div>

        <div className="bg-white/10 rounded-2xl p-6 space-y-4">
          <div className="text-5xl font-black text-white tabular-nums">{score}%</div>
          <div className="text-white/60 text-sm">{correct_answers} of {total_questions} correct</div>
          {passed && (
            <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-xl p-4 text-emerald-300 text-sm font-semibold">
              Your certificate will be issued shortly. Check your email and certificates page.
            </div>
          )}
          {!passed && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-300 text-sm">
              You did not meet the passing score. Contact support to schedule a retake.
            </div>
          )}
        </div>

        <button
          onClick={onBack}
          className="w-full py-3 bg-gold-500 text-white font-bold rounded-xl hover:bg-gold-400 transition-colors"
        >
          Return to My Certificates
        </button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ExamTakePage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const token = useAuthStore((s) => s.accessToken);
  const router = useRouter();

  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  useEffect(() => {
    fetch(`${API_BASE}/time`)
      .then((r) => r.json())
      .then((d) => {
        const serverTs: number = d?.data?.ts ?? d?.ts;
        if (serverTs) setServerOffsetMs(serverTs - Date.now());
      })
      .catch(() => {});
  }, []);

  const { data: attemptRaw, isLoading } = useSWR(
    token && attemptId ? [`/exams/attempts/${attemptId}`, token] : null,
    ([url, t]) => api.get<any>(url, t),
    { revalidateOnFocus: false },
  );

  const attempt = attemptRaw?.data ?? attemptRaw;
  const questions: any[] = (attempt?.answers as any)?.questions ?? [];
  const cert = attempt?.enrollment?.certification;

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const submittedRef = useRef(false);

  const remainingMs = useExamTimer(
    attempt?.time_limit_seconds ?? null,
    attempt?.started_at ?? null,
    serverOffsetMs,
  );

  // Auto-submit when time runs out
  useEffect(() => {
    if (remainingMs === 0 && !submittedRef.current && attempt?.status === "in_progress") {
      handleSubmit(true);
    }
  }, [remainingMs]);

  // Already submitted
  useEffect(() => {
    if (attempt && attempt.status !== "in_progress") {
      setResult({
        passed: attempt.passed,
        score: Number(attempt.score_percentage),
        correct_answers: attempt.correct_answers,
        total_questions: attempt.total_questions,
      });
    }
  }, [attempt]);

  async function handleSubmit(auto = false) {
    if (!token || submittedRef.current) return;
    if (!auto) {
      const unanswered = questions.filter((q) => answers[q.id] == null).length;
      if (unanswered > 0 && !showConfirm) {
        setShowConfirm(true);
        return;
      }
    }
    submittedRef.current = true;
    setSubmitting(true);
    setShowConfirm(false);
    try {
      const res = await api.post<any>(`/exams/attempts/${attemptId}/submit`, { answers }, token);
      const data = res?.data ?? res;
      setResult(data);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to submit");
      submittedRef.current = false;
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center">
        <p className="text-white/60">Please log in to take the exam.</p>
      </div>
    );
  }

  if (isLoading || !attempt) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-gold-500" />
      </div>
    );
  }

  if (result) {
    return (
      <ResultsScreen
        result={result}
        certTitle={cert?.title ?? "Certification Exam"}
        onBack={() => router.push("/certificates")}
      />
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center">
        <div className="text-center text-white/60">
          <AlertTriangle size={32} className="mx-auto mb-3 text-amber-400" />
          <p>No questions found for this attempt.</p>
        </div>
      </div>
    );
  }

  const q = questions[currentQ];
  const options: string[] = Array.isArray(q.options) ? q.options : Object.values(q.options ?? {});
  const answeredCount = Object.keys(answers).length;
  const totalQ = questions.length;
  const isLastQ = currentQ === totalQ - 1;
  const isWarning = remainingMs !== null && remainingMs < 5 * 60 * 1000;

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col">
      {/* Top bar */}
      <div className="bg-navy-900 border-b border-white/10 px-6 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <span className="text-white font-bold text-sm">{cert?.acronym ?? "Exam"}</span>
          <span className="text-white/40 text-xs">·</span>
          <span className="text-white/60 text-xs">Question {currentQ + 1} of {totalQ}</span>
        </div>

        <div className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold tabular-nums",
          isWarning ? "bg-red-500/20 text-red-400 animate-pulse" : "bg-white/10 text-white/80"
        )}>
          <Clock size={13} />
          {remainingMs !== null ? formatTimer(remainingMs) : "--:--"}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-white/50 text-xs">{answeredCount}/{totalQ} answered</span>
          <button
            onClick={() => handleSubmit()}
            disabled={submitting}
            className="px-4 py-1.5 bg-gold-500 text-white text-sm font-bold rounded-xl hover:bg-gold-400 transition-colors flex items-center gap-1.5 disabled:opacity-60"
          >
            {submitting ? <Loader2 size={12} className="animate-spin" /> : <Flag size={12} />}
            Submit Exam
          </button>
        </div>
      </div>

      {/* Question area */}
      <div className="flex-1 max-w-3xl w-full mx-auto px-6 py-8">
        {/* Progress dots */}
        <div className="flex items-center gap-1 flex-wrap mb-6">
          {questions.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentQ(i)}
              className={cn(
                "w-6 h-6 rounded-full text-[10px] font-bold transition-all border",
                i === currentQ
                  ? "bg-gold-500 text-white border-gold-400 scale-110"
                  : answers[questions[i].id] != null
                  ? "bg-emerald-500/30 text-emerald-300 border-emerald-500/40"
                  : "bg-white/5 text-white/40 border-white/10 hover:bg-white/10"
              )}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {/* Question */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-3">
            <span className="w-7 h-7 bg-gold-500/20 text-gold-400 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
              {currentQ + 1}
            </span>
            <p className="text-white text-base leading-relaxed font-medium">{q.question_text}</p>
          </div>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {options.map((option: string, idx: number) => {
            const selected = answers[q.id] === idx;
            return (
              <button
                key={idx}
                onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: idx }))}
                className={cn(
                  "w-full text-left px-5 py-4 rounded-xl border-2 transition-all flex items-center gap-4",
                  selected
                    ? "border-gold-400 bg-gold-500/10 text-white"
                    : "border-white/10 bg-white/5 text-white/70 hover:border-white/30 hover:bg-white/8 hover:text-white"
                )}
              >
                <span className={cn(
                  "w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors",
                  selected ? "border-gold-400 bg-gold-500 text-white" : "border-white/20 text-white/40"
                )}>
                  {selected ? <Check size={12} /> : String.fromCharCode(65 + idx)}
                </span>
                <span className="flex-1">{option}</span>
              </button>
            );
          })}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          <button
            onClick={() => setCurrentQ((q) => Math.max(0, q - 1))}
            disabled={currentQ === 0}
            className="flex items-center gap-2 px-5 py-2.5 border border-white/20 text-white/70 rounded-xl hover:bg-white/10 transition-colors disabled:opacity-30"
          >
            <ChevronLeft size={16} /> Previous
          </button>

          {isLastQ ? (
            <button
              onClick={() => handleSubmit()}
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-gold-500 text-white font-bold rounded-xl hover:bg-gold-400 transition-colors"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
              Review & Submit
            </button>
          ) : (
            <button
              onClick={() => setCurrentQ((q) => Math.min(totalQ - 1, q + 1))}
              className="flex items-center gap-2 px-5 py-2.5 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors"
            >
              Next <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Unanswered confirm modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-navy-900 border border-white/20 rounded-2xl p-6 max-w-sm w-full text-center space-y-4">
            <AlertTriangle size={32} className="text-amber-400 mx-auto" />
            <h3 className="text-white font-bold text-lg">Unanswered Questions</h3>
            <p className="text-white/60 text-sm">
              You have {totalQ - answeredCount} unanswered question{totalQ - answeredCount !== 1 ? "s" : ""}.
              Are you sure you want to submit?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 border border-white/20 text-white rounded-xl text-sm font-semibold hover:bg-white/10 transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={() => { setShowConfirm(false); handleSubmit(true); }}
                className="flex-1 py-2.5 bg-gold-500 text-white rounded-xl text-sm font-bold hover:bg-gold-400 transition-colors"
              >
                Submit Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
