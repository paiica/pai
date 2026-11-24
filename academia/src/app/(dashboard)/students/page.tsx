"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { UserPlus, Loader2, Trash2, Search, Download, Mail, ChevronLeft, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { downloadFile } from "@/lib/download";
import type { InstitutionPerson, Paginated } from "@/types";

const LIMIT = 20;
const EMPTY_INVITE = { email: "", first_name: "", last_name: "" };

export default function StudentsPage() {
  const { accessToken, currentInstitutionId } = useAuthStore();

  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(q); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [q]);

  const { data, isLoading, mutate } = useSWR(
    accessToken && currentInstitutionId
      ? [`/institutions/${currentInstitutionId}/students?page=${page}&limit=${LIMIT}${search ? `&search=${encodeURIComponent(search)}` : ""}`, accessToken]
      : null,
    ([url, token]) => api.get<Paginated<InstitutionPerson>>(url, token),
  );
  const students = data?.data ?? [];
  const pages = data?.pages ?? 1;

  const [showInvite, setShowInvite] = useState(false);
  const [form, setForm] = useState(EMPTY_INVITE);
  const [inviting, setInviting] = useState(false);
  const [resending, setResending] = useState<string | null>(null);

  async function invite() {
    if (!form.email.trim()) { toast.error("Email is required"); return; }
    setInviting(true);
    try {
      const res = await api.post<{ message: string }>(`/institutions/${currentInstitutionId}/students/invite`, {
        email: form.email.trim(),
        first_name: form.first_name.trim() || undefined,
        last_name: form.last_name.trim() || undefined,
      }, accessToken!);
      toast.success(res.message ?? "Added");
      setShowInvite(false); setForm(EMPTY_INVITE);
      mutate();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to add student");
    } finally { setInviting(false); }
  }

  async function remove(membershipId: string) {
    if (!confirm("Suspend this student's access to your institution?")) return;
    try {
      await api.delete(`/institutions/${currentInstitutionId}/students/${membershipId}`, accessToken!);
      toast.success("Suspended");
      mutate();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to suspend");
    }
  }

  async function resendInvite(membershipId: string) {
    setResending(membershipId);
    try {
      await api.post(`/institutions/${currentInstitutionId}/students/${membershipId}/resend-invite`, {}, accessToken!);
      toast.success("Invite resent");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to resend invite");
    } finally { setResending(null); }
  }

  async function handleExport() {
    setExporting(true);
    try {
      await downloadFile(
        `/institutions/${currentInstitutionId}/students/export${search ? `?search=${encodeURIComponent(search)}` : ""}`,
        accessToken!, `students-${new Date().toISOString().split("T")[0]}.csv`,
      );
    } catch {
      toast.error("Export failed");
    } finally { setExporting(false); }
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-slate-500 text-sm">Students join automatically with a verified institution email domain — or add one directly below</p>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} disabled={exporting} className="btn-outline !py-2 !px-3 !text-xs flex items-center gap-1.5 disabled:opacity-60">
            {exporting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />} Export CSV
          </button>
          <button onClick={() => setShowInvite((v) => !v)} className="btn-primary flex items-center gap-2">
            <UserPlus size={14} /> Add Student
          </button>
        </div>
      </div>

      {showInvite && (
        <div className="card p-5 border-2 border-navy-200">
          <p className="font-semibold text-navy-900 text-sm mb-4">Add a Student</p>
          <div className="grid sm:grid-cols-3 gap-4 mb-4">
            <input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              className="input-base text-sm" placeholder="name@example.com" />
            <input value={form.first_name} onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))}
              className="input-base text-sm" placeholder="First name (if new)" />
            <input value={form.last_name} onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))}
              className="input-base text-sm" placeholder="Last name (if new)" />
          </div>
          <button onClick={invite} disabled={inviting} className="btn-primary !py-2 !px-4 !text-xs disabled:opacity-60 flex items-center gap-1.5">
            {inviting && <Loader2 size={12} className="animate-spin" />} Add Student
          </button>
        </div>
      )}

      <div className="relative max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email…" className="input-base !pl-9 text-sm" />
      </div>

      {isLoading ? (
        <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-slate-300" size={24} /></div>
      ) : students.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="font-semibold text-slate-500">{search ? "No matches" : "No students yet"}</p>
          {!search && <p className="text-slate-400 text-sm mt-1">They'll appear here once they register with your institution's email domain, or once you add one directly.</p>}
        </div>
      ) : (
        <div className="card overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Student</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Joined</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((s) => (
                <tr key={s.membership_id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-navy-900">{s.first_name ? `${s.first_name} ${s.last_name ?? ""}` : s.email}</p>
                    <p className="text-xs text-slate-400">{s.email}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(s.joined_at)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${s.status === "active" ? "bg-emerald-50 text-emerald-700" : s.status === "invited" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      {s.status === "invited" && (
                        <button onClick={() => resendInvite(s.membership_id)} disabled={resending === s.membership_id} className="text-slate-400 hover:text-navy-600 transition-colors" title="Resend invite">
                          {resending === s.membership_id ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />}
                        </button>
                      )}
                      <button onClick={() => remove(s.membership_id)} className="text-slate-300 hover:text-red-500 transition-colors" title="Suspend">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
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
