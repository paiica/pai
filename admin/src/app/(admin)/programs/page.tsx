"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import toast from "react-hot-toast";
import {
  GraduationCap, Search, ChevronRight, Loader2, AlertCircle, RefreshCw,
  Plus, BookOpen, Users, Copy, Archive, Globe, EyeOff,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface ProgramRow {
  id: string;
  slug: string;
  title: string;
  level: string;
  status: "draft" | "published" | "archived";
  price: number;
  currency: string;
  course_count: number;
  learner_count: number;
  created_at: string;
}

const LIMIT = 25;
const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-500",
  published: "bg-emerald-50 text-emerald-700",
  archived: "bg-red-50 text-red-700",
};

function fetcher(url: string, token: string) {
  return api.get<any>(url, token);
}

export default function ProgramsPage() {
  const { accessToken } = useAuthStore();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data, isLoading, error, mutate } = useSWR(
    accessToken ? [`/admin/programs?page=${page}&limit=${LIMIT}&q=${encodeURIComponent(q)}&status=${statusFilter}`, accessToken] : null,
    ([url, token]) => fetcher(url, token),
    { revalidateOnFocus: false },
  );

  const payload = data?.data ?? data;
  const programs: ProgramRow[] = Array.isArray(payload?.data) ? payload.data : [];
  const meta = payload?.meta ?? { total: 0, totalPages: 1 };

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setQ(search.trim());
  }

  async function handleAction(e: React.MouseEvent, id: string, action: "publish" | "unpublish" | "archive" | "duplicate") {
    e.preventDefault();
    e.stopPropagation();
    try {
      if (action === "duplicate") {
        await api.post(`/admin/programs/${id}/duplicate`, {}, accessToken!);
        toast.success("Program duplicated as a draft");
      } else {
        await api.patch(`/admin/programs/${id}/${action}`, {}, accessToken!);
        toast.success(`Program ${action === "unpublish" ? "moved back to draft" : action + "d"}`);
      }
      mutate();
    } catch (err: any) {
      toast.error(err.message ?? "Action failed");
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-black text-navy-900 flex items-center gap-2">
            <GraduationCap size={22} className="text-navy-700" /> Programs
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {isLoading ? "Loading…" : `${meta.total} program${meta.total !== 1 ? "s" : ""}`} — structured multi-course pathways with a capstone
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => mutate()} className="btn-outline !py-1.5 !px-3 !text-xs flex items-center gap-1.5">
            <RefreshCw size={12} /> Refresh
          </button>
          <Link href="/programs/create" className="btn-primary !py-1.5 !px-4 !text-xs flex items-center gap-1.5">
            <Plus size={13} /> Create Program
          </Link>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
          <input
            type="text"
            placeholder="Search by title…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 bg-white"
          />
        </form>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="input-base !text-sm sm:w-40"
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <div className="p-10 text-center">
            <Loader2 size={24} className="animate-spin text-slate-300 mx-auto" />
            <p className="text-slate-400 text-sm mt-3">Loading programs…</p>
          </div>
        ) : error ? (
          <div className="p-10 text-center">
            <AlertCircle size={28} className="text-red-300 mx-auto mb-3" />
            <p className="text-slate-600 text-sm font-semibold">Could not load programs</p>
            <button onClick={() => mutate()} className="btn-outline !py-1.5 !px-4 !text-xs mx-auto mt-4">
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        ) : programs.length === 0 ? (
          <div className="p-12 text-center">
            <GraduationCap size={32} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-600 text-sm font-semibold">No programs yet</p>
            <p className="text-slate-400 text-xs mt-1 mb-4">Create the first structured learning program.</p>
            <Link href="/programs/create" className="btn-primary !py-1.5 !px-4 !text-xs mx-auto">
              <Plus size={13} /> Create Program
            </Link>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-4 px-5 py-2.5 border-b border-slate-100 bg-slate-50/80">
              <div className="flex-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Program</div>
              <div className="hidden sm:block text-[10px] font-bold text-slate-400 uppercase tracking-widest w-20 text-center">Courses</div>
              <div className="hidden sm:block text-[10px] font-bold text-slate-400 uppercase tracking-widest w-20 text-center">Learners</div>
              <div className="hidden md:block text-[10px] font-bold text-slate-400 uppercase tracking-widest w-20 text-right">Price</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest w-24">Status</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest w-44 text-right">Actions</div>
            </div>
            {programs.map((p) => (
              <Link
                key={p.id}
                href={`/programs/${p.id}/edit`}
                className="flex items-center gap-4 px-5 py-4 border-b border-slate-50 last:border-0 hover:bg-slate-50/80 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-navy-900 truncate">{p.title}</p>
                  <p className="text-xs text-slate-400 truncate capitalize">{p.level}</p>
                </div>
                <div className="hidden sm:flex items-center justify-center gap-1 text-xs text-slate-600 w-20 flex-shrink-0">
                  <BookOpen size={11} className="text-slate-400" /> {p.course_count}
                </div>
                <div className="hidden sm:flex items-center justify-center gap-1 text-xs text-slate-600 w-20 flex-shrink-0">
                  <Users size={11} className="text-slate-400" /> {p.learner_count}
                </div>
                <div className="hidden md:block text-xs text-slate-600 w-20 flex-shrink-0 text-right">
                  {p.price === 0 ? "Free" : `$${p.price.toFixed(0)}`}
                </div>
                <div className="w-24 flex-shrink-0">
                  <span className={cn("badge", STATUS_COLORS[p.status])}>{p.status}</span>
                </div>
                <div className="w-44 flex-shrink-0 flex items-center justify-end gap-1">
                  {p.status === "draft" && (
                    <button onClick={(e) => handleAction(e, p.id, "publish")} title="Publish" className="btn-outline !py-1.5 !px-2 !text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50">
                      <Globe size={12} />
                    </button>
                  )}
                  {p.status === "published" && (
                    <button onClick={(e) => handleAction(e, p.id, "unpublish")} title="Unpublish" className="btn-outline !py-1.5 !px-2 !text-xs text-amber-600 border-amber-200 hover:bg-amber-50">
                      <EyeOff size={12} />
                    </button>
                  )}
                  {p.status !== "archived" && (
                    <button onClick={(e) => handleAction(e, p.id, "archive")} title="Archive" className="btn-outline !py-1.5 !px-2 !text-xs text-slate-500 hover:bg-slate-50">
                      <Archive size={12} />
                    </button>
                  )}
                  <button onClick={(e) => handleAction(e, p.id, "duplicate")} title="Duplicate" className="btn-outline !py-1.5 !px-2 !text-xs text-slate-500 hover:bg-slate-50">
                    <Copy size={12} />
                  </button>
                  <ChevronRight size={15} className="text-slate-300 flex-shrink-0 ml-1" />
                </div>
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
