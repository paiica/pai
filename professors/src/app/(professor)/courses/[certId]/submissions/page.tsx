"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import toast from "react-hot-toast";
import { FileText, CheckCircle, Download, ChevronDown, ChevronRight, Loader2, Clock, Users } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r: any) => r.data);
}

const STATUS_STYLES: Record<string, string> = {
  submitted: "badge bg-amber-100 text-amber-700",
  under_review: "badge bg-blue-100 text-blue-700",
  graded: "badge bg-emerald-100 text-emerald-700",
  returned: "badge bg-slate-100 text-slate-600",
};

function submissionFiles(s: any): { url: string; name: string }[] {
  const files: { url: string; name: string }[] = [];
  if (s.file_url) files.push({ url: s.file_url, name: s.file_name ?? "file" });
  for (const f of s.files ?? []) files.push({ url: f.file_url, name: f.file_name });
  return files;
}

function downloadAll(s: any) {
  // No zip library in this codebase — trigger each file as its own download
  // instead of bundling server-side.
  for (const f of submissionFiles(s)) {
    const a = document.createElement("a");
    a.href = f.url;
    a.target = "_blank";
    a.rel = "noreferrer";
    a.click();
  }
}

function AttemptHistory({ lessonId, studentUserId, token }: { lessonId: string; studentUserId: string; token: string }) {
  const { data: attempts } = useSWR(
    [`/prof/courses/lessons/${lessonId}/submissions/${studentUserId}/attempts`, token],
    ([url, t]) => fetcher(url, t)
  );
  if (!attempts) return <p className="text-xs text-slate-400 py-2">Loading attempt history…</p>;
  return (
    <div className="space-y-1.5 py-2">
      {attempts.map((a: any) => (
        <div key={a.id} className="flex items-center justify-between text-xs p-2.5 bg-white border border-slate-200 rounded-lg">
          <span className="font-medium text-slate-600 flex items-center gap-2">
            Attempt {a.attempt_number}{a.is_late && <span className="text-amber-600">· late</span>} — {formatDate(a.submitted_at)}
          </span>
          <span className="flex items-center gap-3">
            {submissionFiles(a).map((f) => (
              <a key={f.url} href={f.url} target="_blank" rel="noreferrer" className="text-navy-600 hover:text-navy-800 inline-flex items-center gap-1">
                <Download size={11} /> {f.name}
              </a>
            ))}
            <span className={a.grade != null ? "font-semibold text-emerald-600" : "text-slate-400"}>
              {a.grade != null ? `${a.grade} / ${a.max_grade ?? 100}` : "Not graded"}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

function LessonStatsHeader({ lessonId, token }: { lessonId: string; token: string }) {
  const { data: stats } = useSWR(
    [`/prof/courses/lessons/${lessonId}/statistics`, token],
    ([url, t]) => fetcher(url, t)
  );
  if (!stats) return null;
  return (
    <div className="flex items-center gap-4 flex-wrap text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 mb-3">
      <span className="flex items-center gap-1.5"><Users size={12} /> {stats.submitted}/{stats.enrolled} submitted</span>
      <span>{stats.graded} graded · {stats.awaiting_grading} awaiting</span>
      {stats.late > 0 && <span className="text-amber-600 flex items-center gap-1"><Clock size={12} /> {stats.late} late</span>}
      {stats.average != null && <span>Avg {stats.average}% (range {stats.lowest}–{stats.highest}%)</span>}
    </div>
  );
}

export default function CourseSubmissionsPage() {
  const { certId: courseId } = useParams<{ certId: string }>();
  const token = useAuthStore((s) => s.accessToken)!;
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [gradeInput, setGradeInput] = useState("");
  const [feedbackInput, setFeedbackInput] = useState("");
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({});
  const [exporting, setExporting] = useState(false);

  const { data: submissions, mutate } = useSWR(
    courseId && token ? [`/prof/courses/${courseId}/submissions`, token] : null,
    ([url, t]) => fetcher(url, t)
  );

  async function submitGrade(submissionId: string) {
    const grade = parseFloat(gradeInput);
    if (isNaN(grade)) return toast.error("Enter a valid grade");
    await toast.promise(
      api.put<any>(`/prof/courses/submissions/${submissionId}/grade`, { grade, feedback: feedbackInput }, token)
        .then(() => { setGradingId(null); setGradeInput(""); setFeedbackInput(""); mutate(); }),
      { loading: "Saving grade…", success: "Grade saved", error: "Failed" }
    );
  }

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch(`${API_BASE}/prof/courses/${courseId}/submissions/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gradebook-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  }

  const pendingCount = submissions?.filter((s: any) => s.status === "submitted").length ?? 0;

  // Group latest-attempt submissions by lesson so each assignment gets its
  // own statistics header, matching how a professor thinks about grading —
  // one assignment at a time, not one flat list across the whole course.
  const byLesson = new Map<string, { lesson: any; rows: any[] }>();
  for (const s of submissions ?? []) {
    const key = s.lesson?.id ?? "unknown";
    if (!byLesson.has(key)) byLesson.set(key, { lesson: s.lesson, rows: [] });
    byLesson.get(key)!.rows.push(s);
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-black text-navy-900">Assignment Submissions</h1>
          {pendingCount > 0 && (
            <p className="text-amber-600 text-sm mt-1 font-medium">
              {pendingCount} pending review
            </p>
          )}
        </div>
        {submissions && submissions.length > 0 && (
          <button onClick={handleExport} disabled={exporting} className="btn-outline text-xs py-2 disabled:opacity-60">
            {exporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} Export CSV
          </button>
        )}
      </div>

      {!submissions || submissions.length === 0 ? (
        <div className="card p-12 text-center text-slate-500">
          <FileText size={40} className="mx-auto mb-4 text-slate-300" />
          <p className="font-semibold">No submissions yet</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Array.from(byLesson.values()).map(({ lesson, rows }) => (
            <div key={lesson?.id ?? "unknown"}>
              <h2 className="text-sm font-bold text-navy-900 mb-2">{lesson?.title ?? "Assignment"}</h2>
              {lesson?.id && <LessonStatsHeader lessonId={lesson.id} token={token} />}

              <div className="space-y-3">
                {rows.map((s: any) => {
                  const files = submissionFiles(s);
                  const historyKey = `${s.lesson?.id}:${s.user_id}`;
                  const showHistory = expandedHistory[historyKey];
                  return (
                    <div key={s.id} className="card p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-9 h-9 rounded-full bg-navy-100 flex items-center justify-center flex-shrink-0 text-navy-700 font-bold text-sm">
                          {s.user?.profile?.first_name?.[0]}{s.user?.profile?.last_name?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-navy-900">
                              {s.user?.profile?.display_name ?? s.user?.profile?.first_name + " " + s.user?.profile?.last_name}
                            </p>
                            <span className={STATUS_STYLES[s.status] ?? "badge bg-slate-100 text-slate-600"}>{s.status}</span>
                            {s.is_late && <span className="badge bg-amber-100 text-amber-700">late</span>}
                            <span className="text-xs text-slate-400">attempt {s.attempt_number}</span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">Submitted {formatDate(s.submitted_at)}</p>

                          {s.text_content && (
                            <div className="mt-3 p-3 bg-slate-50 rounded-lg text-sm text-slate-700 border border-slate-100">
                              {s.text_content.slice(0, 200)}{s.text_content.length > 200 ? "…" : ""}
                            </div>
                          )}

                          {files.length > 0 && (
                            <div className="mt-2 flex items-center gap-3 flex-wrap">
                              {files.map((f) => (
                                <a key={f.url} href={f.url} target="_blank" rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 text-sm text-navy-600 hover:text-navy-800 font-medium">
                                  <Download size={14} /> {f.name}
                                </a>
                              ))}
                              {files.length > 1 && (
                                <button onClick={() => downloadAll(s)} className="text-xs text-slate-500 hover:text-navy-700 underline">
                                  Download all ({files.length})
                                </button>
                              )}
                            </div>
                          )}

                          {s.grade !== null && s.grade !== undefined && (
                            <div className="mt-3 flex items-center gap-2">
                              <CheckCircle size={15} className="text-emerald-600" />
                              <span className="text-sm font-semibold text-emerald-700">
                                Grade: {s.grade} / {s.lesson?.max_score ?? 100}
                              </span>
                              {s.feedback && <span className="text-sm text-slate-500">— {s.feedback}</span>}
                            </div>
                          )}

                          {s.attempt_number > 1 && (
                            <button
                              onClick={() => setExpandedHistory((prev) => ({ ...prev, [historyKey]: !prev[historyKey] }))}
                              className="mt-3 text-xs font-semibold text-navy-700 hover:text-navy-900 flex items-center gap-1"
                            >
                              {showHistory ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                              Attempt history ({s.attempt_number})
                            </button>
                          )}
                          {showHistory && s.lesson?.id && (
                            <AttemptHistory lessonId={s.lesson.id} studentUserId={s.user_id} token={token} />
                          )}
                        </div>

                        <div className="flex-shrink-0">
                          {gradingId === s.id ? (
                            <div className="space-y-2 min-w-48">
                              <input
                                type="number"
                                value={gradeInput}
                                onChange={(e) => setGradeInput(e.target.value)}
                                placeholder={`Score / ${s.lesson?.max_score ?? 100}`}
                                className="input-base text-sm py-1.5"
                                min={0}
                                max={s.lesson?.max_score ?? 100}
                              />
                              <textarea
                                value={feedbackInput}
                                onChange={(e) => setFeedbackInput(e.target.value)}
                                placeholder="Feedback (optional)"
                                className="input-base text-sm py-1.5 h-16 resize-none"
                              />
                              <div className="flex gap-2">
                                <button onClick={() => submitGrade(s.id)} className="btn-primary flex-1 py-1.5 text-xs">Save</button>
                                <button onClick={() => setGradingId(null)} className="btn-outline flex-1 py-1.5 text-xs">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setGradingId(s.id); setGradeInput(s.grade?.toString() ?? ""); setFeedbackInput(s.feedback ?? ""); }}
                              className="btn-outline text-xs py-2"
                            >
                              {s.grade !== null ? "Edit Grade" : "Grade"}
                            </button>
                          )}
                        </div>
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
  );
}
