"use client";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";

interface Attempt {
  id: string;
  student_email: string;
  student_name?: string;
  cert_title?: string;
  status: string;
  score?: number;
  started_at: string;
  submitted_at?: string;
}

interface ProctorEvent {
  id: string;
  event_type: string;
  severity: string;
  detail?: any;
  created_at: string;
}

const ATTEMPT_STYLES: Record<string, string> = {
  passed:      "badge-green",
  failed:      "badge-red",
  in_progress: "badge-amber",
};

const SEVERITY_STYLES: Record<string, string> = {
  critical: "badge-red",
  warning:  "badge-amber",
  info:     "badge-blue",
};

function ScoreRing({ score, passing = 70 }: { score: number; passing?: number }) {
  const passed = score >= passing;
  return (
    <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 shrink-0 ${
      passed ? "border-green-500 text-green-400" : "border-red-500 text-red-400"
    }`}>
      <span className="text-sm font-bold">{score}%</span>
    </div>
  );
}

export default function ResultsPage() {
  const { accessToken } = useAuthStore();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [events, setEvents] = useState<ProctorEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");

  useEffect(() => {
    api.get<any>("/exams/admin/attempts", accessToken!)
      .then((r) => {
        const raw = r.data ?? r;
        setAttempts(raw.map((a: any) => ({
          ...a,
          student_email: a.user?.email ?? "",
          student_name: a.user?.profile
            ? `${a.user.profile.first_name ?? ""} ${a.user.profile.last_name ?? ""}`.trim() || undefined
            : undefined,
          cert_title: a.enrollment?.certification?.title,
        })));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [accessToken]);

  async function viewProctor(attemptId: string) {
    if (selectedId === attemptId) { setSelectedId(null); return; }
    setSelectedId(attemptId);
    setEventsLoading(true);
    try {
      const res = await api.get<any>(`/exams/admin/attempts/${attemptId}/proctor-events`, accessToken!);
      setEvents(res.data ?? res);
    } catch {
      setEvents([]);
    } finally {
      setEventsLoading(false);
    }
  }

  const displayed = filterStatus
    ? attempts.filter((a) => a.status === filterStatus)
    : attempts;

  const passed = attempts.filter((a) => a.status === "passed").length;
  const failed = attempts.filter((a) => a.status === "failed").length;
  const inProgress = attempts.filter((a) => a.status === "in_progress").length;
  const avgScore = attempts.filter((a) => a.score !== undefined && a.score !== null).length > 0
    ? Math.round(
        attempts.filter((a) => a.score !== undefined && a.score !== null)
          .reduce((sum, a) => sum + (a.score ?? 0), 0) /
        attempts.filter((a) => a.score !== undefined && a.score !== null).length
      )
    : null;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="page-title">Exam Results</h1>
        <p className="page-subtitle">All attempts with scores and proctor data</p>
      </div>

      {/* Stats */}
      {!loading && attempts.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Attempts", value: attempts.length, color: "text-white" },
            { label: "Passed", value: passed, color: "text-green-400" },
            { label: "Failed", value: failed, color: "text-red-400" },
            { label: "Avg Score", value: avgScore !== null ? `${avgScore}%` : "—", color: "text-slate-300" },
          ].map((stat) => (
            <div key={stat.label} className="card p-4">
              <p className="text-slate-500 text-xs font-medium">{stat.label}</p>
              <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter */}
      {!loading && attempts.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          {["", "passed", "failed", "in_progress"].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`text-xs px-3 py-1.5 rounded-xl border font-medium transition-colors ${
                filterStatus === s
                  ? "bg-slate-700 text-white border-slate-600"
                  : "text-slate-500 border-slate-800 hover:text-slate-300 hover:border-slate-700"
              }`}
            >
              {s === "" ? "All" : s === "in_progress" ? "In Progress" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="card h-20 animate-pulse" />)}
        </div>
      ) : displayed.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-slate-500 text-sm">
            {filterStatus ? `No ${filterStatus.replace("_", " ")} attempts.` : "No exam attempts yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((a) => (
            <div key={a.id} className="card overflow-hidden">
              <div className="px-5 py-4 flex items-center gap-4 flex-wrap">
                {/* Score ring */}
                {a.score !== undefined && a.score !== null ? (
                  <ScoreRing score={a.score} />
                ) : (
                  <div className="w-12 h-12 rounded-full border-2 border-slate-700 flex items-center justify-center shrink-0">
                    <span className="text-slate-600 text-xs">—</span>
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-white font-medium text-sm">{a.student_name ?? a.student_email}</p>
                    {a.student_name && (
                      <span className="text-slate-500 text-xs">{a.student_email}</span>
                    )}
                    <span className={`badge ${ATTEMPT_STYLES[a.status] ?? "badge-slate"}`}>
                      {a.status === "in_progress" ? "In Progress" : a.status}
                    </span>
                  </div>
                  <p className="text-slate-500 text-xs mt-0.5">
                    {a.cert_title && <span className="text-slate-400">{a.cert_title} · </span>}
                    Started {new Date(a.started_at).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                    })}
                    {a.submitted_at && (
                      <span> · Submitted {new Date(a.submitted_at).toLocaleDateString("en-US", {
                        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                      })}</span>
                    )}
                  </p>
                </div>

                <button
                  onClick={() => viewProctor(a.id)}
                  className={`btn-ghost text-xs px-3 py-1.5 shrink-0 ${selectedId === a.id ? "border-navy-600 text-navy-300" : ""}`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  {selectedId === a.id ? "Hide Log" : "Proctor Log"}
                </button>
              </div>

              {/* Proctor log panel */}
              {selectedId === a.id && (
                <div className="border-t border-slate-800 bg-slate-950/50 px-5 py-4">
                  <h3 className="text-slate-300 text-xs font-semibold uppercase tracking-wide mb-3">Proctor Events</h3>
                  {eventsLoading ? (
                    <div className="space-y-2">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-8 bg-slate-800 rounded-lg animate-pulse" />
                      ))}
                    </div>
                  ) : events.length === 0 ? (
                    <p className="text-slate-500 text-sm">No proctor events recorded.</p>
                  ) : (
                    <div className="space-y-1 max-h-56 overflow-y-auto">
                      {events.map((ev) => (
                        <div key={ev.id} className="flex items-start gap-3 py-2 border-b border-slate-800/60 last:border-0 text-xs">
                          <span className={`badge mt-0.5 shrink-0 ${SEVERITY_STYLES[ev.severity] ?? "badge-slate"}`}>
                            {ev.severity}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-slate-300 font-medium">{ev.event_type.replace(/_/g, " ")}</p>
                            {ev.detail && (
                              <p className="text-slate-600 truncate mt-0.5">{JSON.stringify(ev.detail)}</p>
                            )}
                          </div>
                          <p className="text-slate-600 shrink-0 tabular-nums">
                            {new Date(ev.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
