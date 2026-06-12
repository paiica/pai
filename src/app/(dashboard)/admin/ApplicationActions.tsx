"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ApplicationActions({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [reason, setReason] = useState("");
  const [done, setDone] = useState<"approved" | "rejected" | null>(null);
  const [error, setError] = useState("");

  async function approve() {
    setLoading("approve");
    setError("");
    const res = await fetch(`/api/applications/${applicationId}/approve`, { method: "POST" });
    if (res.ok) {
      setDone("approved");
      router.refresh();
    } else {
      const d = await res.json();
      setError(d.error || "Failed to approve");
    }
    setLoading(null);
  }

  async function reject() {
    setLoading("reject");
    setError("");
    const res = await fetch(`/api/applications/${applicationId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    if (res.ok) {
      setDone("rejected");
      setShowRejectModal(false);
      router.refresh();
    } else {
      const d = await res.json();
      setError(d.error || "Failed to reject");
    }
    setLoading(null);
  }

  if (done === "approved") {
    return (
      <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl">
        <CheckCircle2 size={13} /> Approved
      </span>
    );
  }

  if (done === "rejected") {
    return (
      <span className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-xl">
        <XCircle size={13} /> Rejected
      </span>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2 flex-shrink-0">
        {error && <span className="text-xs text-red-500">{error}</span>}
        <button
          onClick={approve}
          disabled={!!loading}
          className="flex items-center gap-1.5 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-white px-3 py-2 rounded-xl transition-all disabled:opacity-50"
        >
          {loading === "approve" ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
          Approve
        </button>
        <button
          onClick={() => setShowRejectModal(true)}
          disabled={!!loading}
          className="flex items-center gap-1.5 text-xs font-bold bg-red-50 hover:bg-red-100 text-red-700 px-3 py-2 rounded-xl transition-all border border-red-100 disabled:opacity-50"
        >
          <XCircle size={12} /> Reject
        </button>
      </div>

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-md p-6">
            <h3 className="font-display font-black text-navy-900 text-lg mb-2">Reject Application</h3>
            <p className="text-slate-500 text-sm mb-4">
              Optionally provide a reason. A full refund will be issued automatically.
            </p>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Reason for rejection (optional — shown to applicant in email)"
              rows={3}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-red-300 focus:ring-4 focus:ring-red-50 outline-none text-sm resize-none text-slate-900"
            />
            {error && (
              <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
                <AlertCircle size={11} /> {error}
              </p>
            )}
            <div className="flex gap-3 mt-4">
              <button
                onClick={reject}
                disabled={loading === "reject"}
                className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white font-bold py-2.5 rounded-xl text-sm transition-all disabled:opacity-50"
              >
                {loading === "reject" ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                Confirm Reject & Refund
              </button>
              <button
                onClick={() => { setShowRejectModal(false); setError(""); }}
                className="flex-1 border-2 border-slate-200 text-slate-600 font-semibold py-2.5 rounded-xl text-sm hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
