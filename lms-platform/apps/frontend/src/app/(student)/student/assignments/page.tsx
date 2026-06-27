"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { FileText, Clock, Send, Loader2, CheckCircle } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r) => r.data ?? r);
}

// ── Status helpers ────────────────────────────────────────────────────────────

function getLessonStatus(a: any) {
  const sub = a.submission;
  if (!sub) {
    const due = a.due_date ? new Date(a.due_date) : null;
    if (due && due < new Date()) return { label: "Overdue", style: "badge bg-red-100 text-red-700" };
    return { label: "Not submitted", style: "badge bg-slate-100 text-slate-500" };
  }
  if (sub.grade !== null && sub.grade !== undefined) {
    return { label: `Graded: ${sub.grade}/${a.max_score ?? 100}`, style: "badge bg-emerald-100 text-emerald-700" };
  }
  return { label: "Submitted · Pending", style: "badge bg-blue-100 text-blue-700" };
}

function getStandaloneStatus(a: any) {
  const entry = a.entry;
  if (!entry) {
    const due = a.due_date ? new Date(a.due_date) : null;
    if (due && due < new Date()) return { label: "Overdue", style: "badge bg-red-100 text-red-700" };
    return { label: "Not submitted", style: "badge bg-slate-100 text-slate-500" };
  }
  if (entry.grade !== null && entry.grade !== undefined) {
    return { label: `Graded: ${entry.grade}/${a.max_score}`, style: "badge bg-emerald-100 text-emerald-700" };
  }
  return { label: "Submitted · Pending", style: "badge bg-blue-100 text-blue-700" };
}

// ── Standalone assignment submit ──────────────────────────────────────────────

function StandaloneSubmitPanel({ assignment, token, onDone }: {
  assignment: any; token: string; onDone: () => void;
}) {
  const [text, setText] = useState(assignment.entry?.text_content ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      await api.post(`/assignments/${assignment.id}/submit`, { text_content: text }, token);
      onDone();
    } catch { /* toast handled by api layer */ }
    setSubmitting(false);
  }

  const alreadySubmitted = !!assignment.entry;

  return (
    <div className="mt-3 space-y-2">
      {assignment.instructions && (
        <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3 whitespace-pre-wrap">{assignment.instructions}</p>
      )}
      <textarea
        className="input-base text-sm h-28 resize-none"
        placeholder="Write your response here…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button
        onClick={submit}
        disabled={submitting || !text.trim()}
        className="btn-primary !py-2 !px-5 !text-xs disabled:opacity-50 inline-flex"
      >
        {submitting
          ? <Loader2 size={12} className="animate-spin" />
          : alreadySubmitted ? <CheckCircle size={12} /> : <Send size={12} />}
        {alreadySubmitted ? "Update Submission" : "Submit"}
      </button>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function StudentAssignmentsPage() {
  const token = useAuthStore((s) => s.accessToken)!;
  const [openSubmit, setOpenSubmit] = useState<string | null>(null);

  // Lesson-based assignments (existing)
  const { data: lessonAssignments, isLoading: loadingLesson } = useSWR(
    token ? ["/learn/assignments", token] : null,
    ([url, t]) => fetcher(url, t)
  );

  // Standalone assignments (new)
  const { data: standaloneAssignments, isLoading: loadingStandalone, mutate: mutateStandalone } = useSWR(
    token ? ["/assignments", token] : null,
    ([url, t]) => fetcher(url, t)
  );

  const isLoading = loadingLesson || loadingStandalone;

  // Normalize lesson-based items
  const lessonItems: any[] = (Array.isArray(lessonAssignments) ? lessonAssignments : []).map((a: any) => ({
    _type: "lesson",
    key: `lesson-${a.lesson_id}`,
    lesson_id: a.lesson_id,
    title: a.title,
    description: null,
    due_date: a.due_date,
    max_score: a.max_score ?? 100,
    certification: a.certification,
    status: getLessonStatus(a),
    feedback: a.submission?.feedback ?? null,
    submission: a.submission,
  }));

  // Normalize standalone items
  const standaloneItems: any[] = (Array.isArray(standaloneAssignments) ? standaloneAssignments : []).map((a: any) => ({
    _type: "standalone",
    key: `standalone-${a.id}`,
    id: a.id,
    title: a.title,
    description: a.description,
    instructions: a.instructions,
    due_date: a.due_date,
    max_score: a.max_score,
    certification: a.certification,
    status: getStandaloneStatus(a),
    feedback: a.entry?.feedback ?? null,
    entry: a.entry,
  }));

  const allItems = [...standaloneItems, ...lessonItems];

  const grouped = allItems.reduce((acc: Record<string, any[]>, a) => {
    const key = a.certification?.acronym ?? "General";
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-display font-black text-navy-900">My Assignments</h1>
          <p className="text-slate-500 mt-1">All assignments across your enrolled certifications.</p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="card h-20 animate-pulse bg-slate-100" />)}
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="card p-12 text-center text-slate-500">
            <FileText size={40} className="mx-auto mb-4 text-slate-300" />
            <p className="font-semibold">No assignments yet</p>
            <p className="text-sm mt-1">Assignments will appear here once your instructor creates them.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([cert, items]) => (
              <div key={cert}>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">{cert}</p>
                <div className="space-y-2">
                  {(items as any[]).map((a) => {
                    const due = a.due_date ? new Date(a.due_date) : null;
                    const isStandalone = a._type === "standalone";
                    const isOpen = openSubmit === a.key;

                    return (
                      <div key={a.key} className="card p-4">
                        <div className="flex items-center gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-navy-900 text-sm">{a.title}</p>
                              <span className={a.status.style}>{a.status.label}</span>
                              {isStandalone && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600">
                                  Assignment
                                </span>
                              )}
                            </div>
                            {a.description && (
                              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{a.description}</p>
                            )}
                            {due && (
                              <p className={cn("text-xs mt-0.5 flex items-center gap-1",
                                due < new Date() && !a.entry && !a.submission ? "text-red-500" : "text-slate-400"
                              )}>
                                <Clock size={11} />
                                Due {due.toLocaleDateString("en-CA", { dateStyle: "medium" })}
                              </p>
                            )}
                            {a.feedback && (
                              <p className="text-xs text-slate-500 mt-1 italic">"{a.feedback}"</p>
                            )}
                          </div>

                          {isStandalone && (
                            <button
                              onClick={() => setOpenSubmit(isOpen ? null : a.key)}
                              className={cn(
                                "btn-outline !py-1.5 !px-3 !text-xs flex-shrink-0",
                                a.entry ? "text-emerald-600 border-emerald-200 hover:bg-emerald-50" : ""
                              )}
                            >
                              {a.entry ? <CheckCircle size={11} /> : <Send size={11} />}
                              {a.entry ? "Edit" : "Submit"}
                            </button>
                          )}
                        </div>

                        {isStandalone && isOpen && (
                          <StandaloneSubmitPanel
                            assignment={a}
                            token={token}
                            onDone={() => { mutateStandalone(); setOpenSubmit(null); }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
