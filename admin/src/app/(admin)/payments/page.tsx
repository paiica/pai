"use client";

import { useState } from "react";
import useSWR from "swr";
import toast from "react-hot-toast";
import {
  ReceiptText, Search, ExternalLink, RefreshCw,
  ChevronLeft, ChevronRight, Loader2, RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

function fetcher([url, token]: [string, string]) {
  return api.get<any>(url, token).then((r: any) => r.data ?? r);
}

const STATUS_STYLES: Record<string, string> = {
  succeeded:           "bg-green-100 text-green-700",
  pending:             "bg-amber-100 text-amber-700",
  failed:              "bg-red-100 text-red-700",
  refunded:            "bg-slate-100 text-slate-600",
  partially_refunded:  "bg-blue-100 text-blue-700",
};

const TYPE_LABELS: Record<string, string> = {
  enrollment:       "Enrollment",
  retake_fee:       "Retake Fee",
  renewal_fee:      "Renewal Fee",
  corporate_bundle: "Corporate Bundle",
};

export default function TransactionsPage() {
  const { accessToken } = useAuthStore();

  const [page,      setPage]      = useState(1);
  const [search,    setSearch]    = useState("");
  const [searchQ,   setSearchQ]   = useState("");
  const [status,    setStatus]    = useState("");
  const [type,      setType]      = useState("");
  const [refunding, setRefunding] = useState<string | null>(null);

  const params = new URLSearchParams({ page: String(page), limit: "20" });
  if (searchQ) params.set("search", searchQ);
  if (status)  params.set("status", status);
  if (type)    params.set("type",   type);

  const { data, mutate, isLoading } = useSWR(
    accessToken ? [`/payments/admin/list?${params}`, accessToken] : null,
    fetcher
  );

  const payments = data?.data ?? [];
  const total    = data?.total ?? 0;
  const pages    = data?.pages ?? 1;

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchQ(search);
    setPage(1);
  }

  function clearFilters() {
    setSearch(""); setSearchQ(""); setStatus(""); setType(""); setPage(1);
  }

  async function refund(payment: any) {
    if (!confirm(`Issue full refund of $${Number(payment.amount).toFixed(2)} to ${payment.user?.email}?`)) return;
    setRefunding(payment.id);
    try {
      await api.post(`/payments/admin/${payment.id}/refund`, {}, accessToken!);
      toast.success("Refund issued");
      mutate();
    } catch (err: any) {
      toast.error(err.message ?? "Refund failed");
    } finally {
      setRefunding(null);
    }
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ReceiptText size={20} className="text-navy-600" />
            <h1 className="text-2xl font-display font-black text-navy-900">Transactions</h1>
          </div>
          <p className="text-slate-500 text-sm">{total.toLocaleString()} total payment{total !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => mutate()} className="btn-outline flex items-center gap-2 !py-2 !px-3 !text-xs">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[220px]">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search email, description, intent ID…"
              className="input-base pl-8 !py-2 text-sm w-full"
            />
          </div>
          <button type="submit" className="btn-primary !py-2 !px-4 !text-sm">Search</button>
        </form>

        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="input-base !py-2 !w-auto text-sm">
          <option value="">All Statuses</option>
          <option value="succeeded">Succeeded</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
          <option value="partially_refunded">Partially Refunded</option>
        </select>

        <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}
          className="input-base !py-2 !w-auto text-sm">
          <option value="">All Types</option>
          <option value="enrollment">Enrollment</option>
          <option value="retake_fee">Retake Fee</option>
          <option value="renewal_fee">Renewal Fee</option>
          <option value="corporate_bundle">Corporate Bundle</option>
        </select>

        {(searchQ || status || type) && (
          <button onClick={clearFilters} className="btn-outline !py-2 !px-3 !text-xs flex items-center gap-1.5">
            <RotateCcw size={12} /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-slate-400" />
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-20 text-slate-400 text-sm">No transactions found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p: any) => {
                  const name = p.user?.profile
                    ? `${p.user.profile.first_name} ${p.user.profile.last_name}`.trim()
                    : p.user?.email ?? "—";
                  const date = new Date(p.created_at).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
                  const canRefund = p.status === "succeeded" && p.stripe_payment_intent_id;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-navy-900 text-xs">{name}</p>
                        <p className="text-[11px] text-slate-400">{p.user?.email}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs max-w-[200px] truncate">{p.description || "—"}</td>
                      <td className="px-4 py-3">
                        <span className="text-[11px] font-medium text-slate-500">
                          {TYPE_LABELS[p.type] ?? p.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-navy-900">
                        ${Number(p.amount).toFixed(2)}
                        {p.refund_amount && (
                          <span className="block text-[11px] text-slate-400 font-normal">
                            −${Number(p.refund_amount).toFixed(2)} refunded
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", STATUS_STYLES[p.status] ?? "bg-slate-100 text-slate-600")}>
                          {p.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{date}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {p.stripe_receipt_url && (
                            <a href={p.stripe_receipt_url} target="_blank" rel="noopener noreferrer"
                              className="text-slate-400 hover:text-navy-600 transition-colors" title="View receipt">
                              <ExternalLink size={14} />
                            </a>
                          )}
                          {canRefund && (
                            <button
                              onClick={() => refund(p)}
                              disabled={refunding === p.id}
                              className="text-xs font-semibold text-red-500 hover:text-red-700 disabled:opacity-40 transition-colors"
                            >
                              {refunding === p.id ? <Loader2 size={13} className="animate-spin" /> : "Refund"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-slate-500">
            Page {page} of {pages} · {total} total
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="btn-outline !py-1.5 !px-3 disabled:opacity-40">
              <ChevronLeft size={15} />
            </button>
            <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}
              className="btn-outline !py-1.5 !px-3 disabled:opacity-40">
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
