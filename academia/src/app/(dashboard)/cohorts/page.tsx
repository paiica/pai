"use client";

import { useState } from "react";
import useSWR from "swr";
import { UsersRound, Plus, Loader2, Check, X, Trash2, UserPlus } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";

interface Term { id: string; name: string; }
interface Cohort {
  id: string; name: string; description: string | null; term: Term | null;
  _count: { memberships: number };
}
interface CohortMember {
  id: string; joined_at: string;
  user: { id: string; email: string; profile: { first_name: string | null; last_name: string | null } | null };
}
interface Student {
  membership_id: string; user_id: string; email: string; first_name: string | null; last_name: string | null;
}

const EMPTY = { name: "", description: "", term_id: "" };

export default function CohortsPage() {
  const { accessToken, currentInstitutionId } = useAuthStore();

  const { data: raw, mutate } = useSWR(
    accessToken && currentInstitutionId ? [`/institutions/${currentInstitutionId}/cohorts`, accessToken] : null,
    ([url, token]) => api.get<any>(url, token).then((r) => r.data ?? r),
  );
  const cohorts: Cohort[] = Array.isArray(raw) ? raw : [];

  const { data: termsRaw } = useSWR(
    accessToken && currentInstitutionId ? [`/institutions/${currentInstitutionId}/terms`, accessToken] : null,
    ([url, token]) => api.get<any>(url, token).then((r) => r.data ?? r),
  );
  const terms: Term[] = Array.isArray(termsRaw) ? termsRaw : [];

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [managing, setManaging] = useState<Cohort | null>(null);

  async function createCohort() {
    if (!form.name.trim()) { toast.error("Cohort name is required"); return; }
    setSaving(true);
    try {
      await api.post(`/institutions/${currentInstitutionId}/cohorts`, { name: form.name.trim(), description: form.description.trim() || undefined, term_id: form.term_id || undefined }, accessToken!);
      toast.success("Cohort created");
      mutate(); setShowForm(false); setForm(EMPTY);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to create cohort");
    } finally { setSaving(false); }
  }

  async function deleteCohort(cohort: Cohort) {
    if (!confirm(`Delete "${cohort.name}"? This removes all its members.`)) return;
    try {
      await api.delete(`/institutions/${currentInstitutionId}/cohorts/${cohort.id}`, accessToken!);
      toast.success("Cohort deleted");
      mutate();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to delete");
    }
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-slate-500 text-sm">Group students moving through your institution together</p>
        <button onClick={() => setShowForm((v) => !v)} className="btn-primary flex items-center gap-2">
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "Cancel" : "New Cohort"}
        </button>
      </div>

      {showForm && (
        <div className="card p-5 border-2 border-navy-200">
          <p className="font-semibold text-navy-900 text-sm mb-4">New Cohort</p>
          <div className="grid sm:grid-cols-3 gap-4 mb-4">
            <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="input-base text-sm" placeholder="Fall 2026 — CS Intake" />
            <input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className="input-base text-sm" placeholder="Description (optional)" />
            <select value={form.term_id} onChange={(e) => setForm((p) => ({ ...p, term_id: e.target.value }))} className="input-base text-sm">
              <option value="">No term</option>
              {terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <button onClick={createCohort} disabled={saving} className="btn-primary !py-2 !px-4 !text-xs disabled:opacity-60 flex items-center gap-1.5">
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Create
          </button>
        </div>
      )}

      {cohorts.length === 0 ? (
        <div className="card p-12 text-center">
          <UsersRound size={32} className="text-slate-200 mx-auto mb-3" />
          <p className="font-semibold text-slate-500">No cohorts yet</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {cohorts.map((cohort) => (
            <div key={cohort.id} className="card p-5 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                {cohort.term && <span className="text-[10px] font-bold uppercase tracking-wide bg-navy-50 text-navy-700 px-2 py-0.5 rounded-full">{cohort.term.name}</span>}
                <button onClick={() => deleteCohort(cohort)} className="text-slate-300 hover:text-red-500 ml-auto"><Trash2 size={14} /></button>
              </div>
              <h3 className="font-display font-black text-navy-900 text-lg mb-1">{cohort.name}</h3>
              {cohort.description && <p className="text-sm text-slate-500 mb-3 flex-1">{cohort.description}</p>}
              <p className="text-xs text-slate-400 mb-4">{cohort._count.memberships} student{cohort._count.memberships === 1 ? "" : "s"}</p>
              <button onClick={() => setManaging(cohort)} className="btn-outline !py-1.5 !text-xs w-full justify-center flex items-center gap-1.5">
                <UserPlus size={12} /> Manage Students
              </button>
            </div>
          ))}
        </div>
      )}

      {managing && (
        <CohortMembersModal
          cohort={managing}
          institutionId={currentInstitutionId!}
          token={accessToken!}
          onClose={() => setManaging(null)}
          onChanged={() => mutate()}
        />
      )}
    </div>
  );
}

