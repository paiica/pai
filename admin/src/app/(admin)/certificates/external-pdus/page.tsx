"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  ListChecks, Loader2, AlertCircle, CheckCircle2, XCircle, ExternalLink, RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { formatDate, cn } from "@/lib/utils";

const STATUS_TABS = [
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "", label: "All" },
] as const;

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  approved: "bg-emerald-50 text-emerald-700",
  rejected: "bg-red-50 text-red-600",
};

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r: any) => r.data ?? r);
}

function SubmissionRow({ row, token, onRefresh }: { row: any; token: string; onRefresh: () => void }) {
  const [pduValue, setPduValue] = useState(row.requested_pdu_value != null ? String(row.requested_pdu_value) : "");
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);

  const name = row.user?.profile ? `${row.user.profile.first_name} ${row.user.profile.last_name}` : row.user?.email;

  async function handleApprove() {
    const value = parseFloat(pduValue);
    if (isNaN(value) || value < 0) return toast.error("Enter a valid PDU value");
    setBusy("approve");
    try {
      await api.patch(`/certificates/admin/external-pdus/${row.id}/approve`, { pdu_value: value }, token);
      toast.success("Approved");
      onRefresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to approve");
    } finally {
      setBusy(null);
    }
  }

  async function handleReject() {
    setBusy("reject");
    try {
      await api.patch(`/certificates/admin/external-pdus/${row.id}/reject`, { reason: rejectReason || undefined }, token);
      toast.success("Rejected");
      onRefresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to reject");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="border-b border-slate-50 last:border-0 px-5 py-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <p className="text-sm font-semibold text-navy-900">{row.title}</p>
            <span className="badge bg-navy-50 text-navy-700">{row.certificate?.certification_acronym}</span>
            <span className={cn("badge", STATUS_COLORS[row.status])}>{row.status}</span>
          </div>
          <p className="text-xs text-slate-400">
            {name} · {row.user?.email} · {formatDate(row.activity_date)}
            {row.provider && ` · ${row.provider}`}
          </p>
          {row.description && <p className="text-xs text-slate-500 mt-1.5">{row.description}</p>}
          {row.proof_url && (
            <a href={row.proof_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-navy-600 hover:text-navy-800 mt-1.5">
              View proof <ExternalLink size={11} />
            </a>
          )}
          {row.requested_pdu_value != null && row.status === "pending" && (
            <p className="text-xs text-slate-400 mt-1">Student suggested: {Number(row.requested_pdu_value)} PDU(s)</p>
          )}
          {row.status === "approved" && (
            <p className="text-xs text-emerald-600 font-semibold mt-1">
              Awarded {Number(row.awarded_pdu_value)} PDU(s)
              {row.reviewer && ` by ${row.reviewer.profile ? `${row.reviewer.profile.first_name} ${row.reviewer.profile.last_name}` : row.reviewer.email}`}
            </p>
          )}
          {row.status === "rejected" && row.rejection_reason && (
            <p className="text-xs text-red-500 mt-1">Reason: {row.rejection_reason}</p>
          )}
        </div>

        {row.status === "pending" && (
          <div className="flex-shrink-0 flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                step={0.5}
                value={pduValue}
                onChange={(e) => setPduValue(e.target.value)}
                placeholder="PDU value"
                className="w-24 text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-gold-400"
              />
              <button
                disabled={busy !== null}
                onClick={handleApprove}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
              >
                {busy === "approve" ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                Approve
              </button>
              <button
                disabled={busy !== null}
                onClick={() => setShowReject((v) => !v)}
                className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
              >
                <XCircle size={12} /> Reject
              </button>
            </div>
            {showReject && (
              <div className="flex items-center gap-2 w-full max-w-xs">
                <input
                  type="text"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Reason (optional)"
                  className="flex-1 text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-300"
                />
                <button
                  disabled={busy !== null}
                  onClick={handleReject}
                  className="text-xs font-semibold text-red-600 hover:text-red-800 px-2 py-1.5 disabled:opacity-60"
                >
                  {busy === "reject" ? <Loader2 size={12} className="animate-spin" /> : "Confirm"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ExternalPdusPage() {
  const token = useAuthStore((s) => s.accessToken);
  const [status, setStatus] = useState<string>("pending");

  const { data: submissions, isLoading, mutate } = useSWR(
    token ? [`/certificates/admin/external-pdus${status ? `?status=${status}` : ""}`, token] : null,
    ([url, t]) => fetcher(url, t),
  );

  const rows: any[] = Array.isArray(submissions) ? submissions : [];

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-black text-navy-900 flex items-center gap-2">
            <ListChecks size={22} className="text-navy-700" /> External PDU Requests
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Review student-submitted external professional-development activity for certificate renewal PDU credit.</p>
        </div>
        <button onClick={() => mutate()} className="btn-outline !py-1.5 !px-4 !text-xs">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      <div className="flex items-center gap-1 border-b border-slate-200">
        {STATUS_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setStatus(t.id)}
            className={cn(
              "px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors",
              status === t.id ? "border-navy-700 text-navy-700" : "border-transparent text-slate-500 hover:text-slate-700",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <div className="p-8 animate-pulse h-32 bg-slate-100" />
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <AlertCircle size={28} className="mx-auto mb-3 text-slate-300" />
            <p className="font-semibold text-slate-500">No {status || ""} submissions</p>
          </div>
        ) : (
          rows.map((row) => <SubmissionRow key={row.id} row={row} token={token!} onRefresh={() => mutate()} />)
        )}
      </div>
    </div>
  );
}
