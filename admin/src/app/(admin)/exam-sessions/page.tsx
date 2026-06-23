"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  CalendarDays, Plus, Trash2, Edit3, Users, ExternalLink,
  Loader2, X, Check, ChevronDown, Eye,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r) => r.data ?? r);
}

const EMPTY_FORM = {
  certification_id: "",
  title: "",
  scheduled_at: "",
  duration_minutes: "90",
  max_seats: "",
  meeting_link: "",
  notes: "",
  allow_late_cancellation: false,
};

function fmt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" });
}

function seatsLabel(session: any) {
  const booked = session._count?.bookings ?? 0;
  if (session.max_seats == null) return `${booked} booked`;
  return `${booked} / ${session.max_seats}`;
}

export default function ExamSessionsPage() {
  const token = useAuthStore((s) => s.accessToken)!;

  const { data: certsRaw } = useSWR(
    token ? ["/admin/certifications", token] : null,
    ([url, t]) => fetcher(url, t),
  );
  const certs: any[] = Array.isArray(certsRaw) ? certsRaw : (certsRaw?.data ?? []);

  const [filterCert, setFilterCert] = useState("");
  const sessionsUrl = "/exam-sessions/admin" + (filterCert ? `?certification_id=${filterCert}` : "");
  const { data: sessionsRaw, mutate } = useSWR(
    token ? [sessionsUrl, token] : null,
    ([url, t]) => fetcher(url, t),
  );
  const sessions: any[] = Array.isArray(sessionsRaw) ? sessionsRaw : [];

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewBookings, setViewBookings] = useState<any | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  function startNew() { setForm(EMPTY_FORM); setEditId(null); setShowForm(true); }
  function startEdit(s: any) {
    const localDt = new Date(s.scheduled_at);
    const offset = localDt.getTimezoneOffset() * 60000;
    const localIso = new Date(localDt.getTime() - offset).toISOString().slice(0, 16);
    setForm({
      certification_id: s.certification_id,
      title: s.title ?? "",
      scheduled_at: localIso,
      duration_minutes: String(s.duration_minutes),
      max_seats: s.max_seats != null ? String(s.max_seats) : "",
      meeting_link: s.meeting_link ?? "",
      notes: s.notes ?? "",
      allow_late_cancellation: s.allow_late_cancellation ?? false,
    });
    setEditId(s.id);
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.certification_id || !form.scheduled_at) {
      toast.error("Certification and scheduled time are required");
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        certification_id: form.certification_id,
        title: form.title || undefined,
        scheduled_at: new Date(form.scheduled_at).toISOString(),
        duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : 90,
        max_seats: form.max_seats ? parseInt(form.max_seats) : undefined,
        meeting_link: form.meeting_link || undefined,
        notes: form.notes || undefined,
        allow_late_cancellation: form.allow_late_cancellation,
      };
      if (editId) {
        await api.patch(`/exam-sessions/admin/${editId}`, payload, token);
        toast.success("Session updated");
      } else {
        await api.post("/exam-sessions/admin", payload, token);
        toast.success("Session created");
      }
      setShowForm(false);
      setEditId(null);
      mutate();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this exam session? All bookings will also be removed.")) return;
    setDeletingId(id);
    try {
      await api.delete(`/exam-sessions/admin/${id}`, token);
      toast.success("Deleted");
      mutate();
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeletingId(null);
    }
  }

  async function openBookings(session: any) {
    setViewBookings(session);
    setLoadingBookings(true);
    try {
      const data = await api.get<any>(`/exam-sessions/admin/${session.id}/bookings`, token);
      setBookings(Array.isArray(data) ? data : data.data ?? []);
    } catch {
      toast.error("Failed to load bookings");
    } finally {
      setLoadingBookings(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 flex items-center gap-2">
            <CalendarDays size={24} className="text-gold-500" />
            Scheduled Exam Sessions
          </h1>
          <p className="text-sm text-navy-500 mt-1">Create and manage proctored exam sessions for students to book</p>
        </div>
        <button
          onClick={startNew}
          className="flex items-center gap-2 px-4 py-2 bg-gold-500 text-white rounded-xl text-sm font-semibold hover:bg-gold-600 transition-colors"
        >
          <Plus size={16} />
          New Session
        </button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-navy-700">Filter by certification:</label>
        <div className="relative">
          <select
            value={filterCert}
            onChange={(e) => setFilterCert(e.target.value)}
            className="pl-3 pr-8 py-2 text-sm border border-navy-200 rounded-xl bg-white text-navy-800 appearance-none focus:outline-none focus:ring-2 focus:ring-gold-500/30"
          >
            <option value="">All certifications</option>
            {certs.map((c) => (
              <option key={c.id} value={c.id}>{c.acronym} — {c.title}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-navy-400 pointer-events-none" />
        </div>
      </div>

      {/* Sessions table */}
      <div className="bg-white rounded-2xl border border-navy-100 overflow-hidden shadow-sm">
        {sessions.length === 0 ? (
          <div className="py-16 text-center text-navy-400">
            <CalendarDays size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No exam sessions yet. Create one to get started.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-navy-50 border-b border-navy-100">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-navy-600">Certification</th>
                <th className="px-4 py-3 text-left font-semibold text-navy-600">Title / Date</th>
                <th className="px-4 py-3 text-left font-semibold text-navy-600">Duration</th>
                <th className="px-4 py-3 text-left font-semibold text-navy-600">Seats</th>
                <th className="px-4 py-3 text-left font-semibold text-navy-600">Status</th>
                <th className="px-4 py-3 text-right font-semibold text-navy-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-50">
              {sessions.map((s) => (
                <tr key={s.id} className="hover:bg-navy-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-medium text-gold-700">{s.certification?.acronym}</span>
                    <div className="text-xs text-navy-400 truncate max-w-[140px]">{s.certification?.title}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-navy-800">{s.title || "Exam Session"}</div>
                    <div className="text-xs text-navy-500">{fmt(s.scheduled_at)}</div>
                  </td>
                  <td className="px-4 py-3 text-navy-700">{s.duration_minutes} min</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openBookings(s)}
                      className="flex items-center gap-1 text-navy-600 hover:text-gold-600 transition-colors"
                    >
                      <Users size={13} />
                      {seatsLabel(s)}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    {s.is_active ? (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">Active</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-navy-100 text-navy-500 rounded-full text-xs font-medium">Inactive</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {s.meeting_link && (
                        <a href={s.meeting_link} target="_blank" rel="noreferrer"
                          className="p-1.5 text-navy-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
                          <ExternalLink size={14} />
                        </a>
                      )}
                      <button
                        onClick={() => openBookings(s)}
                        className="p-1.5 text-navy-400 hover:text-gold-600 rounded-lg hover:bg-gold-50 transition-colors"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => startEdit(s)}
                        className="p-1.5 text-navy-400 hover:text-gold-600 rounded-lg hover:bg-gold-50 transition-colors"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        disabled={deletingId === s.id}
                        className="p-1.5 text-navy-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        {deletingId === s.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create / Edit form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-navy-100">
              <h2 className="text-lg font-bold text-navy-900">{editId ? "Edit Session" : "New Exam Session"}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-navy-100 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-navy-600 mb-1">Certification *</label>
                <select
                  value={form.certification_id}
                  onChange={(e) => setForm({ ...form, certification_id: e.target.value })}
                  className="w-full px-3 py-2 border border-navy-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/30"
                >
                  <option value="">Select certification...</option>
                  {certs.map((c) => (
                    <option key={c.id} value={c.id}>{c.acronym} — {c.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-navy-600 mb-1">Session Title (optional)</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. CAIP Exam — June Cohort"
                  className="w-full px-3 py-2 border border-navy-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/30"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-navy-600 mb-1">Date & Time *</label>
                  <input
                    type="datetime-local"
                    value={form.scheduled_at}
                    onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                    className="w-full px-3 py-2 border border-navy-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-navy-600 mb-1">Duration (minutes)</label>
                  <input
                    type="number"
                    value={form.duration_minutes}
                    onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
                    className="w-full px-3 py-2 border border-navy-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/30"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-navy-600 mb-1">Max Seats (leave blank = unlimited)</label>
                <input
                  type="number"
                  value={form.max_seats}
                  onChange={(e) => setForm({ ...form, max_seats: e.target.value })}
                  placeholder="e.g. 50"
                  className="w-full px-3 py-2 border border-navy-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/30"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-navy-600 mb-1">Meeting / Exam Link</label>
                <input
                  value={form.meeting_link}
                  onChange={(e) => setForm({ ...form, meeting_link: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-navy-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/30"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-navy-600 mb-1">Notes for students</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  placeholder="Instructions, requirements, etc."
                  className="w-full px-3 py-2 border border-navy-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/30 resize-none"
                />
              </div>

              <div
                className="flex items-center justify-between p-3 rounded-xl border border-navy-100 bg-navy-50/50 cursor-pointer select-none"
                onClick={() => setForm({ ...form, allow_late_cancellation: !form.allow_late_cancellation })}
              >
                <div>
                  <p className="text-sm font-semibold text-navy-800">Allow late cancellation</p>
                  <p className="text-xs text-navy-400 mt-0.5">
                    {form.allow_late_cancellation
                      ? "Students can cancel at any time, even within 24 hours of the exam."
                      : "Students cannot cancel within 24 hours of the exam."}
                  </p>
                </div>
                <div className={cn(
                  "relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ml-4",
                  form.allow_late_cancellation ? "bg-gold-500" : "bg-navy-200"
                )}>
                  <div className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform",
                    form.allow_late_cancellation ? "translate-x-5" : "translate-x-1"
                  )} />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-navy-100">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-navy-600 hover:text-navy-900 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-gold-500 text-white rounded-xl text-sm font-semibold hover:bg-gold-600 transition-colors disabled:opacity-60"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {editId ? "Save Changes" : "Create Session"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bookings drawer */}
      {viewBookings && (
        <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-navy-100">
              <div>
                <h2 className="text-lg font-bold text-navy-900">Bookings</h2>
                <p className="text-xs text-navy-500">{viewBookings.title || "Exam Session"} — {fmt(viewBookings.scheduled_at)}</p>
              </div>
              <button onClick={() => setViewBookings(null)} className="p-1.5 rounded-lg hover:bg-navy-100 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {loadingBookings ? (
                <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-gold-500" /></div>
              ) : bookings.length === 0 ? (
                <div className="text-center py-10 text-navy-400 text-sm">No bookings yet</div>
              ) : (
                <div className="space-y-3">
                  {bookings.map((b) => (
                    <div key={b.id} className="bg-navy-50 rounded-xl p-4">
                      <div className="font-medium text-navy-800 text-sm">
                        {b.user?.profile?.first_name} {b.user?.profile?.last_name}
                      </div>
                      <div className="text-xs text-navy-500">{b.user?.email}</div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-medium",
                          b.status === "confirmed" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"
                        )}>
                          {b.status}
                        </span>
                        <span className="text-xs text-navy-400">
                          Booked {new Date(b.booked_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
