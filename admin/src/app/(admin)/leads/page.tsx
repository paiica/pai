"use client";

import { useState } from "react";
import useSWR from "swr";
import toast from "react-hot-toast";
import { Magnet, Search, Trash2, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";

interface Lead {
  id: string;
  email: string;
  name: string;
  interest: string;
  source: string;
  page_url: string;
  created_at: string;
}

const LIMIT = 25;

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}

export default function LeadsPage() {
  const { accessToken } = useAuthStore();

  const [q, setQ]                 = useState("");
  const [debouncedQ, setDQ]       = useState("");
  const [page, setPage]           = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setDQ(q);
    setPage(1);
  }

  const qs = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
  if (debouncedQ) qs.set("q", debouncedQ);

  const { data, mutate, isLoading } = useSWR(
    accessToken ? [`/leads?${qs}`, accessToken] : null,
    ([url, t]) => api.get<any>(url, t),
  );

  const leads: Lead[] = (data as any)?.data?.data ?? [];
  const total: number = (data as any)?.data?.total ?? 0;
  const totalPages: number = (data as any)?.data?.totalPages ?? 1;

  async function handleDelete(id: string) {
    if (!confirm("Delete this lead?")) return;
    setDeletingId(id);
    try {
      await api.delete(`/leads/${id}`, accessToken!);
      toast.success("Lead deleted");
      mutate();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1100px]">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-black text-navy-900">Leads</h1>
        <p className="text-slate-500 text-sm mt-0.5">{total} email{total !== 1 ? "s" : ""} captured from the blog subscribe popup</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 mb-5 max-w-xs">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text" value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search email…"
            className="input-base !pl-9 !py-2 text-sm"
          />
        </div>
      </form>

      <div className="card overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Interest</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Source</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Page</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Captured</th>
              <th className="px-4 py-3 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i}>
                  {[...Array(7)].map((_, j) => (
                    <td key={j} className="px-4 py-3.5">
                      <div className="h-3.5 bg-slate-100 rounded animate-pulse" style={{ width: `${50 + (j * 13) % 40}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center">
                  <Magnet size={28} className="text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">No leads captured yet.</p>
                </td>
              </tr>
            ) : leads.map((lead) => (
              <tr key={lead.id} className="hover:bg-slate-50/60 transition-colors">
                <td className="px-4 py-3 text-navy-900">{lead.name || "—"}</td>
                <td className="px-4 py-3 font-medium text-navy-900">{lead.email}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{lead.interest || "—"}</td>
                <td className="px-4 py-3">
                  <span className="badge bg-teal-100 text-teal-700 capitalize">{lead.source || "—"}</span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 max-w-[260px] truncate">
                  {lead.page_url ? (
                    <a href={lead.page_url} target="_blank" rel="noopener noreferrer" className="hover:text-navy-700 hover:underline">
                      {lead.page_url}
                    </a>
                  ) : "—"}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(lead.created_at)}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleDelete(lead.id)}
                    disabled={deletingId === lead.id}
                    className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 disabled:opacity-40"
                  >
                    {deletingId === lead.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 mt-2">
          <p className="text-xs text-slate-500">Page {page} of {totalPages} · {total} leads</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
              aria-label="Previous page"
              className="btn-outline !px-2 !py-1.5 disabled:opacity-40">
              <ChevronLeft size={14} />
            </button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              aria-label="Next page"
              className="btn-outline !px-2 !py-1.5 disabled:opacity-40">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
