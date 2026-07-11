"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  Award, XCircle, Loader2, AlertCircle,
  RefreshCw, ChevronDown, ChevronUp, Search,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { EnrollmentActions } from "@/components/EnrollmentActions";

const STATUS_COLORS: Record<string, string> = {
  active:    "bg-emerald-50 text-emerald-700",
  completed: "bg-emerald-50 text-emerald-700",
  suspended: "bg-red-50 text-red-700",
  expired:   "bg-slate-100 text-slate-500",
};

function EnrollmentRow({ row, token, onRefresh }: { row: any; token: string; onRefresh: () => void }) {
  const [expanded, setExpanded]   = useState(false);

  const cert    = row.certificate;
  const attempt = row.exam_attempts?.[0];
  const profile = row.user?.profile;
  const name    = profile ? `${profile.first_name} ${profile.last_name}` : (row.user?.email ?? "Unknown");

  return (
    <div className="border-b border-slate-50 last:border-0">
      <div
        className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50/80 transition-colors"
        onClick={() => setExpanded((x) => !x)}
      >
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-navy-100 text-navy-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
          {name.charAt(0).toUpperCase()}
        </div>

        {/* Name + email */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-navy-900 truncate">{name}</p>
          <p className="text-xs text-slate-400 truncate">{row.user?.email}</p>
        </div>

        {/* Program */}
        <span className="badge bg-navy-50 text-navy-700 flex-shrink-0 hidden sm:inline-flex">
          {row.certification?.acronym}
        </span>

        {/* Enrolled date */}
        <span className="text-xs text-slate-400 hidden md:block flex-shrink-0">
          {formatDate(row.enrolled_at)}
        </span>

        {/* Status */}
        <span className={cn("badge flex-shrink-0", STATUS_COLORS[row.status] ?? "bg-slate-100 text-slate-500")}>
          {row.status}
        </span>

        {/* Certificate indicator */}
        <div className="hidden lg:block flex-shrink-0 w-20 text-right">
          {cert ? (
            cert.status === "revoked" ? (
              <span className="text-xs font-semibold text-red-500">Revoked</span>
            ) : (
              <span className="text-xs font-semibold text-emerald-600">Issued</span>
            )
          ) : row.status === "suspended" ? (
            <span className="text-xs font-semibold text-red-500">Failed</span>
          ) : (
            <span className="text-xs text-slate-300">Pending</span>
          )}
        </div>

        <div className="text-slate-300 flex-shrink-0">
          {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </div>
      </div>

      {expanded && (
        <div className="bg-slate-50/50 px-5 pb-5 pt-3 space-y-4 border-t border-slate-100">
          {/* Detail grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Certification</p>
              <p className="text-sm text-slate-800">{row.certification?.title}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Enrolled</p>
              <p className="text-sm text-slate-800">{formatDate(row.enrolled_at)}</p>
            </div>
            {attempt && (
              <>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Last Attempt</p>
                  <p className="text-sm text-slate-800 capitalize">{attempt.status?.replace("_", " ")}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Attempt Score</p>
                  <p className="text-sm text-slate-800">
                    {attempt.score_percentage != null ? `${attempt.score_percentage}%` : "—"}
                    {attempt.passed != null && (
                      <span className={cn("ml-2 text-xs font-semibold", attempt.passed ? "text-emerald-600" : "text-red-500")}>
                        {attempt.passed ? "Passed" : "Failed"}
                      </span>
                    )}
                  </p>
                </div>
              </>
            )}
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
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Expires</p>
                  <p className="text-sm text-slate-800">{formatDate(cert.expires_at)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Exam Score</p>
                  <p className="text-sm text-slate-800">{cert.exam_score != null ? `${cert.exam_score}%` : "—"}</p>
                </div>
              </>
            )}
          </div>

          <EnrollmentActions row={row} token={token} studentName={name} onRefresh={onRefresh} />
        </div>
      )}
    </div>
  );
}

export default function CertificatesPage() {
  const { accessToken } = useAuthStore();
  const [page, setPage]     = useState(1);
  const [search, setSearch] = useState("");

  const { data, isLoading, error, mutate } = useSWR(
    accessToken ? [`/certificates/admin/enrollments?page=${page}&limit=25`, accessToken] : null,
    ([url, token]) => api.get<any>(url, token),
    { revalidateOnFocus: false },
  );

  const payload     = data?.data ?? data;
  const enrollments: any[] = Array.isArray(payload?.data) ? payload.data : [];
  const meta        = payload?.meta ?? { total: 0, totalPages: 1 };

  const filtered = search.trim()
    ? enrollments.filter((e) => {
        const name    = e.user?.profile ? `${e.user.profile.first_name} ${e.user.profile.last_name}`.toLowerCase() : "";
        const email   = (e.user?.email ?? "").toLowerCase();
        const acronym = (e.certification?.acronym ?? "").toLowerCase();
        const q       = search.toLowerCase();
        return name.includes(q) || email.includes(q) || acronym.includes(q);
      })
    : enrollments;

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-black text-navy-900">Issued Certificates</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {isLoading ? "Loading…" : `${meta.total} enrollment${meta.total !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button
          onClick={() => mutate()}
          className="btn-outline !py-1.5 !px-3 !text-xs flex items-center gap-1.5"
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
        <input
          type="text"
          placeholder="Search by name, email, or program…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 bg-white"
        />
      </div>

      {/* Table */}
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
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <Award size={28} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm font-semibold">No enrollments found</p>
          </div>
        ) : (
          <div>
            {/* Column headers */}
            <div className="flex items-center gap-4 px-5 py-2.5 border-b border-slate-100 bg-slate-50/80">
              <div className="w-9 flex-shrink-0" />
              <div className="flex-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Student</div>
              <div className="hidden sm:block text-[10px] font-bold text-slate-400 uppercase tracking-widest w-16">Program</div>
              <div className="hidden md:block text-[10px] font-bold text-slate-400 uppercase tracking-widest w-24">Enrolled</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest w-20">Status</div>
              <div className="hidden lg:block text-[10px] font-bold text-slate-400 uppercase tracking-widest w-20 text-right">Cert</div>
              <div className="w-4 flex-shrink-0" />
            </div>
            {filtered.map((row: any) => (
              <EnrollmentRow key={row.id} row={row} token={accessToken!} onRefresh={() => mutate()} />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-5">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="btn-outline !py-1.5 !px-3 !text-xs disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-slate-500">Page {page} of {meta.totalPages}</span>
          <button
            disabled={page >= meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="btn-outline !py-1.5 !px-3 !text-xs disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
