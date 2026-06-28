"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  DollarSign, CheckCircle, Clock, Banknote, ExternalLink,
  ChevronDown, Loader2, Filter,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

const STATUS_BADGE: Record<string, string> = {
  pending:  "bg-amber-50 text-amber-700 border border-amber-200",
  approved: "bg-blue-50 text-blue-700 border border-blue-200",
  paid:     "bg-emerald-50 text-emerald-700 border border-emerald-200",
};

function StatCard({
  label, value, sub, accent, icon: Icon,
}: {
  label: string; value: string; sub?: string; accent: string; icon: React.ElementType;
}) {
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${accent}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-xl font-display font-black text-navy-900">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 2 }).format(n);
}

export default function CommissionsPage() {
  const { accessToken } = useAuthStore();
  const [statusFilter, setStatusFilter] = useState("");
  const [repFilter, setRepFilter] = useState("");
  const [acting, setActing] = useState<string | null>(null);

  const { data: raw, mutate } = useSWR(
    accessToken ? `/admin/affiliates/commissions?status=${statusFilter}` : null,
    (url) => api.get<any>(url, accessToken!)
  );

  const { data: repsData } = useSWR(
    accessToken ? "/admin/affiliates?page=1&limit=200" : null,
    (url) => api.get<any>(url, accessToken!)
  );

  const allCommissions: any[] = raw?.data ?? raw ?? [];
  const reps: any[] = repsData?.data?.data ?? repsData?.data ?? [];

  // Client-side filter by rep (backend doesn't support rep filter on the global endpoint)
  const commissions = repFilter
    ? allCommissions.filter((c) => {
        const repName = `${c.affiliate?.user?.profile?.first_name ?? ""} ${c.affiliate?.user?.profile?.last_name ?? ""}`.toLowerCase();
        return repName.includes(repFilter.toLowerCase()) ||
               c.affiliate?.user?.email?.toLowerCase().includes(repFilter.toLowerCase());
      })
    : allCommissions;

  // Stats
  const pendingAmount  = allCommissions.filter((c) => c.status === "pending").reduce((s, c) => s + Number(c.amount), 0);
  const approvedAmount = allCommissions.filter((c) => c.status === "approved").reduce((s, c) => s + Number(c.amount), 0);
  const paidAmount     = allCommissions.filter((c) => c.status === "paid").reduce((s, c) => s + Number(c.amount), 0);
  const pendingCount   = allCommissions.filter((c) => c.status === "pending").length;
  const approvedCount  = allCommissions.filter((c) => c.status === "approved").length;

  async function approve(id: string) {
    setActing(id + "_approve");
    try {
      await api.patch(`/admin/affiliates/commissions/${id}/approve`, {}, accessToken!);
      toast.success("Commission approved");
      mutate();
    } catch { toast.error("Failed to approve"); }
    setActing(null);
  }

  async function markPaid(id: string) {
    setActing(id + "_paid");
    try {
      await api.patch(`/admin/affiliates/commissions/${id}/paid`, {}, accessToken!);
      toast.success("Marked as paid");
      mutate();
    } catch { toast.error("Failed to mark as paid"); }
    setActing(null);
  }

  async function approveAll() {
    const pending = commissions.filter((c) => c.status === "pending");
    if (!pending.length) return;
    if (!confirm(`Approve all ${pending.length} pending commission(s)?`)) return;
    setActing("bulk_approve");
    try {
      await Promise.all(pending.map((c) => api.patch(`/admin/affiliates/commissions/${c.id}/approve`, {}, accessToken!)));
      toast.success(`${pending.length} commission(s) approved`);
      mutate();
    } catch { toast.error("Some approvals failed"); }
    setActing(null);
  }

  async function payAll() {
    const approved = commissions.filter((c) => c.status === "approved");
    if (!approved.length) return;
    if (!confirm(`Mark all ${approved.length} approved commission(s) as paid?`)) return;
    setActing("bulk_pay");
    try {
      await Promise.all(approved.map((c) => api.patch(`/admin/affiliates/commissions/${c.id}/paid`, {}, accessToken!)));
      toast.success(`${approved.length} commission(s) marked as paid`);
      mutate();
    } catch { toast.error("Some updates failed"); }
    setActing(null);
  }

  function repName(c: any) {
    const profile = c.affiliate?.user?.profile;
    if (profile?.first_name || profile?.last_name) {
      return `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim();
    }
    return c.affiliate?.user?.email ?? "—";
  }

  function repUserId(c: any) {
    return c.affiliate?.user?.id ?? null;
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <div className="text-xs font-bold uppercase tracking-widest text-gold-600 mb-1">Sales</div>
        <h1 className="text-2xl font-display font-black text-navy-900">Commissions</h1>
        <p className="text-slate-500 text-sm mt-0.5">Review, approve, and pay out sales rep commissions.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Pending Review"
          value={fmt(pendingAmount)}
          sub={`${pendingCount} commission${pendingCount !== 1 ? "s" : ""} awaiting approval`}
          accent="bg-amber-100 text-amber-600"
          icon={Clock}
        />
        <StatCard
          label="Approved — To Pay"
          value={fmt(approvedAmount)}
          sub={`${approvedCount} commission${approvedCount !== 1 ? "s" : ""} ready for payout`}
          accent="bg-blue-100 text-blue-600"
          icon={CheckCircle}
        />
        <StatCard
          label="Total Paid Out"
          value={fmt(paidAmount)}
          sub="All time"
          accent="bg-emerald-100 text-emerald-600"
          icon={Banknote}
        />
      </div>

      {/* Filters + bulk actions */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex gap-2 flex-1 flex-wrap">
          <div className="relative">
            <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              className="input-base pl-8 !py-2 !text-sm sm:w-40"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          <select
            className="input-base !py-2 !text-sm sm:w-48"
            value={repFilter}
            onChange={(e) => setRepFilter(e.target.value)}
          >
            <option value="">All Reps</option>
            {reps.map((r) => (
              <option key={r.id} value={r.first_name && r.last_name ? `${r.first_name} ${r.last_name}` : r.email}>
                {r.first_name && r.last_name ? `${r.first_name} ${r.last_name}` : r.email}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 shrink-0">
          {pendingCount > 0 && (
            <button
              onClick={approveAll}
              disabled={acting === "bulk_approve"}
              className="btn-outline !py-2 !px-3 !text-xs !text-blue-700 !border-blue-200 flex items-center gap-1.5 disabled:opacity-50"
            >
              {acting === "bulk_approve" ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
              Approve All Pending
            </button>
          )}
          {approvedCount > 0 && (
            <button
              onClick={payAll}
              disabled={acting === "bulk_pay"}
              className="btn-primary !py-2 !px-3 !text-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              {acting === "bulk_pay" ? <Loader2 size={12} className="animate-spin" /> : <Banknote size={12} />}
              Mark All Approved as Paid
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">
            {commissions.length} commission{commissions.length !== 1 ? "s" : ""}
          </p>
          {statusFilter && (
            <span className="badge bg-slate-100 text-slate-500 capitalize">{statusFilter}</span>
          )}
        </div>

        {commissions.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <DollarSign size={24} className="text-slate-300" />
            </div>
            <p className="font-semibold text-slate-500 mb-1">No commissions found</p>
            <p className="text-sm text-slate-400">
              {statusFilter ? `No ${statusFilter} commissions.` : "Commissions appear here when sales reps refer paying customers."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Sales Rep</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Lead</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Product</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Sale</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Rate</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Commission</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Payout</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {commissions.map((c: any) => {
                  const uid = repUserId(c);
                  const isActing = acting === c.id + "_approve" || acting === c.id + "_paid";
                  return (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        {uid ? (
                          <Link href={`/affiliates/${uid}`}
                            className="flex items-center gap-1 font-medium text-navy-700 hover:text-navy-900">
                            {repName(c)}
                            <ExternalLink size={11} className="opacity-40 shrink-0" />
                          </Link>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{c.lead?.name ?? "—"}</p>
                        <p className="text-xs text-slate-400">{c.lead?.email ?? ""}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{c.product?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{fmt(Number(c.sale_amount))}</td>
                      <td className="px-4 py-3 text-right text-slate-500">{Number(c.commission_rate)}%</td>
                      <td className="px-4 py-3 text-right font-bold text-gold-700">{fmt(Number(c.amount))}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{formatDate(c.created_at)}</td>
                      <td className="px-4 py-3">
                        <span className={`badge capitalize text-xs ${STATUS_BADGE[c.status] ?? "bg-slate-100 text-slate-500"}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {c.status === "paid" && c.paid_at ? formatDate(c.paid_at) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          {c.status === "pending" && (
                            <button
                              onClick={() => approve(c.id)}
                              disabled={isActing}
                              className="btn-outline !py-1 !px-2.5 !text-xs !text-blue-700 !border-blue-200 hover:!bg-blue-50 flex items-center gap-1 disabled:opacity-50"
                            >
                              {acting === c.id + "_approve" ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={11} />}
                              Approve
                            </button>
                          )}
                          {c.status === "approved" && (
                            <button
                              onClick={() => markPaid(c.id)}
                              disabled={isActing}
                              className="btn-primary !py-1 !px-2.5 !text-xs flex items-center gap-1 disabled:opacity-50"
                            >
                              {acting === c.id + "_paid" ? <Loader2 size={11} className="animate-spin" /> : <Banknote size={11} />}
                              Mark Paid
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
    </div>
  );
}
