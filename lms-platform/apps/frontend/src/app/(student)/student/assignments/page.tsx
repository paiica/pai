"use client";

import Link from "next/link";
import useSWR from "swr";
import { FileText, Clock, Send, Loader2, CheckCircle, ChevronRight, ClipboardList, FlaskConical, Briefcase, Award } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r) => (r as any).data ?? r);
}

const TYPE_META: Record<string, { icon: any; color: string }> = {
  assignment: { icon: ClipboardList, color: "bg-indigo-50 text-indigo-400" },
  exam:       { icon: FlaskConical,  color: "bg-amber-50 text-amber-400"  },
  case:       { icon: Briefcase,     color: "bg-purple-50 text-purple-400"},
};

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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function StudentAssignmentsPage() {
  const token = useAuthStore((s) => s.accessToken)!;

  // Lesson-based assignments (certifications)
  const { data: lessonAssignments, isLoading: loadingLesson } = useSWR(
    token ? ["/learn/assignments", token] : null,
    ([url, t]) => fetcher(url, t)
  );

  // Lesson-based assignments (prep courses)
  const { data: courseAssignments, isLoading: loadingCourse } = useSWR(
    token ? ["/prep-courses/my/assignments", token] : null,
    ([url, t]) => fetcher(url, t)
  );

  // Standalone assignments
  const { data: standaloneAssignments, isLoading: loadingStandalone } = useSWR(
    token ? ["/assignments", token] : null,
    ([url, t]) => fetcher(url, t)
  );

  const isLoading = loadingLesson || loadingCourse || loadingStandalone;

  // Normalize lesson-based items (certifications)
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
  }));

  // Normalize lesson-based items (prep courses)
  const courseLessonItems: any[] = (Array.isArray(courseAssignments) ? courseAssignments : []).map((a: any) => ({
    _type: "lesson",
    key: `course-lesson-${a.lesson_id}`,
    lesson_id: a.lesson_id,
    title: a.title,
    description: null,
    due_date: a.due_date,
    max_score: a.max_score ?? 100,
    certification: a.certification,
    status: getLessonStatus(a),
    feedback: a.submission?.feedback ?? null,
  }));

  // Normalize standalone items
  const standaloneItems: any[] = (Array.isArray(standaloneAssignments) ? standaloneAssignments : []).map((a: any) => ({
    _type: "standalone",
    key: `standalone-${a.id}`,
    id: a.id,
    type: a.type ?? "assignment",
    title: a.title,
    description: a.description,
    due_date: a.due_date,
    max_score: a.max_score,
    certification: a.certification,
    status: getStandaloneStatus(a),
    entry: a.entry,
    sections_count: Array.isArray(a.sections) ? a.sections.length : 0,
  }));

  const allItems = [...standaloneItems, ...lessonItems, ...courseLessonItems];

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
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border border-slate-200 bg-white h-[76px] animate-pulse" />
            ))}
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <FileText size={40} className="mx-auto mb-4 text-slate-300" />
            <p className="font-semibold text-slate-500">No assignments yet</p>
            <p className="text-sm mt-1 text-slate-400">Assignments will appear here once your instructor creates them.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([cert, items]) => (
              <div key={cert}>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.1em] mb-3">{cert}</p>
                <div className="space-y-2">
                  {(items as any[]).map((a) => {
                    const due = a.due_date ? new Date(a.due_date) : null;
                    const isStandalone = a._type === "standalone";
                    const tm = TYPE_META[a.type] ?? TYPE_META.assignment;
                    const TypeIcon = tm.icon;
                    const isOverdue = due && due < new Date() && !a.entry && !a.submission;

                    if (isStandalone) {
                      return (
                        <Link
                          key={a.key}
                          href={`/student/assignments/${a.id}`}
                          className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-slate-300 transition-all group"
                        >
                          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0", tm.color)}>
                            <TypeIcon size={16} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-navy-900 text-sm group-hover:text-navy-700">
                                {a.title}
                              </p>
                              <span className={a.status.style}>{a.status.label}</span>
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400 flex-wrap">
                              {a.sections_count > 0 && (
                                <span>{a.sections_count} section{a.sections_count !== 1 ? "s" : ""}</span>
                              )}
                              <span className="flex items-center gap-1"><Award size={10} />{a.max_score} pts</span>
                              {due && (
                                <span className={cn("flex items-center gap-1", isOverdue ? "text-red-500" : "")}>
                                  <Clock size={10} />
                                  {due.toLocaleDateString("en-CA", { dateStyle: "medium" })}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {a.entry ? (
                              <CheckCircle size={15} className="text-emerald-500" />
                            ) : (
                              <Send size={14} className="text-slate-300 group-hover:text-navy-400 transition-colors" />
                            )}
                            <ChevronRight size={15} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
                          </div>
                        </Link>
                      );
                    }

                    // Lesson-based assignment (non-clickable card)
                    return (
                      <div key={a.key} className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0">
                          <ClipboardList size={16} className="text-slate-400" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-navy-900 text-sm">{a.title}</p>
                            <span className={a.status.style}>{a.status.label}</span>
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-400">
                              In-course
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400">
                            <span className="flex items-center gap-1"><Award size={10} />{a.max_score} pts</span>
                            {due && (
                              <span className={cn("flex items-center gap-1", isOverdue ? "text-red-500" : "")}>
                                <Clock size={10} />
                                {due.toLocaleDateString("en-CA", { dateStyle: "medium" })}
                              </span>
                            )}
                          </div>
                          {a.feedback && (
                            <p className="text-xs text-slate-500 mt-1 italic">"{a.feedback}"</p>
                          )}
                        </div>
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
