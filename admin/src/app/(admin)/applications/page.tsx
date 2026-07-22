"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  ClipboardList, CheckCircle2, XCircle, Loader2, Eye, X,
  User, Briefcase, GraduationCap, FileText, Paperclip,
  ToggleLeft, ToggleRight, Download, Trash2, AlertTriangle, BadgeCheck, Ban, UserCheck,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  pending_payment:   "bg-blue-50 text-blue-700",
  payment_submitted: "bg-amber-50 text-amber-700",
  pending_review:    "bg-purple-50 text-purple-700",
  approved:          "bg-emerald-50 text-emerald-700",
  rejected:          "bg-red-50 text-red-700",
  withdrawn:         "bg-slate-100 text-slate-500",
};

const STATUS_LABELS: Record<string, string> = {
  pending_payment:   "Pending Payment",
  payment_submitted: "Payment Submitted",
  pending_review:    "Pending Review",
  approved:          "Approved",
  rejected:          "Rejected",
  withdrawn:         "Withdrawn",
};

const FILTERS = ["", "pending_payment", "payment_submitted", "pending_review", "approved", "rejected"];

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex gap-3 text-sm">
      <span className="text-slate-400 w-36 flex-shrink-0 text-xs mt-0.5">{label}</span>
      <span className="text-slate-800 font-medium">{String(value)}</span>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={13} className="text-slate-400" />
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</span>
      </div>
      <div className="space-y-2 pl-5">{children}</div>
    </div>
  );
}

