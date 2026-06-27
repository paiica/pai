"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import toast from "react-hot-toast";
import {
  ListChecks, PlusCircle, Loader2, AlertCircle, RefreshCw,
  Trash2, Globe, Archive, Clock, Users, ChevronRight,
  ClipboardList, FlaskConical, Briefcase,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const TYPE_META: Record<string, { label: string; icon: any; color: string }> = {
  assignment: { label: "Assignment", icon: ClipboardList, color: "bg-indigo-50 text-indigo-400" },
  exam:       { label: "Exam",       icon: FlaskConical,  color: "bg-amber-50 text-amber-400"  },
  case:       { label: "Case Study", icon: Briefcase,     color: "bg-purple-50 text-purple-400"},
};

const STATUS_COLORS: Record<string, string> = {
  draft:     "bg-slate-100 text-slate-500",
  published: "bg-emerald-50 text-emerald-700",
  archived:  "bg-red-50 text-red-700",
};

type Assignment = {
  id: string;
  title: string;
  type: string;
  due_date?: string | null;
  max_score: number;
  status: string;
  grades_released: boolean;
  certification: { id: string; acronym: string; title: string };
  _count: { entries: number };
};

function fetcher(url: string, token: string) {
  return api.get<any>(url, token);
}

export default function AdminAssignmentsPage() {
  const token = useAuthStore((s) => s.accessToken)!;
  const router = useRouter();

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

  const grouped = assignments.reduce((acc: Record<string, Assignment[]>, a) => {
    const key = a.certification?.acronym ?? "Unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {});

  // ── Quick create ─────────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newForm, setNewForm] = useState({ certification_id: "", title: "", type: "assignment" });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newForm.certification_id) { toast.error("Select a certification"); return; }
    if (!newForm.title.trim()) { toast.error("Title is required"); return; }
    setCreating(true);
    try {
      const res = await api.post("/admin/assignments", {
        certification_id: newForm.certification_id,
        title: newForm.title.trim(),
        type: newForm.type,
      }, token);
      const created = (res as any)?.data ?? res;
      toast.success("Created!");
      mutate();
      setCreateOpen(false);
      setNewForm({ certification_id: "", title: "", type: "assignment" });
      if (created?.id) router.push(`/assignments/${created.id}`);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create");
    } finally {
      setCreating(false);
    }
  }

  async function toggleStatus(a: Assignment) {
    const next = a.status === "published" ? "archived" : "published";
    await toast.promise(
      api.patch(`/admin/assignments/${a.id}`, { status: next }, token).then(mutate),
      { loading: "Updating…", success: "Updated", error: "Failed" }
    );
  }

  async function handleDelete(a: Assignment) {
    if (!confirm(`Delete "${a.title}"? This cannot be undone.`)) return;
    await toast.promise(
      api.delete(`/admin/assignments/${a.id}`, token).then(mutate),
      { loading: "Deleting…", success: "Deleted", error: "Failed" }
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-black text-navy-900">Assignments</h1>
          <p className="text-slate-500 text-sm mt-1">Manage assignments, exams, and cases for certification programs.</p>
        </div>
        <button
          onClick={() => setCreateOpen((v) => !v)}
          className="btn-primary !py-2 !px-4 !text-xs flex-shrink-0"
        >
          <PlusCircle size={13} /> New Assignment
        </button>
      </div>

      {/* Quick create panel */}
      {createOpen && (
        <div className="card p-5 mb-6 bg-navy-50/30 border-navy-200 space-y-4">
          <p className="text-xs font-bold text-navy-900 uppercase tracking-widest">New Assignment</p>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Certification <span className="text-red-500">*</span>
                </label>
                <select
                  className="input-base"
                  value={newForm.certification_id}
                  onChange={(e) => setNewForm((f) => ({ ...f, certification_id: e.target.value }))}
                  required
                >
                  <option value="">— Select —</option>
                  {certs.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.acronym} — {c.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Type</label>
                <select
                  className="input-base"
                  value={newForm.type}
                  onChange={(e) => setNewForm((f) => ({ ...f, type: e.target.value }))}
                >
                  <option value="assignment">Assignment</option>
                  <option value="exam">Exam</option>
                  <option value="case">Case Study</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                className="input-base"
                placeholder="e.g. AI Ethics Case Study"
                value={newForm.title}
                onChange={(e) => setNewForm((f) => ({ ...f, title: e.target.value }))}
                required
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={creating} className="btn-primary !py-2 !px-5 !text-xs disabled:opacity-60">
                {creating ? <Loader2 size={12} className="animate-spin" /> : <PlusCircle size={12} />} Create & Open
              </button>
              <button type="button" onClick={() => setCreateOpen(false)} className="btn-outline !py-2 !px-4 !text-xs">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="card p-10 text-center">
          <Loader2 size={24} className="animate-spin text-slate-300 mx-auto" />
          <p className="text-slate-400 text-xs mt-3">Loading…</p>
        </div>
      ) : error ? (
        <div className="card p-12 text-center">
          <AlertCircle size={32} className="text-red-300 mx-auto mb-3" />
          <p className="text-slate-600 text-sm font-semibold">Could not reach the backend</p>
          <button onClick={() => mutate()} className="btn-outline !py-1.5 !px-4 !text-xs mx-auto mt-4 flex">
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      ) : assignments.length === 0 ? (
        <div className="card p-12 text-center">
          <ListChecks size={36} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-600 text-sm font-semibold">No assignments yet</p>
          <p className="text-slate-400 text-xs mt-1">Create your first assignment to get started.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([certAcronym, items]) => (
            <div key={certAcronym}>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{certAcronym}</p>
              <div className="space-y-2">
                {(items as Assignment[]).map((a) => {
                  const tm = TYPE_META[a.type] ?? TYPE_META.assignment;
                  const TypeIcon = tm.icon;
                  const due = a.due_date ? new Date(a.due_date) : null;
                  const isOverdue = due && due < new Date() && a.status === "published";

                  return (
                    <div key={a.id} className="card overflow-hidden">
                      <div className="flex items-center gap-3 px-4 py-3.5">
                        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0", tm.color)}>
                          <TypeIcon size={16} />
                        </div>

                        <Link href={`/assignments/${a.id}`} className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-navy-900 text-sm hover:text-gold-600 transition-colors">
                              {a.title}
                            </span>
                            <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", STATUS_COLORS[a.status])}>
                              {a.status}
                            </span>
                            {a.grades_released && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                                Grades Released
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400">
                            <span>{tm.label}</span>
                            <span className="flex items-center gap-1"><Users size={10} />{a._count?.entries ?? 0} submissions</span>
                            {due && (
                              <span className={cn("flex items-center gap-1", isOverdue ? "text-red-500" : "")}>
                                <Clock size={10} />
                                {due.toLocaleDateString("en-CA", { dateStyle: "medium" })}
                              </span>
                            )}
                            <span className="text-slate-300">{a.max_score} pts</span>
                          </div>
                        </Link>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => toggleStatus(a)}
                            className={cn(
                              "btn-outline !py-1.5 !px-2.5 !text-xs",
                              a.status === "published"
                                ? "text-amber-600 border-amber-200 hover:bg-amber-50"
                                : "text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                            )}
                            title={a.status === "published" ? "Archive" : "Publish"}
                          >
                            {a.status === "published" ? <Archive size={12} /> : <Globe size={12} />}
                          </button>
                          <button
                            onClick={() => handleDelete(a)}
                            className="btn-outline !py-1.5 !px-2.5 !text-xs text-red-500 border-red-200 hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 size={12} />
                          </button>
                          <Link href={`/assignments/${a.id}`} className="btn-outline !py-1.5 !px-2.5 !text-xs">
                            <ChevronRight size={12} />
                          </Link>
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