function CohortMembersModal({ cohort, institutionId, token, onClose, onChanged }: {
  cohort: Cohort; institutionId: string; token: string; onClose: () => void; onChanged: () => void;
}) {
  const { data: membersRaw, mutate: mutateMembers } = useSWR(
    [`/institutions/${institutionId}/cohorts/${cohort.id}/members`, token],
    ([url, t]) => api.get<any>(url, t).then((r) => r.data ?? r),
  );
  const members: CohortMember[] = Array.isArray(membersRaw) ? membersRaw : [];

  const { data: studentsRaw } = useSWR(
    [`/institutions/${institutionId}/students`, token],
    ([url, t]) => api.get<any>(url, t).then((r) => r.data ?? r),
  );
  const allStudents: Student[] = Array.isArray(studentsRaw) ? studentsRaw : [];
  const memberUserIds = new Set(members.map((m) => m.user.id));
  const available = allStudents.filter((s) => !memberUserIds.has(s.user_id));

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);

  async function addSelected() {
    if (selected.size === 0) return;
    setAdding(true);
    try {
      await api.post(`/institutions/${institutionId}/cohorts/${cohort.id}/members`, { user_ids: Array.from(selected) }, token);
      toast.success(`Added ${selected.size} student(s)`);
      setSelected(new Set());
      mutateMembers();
      onChanged();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to add students");
    } finally { setAdding(false); }
  }

  async function removeMember(membershipId: string) {
    try {
      await api.delete(`/institutions/${institutionId}/cohorts/${cohort.id}/members/${membershipId}`, token);
      toast.success("Removed");
      mutateMembers();
      onChanged();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to remove");
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="font-display font-black text-navy-900 text-lg">{cohort.name}</h3>
            <p className="text-sm text-slate-500">Manage students in this cohort</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="mb-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Current Members ({members.length})</p>
          {members.length === 0 ? (
            <p className="text-sm text-slate-400">No students yet.</p>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl">
              {members.map((m) => (
                <div key={m.id} className="px-3 py-2 flex items-center justify-between text-sm">
                  <span className="text-navy-900">{m.user.profile?.first_name ? `${m.user.profile.first_name} ${m.user.profile.last_name ?? ""}` : m.user.email}</span>
                  <button onClick={() => removeMember(m.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Add Students ({available.length} available)</p>
          {available.length === 0 ? (
            <p className="text-sm text-slate-400">No more institution students to add.</p>
          ) : (
            <>
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl max-h-52 overflow-y-auto mb-3">
                {available.map((s) => (
                  <label key={s.user_id} className="px-3 py-2 flex items-center gap-2.5 text-sm cursor-pointer hover:bg-slate-50">
                    <input type="checkbox" checked={selected.has(s.user_id)} onChange={() => toggle(s.user_id)} />
                    {s.first_name ? `${s.first_name} ${s.last_name ?? ""}` : s.email}
                  </label>
                ))}
              </div>
              <button onClick={addSelected} disabled={adding || selected.size === 0} className="btn-primary !py-2 !px-4 !text-xs disabled:opacity-50 flex items-center gap-1.5">
                {adding ? <Loader2 size={12} className="animate-spin" /> : <UserPlus size={12} />} Add Selected ({selected.size})
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
