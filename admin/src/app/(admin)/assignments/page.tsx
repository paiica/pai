"use client";

import { useState } from "react";
import useSWR from "swr";
import toast from "react-hot-toast";
import {
  ClipboardList, Plus, PlusCircle, Loader2, AlertCircle, RefreshCw,
  Trash2, Edit3, Globe, Archive, Clock, Users, ChevronDown, ChevronUp,
  CheckCircle, Star,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const STATUSES = ["draft", "published", "archived"] as const;

const STATUS_COLORS: Record<string, string> = {
  draft:     "bg-slate-100 text-slate-500",
  published: "bg-emerald-50 text-emerald-700",
  archived:  "bg-red-50 text-red-700",
};

type Assignment = {
  id: string;
  title: string;
  description?: string;
  instructions?: string;
  due_date?: string;
  max_score: number;
  status: string;
  sort_order: number;
  certification_id: string;
  certification: { id: string; acronym: string; title: string };
  _count: { entries: number };
};

function fetcher(url: string, token: string) {
  return api.get<any>(url, token);
}

function formatDate(d?: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-CA", { dateStyle: "medium" });
}

function toInputDate(d?: string | null) {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

export default function AdminAssignmentsPage() {
  const token = useAuthStore((s) => s.accessToken)!;

  const { data: rawAssignments, mutate, isLoading, error } = useSWR(
    token ? ["/admin/assignments", token] : null,
    ([url, t]) => fetcher(url, t)
  );
  const { data: rawCerts } = useSWR(
    token ? ["/admin/certifications", token] : null,
    ([url, t]) => fetcher(url, t)
  );

  const assignments: Assignment[] = (() => {
    const d = (rawAssignments as any)?.data ?? rawAssignments;
    return Array.isArray(d) ? d : [];
  })();

  const certs: any[] = (() => {
    const d = (rawCerts as any)?.data ?? rawCerts;
    return Array.isArray(d) ? d : [];
  })();

  // Group by cert
  const grouped = assignments.reduce((acc: Record<string, Assignment[]>, a) => {
    const key = a.certification?.acronym ?? "Unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {});

  // ── Create form ────────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    certification_id: "",
    title: "",
    description: "",
    instructions: "",
    due_date: "",
    max_score: "100",
    status: "draft" as typeof STATUSES[number],
    sort_order: "0",
  });

  function setField(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.certification_id) { toast.error("Please select a certification"); return; }
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    setSaving(true);
    try {
      await api.post("/admin/assignments", {
        certification_id: form.certification_id,
        title: form.title,
        description: form.description || undefined,
        instructions: form.instructions || undefined,
        due_date: form.due_date || undefined,
        max_score: parseInt(form.max_score) || 100,
        status: form.status,
        sort_order: parseInt(form.sort_order) || 0,
      }, token);
      toast.success("Assignment created!");
      mutate();
      setCreateOpen(false);
      setForm({ certification_id: "", title: "", description: "", instructions: "", due_date: "", max_score: "100", status: "draft", sort_order: "0" });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create assignment");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(a: Assignment) {
    if (!confirm(`Delete "${a.title}"? This cannot be undone.`)) return;
    await toast.promise(
      api.delete(`/admin/assignments/${a.id}`, token).then(mutate),
      { loading: "Deleting…", success: "Deleted", error: "Failed" }
    );
  }

  async function toggleStatus(a: Assignment) {
    const next = a.status === "published" ? "archived" : "published";
    await toast.promise(
      api.patch(`/admin/assignments/${a.id}`, { status: next }, token).then(mutate),
      { loading: "Updating…", success: "Updated", error: "Failed" }
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-black text-navy-900">Assignments</h1>
          <p className="text-slate-500 text-sm mt-1">Create and manage assignments linked to certification programs.</p>
        </div>
        <button
          onClick={() => setCreateOpen((v) => !v)}
          className="btn-primary !py-2 !px-4 !text-xs flex-shrink-0"
        >
          <PlusCircle size={13} /> New Assignment
        </button>
      </div>

      {/* ── Create form ─────────────────────────────────────────────────────── */}
      {createOpen && (
        <div className="card p-6 mb-6 border-navy-200 bg-navy-50/30 space-y-5">
          <p className="text-xs font-bold text-navy-900 uppercase tracking-widest">New Assignment</p>
          <form onSubmit={handleCreate} className="space-y-4">

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Certification <span className="text-red-500">*</span>
              </label>
              <select
                className="input-base"
                value={form.certification_id}
                onChange={(e) => setField("certification_id", e.target.value)}
                required
              >
                <option value="">— Select certification —</option>
                {certs.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.acronym} — {c.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                className="input-base"
                placeholder="e.g. AI Ethics Case Study"
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Description</label>
              <textarea
                className="input-base h-16 resize-none"
                placeholder="Brief overview of this assignment"
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Instructions</label>
              <textarea
                className="input-base h-24 resize-none"
                placeholder="Detailed instructions for students…"
                value={form.instructions}
                onChange={(e) => setField("instructions", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Status</label>
                <select className="input-base" value={form.status} onChange={(e) => setField("status", e.target.value)}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Max Score</label>
                <input
                  className="input-base"
                  type="number" min="1" max="1000"
                  value={form.max_score}
                  onChange={(e) => setField("max_score", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Due Date</label>
                <input
                  className="input-base"
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setField("due_date", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Sort Order</label>
                <input
                  className="input-base"
                  type="number" min="0"
                  value={form.sort_order}
                  onChange={(e) => setField("sort_order", e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving} className="btn-primary !py-2 !px-5 !text-xs disabled:opacity-60">
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Create Assignment
              </button>
              <button type="button" onClick={() => setCreateOpen(false)} className="btn-outline !py-2 !px-4 !text-xs">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── List ─────────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="card p-10 text-center">
          <Loader2 size={24} className="animate-spin text-slate-300 mx-auto" />
          <p className="text-slate-400 text-xs mt-3">Loading assignments…</p>
        </div>
      ) : error ? (
        <div className="card p-12 text-center">
          <AlertCircle size={32} className="text-red-300 mx-auto mb-3" />
          <p className="text-slate-600 text-sm font-semibold">Could not reach the backend</p>
          <button onClick={() => mutate()} className="btn-outline !py-1.5 !px-4 !text-xs mx-auto mt-4">
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      ) : assignments.length === 0 ? (
        <div className="card p-12 text-center">
          <ClipboardList size={36} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-600 text-sm font-semibold">No assignments yet</p>
          <p className="text-slate-400 text-xs mt-1">Create the first assignment to get started.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([certAcronym, items]) => (
            <div key={certAcronym}>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{certAcronym}</p>
              <div className="space-y-2">
                {items.map((a) => (
                  <AssignmentCard
                    key={a.id}
                    assignment={a}
                    certs={certs}
                    token={token}
                    onToggleStatus={() => toggleStatus(a)}
                    onDelete={() => handleDelete(a)}
                    onMutate={mutate}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AssignmentCard({
  assignment, certs, token, onToggleStatus, onDelete, onMutate,
}: {
  assignment: Assignment;
  certs: any[];
  token: string;
  onToggleStatus: () => void;
  onDelete: () => void;
  onMutate: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showEntries, setShowEntries] = useState(false);

  const [editForm, setEditForm] = useState({
    title: assignment.title,
    description: assignment.description ?? "",
    instructions: assignment.instructions ?? "",
    due_date: toInputDate(assignment.due_date),
    max_score: String(assignment.max_score),
    status: assignment.status,
    sort_order: String(assignment.sort_order),
  });

  function setEField(k: string, v: string) {
    setEditForm((f) => ({ ...f, [k]: v }));
  }

  async function saveEdit() {
    setSaving(true);
    try {
      await api.patch(`/admin/assignments/${assignment.id}`, {
        title: editForm.title,
        description: editForm.description || null,
        instructions: editForm.instructions || null,
        due_date: editForm.due_date || null,
        max_score: parseInt(editForm.max_score) || 100,
        status: editForm.status,
        sort_order: parseInt(editForm.sort_order) || 0,
      }, token);
      toast.success("Saved");
      onMutate();
      setEditing(false);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const due = assignment.due_date ? new Date(assignment.due_date) : null;
  const isOverdue = due && due < new Date() && assignment.status === "published";

  return (
    <div className={cn("card overflow-hidden", assignment.status === "archived" && "opacity-60")}>
      {/* ── Header row ──────────────────────────────────────────────────────── */}
      <div className="px-4 py-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
          <ClipboardList size={18} className="text-indigo-400" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-navy-900 text-sm">{assignment.title}</span>
            <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", STATUS_COLORS[assignment.status])}>
              {assignment.status}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400 flex-wrap">
            <span className="text-gold-600 font-medium">{assignment.certification?.acronym}</span>
            <span className="flex items-center gap-1"><Star size={10} />{assignment.max_score} pts</span>
            {due && (
              <span className={cn("flex items-center gap-1", isOverdue ? "text-red-500" : "")}>
                <Clock size={10} />Due {formatDate(assignment.due_date)}
              </span>
            )}
            <span className="flex items-center gap-1"><Users size={10} />{assignment._count?.entries ?? 0} submissions</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => setShowEntries((v) => !v)}
            className="btn-outline !py-1.5 !px-3 !text-xs"
            title="View submissions"
          >
            <Users size={11} />
            {assignment._count?.entries ?? 0}
          </button>
          <button
            onClick={() => { setEditing((v) => !v); setExpanded(true); }}
            className="btn-outline !py-1.5 !px-2.5 !text-xs"
            title="Edit"
          >
            <Edit3 size={12} />
          </button>
          <button
            onClick={onToggleStatus}
            className={cn(
              "btn-outline !py-1.5 !px-2.5 !text-xs",
              assignment.status === "published"
                ? "text-amber-600 border-amber-200 hover:bg-amber-50"
                : "text-emerald-600 border-emerald-200 hover:bg-emerald-50"
            )}
            title={assignment.status === "published" ? "Archive" : "Publish"}
          >
            {assignment.status === "published" ? <Archive size={12} /> : <Globe size={12} />}
          </button>
          <button
            onClick={onDelete}
            className="btn-outline !py-1.5 !px-2.5 !text-xs text-red-500 border-red-200 hover:bg-red-50"
            title="Delete"
          >
            <Trash2 size={12} />
          </button>
          <button onClick={() => setExpanded((v) => !v)} className="btn-outline !py-1.5 !px-2 !text-xs">
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
      </div>

      {/* ── Expanded: edit form ──────────────────────────────────────────────── */}
      {expanded && (
        <div className="border-t border-slate-100 px-4 py-4 bg-slate-50/50">
          {editing ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Title</label>
                <input className="input-base text-sm" value={editForm.title} onChange={(e) => setEField("title", e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
                <textarea className="input-base text-sm h-16 resize-none" value={editForm.description} onChange={(e) => setEField("description", e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Instructions</label>
                <textarea className="input-base text-sm h-24 resize-none" value={editForm.instructions} onChange={(e) => setEField("instructions", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
                  <select className="input-base text-sm" value={editForm.status} onChange={(e) => setEField("status", e.target.value)}>
                    {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Max Score</label>
                  <input className="input-base text-sm" type="number" min="1" value={editForm.max_score} onChange={(e) => setEField("max_score", e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Due Date</label>
                  <input className="input-base text-sm" type="date" value={editForm.due_date} onChange={(e) => setEField("due_date", e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Sort Order</label>
                  <input className="input-base text-sm" type="number" min="0" value={editForm.sort_order} onChange={(e) => setEField("sort_order", e.target.value)} />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={saveEdit} disabled={saving} className="btn-primary !py-1.5 !px-4 !text-xs disabled:opacity-60">
                  {saving ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={11} />} Save
                </button>
                <button onClick={() => setEditing(false)} className="btn-outline !py-1.5 !px-4 !text-xs">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-sm text-slate-600">
              {assignment.description && <p>{assignment.description}</p>}
              {assignment.instructions && (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Instructions</p>
                  <p className="whitespace-pre-wrap text-xs">{assignment.instructions}</p>
                </div>
              )}
              {!assignment.description && !assignment.instructions && (
                <p className="text-xs text-slate-400 italic">No description or instructions set.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Entries (submissions) panel ──────────────────────────────────────── */}
      {showEntries && (
        <EntriesPanel assignmentId={assignment.id} token={token} maxScore={assignment.max_score} />
      )}
    </div>
  );
}

function EntriesPanel({ assignmentId, token, maxScore }: { assignmentId: string; token: string; maxScore: number }) {
  const { data: rawEntries, isLoading, mutate } = useSWR(
    token ? [`/admin/assignments/${assignmentId}/entries`, token] : null,
    ([url, t]) => api.get<any>(url, t)
  );

  const entries: any[] = (() => {
    const d = (rawEntries as any)?.data ?? rawEntries;
    return Array.isArray(d) ? d : [];
  })();

  const [grading, setGrading] = useState<Record<string, { grade: string; feedback: string }>>({});

  function initGrade(id: string, entry: any) {
    if (!grading[id]) {
      setGrading((g) => ({ ...g, [id]: { grade: String(entry.grade ?? ""), feedback: entry.feedback ?? "" } }));
    }
  }

  async function submitGrade(entryId: string) {
    const g = grading[entryId];
    if (!g || g.grade === "") { toast.error("Enter a grade"); return; }
    try {
      await api.put(`/admin/assignments/${assignmentId}/entries/${entryId}/grade`, {
        grade: parseFloat(g.grade),
        feedback: g.feedback || undefined,
      }, token);
      toast.success("Graded");
      mutate();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to grade");
    }
  }

  return (
    <div className="border-t border-slate-100">
      <div className="px-4 py-3 bg-indigo-50/50">
        <p className="text-xs font-bold text-indigo-700 uppercase tracking-wide">Submissions</p>
      </div>
      {isLoading ? (
        <div className="px-4 py-6 text-center">
          <Loader2 size={20} className="animate-spin text-slate-300 mx-auto" />
        </div>
      ) : entries.length === 0 ? (
        <div className="px-4 py-6 text-center text-xs text-slate-400">No submissions yet.</div>
      ) : (
        <div className="divide-y divide-slate-100">
          {entries.map((entry) => {
            const name = entry.user?.profile
              ? `${entry.user.profile.first_name ?? ""} ${entry.user.profile.last_name ?? ""}`.trim() || entry.user.email
              : entry.user?.email ?? "Unknown";
            const g = grading[entry.id];

            return (
              <div key={entry.id} className="px-4 py-3 flex gap-4 items-start">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{name}</p>
                  <p className="text-xs text-slate-400">{entry.user?.email}</p>
                  {entry.text_content && (
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2 italic">"{entry.text_content}"</p>
                  )}
                  {entry.file_name && (
                    <p className="text-xs text-blue-600 mt-1">📎 {entry.file_name}</p>
                  )}
                  <p className="text-[10px] text-slate-400 mt-1">
                    Submitted {new Date(entry.submitted_at).toLocaleDateString("en-CA", { dateStyle: "medium" })}
                    {entry.grade != null && ` · Graded ${entry.grade}/${maxScore}`}
                  </p>
                  {entry.feedback && (
                    <p className="text-xs text-slate-500 italic mt-0.5">"{entry.feedback}"</p>
                  )}
                </div>

                <div className="flex-shrink-0 flex flex-col gap-1.5 items-end" onClick={() => initGrade(entry.id, entry)}>
                  <div className="flex gap-1.5 items-center">
                    <input
                      className="input-base !py-1 !px-2 text-xs w-20 text-right"
                      type="number"
                      min="0"
                      max={maxScore}
                      placeholder={`/ ${maxScore}`}
                      value={g?.grade ?? (entry.grade != null ? String(entry.grade) : "")}
                      onChange={(e) => setGrading((prev) => ({ ...prev, [entry.id]: { ...prev[entry.id] ?? { feedback: entry.feedback ?? "" }, grade: e.target.value } }))}
                    />
                    <button
                      onClick={() => submitGrade(entry.id)}
                      className="btn-primary !py-1 !px-2.5 !text-xs"
                    >
                      Grade
                    </button>
                  </div>
                  <input
                    className="input-base !py-1 !px-2 text-xs w-48"
                    placeholder="Feedback (optional)"
                    value={g?.feedback ?? (entry.feedback ?? "")}
                    onChange={(e) => setGrading((prev) => ({ ...prev, [entry.id]: { ...prev[entry.id] ?? { grade: entry.grade != null ? String(entry.grade) : "" }, feedback: e.target.value } }))}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
