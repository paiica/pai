"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import toast from "react-hot-toast";
import {
  ChevronLeft, Loader2, AlertCircle, Send, CheckCircle,
  Clock, Star, ClipboardList, FlaskConical, Briefcase,
  BookOpen, Award, Lock,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const TYPE_META: Record<string, { label: string; icon: any; gradient: string; badge: string }> = {
  assignment: {
    label: "Assignment",
    icon: ClipboardList,
    gradient: "from-indigo-500 to-blue-600",
    badge: "bg-indigo-50 text-indigo-700 border border-indigo-100",
  },
  exam: {
    label: "Exam",
    icon: FlaskConical,
    gradient: "from-amber-400 to-orange-500",
    badge: "bg-amber-50 text-amber-700 border border-amber-100",
  },
  case: {
    label: "Case Study",
    icon: Briefcase,
    gradient: "from-purple-500 to-violet-600",
    badge: "bg-purple-50 text-purple-700 border border-purple-100",
  },
};

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r) => (r as any).data ?? r);
}

// ─────────────────────────────────────────────────────────────────────────────

export default function StudentAssignmentDetailPage() {
  const { id } = useParams() as { id: string };
  const token = useAuthStore((s) => s.accessToken)!;

  const { data, isLoading, error, mutate } = useSWR(
    token && id ? [`/assignments/${id}`, token] : null,
    ([url, t]) => fetcher(url, t)
  );

  const assignment = data ?? null;

  const sections: any[] = Array.isArray(assignment?.sections) ? assignment.sections : [];
  const entry = assignment?.entry ?? null;
  const existingResponses: any[] = entry?.section_responses ?? [];

  // Section text state
  const [sectionTexts, setSectionTexts] = useState<Record<string, string>>({});
  const [simpleText, setSimpleText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!assignment) return;
    if (sections.length > 0) {
      const init: Record<string, string> = {};
      sections.forEach((sec: any) => {
        const existing = existingResponses.find((r: any) => r.section_id === sec.id);
        init[sec.id] = existing?.text_content ?? "";
      });
      setSectionTexts(init);
    } else {
      setSimpleText(entry?.text_content ?? "");
    }
  }, [assignment?.id, entry?.id]);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      if (sections.length > 0) {
        const section_responses = sections.map((sec: any) => ({
          section_id: sec.id,
          text_content: sectionTexts[sec.id] ?? "",
        }));
        await api.post(`/assignments/${id}/submit`, { section_responses }, token);
      } else {
        if (!simpleText.trim()) { setSubmitting(false); return; }
        await api.post(`/assignments/${id}/submit`, { text_content: simpleText }, token);
      }
      toast.success(entry ? "Submission updated!" : "Submitted!");
      mutate();
    } catch {
      // handled by api layer
    } finally {
      setSubmitting(false);
    }
  }

  // ── Derived state ──────────────────────────────────────────────────────────
  const gradesReleased = assignment?.grades_released;
  const answeredCount = sections.length > 0
    ? sections.filter((sec: any) => (sectionTexts[sec.id] ?? "").trim()).length
    : simpleText.trim() ? 1 : 0;
  const totalSections = sections.length > 0 ? sections.length : 1;
  const progressPct = Math.round((answeredCount / totalSections) * 100);

  const canSubmit = sections.length > 0
    ? sections.some((sec: any) => (sectionTexts[sec.id] ?? "").trim())
    : !!simpleText.trim();

  function getStatusBadge() {
    if (!entry) {
      const due = assignment?.due_date ? new Date(assignment.due_date) : null;
      if (due && due < new Date()) return { label: "Overdue", cls: "bg-red-50 text-red-700 border border-red-100" };
      return { label: "Not submitted", cls: "bg-slate-100 text-slate-500 border border-slate-200" };
    }
    if (entry.grade !== null && entry.grade !== undefined) {
      return { label: `${entry.grade} / ${assignment?.max_score} pts`, cls: "bg-emerald-50 text-emerald-700 border border-emerald-100" };
    }
    if (entry.status === "graded") {
      return { label: "Graded · Pending release", cls: "bg-blue-50 text-blue-700 border border-blue-100" };
    }
    return { label: "Submitted · Pending grade", cls: "bg-amber-50 text-amber-700 border border-amber-100" };
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f7f8fa] flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-slate-300" />
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <div className="min-h-screen bg-[#f7f8fa]">
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <AlertCircle size={36} className="text-red-300 mx-auto mb-3" />
          <p className="text-slate-600 font-semibold text-sm">Assignment not found or you are not enrolled.</p>
          <Link href="/student/assignments" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-navy-700 mt-4">
            <ChevronLeft size={13} /> Back to Assignments
          </Link>
        </div>
      </div>
    );
  }

  const tm = TYPE_META[assignment.type] ?? TYPE_META.assignment;
  const TypeIcon = tm.icon;
  const status = getStatusBadge();
  const due = assignment.due_date ? new Date(assignment.due_date) : null;
  const isOverdue = due && due < new Date() && !entry;

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="max-w-3xl mx-auto px-6 py-10">

        {/* Back link */}
        <Link
          href="/student/assignments"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-navy-700 transition-colors mb-6"
        >
          <ChevronLeft size={13} /> My Assignments
        </Link>

        {/* ── Hero card ─────────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm mb-5">
          {/* Gradient banner */}
          <div className={cn("relative h-24 flex flex-col justify-end px-6 pb-4 bg-gradient-to-r", tm.gradient)}>
            <div className="absolute inset-0 bg-black/10" />
            <div className="relative flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <TypeIcon size={20} className="text-white" />
              </div>
              <span className="text-xs font-black text-white/80 uppercase tracking-widest">{tm.label}</span>
            </div>
          </div>

          <div className="px-6 py-5">
            <h1 className="text-2xl font-display font-black text-navy-900 mb-3 leading-tight">
              {assignment.title}
            </h1>

            {/* Meta row */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", status.cls)}>
                {status.label}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-full">
                <BookOpen size={11} />
                {assignment.certification?.acronym}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-full">
                <Award size={11} />
                {assignment.max_score} pts
              </span>
              {due && (
                <span className={cn(
                  "flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border",
                  isOverdue
                    ? "bg-red-50 text-red-600 border-red-100"
                    : "bg-slate-50 text-slate-400 border-slate-100"
                )}>
                  <Clock size={11} />
                  {isOverdue ? "Was due " : "Due "}
                  {due.toLocaleDateString("en-CA", { dateStyle: "medium" })}
                </span>
              )}
            </div>

            {/* Progress bar (when there are sections) */}
            {sections.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                  <span>{answeredCount} of {sections.length} sections answered</span>
                  <span>{progressPct}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      progressPct === 100 ? "bg-emerald-500" : `bg-gradient-to-r ${tm.gradient}`
                    )}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Description ───────────────────────────────────────────────────── */}
        {assignment.description && (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 mb-4 shadow-sm">
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.1em] mb-2">About</p>
            <p className="text-sm text-slate-600 leading-relaxed">{assignment.description}</p>
          </div>
        )}

        {/* ── Instructions ──────────────────────────────────────────────────── */}
        {assignment.instructions && (
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 px-6 py-5 mb-5 shadow-sm">
            <p className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.1em] mb-2">Instructions</p>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{assignment.instructions}</p>
          </div>
        )}

        {/* ── Sections ──────────────────────────────────────────────────────── */}
        {sections.length > 0 ? (
          <div className="space-y-4 mb-6">
            {sections.map((sec: any, idx: number) => {
              const resp = existingResponses.find((r: any) => r.section_id === sec.id);
              const hasGrade = gradesReleased && resp?.grade != null;
              const text = sectionTexts[sec.id] ?? "";

              return (
                <div
                  key={sec.id}
                  className={cn(
                    "rounded-2xl border bg-white overflow-hidden shadow-sm transition-all",
                    text.trim() ? "border-slate-200" : "border-slate-200"
                  )}
                >
                  {/* Section header */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full bg-navy-100 text-navy-700 text-xs font-black flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="font-semibold text-navy-900 text-sm leading-snug">{sec.title}</p>
                        {sec.description && (
                          <p className="text-xs text-slate-500 mt-0.5">{sec.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      {hasGrade ? (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full flex items-center gap-1">
                          <CheckCircle size={11} /> {resp.grade} / {sec.points} pts
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-full flex items-center gap-1">
                          <Star size={10} /> {sec.points} pts
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Response area */}
                  <div className="px-5 py-4 space-y-3">
                    <textarea
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-200 focus:border-navy-300 resize-none transition-all"
                      rows={5}
                      placeholder="Write your response for this section…"
                      value={text}
                      onChange={(e) => setSectionTexts((prev) => ({ ...prev, [sec.id]: e.target.value }))}
                    />

                    {/* Graded section feedback */}
                    {hasGrade && resp?.feedback && (
                      <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3">
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Instructor Feedback</p>
                        <p className="text-sm text-emerald-800 italic">"{resp.feedback}"</p>
                      </div>
                    )}

                    {/* Grades hidden banner */}
                    {entry?.status === "graded" && !gradesReleased && (
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Lock size={11} />
                        <span>Grades not yet released by your instructor</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* No sections — simple text response */
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm mb-6">
            <div className="px-5 py-4 border-b border-slate-100">
              <p className="font-semibold text-navy-900 text-sm">Your Response</p>
            </div>
            <div className="px-5 py-4 space-y-3">
              <textarea
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-200 focus:border-navy-300 resize-none transition-all"
                rows={7}
                placeholder="Write your response here…"
                value={simpleText}
                onChange={(e) => setSimpleText(e.target.value)}
              />
              {entry?.status === "graded" && !gradesReleased && (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Lock size={11} />
                  <span>Grades not yet released by your instructor</span>
                </div>
              )}
              {gradesReleased && entry?.feedback && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Instructor Feedback</p>
                  <p className="text-sm text-emerald-800 italic">"{entry.feedback}"</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Overall feedback (grades released) ────────────────────────────── */}
        {gradesReleased && entry?.feedback && sections.length > 0 && (
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-6 py-5 mb-6 shadow-sm">
            <p className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.1em] mb-2">Overall Feedback</p>
            <p className="text-sm text-emerald-800 italic leading-relaxed">"{entry.feedback}"</p>
          </div>
        )}

        {/* ── Submit button ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">
            {entry
              ? entry.grade != null && gradesReleased
                ? `Final score: ${entry.grade} / ${assignment.max_score} pts`
                : "Submitted — you can still update your response"
              : "Your responses are saved when you submit"}
          </p>
          <button
            onClick={handleSubmit}
            disabled={submitting || !canSubmit}
            className={cn(
              "inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed",
              entry
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-navy-900 hover:bg-navy-700 text-white"
            )}
          >
            {submitting
              ? <Loader2 size={14} className="animate-spin" />
              : entry ? <CheckCircle size={14} /> : <Send size={14} />}
            {entry ? "Update Submission" : "Submit Assignment"}
          </button>
        </div>

      </div>
    </div>
  );
}
