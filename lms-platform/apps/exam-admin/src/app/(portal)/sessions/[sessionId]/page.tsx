"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";

interface StructuredExamOption {
  id: string;
  title: string;
  status: string;
  version?: string | null;
}

interface Session {
  id: string;
  certification_id: string;
  cert_title?: string;
  certification?: { title: string; acronym?: string };
  structured_exam_id?: string | null;
  structured_exam?: StructuredExamOption | null;
  title?: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  max_seats?: number | null;
  meeting_link?: string;
  notes?: string;
}

interface Booking {
  id: string;
  user_id: string;
  status: string;
  booked_at: string;
  user: {
    id: string;
    email: string;
    profile?: { first_name?: string; last_name?: string };
  };
  latest_attempt?: {
    id: string;
    status: string;
    score_percentage?: number;
    passed?: boolean;
  } | null;
  exam_link?: string;
}

const STATUS_STYLES: Record<string, string> = {
  scheduled: "badge-blue",
  active:    "badge-green",
  completed: "badge-slate",
  cancelled: "badge-red",
};

function Badge({ label, cls }: { label: string; cls: string }) {
  return <span className={`badge ${cls}`}>{label}</span>;
}

function attemptBadge(status?: string) {
  if (!status) return <Badge label="Not started" cls="badge-slate" />;
  if (status === "in_progress") return <Badge label="In progress" cls="badge-amber" />;
  if (status === "passed") return <Badge label="Passed" cls="badge-green" />;
  if (status === "failed") return <Badge label="Failed" cls="badge-red" />;
  return <Badge label={status} cls="badge-slate" />;
}

