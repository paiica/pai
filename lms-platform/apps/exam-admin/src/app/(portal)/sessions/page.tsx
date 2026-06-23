"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";

interface Cert { id: string; title: string; acronym?: string; }
interface ExamOption { id: string; title: string; version?: string | null; status: string; }
interface Session {
  id: string;
  certification_id: string;
  structured_exam_id?: string | null;
  structured_exam?: { id: string; title: string; status: string; version?: string | null } | null;
  certification?: { title: string; acronym?: string };
  title?: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  max_seats?: number | null;
  meeting_link?: string;
  notes?: string;
  allow_late_cancellation?: boolean;
  _count?: { bookings: number };
}

const EMPTY_FORM = {
  certification_id: "",
  structured_exam_id: "",
  title: "",
  scheduled_at: "",
  duration_minutes: "90",
  max_seats: "",
  meeting_link: "",
  notes: "",
  allow_late_cancellation: false,
};

const STATUS_STYLES: Record<string, string> = {
  scheduled: "badge-blue",
  active:    "badge-green",
  completed: "badge-slate",
  cancelled: "badge-red",
};

const STATUS_DOT: Record<string, string> = {
  scheduled: "bg-blue-400",
  active:    "bg-green-400 animate-pulse",
  completed: "bg-slate-500",
  cancelled: "bg-red-400",
};

function Badge({ status }: { status: string }) {
  return (
    <span className={`badge ${STATUS_STYLES[status] ?? "badge-slate"}`}>
      {status}
    </span>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <div
      onClick={onChange}
      className={`relative w-10 h-6 rounded-full transition-colors cursor-pointer shrink-0 ${checked ? "bg-brand-500" : "bg-slate-700"}`}
    >
      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-5" : "translate-x-1"}`} />
    </div>
  );
}

const inputCls = "w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-colors";
const labelCls = "block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5";

