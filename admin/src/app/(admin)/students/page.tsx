"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { GraduationCap, Search, ChevronRight, Loader2, AlertCircle, RefreshCw, Mail } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";

interface StudentRow {
  id: string;
  email: string;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
  last_login_at: string | null;
  first_name: string | null;
  last_name: string | null;
  pai_id: string | null;
  country: string | null;
}

const LIMIT = 25;

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}

function fullName(s: StudentRow) {
  const n = `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim();
  return n || s.email;
}

export default function StudentsPage() {
  const { accessToken } = useAuthStore();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");

  const { data, isLoading, error, mutate } = useSWR(
    accessToken ? [`/users?page=${page}&limit=${LIMIT}&role=student&q=${encodeURIComponent(q)}`, accessToken] : null,
    ([url, token]) => api.get<any>(url, token),
    { revalidateOnFocus: false },
  );

  const payload = data?.data ?? data;
  const students: StudentRow[] = Array.isArray(payload?.data) ? payload.data : [];
  const meta = payload?.meta ?? { total: 0, totalPages: 1 };

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setQ(search.trim());
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-black text-navy-900 flex items-center gap-2">
            <GraduationCap size={22} className="text-navy-700" /> Students
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {isLoading ? "Loading…" : `${meta.total} student${meta.total !== 1 ? "s" : ""}`} — full profile, courses, certificates, renewals & payments in one place
          </p>
        </div>
        <button onClick={() => mutate()} className="btn-outline !py-1.5 !px-3 !text-xs flex items-center gap-1.5">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
        <input
          type="text"
          placeholder="Search by name, email, or PAI ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 bg-white"
        />
      </form>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <div className="p-10 text-center">
            <Loader2 size={24} className="animate-spin text-slate-300 mx-auto" />
            <p className="text-slate-400 text-sm mt-3">Loading students…</p>
          </div>
        ) : error ? (
          <div className="p-10 text-center">
            <AlertCircle size={28} className="text-red-300 mx-auto mb-3" />
            <p className="text-slate-600 text-sm font-semibold">Could not load students</p>
            <button onClick={() => mutate()} className="btn-outline !py-1.5 !px-4 !text-xs mx-auto mt-4">
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        ) : students.length === 0 ? (
          <div className="p-10 text-center">
            <GraduationCap size={28} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm font-semibold">No students found</p>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-4 px-5 py-2.5 border-b border-slate-100 bg-slate-50/80">
              <div className="w-9 flex-shrink-0" />
              <div className="flex-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Student</div>
              <div className="hidden sm:block text-[10px] font-bold text-slate-400 uppercase tracking-widest w-28">PAI ID</div>
              <div className="hidden md:block text-[10px] font-bold text-slate-400 uppercase tracking-widest w-24">Country</div>
              <div className="hidden md:block text-[10px] font-bold text-slate-400 uppercase tracking-widest w-24">Last Login</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest w-20">Status</div>
              <div className="w-4 flex-shrink-0" />
            </div>
            {students.map((s) => (
              <Link
                key={s.id}
                href={`/students/${s.id}`}
                className="flex items-center gap-4 px-5 py-4 border-b border-slate-50 last:border-0 hover:bg-slate-50/80 transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-navy-100 text-navy-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {fullName(s).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-navy-900 truncate">{fullName(s)}</p>
                  <p className="text-xs text-slate-400 truncate flex items-center gap-1">
                    <Mail size={10} /> {s.email}
                  </p>
                </div>
                <div className="hidden sm:block text-xs text-slate-500 font-mono w-28 flex-shrink-0">{s.pai_id || "—"}</div>
                <div className="hidden md:block text-xs text-slate-500 w-24 flex-shrink-0">{s.country || "—"}</div>
                <div className="hidden md:block text-xs text-slate-500 w-24 flex-shrink-0">{fmtDate(s.last_login_at)}</div>
                <div className="w-20 flex-shrink-0">
                  <span className={`badge ${s.is_active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                    {s.is_active ? "Active" : "Disabled"}
                  </span>
                </div>
                <ChevronRight size={15} className="text-slate-300 flex-shrink-0" />
              </Link>
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