function ApplicationDrawer({
  app,
  onClose,
  onAction,
  onDocRequestToggle,
  actionLoading,
}: {
  app: any;
  onClose: () => void;
  onAction: (id: string, action: "approve" | "reject" | "set-pending" | "verify-payment" | "reject-payment" | "unverify-payment", reason?: string) => void;
  onDocRequestToggle: (id: string, requested: boolean, message?: string) => void;
  actionLoading: string | null;
}) {
  const [rejectReason,    setRejectReason]    = useState("");
  const [showRejectForm,  setShowRejectForm]  = useState(false);
  const [docMessage,      setDocMessage]      = useState(app.documents_request_message ?? "");
  const [editingDocMsg,   setEditingDocMsg]   = useState(false);
  const [togglingDocs,    setTogglingDocs]    = useState(false);

  const isActionable  = app.status !== "withdrawn";
  const docsRequested = app.documents_requested ?? false;
  const docs: any[]   = Array.isArray(app.documents) ? app.documents : [];

  async function handleDocToggle() {
    setTogglingDocs(true);
    await onDocRequestToggle(app.id, !docsRequested, docsRequested ? undefined : docMessage);
    setTogglingDocs(false);
    setEditingDocMsg(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white shadow-2xl flex flex-col h-full overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="font-display font-black text-navy-900 text-base">{app.full_name}</h2>
            <p className="text-xs text-slate-400">{app.email}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 px-6 py-5 space-y-6">
          {/* Status + Certification */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="badge bg-navy-50 text-navy-700 font-bold">{app.certification?.acronym}</span>
            <span className={`badge ${STATUS_COLORS[app.status] || "bg-slate-100 text-slate-600"}`}>
              {STATUS_LABELS[app.status] || app.status}
            </span>
            <span className="text-xs text-slate-400">Applied {formatDate(app.created_at)}</span>
          </div>

          {/* Eligibility flag — shortfall against the certification's minimums, needs a manual call */}
          {app.eligibility_flagged && (
            <div className="border border-amber-300 bg-amber-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <AlertTriangle size={14} className="text-amber-600 flex-shrink-0" />
                <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Eligibility Flagged — Manual Review Needed</span>
              </div>
              <p className="text-sm text-amber-800">{app.eligibility_flag_reason}</p>
              {(app.certification?.min_years_experience != null || app.certification?.min_training_hours != null) && (
                <p className="text-xs text-amber-700/80 mt-1.5">
                  Certification requires
                  {app.certification?.min_years_experience != null ? ` ${app.certification.min_years_experience}+ years experience` : ""}
                  {app.certification?.min_years_experience != null && app.certification?.min_training_hours != null ? " and" : ""}
                  {app.certification?.min_training_hours != null ? ` ${app.certification.min_training_hours}+ training hours` : ""}.
                </p>
              )}
            </div>
          )}

          {/* Personal */}
          <Section title="Personal" icon={User}>
            <DetailRow label="Phone"         value={app.phone} />
            <DetailRow label="Date of Birth" value={app.date_of_birth ? new Date(app.date_of_birth).toLocaleDateString("en-CA", { dateStyle: "long" }) : null} />
            <DetailRow label="Gender"        value={app.gender} />
            <DetailRow label="Country"       value={app.country} />
          </Section>

          {/* Professional */}
          <Section title="Professional" icon={Briefcase}>
            <DetailRow label="Career Status"    value={app.career_status?.replace("_", " ")} />
            <DetailRow label="Job Title"        value={app.job_title} />
            <DetailRow label="Company"          value={app.company} />
            <DetailRow label="Years Experience" value={app.years_experience != null ? `${app.years_experience} years` : null} />
            <DetailRow label="Training Hours"   value={app.training_hours != null ? `${app.training_hours} hrs` : null} />
            <DetailRow label="LinkedIn"         value={app.linkedin_url} />
          </Section>

          {/* Education */}
          <Section title="Education" icon={GraduationCap}>
            <DetailRow label="University"      value={app.university} />
            <DetailRow label="Degree"          value={app.degree_program} />
            <DetailRow label="Graduation Year" value={app.graduation_year} />
          </Section>

          {/* Motivation */}
          {app.motivation && (
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Motivation</span>
              <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-xl p-4">{app.motivation}</p>
            </div>
          )}

          {app.how_heard && (
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">How They Heard</span>
              <p className="text-sm text-slate-600">{app.how_heard}</p>
            </div>
          )}

          {app.referred_by && (
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Referred By</span>
              <div className="flex items-center gap-3 bg-teal-50 border border-teal-100 rounded-xl p-3">
                <div className="w-9 h-9 bg-teal-600 rounded-full flex items-center justify-center text-white flex-shrink-0">
                  <UserCheck size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <a
                    href={`/affiliates/${app.referred_by.affiliate_user_id}`}
                    className="text-sm font-semibold text-teal-800 hover:underline"
                  >
                    {app.referred_by.name}
                  </a>
                  <p className="text-xs text-teal-700/80 truncate">
                    {app.referred_by.email} · code {app.referred_by.referral_code}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Rejection reason */}
          {app.rejection_reason && (
            <div>
              <span className="text-xs font-bold text-red-500 uppercase tracking-wider block mb-1">Rejection Reason</span>
              <p className="text-sm text-red-700 bg-red-50 rounded-xl p-3">{app.rejection_reason}</p>
            </div>
          )}

          {/* ── Request Supporting Documents ── */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Paperclip size={13} className="text-slate-500" />
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Supporting Documents</span>
              </div>
              <button
                onClick={() => {
                  if (!docsRequested) setEditingDocMsg(true);
                  else handleDocToggle();
                }}
                disabled={togglingDocs}
                className={cn(
                  "flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors",
                  docsRequested
                    ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                    : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                )}
              >
                {togglingDocs ? <Loader2 size={11} className="animate-spin" /> : docsRequested ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                {docsRequested ? "Requested" : "Request Documents"}
              </button>
            </div>

            {/* Inline message editor when enabling */}
            {editingDocMsg && !docsRequested && (
              <div className="px-4 py-3 space-y-2 border-t border-slate-100">
                <p className="text-xs text-slate-500">Add a message to the student explaining what documents are needed (optional):</p>
                <textarea
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-navy-300 resize-none h-20"
                  placeholder="e.g. Please upload proof of work experience (e.g. LinkedIn profile, reference letter) and a copy of your most recent transcript."
                  value={docMessage}
                  onChange={(e) => setDocMessage(e.target.value)}
                />
                <div className="flex gap-2">
                  <button onClick={() => setEditingDocMsg(false)} className="flex-1 btn-outline !py-1.5 !text-xs">Cancel</button>
                  <button
                    onClick={handleDocToggle}
                    disabled={togglingDocs}
                    className="flex-1 text-xs font-semibold py-1.5 px-3 bg-navy-800 hover:bg-navy-700 text-white rounded-xl transition-colors disabled:opacity-50"
                  >
                    {togglingDocs ? <Loader2 size={11} className="animate-spin" /> : "Send Request"}
                  </button>
                </div>
              </div>
            )}

            {/* Active request message */}
            {docsRequested && app.documents_request_message && (
              <div className="px-4 py-3 border-t border-slate-100">
                <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider mb-1">Message sent to student</p>
                <p className="text-xs text-slate-700 leading-relaxed">{app.documents_request_message}</p>
              </div>
            )}

            {/* Uploaded documents */}
            {docs.length > 0 ? (
              <div className="px-4 py-3 border-t border-slate-100 space-y-2">
                <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Uploaded by student ({docs.length})</p>
                {docs.map((doc: any) => (
                  <div key={doc.id} className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors group">
                    <FileText size={14} className="text-slate-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-navy-900 truncate">{doc.file_name}</p>
                      <p className="text-[10px] text-slate-400">{formatDate(doc.uploaded_at)}{doc.file_size ? ` · ${(doc.file_size / 1024).toFixed(0)} KB` : ""}</p>
                    </div>
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-slate-400 hover:text-navy-700 transition-colors opacity-0 group-hover:opacity-100"
                      title="Download"
                    >
                      <Download size={13} />
                    </a>
                  </div>
                ))}
              </div>
            ) : docsRequested ? (
              <div className="px-4 py-3 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-400">Waiting for student to upload documents…</p>
              </div>
            ) : null}
          </div>
        </div>

        {/* Sticky footer — always visible, contains payment toggle + action buttons */}
        {isActionable && (
          <div className="sticky bottom-0 bg-white border-t border-slate-100 px-6 py-4 space-y-3">
            {/* Payment verification toggle — only when a real payment was submitted */}
            {(app.status === "payment_submitted" || app.status === "pending_review" ||
              (app.status === "approved" && app.payment_status === "succeeded")) && (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <BadgeCheck size={14} className={app.status === "payment_submitted" ? "text-amber-500" : "text-emerald-500"} />
                    <div>
                      <p className="text-xs font-semibold text-slate-800">
                        {app.status === "payment_submitted" ? "Payment submitted — not yet verified" : "Payment received ✓"}
                      </p>
                      {app.promo_code ? (
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Promo: <span className="font-mono font-semibold text-purple-600">{app.promo_code}</span>
                          {Number(app.amount_paid) === 0 && <span className="ml-1 text-emerald-600 font-semibold">(100% off — free)</span>}
                          {app.promo_affiliate && (
                            <>
                              {" · "}
                              <a
                                href={`/affiliates/${app.promo_affiliate.affiliate_user_id}`}
                                className="text-teal-700 font-semibold hover:underline"
                              >
                                {app.promo_affiliate.name}
                              </a>
                              's code
                            </>
                          )}
                        </p>
                      ) : (
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {app.status === "payment_submitted" ? "Toggle ON to verify receipt" : app.status === "pending_review" ? "Toggle OFF to un-verify" : ""}
                        </p>
                      )}
                    </div>
                  </div>
                  {/* Bi-directional toggle: OFF = payment_submitted, ON = pending_review, locked = approved */}
                  <button
                    onClick={() => {
                      if (app.status === "payment_submitted") onAction(app.id, "verify-payment");
                      else if (app.status === "pending_review") onAction(app.id, "unverify-payment");
                    }}
                    disabled={(app.status !== "payment_submitted" && app.status !== "pending_review") || !!actionLoading}
                    title={app.status === "payment_submitted" ? "Click to verify payment" : app.status === "pending_review" ? "Click to un-verify" : "Locked — application approved"}
                    className={cn(
                      "relative w-11 h-6 rounded-full transition-colors flex-shrink-0",
                      app.status === "payment_submitted" ? "bg-slate-200 hover:bg-slate-300 cursor-pointer" :
                      app.status === "pending_review" ? "bg-emerald-500 hover:bg-emerald-600 cursor-pointer" :
                      "bg-emerald-500 cursor-not-allowed opacity-60",
                      !!actionLoading && "opacity-50"
                    )}
                  >
                    {(actionLoading === app.id + "verify-payment" || actionLoading === app.id + "unverify-payment")
                      ? <Loader2 size={11} className="animate-spin absolute inset-0 m-auto text-white" />
                      : <span className={cn(
                          "absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-200",
                          app.status === "payment_submitted" ? "left-1" : "left-6"
                        )} />
                    }
                  </button>
                </div>
                {app.status === "payment_submitted" && (
                  <div className="px-4 pb-2.5 border-t border-slate-100 pt-2">
                    <button
                      onClick={() => onAction(app.id, "reject-payment")}
                      disabled={!!actionLoading}
                      className="text-[11px] text-red-500 hover:text-red-700 font-semibold disabled:opacity-50 flex items-center gap-1"
                    >
                      {actionLoading === app.id + "reject-payment" ? <Loader2 size={10} className="animate-spin" /> : <Ban size={10} />}
                      Reject payment — reset to unpaid
                    </button>
                  </div>
                )}
              </div>
            )}

            {showRejectForm ? (
              <>
                <textarea
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-red-300 resize-none h-20"
                  placeholder="Reason for rejection (optional)"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
                <div className="flex gap-2">
                  <button onClick={() => setShowRejectForm(false)} className="flex-1 btn-outline !py-2 !text-xs">Cancel</button>
                  <button
                    onClick={() => onAction(app.id, "reject", rejectReason)}
                    disabled={!!actionLoading}
                    className="flex-1 text-xs font-semibold py-2 px-4 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {actionLoading === app.id + "reject" ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                    Confirm Reject
                  </button>
                </div>
              </>
            ) : (
              <div className="flex gap-2 flex-wrap">
                {app.status !== "rejected" && (
                  <button
                    onClick={() => setShowRejectForm(true)}
                    disabled={!!actionLoading}
                    className="flex-1 btn-outline !py-2 !text-xs !text-red-600 !border-red-200 disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <XCircle size={12} />
                    {app.status === "approved" ? "Revoke Approval" : "Reject"}
                  </button>
                )}
                {(app.status === "approved" || app.status === "rejected") && (
                  <button
                    onClick={() => onAction(app.id, "set-pending")}
                    disabled={!!actionLoading}
                    className="flex-1 btn-outline !py-2 !text-xs !text-amber-600 !border-amber-200 disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {actionLoading === app.id + "set-pending" ? <Loader2 size={12} className="animate-spin" /> : <AlertTriangle size={12} />}
                    Set to Pending
                  </button>
                )}
                {app.status !== "approved" && (
                  <button
                    onClick={() => onAction(app.id, "approve")}
                    disabled={!!actionLoading}
                    className="flex-1 text-xs font-semibold py-2 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {actionLoading === app.id + "approve" ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                    {app.status === "rejected" ? "Re-approve" : "Approve"}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


export default function ApplicationsPage() {
  const { accessToken } = useAuthStore();
  const [filter,        setFilter]        = useState<string>("");
  const [selected,      setSelected]      = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [checkedIds,    setCheckedIds]    = useState<Set<string>>(new Set());
  const [bulkDeleting,  setBulkDeleting]  = useState(false);

  const { data, mutate } = useSWR(
    accessToken ? `/applications?limit=100${filter ? `&status=${filter}` : ""}` : null,
    (url) => api.get<any>(url, accessToken!)
  );

  const applications: any[] = data?.data?.data ?? [];

  const allChecked = applications.length > 0 && checkedIds.size === applications.length;
  const someChecked = checkedIds.size > 0;

  function toggleAll() {
    if (allChecked) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(applications.map((a: any) => a.id)));
    }
  }

  function toggleOne(id: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleDeleteOne(app: any, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Delete application from ${app.full_name}? This cannot be undone.`)) return;
    setActionLoading("delete-" + app.id);
    try {
      await api.delete(`/applications/${app.id}`, accessToken!);
      toast.success("Application deleted");
      setCheckedIds((prev) => { const n = new Set(prev); n.delete(app.id); return n; });
      mutate();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    }
    setActionLoading(null);
  }

  async function handleBulkDelete() {
    const ids = Array.from(checkedIds);
    if (!confirm(`Permanently delete ${ids.length} application${ids.length !== 1 ? "s" : ""}? This cannot be undone.`)) return;
    setBulkDeleting(true);
    try {
      await api.delete(`/applications/bulk`, accessToken!, { ids });
      toast.success(`${ids.length} application${ids.length !== 1 ? "s" : ""} deleted`);
      setCheckedIds(new Set());
      mutate();
    } catch (err: any) {
      toast.error(err.message || "Bulk delete failed");
    }
    setBulkDeleting(false);
  }

  async function handleAction(id: string, action: "approve" | "reject" | "set-pending" | "verify-payment" | "reject-payment" | "unverify-payment", reason?: string) {
    setActionLoading(id + action);
    try {
      await api.patch(`/applications/${id}/${action}`, action === "reject" ? { reason } : {}, accessToken!);
      toast.success(
        action === "approve"          ? "Application approved" :
        action === "reject"           ? "Application rejected" :
        action === "verify-payment"   ? "Payment verified — now under review" :
        action === "unverify-payment" ? "Payment un-verified — back to processing" :
        action === "reject-payment"   ? "Payment rejected — reset to unpaid" :
        "Application set to pending review"
      );
      mutate();
      setSelected(null);
    } catch (err: any) {
      toast.error(err.message || "Action failed");
    }
    setActionLoading(null);
  }

  async function handleDocRequestToggle(id: string, requested: boolean, message?: string) {
    try {
      if (requested) {
        await api.patch(`/applications/${id}/request-documents`, { message }, accessToken!);
        toast.success("Document request sent to student");
      } else {
        await api.patch(`/applications/${id}/cancel-document-request`, {}, accessToken!);
        toast.success("Document request cancelled");
      }
      const fresh = await api.get<any>(`/applications?limit=100${filter ? `&status=${filter}` : ""}`, accessToken!);
      mutate(fresh, false);
      const updatedApp = (fresh?.data?.data ?? []).find((a: any) => a.id === id);
      if (updatedApp) setSelected(updatedApp);
    } catch (err: any) {
      toast.error(err.message || "Failed to update document request");
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-display font-black text-navy-900">Applications</h1>
        <div className="flex gap-1.5 flex-wrap">
          {FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => { setFilter(s); setCheckedIds(new Set()); }}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors border ${
                filter === s
                  ? "bg-navy-800 text-white border-navy-800"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              }`}
            >
              {s === "" ? "All" : STATUS_LABELS[s] || s}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk action toolbar */}
      {someChecked && (
        <div className="flex items-center gap-3 mb-3 px-4 py-2.5 bg-navy-50 border border-navy-200 rounded-xl">
          <span className="text-sm font-semibold text-navy-800">{checkedIds.size} selected</span>
          <button
            onClick={handleBulkDelete}
            disabled={bulkDeleting}
            className="flex items-center gap-1.5 ml-auto bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
          >
            {bulkDeleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            Delete {checkedIds.size} application{checkedIds.size !== 1 ? "s" : ""}
          </button>
          <button
            onClick={() => setCheckedIds(new Set())}
            className="text-xs text-slate-500 hover:text-slate-700"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="card overflow-hidden">
        {/* Select-all header */}
        {applications.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-100 bg-slate-50/60">
            <input
              type="checkbox"
              checked={allChecked}
              onChange={toggleAll}
              className="w-4 h-4 rounded accent-navy-700 cursor-pointer"
            />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {allChecked ? "Deselect all" : `Select all ${applications.length}`}
            </span>
          </div>
        )}

        <div className="divide-y divide-slate-50">
          {applications.length === 0 ? (
            <div className="p-10 text-center">
              <ClipboardList size={28} className="text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No applications found.</p>
            </div>
          ) : applications.map((app: any) => {
            const isChecked = checkedIds.has(app.id);
            const isDeleting = actionLoading === "delete-" + app.id;
            return (
              <div
                key={app.id}
                className={cn(
                  "p-4 flex flex-col sm:flex-row sm:items-center gap-3 transition-colors",
                  isChecked ? "bg-navy-50/50" : "hover:bg-slate-50/50"
                )}
              >
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleOne(app.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-4 h-4 rounded accent-navy-700 cursor-pointer flex-shrink-0"
                />

                {/* Row content — clicking opens drawer */}
                <div
                  className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1 min-w-0 cursor-pointer"
                  onClick={() => setSelected(app)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 bg-navy-800 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0">
                      {(app.full_name || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-navy-900 text-sm">{app.full_name}</div>
                      <div className="text-xs text-slate-400 truncate">{app.email}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs items-center">
                    <span className="badge bg-navy-50 text-navy-700">{app.certification?.acronym}</span>
                    <span className={`badge ${STATUS_COLORS[app.status] || "bg-slate-100 text-slate-600"}`}>
                      {STATUS_LABELS[app.status] || app.status}
                    </span>
                    {app.eligibility_flagged && (
                      <span className="badge bg-amber-50 text-amber-700 flex items-center gap-1">
                        <AlertTriangle size={9} /> Eligibility Flag
                      </span>
                    )}
                    {app.documents_requested && (
                      <span className="badge bg-orange-50 text-orange-700 flex items-center gap-1">
                        <Paperclip size={9} /> Docs Requested
                      </span>
                    )}
                    {app.documents?.length > 0 && (
                      <span className="badge bg-purple-50 text-purple-700 flex items-center gap-1">
                        <FileText size={9} /> {app.documents.length} doc{app.documents.length !== 1 ? "s" : ""}
                      </span>
                    )}
                    {app.referred_by && (
                      <span className="badge bg-teal-50 text-teal-700 flex items-center gap-1" title={`Referred by ${app.referred_by.name}`}>
                        <UserCheck size={9} /> {app.referred_by.name}
                      </span>
                    )}
                    <span className="text-slate-400">{formatDate(app.created_at)}</span>
                  </div>
                  <Eye size={14} className="text-slate-300 flex-shrink-0 hidden sm:block" />
                </div>

                {/* Delete button */}
                <button
                  disabled={isDeleting}
                  onClick={(e) => handleDeleteOne(app, e)}
                  className="flex-shrink-0 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                  title="Delete application"
                >
                  {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {selected && (
        <ApplicationDrawer
          app={selected}
          onClose={() => setSelected(null)}
          onAction={handleAction}
          onDocRequestToggle={handleDocRequestToggle}
          actionLoading={actionLoading}
        />
      )}
    </div>
  );
}
