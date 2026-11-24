"use client";

import { useState } from "react";
import useSWR from "swr";
import { CalendarRange, Plus, Loader2, Check, X, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";

interface Term {
  id: string; name: string; start_date: string; end_date: string; status: "upcoming" | "active" | "completed";
  _count: { cohorts: number; courses: number };
}

const EMPTY = { name: "", start_date: "", end_date: "", status: "upcoming" as Term["status"] };

const STATUS_COLOR: Record<Term["status"], string> = {
  upcoming: "bg-slate-100 text-slate-500",
  active: "bg-emerald-50 text-emerald-700",
  completed: "bg-slate-100 text-slate-400",
};

export default function TermsPage() {
  const { accessToken, currentInstitutionId } = useAuthStore();

  const { data: raw, isLoading, mutate } = useSWR(
    accessToken && currentInstitutionId ? [`/institutions/${currentInstitutionId}/terms`, accessToken] : null,
    ([url, token]) => api.get<any>(url, token).then((r) => r.data ?? r),
  );
  const terms: Term[] = Array.isArray(raw) ? raw : [];

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  async function createTerm() {
    if (!form.name.trim() || !form.start_date || !form.end_date) { toast.error("Name, start date, and end date are required"); return; }
    setSaving(true);
    try {
      await api.post(`/institutions/${currentInstitutionId}/terms`, form, accessToken!);
      toast.success("Term created");
      mutate(); setShowForm(false); setForm(EMPTY);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to create term");
    } finally { setSaving(false); }
  }

  async function updateStatus(term: Term, status: Term["status"]) {
    try {
      await api.patch(`/institutions/${currentInstitutionId}/terms/${term.id}`, { status }, accessToken!);
      toast.success("Status updated");
      mutate();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to update");
    }
  }

  async function deleteTerm(term: Term) {
    if (!confirm(`Delete "${term.name}"? Cohorts/courses linked to it will just become unscoped, not deleted.`)) return;
    try {
      await api.delete(`/institutions/${currentInstitutionId}/terms/${term.id}`, accessToken!);
      toast.success("Term deleted");
      mutate();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to delete");
    }
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-slate-500 text-sm">Your institution's semester/term calendar</p>
        <button onClick={() => setShowForm((v) => !v)} className="btn-primary flex items-center gap-2">
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "Cancel" : "New Term"}
        </button>
      </div>

      {showForm && (
        <div className="card p-5 border-2 border-navy-200">
          <p className="font-semibold text-navy-900 text-sm mb-4">New Term</p>
          <div className="grid sm:grid-cols-4 gap-4 mb-4">
            <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="input-base text-sm" placeholder="Fall 2026" />
            <input type="date" value={form.start_date} onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))} className="input-base text-sm" />
            <input type="date" value={form.end_date} onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))} className="input-base text-sm" />
            <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as Term["status"] }))} className="input-base text-sm">
              <option value="upcoming">Upcoming</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <button onClick={createTerm} disabled={saving} className="btn-primary !py-2 !px-4 !text-xs disabled:opacity-60 flex items-center gap-1.5">
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Create
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-slate-300" size={24} /></div>
      ) : terms.length === 0 ? (
        <div className="card p-12 text-center">
          <CalendarRange size={32} className="text-slate-200 mx-auto mb-3" />
          <p className="font-semibold text-slate-500">No terms yet</p>
          <p className="text-slate-400 text-sm mt-1">Create your first term (e.g. "Fall 2026") to start scoping cohorts and courses to it.</p>
        </div>
      ) : (
        <div className="card overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Term</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Dates</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Cohorts</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Courses</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {terms.map((term) => (
                <tr key={term.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-navy-900">{term.name}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(term.start_date)} – {formatDate(term.end_date)}</td>
                  <td className="px-4 py-3">
                    <select
                      value={term.status}
                      onChange={(e) => updateStatus(term, e.target.value as Term["status"])}
                      className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full border-0 ${STATUS_COLOR[term.status]}`}
                    >
                      <option value="upcoming">Upcoming</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{term._count.cohorts}</td>
                  <td className="px-4 py-3 text-slate-600">{term._count.courses}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => deleteTerm(term)} className="text-slate-300 hover:text-red-500 ml-auto block"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
