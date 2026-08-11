"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { FileText, Search, ChevronRight, Loader2, AlertCircle, RefreshCw, Share2 } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";

interface TranscriptRow {
  id: string;
  transcript_number: string;
  student_name: string;
  student_email: string;
  program_title: string;
  status: string;
  issued_at: string;
  share_count: number;
}

const LIMIT = 25;
const STATUS_COLORS: Record<string, string> = {
  "In Progress": "bg-amber-50 text-amber-700",
  "Completed": "bg-emerald-50 text-emerald-700",
  "Withdrawn": "bg-red-50 text-red-700",
};

function fetcher(url: string, token: string) {
  return api.get<any>(url, token);
}

export default function TranscriptsPage() {
  const { accessToken } = useAuthStore();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");

  const { data, isLoading, error, mutate } = useSWR(
    accessToken ? [`/admin/transcripts?page=${page}&limit=${LIMIT}&search=${encodeURIComponent(q)}`, accessToken] : null,
    ([url, token]) => fetcher(url, token),
    { revalidateOnFocus: false },
  );

  const payload = data?.data ?? data;
  const rows: TranscriptRow[] = Array.isArray(payload?.data) ? payload.data : [];
  const meta = payload?.meta ?? { total: 0, totalPages: 1 };

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setQ(search.trim());
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-black text-navy-900 flex items-center gap-2">
            <FileText size={22} className="text-navy-700" /> Transcripts
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {isLoading ? "Loading…" : `${meta.total} issued transcript${meta.total !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button onClick={() => mutate()} className="btn-outline !py-1.5 !px-3 !text-xs flex items-center gap-1.5">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      <form onSubmit={handleSearch} className="relative mb-4 max-w-md">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
        <input
          type="text"
          placeholder="Search by student, program, or transcript #…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 bg-white"
        />
      </form>

      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <div className="p-10 text-center">
            <Loader2 size={24} className="animate-spin text-slate-300 mx-auto" />
            <p className="text-slate-400 text-sm mt-3">Loading transcripts…</p>
          </div>
        ) : error ? (
          <div className="p-10 text-center">
            <AlertCircle size={28} className="text-red-300 mx-auto mb-3" />
            <p className="text-slate-600 text-sm font-semibold">Could not load transcripts</p>
            <button onClick={() => mutate()} className="btn-outline !py-1.5 !px-4 !text-xs mx-auto mt-4">
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center">
            <FileText size={32} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-600 text-sm font-semibold">No transcripts issued yet</p>
            <p className="text-slate-400 text-xs mt-1">Transcripts are created the first time a student opens theirs.</p>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-4 px-5 py-2.5 border-b border-slate-100 bg-slate-50/80">
              <div className="w-36 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Transcript #</div>
              <div className="flex-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Student</div>
              <div className="hidden sm:block flex-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Program</div>
              <div className="w-24 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</div>
              <div className="hidden md:block w-24 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Shares</div>
              <div className="w-28 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Issued</div>
            </div>
            {rows.map((t) => (
              <Link
                key={t.id}
                href={`/transcripts/${t.id}`}
                className="flex items-center gap-4 px-5 py-4 border-b border-slate-50 last:border-0 hover:bg-slate-50/80 transition-colors"
              >
                <div className="w-36 font-mono text-xs text-slate-500 flex-shrink-0">{t.transcript_number}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-navy-900 truncate">{t.student_name}</p>
                  <p className="text-xs text-slate-400 truncate">{t.student_email}</p>
                </div>
                <div className="hidden sm:block flex-1 text-sm text-slate-600 truncate">{t.program_title}</div>
                <div className="w-24 flex-shrink-0">
                  <span className={cn("badge", STATUS_COLORS[t.status] ?? "bg-slate-100 text-slate-500")}>{t.status}</span>
                </div>
                <div className="hidden md:flex w-24 flex-shrink-0 items-center justify-center gap-1 text-xs text-slate-600">
                  <Share2 size={11} className="text-slate-400" /> {t.share_count}
                </div>
                <div className="w-28 flex-shrink-0 text-xs text-slate-500 text-right">{formatDate(t.issued_at)}</div>
                <ChevronRight size={15} className="text-slate-300 flex-shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-5">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="btn-outline !py-1.5 !px-3 !text-xs disabled:opacity-40">
            Previous
          </button>
          <span className="text-sm text-slate-500">Page {page} of {meta.totalPages}</span>
          <button disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)} className="btn-outline !py-1.5 !px-3 !text-xs disabled:opacity-40">
            Next
          </button>
        </div>
      )}
    </div>
  );
}
