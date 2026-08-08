"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Users2, Search, ChevronRight, Loader2, AlertCircle, RefreshCw, Mail, BookOpen, Send, Award } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";

interface ProfessorRow {
  id: string;
  email: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  roster_count: number;
  courses_taught_count: number;
  courses_created_count: number;
  invitations_sent_count: number;
  course_recommendations_sent_count: number;
  cert_recommendations_sent_count: number;
}

const LIMIT = 25;

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}

function fullName(p: ProfessorRow) {
  const n = `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim();
  return n || p.email;
}

export default function ProfessorsPage() {
  const { accessToken } = useAuthStore();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");

  const { data, isLoading, error, mutate } = useSWR(
    accessToken ? [`/admin/professors?page=${page}&limit=${LIMIT}&q=${encodeURIComponent(q)}`, accessToken] : null,
    ([url, token]) => api.get<any>(url, token),
    { revalidateOnFocus: false },
  );

  const payload = data?.data ?? data;
  const professors: ProfessorRow[] = Array.isArray(payload?.data) ? payload.data : [];
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
            <Users2 size={22} className="text-navy-700" /> Professors
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {isLoading ? "Loading…" : `${meta.total} professor${meta.total !== 1 ? "s" : ""}`} — roster, courses, invitations & recommendations in one place
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
          placeholder="Search by name or email…"
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
            <p className="text-slate-400 text-sm mt-3">Loading professors…</p>
          </div>
        ) : error ? (
          <div className="p-10 text-center">
            <AlertCircle size={28} className="text-red-300 mx-auto mb-3" />
            <p className="text-slate-600 text-sm font-semibold">Could not load professors</p>
            <button onClick={() => mutate()} className="btn-outline !py-1.5 !px-4 !text-xs mx-auto mt-4">
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        ) : professors.length === 0 ? (
          <div className="p-10 text-center">
            <Users2 size={28} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm font-semibold">No professors found</p>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-4 px-5 py-2.5 border-b border-slate-100 bg-slate-50/80">
              <div className="w-9 flex-shrink-0" />
              <div className="flex-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Professor</div>
              <div className="hidden sm:block text-[10px] font-bold text-slate-400 uppercase tracking-widest w-20 text-center">Students</div>
              <div className="hidden md:block text-[10px] font-bold text-slate-400 uppercase tracking-widest w-24 text-center">Courses</div>
              <div className="hidden md:block text-[10px] font-bold text-slate-400 uppercase tracking-widest w-28 text-center">Invitations</div>
              <div className="hidden lg:block text-[10px] font-bold text-slate-400 uppercase tracking-widest w-24 text-center">Cert Recs</div>
              <div className="hidden md:block text-[10px] font-bold text-slate-400 uppercase tracking-widest w-24">Last Login</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest w-20">Status</div>
              <div className="w-4 flex-shrink-0" />
            </div>
            {professors.map((p) => (
              <Link
                key={p.id}
                href={`/professors/${p.id}`}
                className="flex items-center gap-4 px-5 py-4 border-b border-slate-50 last:border-0 hover:bg-slate-50/80 transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-navy-100 text-navy-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {fullName(p).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-navy-900 truncate">{fullName(p)}</p>
                  <p className="text-xs text-slate-400 truncate flex items-center gap-1">
                    <Mail size={10} /> {p.email}
                  </p>
                </div>
                <div className="hidden sm:flex items-center justify-center gap-1 text-xs text-slate-600 w-20 flex-shrink-0">
                  <Users2 size={11} className="text-slate-400" /> {p.roster_count}
                </div>
                <div className="hidden md:flex items-center justify-center gap-1 text-xs text-slate-600 w-24 flex-shrink-0">
                  <BookOpen size={11} className="text-slate-400" /> {p.courses_taught_count + p.courses_created_count}
                </div>
                <div className="hidden md:flex items-center justify-center gap-1 text-xs text-slate-600 w-28 flex-shrink-0">
                  <Send size={11} className="text-slate-400" /> {p.invitations_sent_count + p.course_recommendations_sent_count}
                </div>
                <div className="hidden lg:flex items-center justify-center gap-1 text-xs text-slate-600 w-24 flex-shrink-0">
                  <Award size={11} className="text-slate-400" /> {p.cert_recommendations_sent_count}
                </div>
                <div className="hidden md:block text-xs text-slate-500 w-24 flex-shrink-0">{fmtDate(p.last_login_at)}</div>
                <div className="w-20 flex-shrink-0">
                  <span className={`badge ${p.is_active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                    {p.is_active ? "Active" : "Disabled"}
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
