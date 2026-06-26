"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────────

interface EnrichedQuestion {
  id: string;
  question_text: string;
  options: string[];
  topic_tag: string;
  student_answer: number | null;
  correct_index: number | null;
  is_correct: boolean;
  explanation: string | null;
}

interface Section {
  tag: string;
  questions: EnrichedQuestion[];
  total: number;
  correct: number;
  score: number;
  passed: boolean;
}

interface AttemptDetail {
  id: string;
  status: string;
  score_percentage: number | null;
  passing_score: number;
  passed: boolean | null;
  total_questions: number;
  correct_answers: number;
  started_at: string;
  submitted_at: string | null;
  time_used_seconds: number | null;
  sections: Section[];
  user: {
    email: string;
    profile?: { first_name?: string; last_name?: string } | null;
  };
  enrollment: {
    certification: { title: string; acronym: string; passing_score: number };
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function pct(n: number) { return `${n}%`; }

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function MarkingPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const router = useRouter();
  const { accessToken } = useAuthStore();

  const [attempt, setAttempt]     = useState<AttemptDetail | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  // Per-section score overrides: tag → score string
  const [sectionScores, setSectionScores] = useState<Record<string, string>>({});
  const [sectionSaving, setSectionSaving] = useState(false);
  const [sectionMsg, setSectionMsg]       = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Whole-exam override
  const [overrideScore, setOverrideScore]   = useState("");
  const [overridePassed, setOverridePassed] = useState<boolean | null>(null);
  const [saving, setSaving]                 = useState(false);
  const [saveMsg, setSaveMsg]               = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Expanded sections
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  function loadAttempt(d: AttemptDetail) {
    setAttempt(d);
    setOverrideScore(d.score_percentage != null ? String(Math.round(Number(d.score_percentage))) : "");
    setOverridePassed(d.passed ?? null);
    if (d.sections?.length) {
      setExpandedSections(new Set(d.sections.map((s) => s.tag)));
      setSectionScores(Object.fromEntries(d.sections.map((s) => [s.tag, String(s.score)])));
    }
  }

  useEffect(() => {
    if (!accessToken || !attemptId) { setLoading(false); return; }
    api.get<any>(`/exams/admin/attempts/${attemptId}`, accessToken)
      .then((r) => loadAttempt(r.data ?? r))
      .catch((e) => setError(e.message ?? "Failed to load attempt."))
      .finally(() => setLoading(false));
  }, [accessToken, attemptId]);

  async function handleSectionScores() {
    if (!accessToken || !attemptId || !attempt) return;
    setSectionSaving(true);
    setSectionMsg(null);
    try {
      const sections = attempt.sections;
      const scores = sections.map((s) => {
        const raw = parseFloat(sectionScores[s.tag] ?? "");
        if (isNaN(raw) || raw < 0 || raw > 100) throw new Error(`Invalid score for "${s.tag}"`);
        return raw;
      });
      // Weighted average by number of questions in each section
      const totalQ = sections.reduce((sum, s) => sum + s.total, 0);
      const weighted = totalQ > 0
        ? Math.round(sections.reduce((sum, s, i) => sum + scores[i] * s.total, 0) / totalQ)
        : Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      const passed = weighted >= (attempt.passing_score ?? 70);
      await api.patch<any>(`/exams/admin/attempts/${attemptId}/score`, { score_percentage: weighted, passed }, accessToken);
      setSectionMsg({ type: "ok", text: `Saved — overall score recalculated to ${weighted}%` });
      const r = await api.get<any>(`/exams/admin/attempts/${attemptId}`, accessToken);
      loadAttempt(r.data ?? r);
    } catch (ex: any) {
      setSectionMsg({ type: "err", text: ex.message ?? "Failed." });
    } finally {
      setSectionSaving(false);
    }
  }

  async function handleOverride(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken || !attemptId) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const score = parseFloat(overrideScore);
      if (isNaN(score) || score < 0 || score > 100) throw new Error("Score must be 0–100");
      const passed = overridePassed ?? score >= (attempt?.passing_score ?? 70);
      await api.patch<any>(`/exams/admin/attempts/${attemptId}/score`, { score_percentage: score, passed }, accessToken);
      setSaveMsg({ type: "ok", text: "Score updated." });
      const r = await api.get<any>(`/exams/admin/attempts/${attemptId}`, accessToken);
      loadAttempt(r.data ?? r);
    } catch (ex: any) {
      setSaveMsg({ type: "err", text: ex.message ?? "Failed." });
    } finally {
      setSaving(false);
    }
  }

  function toggleSection(tag: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }

  // ── Loading / Error ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        {[...Array(4)].map((_, i) => <div key={i} className="card h-24 animate-pulse" />)}
      </div>
    );
  }

  if (error || !attempt) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="card p-10 text-center">
          <p className="text-red-400 text-sm mb-4">{error ?? "Attempt not found."}</p>
          <Link href="/results" className="btn-ghost text-xs">← Back to Results</Link>
        </div>
      </div>
    );
  }

  const studentName = attempt.user.profile
    ? `${attempt.user.profile.first_name ?? ""} ${attempt.user.profile.last_name ?? ""}`.trim() || attempt.user.email
    : attempt.user.email;

  const score = attempt.score_percentage != null ? Math.round(Number(attempt.score_percentage)) : null;
  const isPassed = attempt.passed;
  const allSectionsPassed = attempt.sections.every((s) => s.passed);
  const noQuestions = !attempt.sections?.length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link href="/results" className="text-slate-500 text-xs hover:text-slate-300 transition-colors inline-flex items-center gap-1 mb-2">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Results
          </Link>
          <h1 className="page-title">Marking View</h1>
          <p className="page-subtitle">{studentName} · {attempt.enrollment.certification.acronym}</p>
        </div>
        <div className={`px-4 py-2 rounded-xl text-sm font-bold border ${
          attempt.status === "in_progress"
            ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
            : isPassed
            ? "bg-green-500/10 border-green-500/30 text-green-400"
            : "bg-red-500/10 border-red-500/30 text-red-400"
        }`}>
          {attempt.status === "in_progress" ? "In Progress" : isPassed ? "Passed" : "Failed"}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Score", value: score != null ? pct(score) : "—", color: score != null && score >= attempt.passing_score ? "text-green-400" : "text-red-400" },
          { label: "Passing Score", value: pct(attempt.passing_score), color: "text-slate-300" },
          { label: "Correct", value: `${attempt.correct_answers} / ${attempt.total_questions}`, color: "text-white" },
          { label: "Time Used", value: attempt.time_used_seconds ? `${Math.round(attempt.time_used_seconds / 60)} min` : "—", color: "text-slate-300" },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <p className="text-slate-500 text-xs font-medium">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Student & attempt info */}
      <div className="card p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div className="space-y-1.5">
          <Row label="Student" value={studentName} />
          <Row label="Email" value={attempt.user.email} />
          <Row label="Certification" value={attempt.enrollment.certification.title} />
        </div>
        <div className="space-y-1.5">
          <Row label="Started" value={fmt(attempt.started_at)} />
          <Row label="Submitted" value={attempt.submitted_at ? fmt(attempt.submitted_at) : "Not submitted"} />
          <Row label="Attempt ID" value={attempt.id.slice(0, 8) + "…"} mono />
        </div>
      </div>

      {/* Section grading */}
      {attempt.sections.length > 0 && attempt.status !== "in_progress" && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold text-sm">Section Scores</h2>
            <p className="text-slate-500 text-xs">Edit any section score — overall recalculates automatically</p>
          </div>
          <div className="space-y-3">
            {attempt.sections.map((sec) => {
              const raw = parseFloat(sectionScores[sec.tag] ?? "");
              const display = isNaN(raw) ? sec.score : raw;
              const secPassed = display >= (attempt.passing_score ?? 70);
              return (
                <div key={sec.tag} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${secPassed ? "bg-green-500" : "bg-red-500"}`} />
                  <p className="text-slate-300 text-sm flex-1 min-w-0 truncate">{sec.tag}</p>
                  <p className="text-slate-600 text-xs tabular-nums shrink-0">{sec.correct}/{sec.total} auto</p>
                  <div className="relative shrink-0">
                    <input
                      type="number" min={0} max={100} step={1}
                      value={sectionScores[sec.tag] ?? ""}
                      onChange={(e) => setSectionScores((p) => ({ ...p, [sec.tag]: e.target.value }))}
                      className="input w-20 pr-6 text-right text-sm"
                      placeholder={String(sec.score)}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs pointer-events-none">%</span>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                    secPassed ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                  }`}>
                    {secPassed ? "Pass" : "Fail"}
                  </span>
                </div>
              );
            })}
          </div>
          {!allSectionsPassed && (
            <p className="text-amber-400 text-xs mt-3 pt-3 border-t border-slate-800">
              One or more sections did not meet the minimum {attempt.passing_score ?? 70}% passing score.
            </p>
          )}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={handleSectionScores}
              disabled={sectionSaving}
              className="btn-primary text-sm"
            >
              {sectionSaving ? "Saving…" : "Save Section Scores"}
            </button>
            {sectionMsg && (
              <span className={`text-xs ${sectionMsg.type === "ok" ? "text-green-400" : "text-red-400"}`}>
                {sectionMsg.text}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Score override */}
      {attempt.status !== "in_progress" && (
        <div className="card p-5">
          <h2 className="text-white font-semibold text-sm mb-4">Override Score</h2>
          <form onSubmit={handleOverride} className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[140px]">
              <label className="label">Score (%)</label>
              <input
                type="number" min={0} max={100} step={0.01}
                className="input"
                value={overrideScore}
                onChange={(e) => setOverrideScore(e.target.value)}
                placeholder="e.g. 82"
              />
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="label">Pass/Fail</label>
              <select
                className="input"
                value={overridePassed === null ? "" : overridePassed ? "true" : "false"}
                onChange={(e) => setOverridePassed(e.target.value === "" ? null : e.target.value === "true")}
              >
                <option value="">Auto (based on score)</option>
                <option value="true">Mark as Passed</option>
                <option value="false">Mark as Failed</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? "Saving…" : "Apply Override"}
              </button>
              {saveMsg && (
                <span className={`text-xs ${saveMsg.type === "ok" ? "text-green-400" : "text-red-400"}`}>
                  {saveMsg.text}
                </span>
              )}
            </div>
          </form>
        </div>
      )}

      {/* No questions yet */}
      {noQuestions && (
        <div className="card p-10 text-center">
          <p className="text-slate-500 text-sm">No questions recorded for this attempt yet.</p>
        </div>
      )}

      {/* Per-section question breakdown */}
      {attempt.sections.map((sec) => (
        <div key={sec.tag} className="card overflow-hidden">
          {/* Section header */}
          <button
            onClick={() => toggleSection(sec.tag)}
            className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/[0.02] transition-colors text-left"
          >
            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${sec.passed ? "bg-green-500" : "bg-red-500"}`} />
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm">{sec.tag}</p>
              <p className="text-slate-500 text-xs mt-0.5">
                {sec.correct} of {sec.total} correct · {pct(sec.score)}
                {" · "}
                <span className={sec.passed ? "text-green-400" : "text-red-400"}>
                  {sec.passed ? "Section Passed" : "Section Failed"}
                </span>
              </p>
            </div>
            <svg
              className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${expandedSections.has(sec.tag) ? "rotate-180" : ""}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Questions */}
          {expandedSections.has(sec.tag) && (
            <div className="border-t border-slate-800 divide-y divide-slate-800/60">
              {sec.questions.map((q, i) => (
                <QuestionRow key={q.id} q={q} index={i} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-slate-500 text-xs w-28 shrink-0 pt-0.5">{label}</span>
      <span className={`text-slate-200 text-xs break-all ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

function QuestionRow({ q, index }: { q: EnrichedQuestion; index: number }) {
  const [showExplanation, setShowExplanation] = useState(false);
  const options = Array.isArray(q.options) ? q.options : [];
  const notSubmitted = q.student_answer === null;

  return (
    <div className={`px-5 py-4 ${q.is_correct ? "bg-green-950/10" : notSubmitted ? "" : "bg-red-950/10"}`}>
      <div className="flex items-start gap-3 mb-3">
        <span className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
          notSubmitted ? "bg-slate-800 text-slate-500" : q.is_correct ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
        }`}>
          {notSubmitted ? "—" : q.is_correct ? "✓" : "✗"}
        </span>
        <p className="text-slate-200 text-sm leading-relaxed flex-1">
          <span className="text-slate-500 text-xs mr-2">Q{index + 1}.</span>
          {q.question_text}
        </p>
      </div>

      {options.length > 0 && (
        <div className="ml-8 space-y-1">
          {options.map((opt, idx) => {
            const isStudent = q.student_answer === idx;
            const isCorrect = q.correct_index === idx;
            let cls = "text-slate-500";
            let icon = null;
            if (isCorrect && isStudent) {
              cls = "text-green-400 font-medium";
              icon = <span className="text-green-400 text-xs">✓ Your answer (correct)</span>;
            } else if (isCorrect) {
              cls = "text-green-400/70";
              icon = <span className="text-green-400/70 text-xs">✓ Correct answer</span>;
            } else if (isStudent) {
              cls = "text-red-400 line-through";
              icon = <span className="text-red-400 text-xs">✗ Your answer</span>;
            }
            return (
              <div key={idx} className={`flex items-center gap-2 text-xs py-0.5 ${cls}`}>
                <span className="w-4 shrink-0 tabular-nums text-[10px]">{String.fromCharCode(65 + idx)}.</span>
                <span className="flex-1">{String(opt)}</span>
                {icon}
              </div>
            );
          })}
        </div>
      )}

      {notSubmitted && (
        <p className="ml-8 text-slate-600 text-xs mt-1 italic">Not answered</p>
      )}

      {q.explanation && (
        <div className="ml-8 mt-2">
          <button
            onClick={() => setShowExplanation((p) => !p)}
            className="text-slate-600 hover:text-slate-400 text-xs transition-colors"
          >
            {showExplanation ? "Hide explanation" : "Show explanation"}
          </button>
          {showExplanation && (
            <p className="text-slate-500 text-xs mt-1 leading-relaxed border-l-2 border-slate-700 pl-3">
              {q.explanation}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
