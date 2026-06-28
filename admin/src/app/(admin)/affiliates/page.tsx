"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  Users, Search, ChevronLeft, ChevronRight, CheckCircle,
  Ban, ExternalLink, Percent, Save, Loader2, RefreshCw,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

type Status = "" | "pending" | "approved" | "suspended";

const STATUS_BADGE: Record<string, string> = {
  pending:   "bg-amber-100 text-amber-700",
  approved:  "bg-emerald-50 text-emerald-700",
  suspended: "bg-red-50 text-red-600",
};

export default function AffiliatesPage() {
  const { accessToken } = useAuthStore();
  const [page, setPage]               = useState(1);
  const [status, setStatus]           = useState<Status>("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch]           = useState("");
  const [acting, setActing]           = useState<string | null>(null);

  // Inline rate editing: repId → draft value
  const [rateEdits, setRateEdits]     = useState<Record<string, string>>({});
  const [savingRate, setSavingRate]   = useState<string | null>(null);

  // Bulk rate form
  const [bulkRate, setBulkRate]       = useState("");
  const [applyingBulk, setApplyingBulk] = useState(false);

  const { data, mutate } = useSWR(
    accessToken
      ? `/admin/affiliates?page=${page}&limit=25&status=${status}&search=${search}`
      : null,
    (url: string) => api.get<any>(url, accessToken!)
  );

  const reps: any[]      = data?.data?.data ?? data?.data ?? [];
  const total: number    = data?.data?.total ?? 0;
  const totalPages       = data?.data?.totalPages ?? 1;

  // ── Actions ────────────────────────────────────────────────────────────────

  async function handleApprove(id: string) {
    setActing(id + "_approve");
    try { await api.patch(`/admin/affiliates/${id}/approve`, {}, accessToken!); mutate(); }
    catch { toast.error("Failed to approve"); }
    setActing(null);
  }

  async function handleSuspend(id: string) {
    setActing(id + "_suspend");
    try { await api.patch(`/admin/affiliates/${id}/suspend`, {}, accessToken!); mutate(); }
    catch { toast.error("Failed to suspend"); }
    setActing(null);
  }

  async function handleSaveRate(id: string) {
    const raw = rateEdits[id];
    if (!raw) return;
    const rate = parseFloat(raw);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      toast.error("Rate must be between 0 and 100");
      return;
    }
    setSavingRate(id);
    try {
      await api.patch(`/admin/affiliates/${id}/commission-rate`, { rate }, accessToken!);
      toast.success("Commission rate updated");
      setRateEdits((prev) => { const n = { ...prev }; delete n[id]; return n; });
      mutate();
    } catch { toast.error("Failed to update rate"); }
    setSavingRate(null);
  }

  async function handleBulkRate(e: React.FormEvent) {
    e.preventDefault();
    const rate = parseFloat(bulkRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      toast.error("Rate must be between 0 and 100");
      return;
    }
    const targets = reps.filter((r) => r.status === "approved");
    if (!targets.length) { toast.error("No approved reps to update"); return; }
    if (!confirm(`Set ${rate}% commission for all ${targets.length} approved rep(s)?`)) return;
    setApplyingBulk(true);
    try {
      await Promise.all(
        targets.map((r) =>
          api.patch(`/admin/affiliates/${r.id}/commission-rate`, { rate }, accessToken!)
        )
      );
      toast.success(`Updated ${targets.length} rep(s) to ${rate}%`);
      setBulkRate("");
      mutate();
    } catch { toast.error("Some updates failed"); }
    setApplyingBulk(false);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  // ── UI ─────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <div className="text-xs font-bold uppercase tracking-widest text-gold-600 mb-1">Sales</div>
        <h1 className="text-2xl font-display font-black text-navy-900">Sales Reps</h1>
      </div>

      {/* Bulk commission rate setter */}
      <div className="card p-4 flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="flex-1">
          <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">
            Set Commission Rate for All Approved Reps
          </p>
          <p className="text-xs text-slate-400">
            Applies the same rate to every rep currently in <span className="font-semibold">approved</span> status.
            Individual overrides can still be set below.
          </p>
        </div>
        <form onSubmit={handleBulkRate} className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <Percent size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="number" min="0" max="100" step="0.5" required
              className="input-base pl-8 w-28 !text-sm"
              placeholder="e.g. 15"
              value={bulkRate}
              onChange={(e) => setBulkRate(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={applyingBulk || !bulkRate}
            className="btn-primary !py-2 !px-4 !text-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            {applyingBulk
              ? <Loader2 size={13} className="animate-spin" />
              : <RefreshCw size={13} />}
            Apply to All
          </button>
        </form>
      </div>

      {/* Search + status filter */}
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
        <select
          className="input-base !py-2 !text-sm sm:w-40"
          value={status}
          onChange={(e) => { setStatus(e.target.value as Status); setPage(1); }}
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Rep list */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100">
          <p className="text-sm font-semibold text-slate-700">{total} rep{total !== 1 ? "s" : ""}</p>
        </div>

        {reps.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Users size={22} className="text-slate-400" />
            </div>
            <p className="font-semibold text-slate-500 mb-1">No reps found</p>
            <p className="text-sm text-slate-400">Sales reps who register appear here for approval.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Rep</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Ref Code</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Leads</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Joined</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase w-48">
                    Commission Rate
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reps.map((rep) => {
                  const name = rep.first_name && rep.last_name
                    ? `${rep.first_name} ${rep.last_name}`
                    : rep.email;
                  const initials = (rep.first_name?.[0] ?? rep.email[0]).toUpperCase();
                  const draftRate = rateEdits[rep.id];
                  const isDirty = draftRate !== undefined;
                  const isSaving = savingRate === rep.id;

                  return (
                    <tr key={rep.id} className="hover:bg-slate-50 transition-colors">
                      {/* Rep info */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-navy-800 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-navy-900 truncate">{name}</p>
                            <p className="text-xs text-slate-400 truncate">{rep.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Referral code */}
                      <td className="px-4 py-3">
                        {rep.referral_code
                          ? <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{rep.referral_code}</span>
                          : <span className="text-slate-300">—</span>}
                      </td>

                      {/* Leads */}
                      <td className="px-4 py-3 text-slate-600">{rep.lead_count ?? 0}</td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={`badge capitalize ${STATUS_BADGE[rep.status] ?? "bg-slate-100 text-slate-500"}`}>
                          {rep.status}
                        </span>
                      </td>

                      {/* Joined */}
                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                        {formatDate(rep.created_at)}
                      </td>

                      {/* Commission rate — inline editable */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <div className="relative">
                            <input
                              type="number"
                              min="0" max="100" step="0.5"
                              className={`w-20 rounded-lg border text-sm px-2 py-1 text-center font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-navy-500 ${
                                isDirty
                                  ? "border-navy-400 bg-navy-50 text-navy-900"
                                  : "border-slate-200 bg-white text-slate-700"
                              }`}
                              value={isDirty ? draftRate : String(rep.commission_rate)}
                              onChange={(e) =>
                                setRateEdits((prev) => ({ ...prev, [rep.id]: e.target.value }))
                              }
                            />
                          </div>
                          <span className="text-xs text-slate-400">%</span>
                          {isDirty && (
                            <button
                              onClick={() => handleSaveRate(rep.id)}
                              disabled={isSaving}
                              className="w-7 h-7 rounded-lg bg-navy-800 hover:bg-navy-700 text-white flex items-center justify-center disabled:opacity-50 transition-colors"
                              title="Save rate"
                            >
                              {isSaving
                                ? <Loader2 size={11} className="animate-spin" />
                                : <Save size={11} />}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 justify-end">
                          {rep.status === "pending" && (
                            <button
                              onClick={() => handleApprove(rep.id)}
                              disabled={acting === rep.id + "_approve"}
                              className="btn-primary !py-1 !px-2.5 !text-xs !bg-emerald-500 hover:!bg-emerald-400 disabled:opacity-50 flex items-center gap-1"
                            >
                              <CheckCircle size={11} /> Approve
                            </button>
                          )}
                          {rep.status === "approved" && (
                            <button
                              onClick={() => handleSuspend(rep.id)}
                              disabled={acting === rep.id + "_suspend"}
                              className="btn-outline !py-1 !px-2.5 !text-xs !text-red-600 !border-red-100 disabled:opacity-50 flex items-center gap-1"
                            >
                              <Ban size={11} /> Suspend
                            </button>
                          )}
                          {rep.status === "suspended" && (
                            <button
                              onClick={() => handleApprove(rep.id)}
                              disabled={acting === rep.id + "_approve"}
                              className="btn-outline !py-1 !px-2.5 !text-xs disabled:opacity-50 flex items-center gap-1"
                            >
                              <CheckCircle size={11} /> Reinstate
                            </button>
                          )}
                          <Link href={`/affiliates/${rep.id}`} className="btn-ghost !p-1.5" title="View detail">
                            <ExternalLink size={14} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-400">Page {page} of {totalPages}</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="btn-ghost !p-1.5 disabled:opacity-40"><ChevronLeft size={16} /></button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="btn-ghost !p-1.5 disabled:opacity-40"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