export default function SessionsPage() {
  const { accessToken } = useAuthStore();
  const [certs, setCerts] = useState<Cert[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCert, setFilterCert] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [certExams, setCertExams] = useState<ExamOption[]>([]);
  const [loadingExams, setLoadingExams] = useState(false);

  async function load() {
    try {
      const [cRes, sRes] = await Promise.all([
        api.get<any>("/admin/certifications", accessToken!),
        api.get<any>("/exam-sessions/admin", accessToken!),
      ]);
      setCerts(cRes.data ?? cRes);
      setSessions((sRes.data ?? sRes).map((s: any) => ({
        ...s,
        cert_title: s.certification?.title ?? s.cert_title,
        booking_count: s._count?.bookings ?? s.booking_count,
      })));
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, [accessToken]);

  useEffect(() => {
    if (!form.certification_id || !showForm) { setCertExams([]); return; }
    setLoadingExams(true);
    api.get<any>(`/exams/admin/structured-exams?certification_id=${form.certification_id}`, accessToken!)
      .then((res) => setCertExams((res.data ?? res).filter((e: ExamOption) => e.status === "published")))
      .catch(() => setCertExams([]))
      .finally(() => setLoadingExams(false));
  }, [form.certification_id, showForm, accessToken]);

  function startNew() { setForm(EMPTY_FORM); setEditId(null); setFormErr(""); setCertExams([]); setShowForm(true); }
  function startEdit(s: Session) {
    const localDt = new Date(s.scheduled_at);
    const offset = localDt.getTimezoneOffset() * 60000;
    const localIso = new Date(localDt.getTime() - offset).toISOString().slice(0, 16);
    setForm({
      certification_id: s.certification_id,
      structured_exam_id: s.structured_exam_id ?? "",
      title: s.title ?? "",
      scheduled_at: localIso,
      duration_minutes: String(s.duration_minutes),
      max_seats: s.max_seats != null ? String(s.max_seats) : "",
      meeting_link: s.meeting_link ?? "",
      notes: s.notes ?? "",
      allow_late_cancellation: s.allow_late_cancellation ?? false,
    });
    setEditId(s.id);
    setFormErr("");
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.certification_id || !form.scheduled_at) {
      setFormErr("Certification and date/time are required.");
      return;
    }
    setFormErr("");
    setSaving(true);
    try {
      const payload: any = {
        certification_id: form.certification_id,
        structured_exam_id: form.structured_exam_id || null,
        title: form.title || undefined,
        scheduled_at: new Date(form.scheduled_at).toISOString(),
        duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : 90,
        max_seats: form.max_seats ? parseInt(form.max_seats) : undefined,
        meeting_link: form.meeting_link || undefined,
        notes: form.notes || undefined,
        allow_late_cancellation: form.allow_late_cancellation,
      };
      if (editId) {
        await api.patch<any>(`/exam-sessions/admin/${editId}`, payload, accessToken!);
      } else {
        await api.post<any>("/exam-sessions/admin", payload, accessToken!);
      }
      setShowForm(false);
      setEditId(null);
      load();
    } catch (e: any) {
      setFormErr(e?.message ?? "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this session? All bookings will be removed.")) return;
    setDeletingId(id);
    try {
      await api.delete<any>(`/exam-sessions/admin/${id}`, accessToken!);
      load();
    } catch {}
    setDeletingId(null);
  }

  const displayed = filterCert ? sessions.filter((s) => s.certification_id === filterCert) : sessions;

  const upcoming = sessions.filter((s) => s.status === "scheduled").length;
  const active = sessions.filter((s) => s.status === "active").length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Exam Sessions</h1>
          <p className="page-subtitle">Schedule and manage proctored exam sessions</p>
        </div>
        <button onClick={startNew} className="btn-primary shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Session
        </button>
      </div>

      {/* Summary pills */}
      {!loading && sessions.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-slate-400 text-xs">{sessions.length} total</span>
          {upcoming > 0 && (
            <span className="badge badge-blue">{upcoming} upcoming</span>
          )}
          {active > 0 && (
            <span className="badge badge-green">{active} active</span>
          )}
        </div>
      )}

      {/* Filter */}
      {certs.length > 0 && (
        <div className="flex items-center gap-3">
          <label className="text-slate-500 text-xs font-medium shrink-0">Filter by cert:</label>
          <select
            value={filterCert}
            onChange={(e) => setFilterCert(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-300 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-navy-500 transition-colors"
          >
            <option value="">All certifications</option>
            {certs.map((c) => (
              <option key={c.id} value={c.id}>{c.acronym ? `${c.acronym} — ` : ""}{c.title}</option>
            ))}
          </select>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="card h-20 animate-pulse" />)}
        </div>
      ) : displayed.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-slate-500 text-sm">No sessions yet.</p>
          <button onClick={startNew} className="inline-flex items-center gap-1.5 mt-3 text-brand-400 hover:text-brand-300 text-sm font-medium transition-colors">
            Schedule your first session →
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map((s) => {
            const bookings = s._count?.bookings;
            const certTitle = s.certification?.title ?? "Exam Session";
            const sessionTitle = s.title || certTitle;
            return (
              <div key={s.id} className="card flex items-center gap-4 px-5 py-4 hover:border-slate-700 transition-all">
                {/* Status dot */}
                <div className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[s.status] ?? "bg-slate-600"}`} />

                {/* Main info — clickable */}
                <Link href={`/sessions/${s.id}`} className="flex-1 min-w-0 hover:opacity-80 transition-opacity">
                  <p className="text-white font-medium text-sm truncate">{sessionTitle}</p>
                  <p className="text-slate-500 text-xs mt-0.5">
                    {s.certification?.acronym && (
                      <span className="text-brand-400 font-medium mr-1.5">{s.certification.acronym}</span>
                    )}
                    {new Date(s.scheduled_at).toLocaleDateString("en-US", {
                      month: "short", day: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                    {" · "}
                    {s.duration_minutes} min
                    {bookings !== undefined && ` · ${bookings} student${bookings !== 1 ? "s" : ""}`}
                    {s.max_seats && ` / ${s.max_seats} seats`}
                  </p>
                  {s.structured_exam ? (
                    <p className="text-green-400 text-xs mt-0.5 font-medium">
                      {s.structured_exam.title}{s.structured_exam.version ? ` (${s.structured_exam.version})` : ""}
                    </p>
                  ) : (
                    <p className="text-amber-500 text-xs mt-0.5">No exam linked</p>
                  )}
                </Link>

                {/* Right side */}
                <div className="flex items-center gap-2 shrink-0">
                  <Badge status={s.status} />
                  <button
                    onClick={() => startEdit(s)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
                    title="Edit"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    disabled={deletingId === s.id}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-900/20 transition-colors disabled:opacity-40"
                    title="Delete"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  <Link href={`/sessions/${s.id}`} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-white">{editId ? "Edit Session" : "New Exam Session"}</h2>
                <p className="text-slate-500 text-xs mt-0.5">{editId ? "Update session details" : "Schedule a proctored exam"}</p>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div>
                <label className={labelCls}>Certification *</label>
                <select
                  value={form.certification_id}
                  onChange={(e) => setForm({ ...form, certification_id: e.target.value, structured_exam_id: "" })}
                  className={inputCls}
                >
                  <option value="">Select certification…</option>
                  {certs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.acronym ? `${c.acronym} — ` : ""}{c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelCls}>
                  Structured Exam
                  <span className="text-slate-600 normal-case font-normal ml-1">(optional)</span>
                </label>
                <select
                  value={form.structured_exam_id}
                  onChange={(e) => setForm({ ...form, structured_exam_id: e.target.value })}
                  className={inputCls}
                  disabled={!form.certification_id || loadingExams}
                >
                  <option value="">
                    {loadingExams ? "Loading exams…" : !form.certification_id ? "Select a certification first…" : certExams.length === 0 ? "No published exams yet" : "— None selected —"}
                  </option>
                  {certExams.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.title}{e.version ? ` (${e.version})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelCls}>Session Title <span className="text-slate-600 normal-case font-normal">(optional)</span></label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. CAIP Exam — June Cohort"
                  className={inputCls}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Date & Time *</label>
                  <input
                    type="datetime-local"
                    value={form.scheduled_at}
                    onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Duration (minutes)</label>
                  <input
                    type="number"
                    value={form.duration_minutes}
                    min={10}
                    max={480}
                    onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Max Seats <span className="text-slate-600 normal-case font-normal">(blank = unlimited)</span></label>
                <input
                  type="number"
                  value={form.max_seats}
                  onChange={(e) => setForm({ ...form, max_seats: e.target.value })}
                  placeholder="e.g. 50"
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Meeting / Exam Link</label>
                <input
                  value={form.meeting_link}
                  onChange={(e) => setForm({ ...form, meeting_link: e.target.value })}
                  placeholder="https://…"
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Notes for students</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  placeholder="Instructions, requirements, etc."
                  className={`${inputCls} resize-none`}
                />
              </div>

              <div
                className="flex items-center justify-between p-4 rounded-xl border border-slate-700/60 bg-slate-800/30 cursor-pointer select-none"
                onClick={() => setForm({ ...form, allow_late_cancellation: !form.allow_late_cancellation })}
              >
                <div>
                  <p className="text-sm font-semibold text-white">Allow late cancellation</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {form.allow_late_cancellation
                      ? "Students can cancel at any time."
                      : "Students cannot cancel within 24 hours."}
                  </p>
                </div>
                <Toggle
                  checked={form.allow_late_cancellation}
                  onChange={() => setForm({ ...form, allow_late_cancellation: !form.allow_late_cancellation })}
                />
              </div>

              {formErr && (
                <div className="flex items-center gap-2 text-red-400 text-xs bg-red-900/20 border border-red-800/50 rounded-xl px-3 py-2.5">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {formErr}
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800">
              <button onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Saving…
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {editId ? "Save Changes" : "Create Session"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
