"use client";

import { useState } from "react";
import { Users, Search, Download, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { useLeads } from "@/hooks/useLeads";
import { LeadBadge } from "@/components/ui/StatusBadge";
import { TableRowSkeleton } from "@/components/ui/LoadingSkeleton";
import EmptyState from "@/components/ui/EmptyState";
import { formatDate, exportToCSV } from "@/lib/utils";

const STATUS_OPTIONS = ["", "invited", "registered", "logged_in", "purchased"] as const;

export default function LeadsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { leads, total, totalPages, isLoading, deleteLead } = useLeads({ page, limit: 20, status, search });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  function handleStatusChange(s: string) {
    setStatus(s);
    setPage(1);
  }

  function handleExport() {
    exportToCSV(
      leads.map((l) => ({
        Name: l.name ?? "—",
        Email: l.email,
        Status: l.status,
        Source: l.source ?? "—",
        "Referred At": formatDate(l.created_at),
        "Product": l.product_name ?? "—",
      })),
      "leads-export"
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input-base pl-9"
              placeholder="Search by name or email…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-outline !py-2 !px-4 !text-sm">Search</button>
        </form>

        <div className="flex items-center gap-2">
          <select
            className="input-base !py-2 !text-sm"
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.filter(Boolean).map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>

          <button onClick={handleExport} className="btn-outline !py-2 !px-3 flex items-center gap-1.5 !text-sm">
            <Download size={14} />
            CSV
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">{total} lead{total !== 1 ? "s" : ""}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Source</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Product</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => <TableRowSkeleton key={i} cols={7} />)
                : leads.length === 0
                ? (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState icon={Users} title="No leads found" description="Try adjusting your filters." className="py-12" />
                    </td>
                  </tr>
                )
                : leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{lead.name ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{lead.email}</td>
                    <td className="px-4 py-3"><LeadBadge status={lead.status} /></td>
                    <td className="px-4 py-3 text-slate-500 capitalize">{lead.source ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{lead.product_name ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(lead.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      {deletingId === lead.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs text-slate-500">Delete?</span>
                          <button
                            onClick={async () => { await deleteLead(lead.id); setDeletingId(null); }}
                            className="text-xs font-semibold text-red-600 hover:text-red-700"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setDeletingId(null)}
                            className="text-xs font-semibold text-slate-400 hover:text-slate-600"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingId(lead.id)}
                          className="text-slate-300 hover:text-red-500 transition-colors p-1"
                          title="Delete lead"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-400">Page {page} of {totalPages}</p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-ghost !p-1.5 disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-ghost !p-1.5 disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
