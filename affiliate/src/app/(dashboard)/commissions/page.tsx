"use client";

import { useState } from "react";
import { DollarSign, Clock, CheckCircle, Banknote, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { useCommissions } from "@/hooks/useCommissions";
import { CommissionBadge } from "@/components/ui/StatusBadge";
import { TableRowSkeleton, Skeleton } from "@/components/ui/LoadingSkeleton";
import EmptyState from "@/components/ui/EmptyState";
import { formatCurrency, formatDate, exportToCSV } from "@/lib/utils";

export default function CommissionsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");

  const { commissions, total, totalPages, summary, isLoading } = useCommissions({ page, limit: 20, status });

  function handleExport() {
    exportToCSV(
      commissions.map((c) => ({
        "Lead Name": c.lead_name ?? "—",
        "Product": c.product_name ?? "—",
        "Amount": c.amount,
        "Rate": `${c.commission_rate}%`,
        "Status": c.status,
        "Date": formatDate(c.created_at),
        "Paid At": c.paid_at ? formatDate(c.paid_at) : "—",
      })),
      "commissions-export"
    );
  }

  const summaryCards = [
    { label: "Total Earned",   value: formatCurrency(summary?.total_earned   ?? 0), icon: DollarSign, color: "text-gold-600",    bg: "bg-gold-50"    },
    { label: "Pending",        value: formatCurrency(summary?.pending         ?? 0), icon: Clock,      color: "text-amber-600",   bg: "bg-amber-50"   },
    { label: "Approved",       value: formatCurrency(summary?.approved        ?? 0), icon: CheckCircle,color: "text-blue-600",    bg: "bg-blue-50"    },
    { label: "Paid Out",       value: formatCurrency(summary?.paid            ?? 0), icon: Banknote,   color: "text-emerald-600", bg: "bg-emerald-50" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {summaryCards.map((s) => (
          <div key={s.label} className="card p-4 space-y-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.bg}`}>
              <s.icon size={15} className={s.color} />
            </div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{s.label}</p>
            {isLoading
              ? <Skeleton className="h-6 w-20" />
              : <p className="text-xl font-display font-black text-navy-900">{s.value}</p>}
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm font-semibold text-slate-700">{total} commission{total !== 1 ? "s" : ""}</p>
          <div className="flex items-center gap-2">
            <select
              className="input-base !py-1.5 !text-xs"
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
            </select>
            <button onClick={handleExport} className="btn-outline !py-1.5 !px-3 !text-xs flex items-center gap-1.5">
              <Download size={12} /> CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Lead</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Product</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Sale</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Commission</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Rate</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => <TableRowSkeleton key={i} cols={7} />)
                : commissions.length === 0
                ? (
                  <tr><td colSpan={7}>
                    <EmptyState icon={DollarSign} title="No commissions yet" description="Commissions appear when your leads make purchases." className="py-12" />
                  </td></tr>
                )
                : commissions.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{c.lead_name ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{c.product_name ?? "—"}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{formatCurrency(c.sale_amount)}</td>
                    <td className="px-4 py-3 font-bold text-gold-700">{formatCurrency(c.amount)}</td>
                    <td className="px-4 py-3 text-slate-500">{c.commission_rate}%</td>
                    <td className="px-4 py-3"><CommissionBadge status={c.status} /></td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(c.created_at)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-400">Page {page} of {totalPages}</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost !p-1.5 disabled:opacity-40">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-ghost !p-1.5 disabled:opacity-40">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
