"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { UserPlus, Loader2, Trash2, BookOpen, Search, Download, Mail, ChevronLeft, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { downloadFile } from "@/lib/download";
import type { InstitutionPerson, Paginated } from "@/types";

const EMPTY_INVITE = { email: "", first_name: "", last_name: "", role: "professor" as "professor" | "admin" };
const LIMIT = 20;

const ROLE_LABEL: Record<string, string> = { owner: "Owner", admin: "Admin", professor: "Professor" };

export default function ProfessorsPage() {
  const { accessToken, currentInstitutionId, user } = useAuthStore();

  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(q); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [q]);

  const { data, isLoading, mutate } = useSWR(
    accessToken && currentInstitutionId
      ? [`/institutions/${currentInstitutionId}/professors?page=${page}&limit=${LIMIT}${search ? `&search=${encodeURIComponent(search)}` : ""}`, accessToken]
      : null,
    ([url, token]) => api.get<Paginated<InstitutionPerson>>(url, token),
  );
  const professors = data?.data ?? [];

  const [showInvite, setShowInvite] = useState(false);
  const [form, setForm] = useState(EMPTY_INVITE);
  const [inviting, setInviting] = useState(false);
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [resending, setResending] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  async function invite() {
    if (!form.email.trim()) { toast.error("Email is required"); return; }
    setInviting(true);
    try {
      const res = await api.post<{ message: string }>(`/institutions/${currentInstitutionId}/professors/invite`, {
        email: form.email.trim(),
        first_name: form.first_name.trim() || undefined,
        last_name: form.last_name.trim() || undefined,
        role: form.role,
      }, accessToken!);
      toast.success(res.message ?? "Invited");
      setShowInvite(false); setForm(EMPTY_INVITE);
      mutate();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to send invite");
    } finally { setInviting(false); }
  }

  async function remove(membershipId: string) {
    if (!confirm("Suspend this person's access to your institution?")) return;
    try {
      await api.delete(`/institutions/${currentInstitutionId}/professors/${membershipId}`, accessToken!);
      toast.success("Suspended");
      mutate();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to suspend");
    }
  }

  async function changeRole(membershipId: string, role: "admin" | "professor") {
    setChangingRole(membershipId);
    try {
      await api.patch(`/institutions/${currentInstitutionId}/memberships/${membershipId}`, { role }, accessToken!);
      toast.success("Role updated");
      mutate();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to update role");
    } finally { setChangingRole(null); }
  }

  async function resendInvite(membershipId: string) {
    setResending(membershipId);
    try {
      await api.post(`/institutions/${currentInstitutionId}/professors/${membershipId}/resend-invite`, {}, accessToken!);
      toast.success("Invite resent");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to resend invite");
    } finally { setResending(null); }
  }

  async function handleExport() {
    setExporting(true);
    try {
      await downloadFile(
        `/institutions/${currentInstitutionId}/professors/export${search ? `?search=${encodeURIComponent(search)}` : ""}`,
        accessToken!, `professors-${new Date().toISOString().split("T")[0]}.csv`,
      );
    } catch {
      toast.error("Export failed");
    } finally { setExporting(false); }
  }

  const pages = data?.pages ?? 1;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-slate-500 text-sm">Professors and admins who can create courses or manage your institution</p>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} disabled={exporting} className="btn-outline !py-2 !px-3 !text-xs flex items-center gap-1.5 disabled:opacity-60">
            {exporting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />} Export CSV
          </button>
          <button onClick={() => setShowInvite((v) => !v)} className="btn-primary flex items-center gap-2">
            <UserPlus size={14} /> Invite
          </button>
        </div>
      </div>

      {showInvite && (
        <div className="card p-5 border-2 border-navy-200">
          <p className="font-semibold text-navy-900 text-sm mb-4">Invite a Team Member</p>
          <div className="grid sm:grid-cols-4 gap-4 mb-4">
            <input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              className="input-base text-sm" placeholder="name@youruniversity.edu" />
            <input value={form.first_name} onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))}
              className="input-base text-sm" placeholder="First name (if new)" />
            <input value={form.last_name} onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))}
              className="input-base text-sm" placeholder="Last name (if new)" />
            <select value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as "professor" | "admin" }))} className="input-base text-sm">
              <option value="professor">Professor</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button onClick={invite} disabled={inviting} className="btn-primary !py-2 !px-4 !text-xs disabled:opacity-60 flex items-center gap-1.5">
            {inviting && <Loader2 size={12} className="animate-spin" />} Send Invite
          </button>
        </div>
      )}

      <div className="relative max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email…" className="input-base !pl-9 text-sm" />
      </div>

      {isLoading ? (
        <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-slate-300" size={24} /></div>
      ) : professors.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="font-semibold text-slate-500">{search ? "No matches" : "No professors yet"}</p>
          {!search && <p className="text-slate-400 text-sm mt-1">Invite one to start creating courses for your institution.</p>}
        </div>
      ) : (
        <div className="card overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Professor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Courses</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {professors.map((p) => {
                const isSelf = p.user_id === user?.id;
                const canChangeRole = p.role !== "owner" && !isSelf;
                return (
                  <tr key={p.membership_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-navy-900">{p.first_name ? `${p.first_name} ${p.last_name ?? ""}` : p.email}</p>
                      <p className="text-xs text-slate-400">{p.email}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {canChangeRole ? (
                        <select
                          value={p.role}
                          disabled={changingRole === p.membership_id}
                          onChange={(e) => changeRole(p.membership_id, e.target.value as "admin" | "professor")}
                          className="input-base !py-1 !text-xs !w-auto"
                        >
                          <option value="professor">Professor</option>
                          <option value="admin">Admin</option>
                        </select>
                      ) : (
                        ROLE_LABEL[p.role ?? ""] ?? p.role
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <span className="inline-flex items-center gap-1.5"><BookOpen size={13} className="text-slate-400" /> {p.course_count ?? 0}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${p.status === "active" ? "bg-emerald-50 text-emerald-700" : p.status === "invited" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        {p.status === "invited" && (
                          <button onClick={() => resendInvite(p.membership_id)} disabled={resending === p.membership_id} className="text-slate-400 hover:text-navy-600 transition-colors" title="Resend invite">
                            {resending === p.membership_id ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />}
                          </button>
                        )}
                        {p.role !== "owner" && (
                          <button onClick={() => remove(p.membership_id)} className="text-slate-300 hover:text-red-500 transition-colors" title="Suspend">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="btn-outline !p-2 disabled:opacity-40"><ChevronLeft size={14} /></button>
          <span className="text-xs text-slate-500">Page {page} of {pages}</span>
          <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages} className="btn-outline !p-2 disabled:opacity-40"><ChevronRight size={14} /></button>
        </div>
      )}
    </div>
  );
}
