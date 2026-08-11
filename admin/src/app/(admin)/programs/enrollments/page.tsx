"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import toast from "react-hot-toast";
import {
  Users, ChevronDown, ChevronUp, Loader2, AlertCircle, RefreshCw, Search,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-blue-50 text-blue-700",
  completed: "bg-emerald-50 text-emerald-700",
  suspended: "bg-red-50 text-red-700",
};

function EnrollmentRow({ row, token, onRefresh }: { row: any; token: string; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const profile = row.user?.profile;
  const name = profile ? `${profile.first_name} ${profile.last_name}` : (row.user?.email ?? "Unknown");
  const cert = row.certificate;

  async function revoke() {
    const reason = prompt("Reason for revoking this certificate? (optional)") ?? undefined;
    await toast.promise(
      api.patch(`/admin/programs/certificates/${cert.id}/revoke`, { reason }, token).then(() => onRefresh()),
      { loading: "Revoking…", success: "Certificate revoked", error: "Failed" },
    );
  }

  async function reactivate() {
    await toast.promise(
      api.patch(`/admin/programs/certificates/${cert.id}/reactivate`, {}, token).then(() => onRefresh()),
      { loading: "Reactivating…", success: "Certificate reactivated", error: "Failed" },
    );
  }

  return (
    <div className="border-b border-slate-50 last:border-0">
      <div className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50/80 transition-colors" onClick={() => setExpanded((x) => !x)}>
        <div className="w-9 h-9 rounded-full bg-navy-100 text-navy-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-navy-900 truncate">{name}</p>
          <p className="text-xs text-slate-400 truncate">{row.user?.email}</p>
        </div>
        <Link href={`/programs/${row.program?.id}/edit`} onClick={(e) => e.stopPropagation()} className="badge bg-navy-50 text-navy-700 flex-shrink-0 hidden sm:inline-flex hover:bg-navy-100">
          {row.program?.title}
        </Link>
        <span className="text-xs text-slate-400 hidden md:block flex-shrink-0">{formatDate(row.enrolled_at)}</span>
        <span className={cn("badge flex-shrink-0", STATUS_COLORS[row.status] ?? "bg-slate-100 text-slate-500")}>{row.status}</span>
        <div className="hidden lg:block flex-shrink-0 w-24 text-right">
          {cert ? (
            cert.status === "revoked"
              ? <span className="text-xs font-semibold text-red-500">Revoked</span>
              : <span className="text-xs font-semibold text-emerald-600">Issued</span>
          ) : <span className="text-xs text-slate-300">Pending</span>}
        </div>
        <div className="text-slate-300 flex-shrink-0">{expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</div>
      </div>

      {expanded && (
        <div className="bg-slate-50/50 px-5 pb-5 pt-3 space-y-4 border-t border-slate-100">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Program</p>
              <p className="text-sm text-slate-800">{row.program?.title}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Enrolled</p>
              <p className="text-sm text-slate-800">{formatDate(row.enrolled_at)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Progress</p>
              <p className="text-sm text-slate-800">{row.progress_percentage ?? 0}%</p>
            </div>
            {cert && (
              <>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Certificate #</p>
                  <p className="text-xs text-slate-700 font-mono">{cert.certificate_number}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Issued</p>
                  <p className="text-sm text-slate-800">{formatDate(cert.issued_at)}</p>
                </div>
              </>
            )}
          </div>
          {cert && (
            <div>
              {cert.status === "revoked" ? (
                <button onClick={reactivate} className="btn-outline !py-1.5 !px-3 !text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50">Reactivate Certificate</button>
              ) : (
                <button onClick={revoke} className="btn-outline !py-1.5 !px-3 !text-xs text-red-500 border-red-200 hover:bg-red-50">Revoke Certificate</button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProgramEnrollmentsPage() {
  const { accessToken } = useAuthStore();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data, isLoading, error, mutate } = useSWR(
    accessToken ? [`/admin/programs/enrollments?page=${page}&limit=25&q=${encodeURIComponent(search)}&status=${statusFilter}`, accessToken] : null,
    ([url, token]) => api.get<any>(url, token),
    { revalidateOnFocus: false },
  );

  const payload = data?.data ?? data;
  const enrollments: any[] = Array.isArray(payload?.data) ? payload.data : [];
  const meta = payload?.meta ?? { total: 0, totalPages: 1 };

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-black text-navy-900">Program Enrollments</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {isLoading ? "Loading…" : `${meta.total} enrollment${meta.total !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button onClick={() => mutate()} className="btn-outline !py-1.5 !px-3 !text-xs flex items-center gap-1.5">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
          <input
            type="text"
            placeholder="Search by name, email, or program…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 bg-white"
          />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="input-base !text-sm sm:w-40">
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <div className="p-10 text-center">
            <Loader2 size={24} className="animate-spin text-slate-300 mx-auto" />
            <p className="text-slate-400 text-sm mt-3">Loading enrollments…</p>
          </div>
        ) : error ? (
          <div className="p-10 text-center">
            <AlertCircle size={28} className="text-red-300 mx-auto mb-3" />
            <p className="text-slate-600 text-sm font-semibold">Could not load enrollments</p>
            <button onClick={() => mutate()} className="btn-outline !py-1.5 !px-4 !text-xs mx-auto mt-4">
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        ) : enrollments.length === 0 ? (
          <div className="p-10 text-center">
            <Users size={28} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm font-semibold">No enrollments found</p>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-4 px-5 py-2.5 border-b border-slate-100 bg-slate-50/80">
              <div className="w-9 flex-shrink-0" />
              <div className="flex-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Student</div>
              <div className="hidden sm:block text-[10px] font-bold text-slate-400 uppercase tracking-widest w-32">Program</div>
              <div className="hidden md:block text-[10px] font-bold text-slate-400 uppercase tracking-widest w-24">Enrolled</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest w-20">Status</div>
              <div className="hidden lg:block text-[10px] font-bold text-slate-400 uppercase tracking-widest w-24 text-right">Certificate</div>
              <div className="w-4 flex-shrink-0" />
            </div>
            {enrollments.map((row: any) => (
              <EnrollmentRow key={row.id} row={row} token={accessToken!} onRefresh={() => mutate()} />
            ))}
          </div>
        )}
      </div>

      {meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-5">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="btn-outline !py-1.5 !px-3 !text-xs disabled:opacity-40">Previous</button>
          <span className="text-sm text-slate-500">Page {page} of {meta.totalPages}</span>
          <button disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)} className="btn-outline !py-1.5 !px-3 !text-xs disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}