export default function SessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { accessToken } = useAuthStore();
  const [session, setSession] = useState<Session | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [addEmail, setAddEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [addErr, setAddErr] = useState("");
  const [generatingLink, setGeneratingLink] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [cancellingBooking, setCancellingBooking] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editDate, setEditDate] = useState("");
  const [editDuration, setEditDuration] = useState("");
  const [editExamId, setEditExamId] = useState("");
  const [examOptions, setExamOptions] = useState<StructuredExamOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewErr, setPreviewErr] = useState("");

  const load = useCallback(async () => {
    try {
      const [sRes, bRes] = await Promise.all([
        api.get<any>(`/exam-sessions/admin/${sessionId}`, accessToken!),
        api.get<any>(`/exam-sessions/admin/${sessionId}/bookings`, accessToken!),
      ]);
      const s = sRes.data ?? sRes;
      setSession(s);
      setEditDate(s.scheduled_at?.slice(0, 16) ?? "");
      setEditDuration(String(s.duration_minutes ?? 90));
      setEditExamId(s.structured_exam_id ?? "");
      setBookings(bRes.data ?? bRes);

      if (s.certification_id) {
        try {
          const eRes = await api.get<any>(`/exams/admin/structured-exams?certification_id=${s.certification_id}`, accessToken!);
          const list: StructuredExamOption[] = eRes.data ?? eRes;
          setExamOptions(list.filter((e) => e.status === "published"));
        } catch {}
      }
    } catch {}
    setLoading(false);
  }, [sessionId, accessToken]);

  useEffect(() => { load(); }, [load]);

  async function handleAddStudent(e: React.FormEvent) {
    e.preventDefault();
    setAddErr("");
    setAdding(true);
    try {
      await api.post<any>(`/exam-sessions/admin/${sessionId}/students`, { email: addEmail }, accessToken!);
      setAddEmail("");
      load();
    } catch (ex: any) {
      setAddErr(ex.message ?? "Failed to add student.");
    } finally {
      setAdding(false);
    }
  }

  async function generateLink(bookingId: string) {
    setGeneratingLink(bookingId);
    try {
      const res = await api.post<any>(`/exam-sessions/admin/bookings/${bookingId}/exam-link`, {}, accessToken!);
      const link = res.data?.url ?? res.url;
      setBookings((prev) => prev.map((b) => b.id === bookingId ? { ...b, exam_link: link } : b));
    } catch {}
    setGeneratingLink(null);
  }

  async function handleCancelBooking(bookingId: string) {
    if (!confirm("Cancel this student's booking? They will be able to rebook another session.")) return;
    setCancellingBooking(bookingId);
    try {
      await api.patch<any>(`/exam-sessions/admin/bookings/${bookingId}/cancel`, {}, accessToken!);
      load();
    } catch (ex: any) {
      alert(ex.message ?? "Failed to cancel booking.");
    } finally {
      setCancellingBooking(null);
    }
  }

  async function copyLink(b: Booking) {
    if (!b.exam_link) return;
    await navigator.clipboard.writeText(b.exam_link);
    setCopiedId(b.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handlePreview() {
    setPreviewErr("");
    setPreviewing(true);
    // Open the window synchronously before any await — browsers block window.open after async ops
    const win = window.open("about:blank", "_blank");
    try {
      const res = await api.post<any>(`/exam-sessions/admin/${sessionId}/preview-link`, {}, accessToken!);
      const url = res.data?.url ?? res.url;
      if (win) win.location.href = url;
    } catch (e: any) {
      if (win) win.close();
      setPreviewErr(e?.message ?? "Failed to generate preview link");
    }
    setPreviewing(false);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch<any>(`/exam-sessions/admin/${sessionId}`, {
        scheduled_at: editDate,
        duration_minutes: Number(editDuration),
        structured_exam_id: editExamId || null,
      }, accessToken!);
      setEditOpen(false);
      load();
    } catch {}
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-5">
        <div className="h-8 w-64 bg-slate-800 rounded-xl animate-pulse" />
        <div className="card h-32 animate-pulse" />
        <div className="card h-64 animate-pulse" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-4xl mx-auto">
        <p className="text-slate-400 text-sm">Session not found.</p>
      </div>
    );
  }

  const certTitle = session.certification?.title ?? session.cert_title ?? "Exam Session";
  const sessionLabel = session.title || certTitle;
  const acronym = session.certification?.acronym;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link
          href="/sessions"
          className="mt-1 text-slate-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="page-title">{sessionLabel}</h1>
            <Badge label={session.status} cls={STATUS_STYLES[session.status] ?? "badge-slate"} />
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-slate-500 text-sm flex-wrap">
            {acronym && <span className="text-navy-400 font-medium text-xs">{acronym}</span>}
            <span>
              {new Date(session.scheduled_at).toLocaleDateString("en-US", {
                weekday: "short", month: "long", day: "numeric",
                hour: "2-digit", minute: "2-digit",
              })}
            </span>
            <span className="text-slate-700">·</span>
            <span>{session.duration_minutes} minutes</span>
            {session.max_seats && (
              <>
                <span className="text-slate-700">·</span>
                <span>{session.max_seats} seats</span>
              </>
            )}
            <span className="text-slate-700">·</span>
            {session.structured_exam ? (
              <span className="text-green-400 text-xs font-medium">
                {session.structured_exam.title}{session.structured_exam.version ? ` (${session.structured_exam.version})` : ""}
              </span>
            ) : (
              <span className="text-amber-400 text-xs">No exam linked — edit to assign one</span>
            )}
          </div>
        </div>
        {previewErr && (
          <p className="text-red-400 text-xs shrink-0">{previewErr}</p>
        )}
        <button onClick={handlePreview} disabled={previewing} className="btn-ghost shrink-0">
          {previewing ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
          {previewing ? "Opening…" : "Preview Exam"}
        </button>
        <button onClick={() => setEditOpen(!editOpen)} className="btn-ghost shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit
        </button>
      </div>

      {/* Info strip */}
      {(session.meeting_link || session.notes) && (
        <div className="card p-4 flex flex-col gap-2">
          {session.meeting_link && (
            <div className="flex items-center gap-2 text-sm">
              <svg className="w-4 h-4 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <a href={session.meeting_link} target="_blank" rel="noreferrer"
                className="text-navy-400 hover:text-navy-300 transition-colors truncate">
                {session.meeting_link}
              </a>
            </div>
          )}
          {session.notes && (
            <div className="flex items-start gap-2 text-sm">
              <svg className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-slate-400">{session.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Edit form */}
      {editOpen && (
        <div className="card p-5">
          <h3 className="section-title mb-4">Edit Session Details</h3>
          <form onSubmit={saveEdit} className="flex gap-4 items-end flex-wrap">
            <div>
              <label className="label">Date & Time</label>
              <input
                type="datetime-local"
                className="input w-56"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Duration (min)</label>
              <input
                type="number"
                className="input w-28"
                value={editDuration}
                min={10}
                onChange={(e) => setEditDuration(e.target.value)}
                required
              />
            </div>
            <div className="min-w-56">
              <label className="label">Structured Exam</label>
              <select
                className="input"
                value={editExamId}
                onChange={(e) => setEditExamId(e.target.value)}
              >
                <option value="">— None —</option>
                {examOptions.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title}{e.version ? ` (${e.version})` : ""}
                  </option>
                ))}
              </select>
              {examOptions.length === 0 && (
                <p className="text-slate-500 text-xs mt-1">No published exams for this certification.</p>
              )}
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? "Saving…" : "Save"}
              </button>
              <button type="button" onClick={() => setEditOpen(false)} className="btn-ghost">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Add student */}
      <div className="card p-5">
        <h2 className="section-title mb-4">Add Student</h2>
        <form onSubmit={handleAddStudent} className="flex gap-3 items-start flex-wrap">
          <div className="flex-1 min-w-56">
            <input
              type="email"
              className="input"
              placeholder="student@example.com"
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
              required
            />
            {addErr && (
              <p className="text-red-400 text-xs mt-1.5">{addErr}</p>
            )}
          </div>
          <button type="submit" disabled={adding} className="btn-primary shrink-0">
            {adding ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Adding…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Add Student
              </>
            )}
          </button>
        </form>
      </div>

      {/* Bookings */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">
            Students
            <span className="ml-2 text-slate-500 font-normal">({bookings.length})</span>
          </h2>
        </div>

        {bookings.length === 0 ? (
          <div className="card p-10 text-center">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center mx-auto mb-3">
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <p className="text-slate-500 text-sm">No students added yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {bookings.map((b) => {
              const name = [b.user.profile?.first_name, b.user.profile?.last_name].filter(Boolean).join(" ") || b.user.email;
              const initials = name.slice(0, 2).toUpperCase();
              const isCancelled = b.status === "cancelled";
              return (
              <div key={b.id} className={`card p-5 ${isCancelled ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  {/* Student info */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                      <span className="text-slate-400 text-xs font-bold">{initials}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium">{name}</p>
                      <p className="text-slate-500 text-xs">{b.user.email}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {isCancelled
                          ? <Badge label="Booking cancelled" cls="badge-red" />
                          : attemptBadge(b.latest_attempt?.status)}
                        {!isCancelled && b.latest_attempt?.score_percentage != null && (
                          <span className="text-slate-400 text-xs font-medium">{b.latest_attempt.score_percentage}%</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    {!isCancelled && (
                      <>
                        {b.exam_link ? (
                          <>
                            <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2">
                              <svg className="w-3.5 h-3.5 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                              </svg>
                              <span className="text-slate-400 text-xs font-mono max-w-48 truncate">{b.exam_link}</span>
                            </div>
                            <button
                              onClick={() => copyLink(b)}
                              className={`btn-ghost text-xs px-3 py-1.5 ${copiedId === b.id ? "text-green-400 border-green-700" : ""}`}
                            >
                              {copiedId === b.id ? (
                                <>
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  Copied!
                                </>
                              ) : (
                                <>
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                  Copy Link
                                </>
                              )}
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => generateLink(b.id)}
                            disabled={generatingLink === b.id}
                            className="btn-primary text-xs px-3 py-1.5"
                          >
                            {generatingLink === b.id ? (
                              <>
                                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                </svg>
                                Generating…
                              </>
                            ) : (
                              <>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                                Generate Link
                              </>
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => handleCancelBooking(b.id)}
                          disabled={cancellingBooking === b.id}
                          className="btn-ghost text-xs px-3 py-1.5 text-red-400 border-red-900 hover:bg-red-950 hover:border-red-700"
                        >
                          {cancellingBooking === b.id ? (
                            <>
                              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                              </svg>
                              Cancelling…
                            </>
                          ) : (
                            <>
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              Cancel Booking
                            </>
                          )}
                        </button>
                      </>
                    )}
                    <Link href={`/results`} className="btn-ghost text-xs px-3 py-1.5">
                      Results
                    </Link>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
