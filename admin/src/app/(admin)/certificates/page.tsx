"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  Award, CheckCircle2, XCircle, Loader2, AlertCircle,
  RefreshCw, ChevronDown, ChevronUp, Search, RotateCcw, AlertTriangle, Trash2, Check,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const STATUS_COLORS: Record<string, string> = {
  active:    "bg-teal-50 text-teal-700",
  completed: "bg-emerald-50 text-emerald-700",
  suspended: "bg-red-50 text-red-700",
  expired:   "bg-slate-100 text-slate-500",
};

// Mirrors the student portal's getProgress() — returns the last completed step (0–4)
// and a variant string describing the current state
function getAdminProgress(row: any): { step: number; variant: string } {
  if (row.status === "completed") return { step: 4, variant: "completed" };
  if (row.status === "active")    return { step: 3, variant: "active" };
  // suspended or expired — derive from application if available
  const app = row.application;
  if (!app) {
    // Cart-enrolled student with no application (old flow) or freshly failed
    return row.status === "suspended"
      ? { step: 3, variant: "suspended_no_app" }
      : { step: 0, variant: "none" };
  }
  if (app.status === "approved")          return { step: 3, variant: row.status === "suspended" ? "suspended" : "active" };
  if (app.status === "pending_review")    return { step: 2, variant: "pending_review" };
  if (app.status === "payment_submitted") return { step: 1, variant: "payment_submitted" };
  if (app.status === "pending_payment")   return { step: 1, variant: "pending_payment" };
  return { step: 0, variant: app.status }; // rejected / withdrawn
}

function EnrollmentRow({ row, token, onRefresh }: { row: any; token: string; onRefresh: () => void }) {
  const [expanded, setExpanded]   = useState(false);
  const [score, setScore]         = useState("");
  const [loading, setLoading]     = useState<"grant" | "fail" | "revoke" | "reactivate" | "reset" | "delete" | `step${1|2|3|4}` | null>(null);

  const cert    = row.certificate;
  const attempt = row.exam_attempts?.[0];
  const profile = row.user?.profile;
  const name    = profile ? `${profile.first_name} ${profile.last_name}` : (row.user?.email ?? "Unknown");

  const canAct = !cert && row.status !== "suspended" && row.status !== "completed";

  async function handleGrant() {
    const s = parseFloat(score);
    if (isNaN(s) || s < 0 || s > 100) {
      toast.error("Enter a valid score between 0 and 100");
      return;
    }
    setLoading("grant");
    try {
      await api.post(`/certificates/issue/${row.id}`, { exam_score: s }, token);
      toast.success("Certificate issued successfully");
      onRefresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to issue certificate");
    } finally {
      setLoading(null);
    }
  }

  async function handleReactivate() {
    if (!confirm(`Reactivate certificate #${cert.certificate_number}? It will be valid for verification again.`)) return;
    setLoading("reactivate");
    try {
      await api.patch(`/certificates/reactivate/${cert.id}`, {}, token);
      toast.success("Certificate reactivated");
      onRefresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to reactivate certificate");
    } finally {
      setLoading(null);
    }
  }

  async function handleRevoke() {
    if (!confirm(`Revoke this certificate (#${cert.certificate_number})? The holder will no longer be able to verify it.`)) return;
    setLoading("revoke");
    try {
      await api.patch(`/certificates/revoke/${cert.id}`, {}, token);
      toast.success("Certificate revoked");
      onRefresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to revoke certificate");
    } finally {
      setLoading(null);
    }
  }

  async function handleReset() {
    if (!confirm(`Reset this enrollment to "Active"? The student will be able to rebook an exam session.${cert ? " The certificate will also be revoked." : ""}`)) return;
    setLoading("reset");
    try {
      await api.patch(`/certificates/reset-enrollment/${row.id}`, {}, token);
      toast.success("Enrollment reset — student can rebook the exam");
      onRefresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to reset enrollment");
    } finally {
      setLoading(null);
    }
  }

  const STEP_DEFS = [
    {
      step: 1 as const,
      label: "Step 1",
      sublabel: "Unpaid application",
      description: "Reverts to application submitted. Removes: payment approval, enrollment, exam bookings, exam attempts, certificate.",
    },
    {
      step: 2 as const,
      label: "Step 2",
      sublabel: "Payment received",
      description: "Keeps payment on record but removes approval. Removes: enrollment activation, exam bookings, exam attempts, certificate.",
    },
    {
      step: 3 as const,
      label: "Step 3",
      sublabel: "Enrolled (no exam)",
      description: "Student is enrolled and active. Removes: exam bookings, exam attempts, certificate.",
    },
    {
      step: 4 as const,
      label: "Step 4",
      sublabel: "Exam complete",
      description: "Keeps exam results. Removes: certificate only.",
    },
  ] as const;

  async function handleResetToStep(step: 1 | 2 | 3 | 4, description: string) {
    if (!confirm(`Return student to Step ${step}?\n\n${description}\n\nThis cannot be undone.`)) return;
    setLoading(`step${step}`);
    try {
      await api.patch(`/certificates/reset-to-step/${row.id}`, { step }, token);
      toast.success(`Student progress reset to Step ${step}`);
      onRefresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to reset student progress");
    } finally {
      setLoading(null);
    }
  }

  async function handleFail() {
    setLoading("fail");
    try {
      await api.patch(`/certificates/fail/${row.id}`, {}, token);
      toast.success("Enrollment marked as failed");
      onRefresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update enrollment");
    } finally {
      setLoading(null);
    }
  }

  async function handleDelete() {
    const name2 = name;
    if (!confirm(`Permanently delete ${name2}'s enrollment in ${row.certification?.acronym}?\n\nThis will also delete all lesson progress, exam attempts, and any issued certificate. This cannot be undone.`)) return;
    setLoading("delete");
    try {
      await api.delete(`/enrollments/${row.id}`, token);
      toast.success("Enrollment deleted");
      onRefresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to delete enrollment");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="border-b border-slate-50 last:border-0">
      <div
        className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50/80 transition-colors"
        onClick={() => setExpanded((x) => !x)}
      >
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-navy-100 text-navy-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
          {name.charAt(0).toUpperCase()}
        </div>

        {/* Name + email */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-navy-900 truncate">{name}</p>
          <p className="text-xs text-slate-400 truncate">{row.user?.email}</p>
        </div>

        {/* Program */}
        <span className="badge bg-navy-50 text-navy-700 flex-shrink-0 hidden sm:inline-flex">
          {row.certification?.acronym}
        </span>

        {/* Enrolled date */}
        <span className="text-xs text-slate-400 hidden md:block flex-shrink-0">
          {formatDate(row.enrolled_at)}
        </span>

        {/* Status */}
        <span className={cn("badge flex-shrink-0", STATUS_COLORS[row.status] ?? "bg-slate-100 text-slate-500")}>
          {row.status}
        </span>

        {/* Certificate indicator */}
        <div className="hidden lg:block flex-shrink-0 w-20 text-right">
          {cert ? (
            cert.status === "revoked" ? (
              <span className="text-xs font-semibold text-red-500">Revoked</span>
            ) : (
              <span className="text-xs font-semibold text-emerald-600">Issued</span>
            )
          ) : row.status === "suspended" ? (
            <span className="text-xs font-semibold text-red-500">Failed</span>
          ) : (
            <span className="text-xs text-slate-300">Pending</span>
          )}
        </div>

        <div className="text-slate-300 flex-shrink-0">
          {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </div>
      </div>

      {expanded && (
        <div className="bg-slate-50/50 px-5 pb-5 pt-3 space-y-4 border-t border-slate-100">
          {/* Detail grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Certification</p>
              <p className="text-sm text-slate-800">{row.certification?.title}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Enrolled</p>
              <p className="text-sm text-slate-800">{formatDate(row.enrolled_at)}</p>
            </div>
            {attempt && (
              <>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Last Attempt</p>
                  <p className="text-sm text-slate-800 capitalize">{attempt.status?.replace("_", " ")}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Attempt Score</p>
                  <p className="text-sm text-slate-800">
                    {attempt.score_percentage != null ? `${attempt.score_percentage}%` : "—"}
                    {attempt.passed != null && (
                      <span className={cn("ml-2 text-xs font-semibold", attempt.passed ? "text-emerald-600" : "text-red-500")}>
                        {attempt.passed ? "Passed" : "Failed"}
                      </span>
                    )}
                  </p>
                </div>
              </>
            )}
            {cert && (
              <>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Certificate #</p>
                  <p className="text-xs text-slate-700 font-mono">{cert.certificate_number}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Issued</p>
                  <p className="text-sm text-slate-800">{formatDate(cert.issued_at)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Expires</p>
                  <p className="text-sm text-slate-800">{formatDate(cert.expires_at)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Exam Score</p>
                  <p className="text-sm text-slate-800">{cert.exam_score != null ? `${cert.exam_score}%` : "—"}</p>
                </div>
              </>
            )}
          </div>

          {/* Actions */}
          {canAct && (
            <div className="flex items-center gap-3 pt-2 border-t border-slate-200 flex-wrap">
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={0}
                  max={100}
                  placeholder="Score %"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-24 text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-gold-400 bg-white"
                />
              </div>
              <button
                disabled={loading === "grant"}
                onClick={(e) => { e.stopPropagation(); handleGrant(); }}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors disabled:opacity-60"
              >
                {loading === "grant" ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Grant Certificate
              </button>
              <button
                disabled={loading === "fail"}
                onClick={(e) => { e.stopPropagation(); handleFail(); }}
                className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors disabled:opacity-60"
              >
                {loading === "fail" ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                Fail
              </button>
            </div>
          )}

          {cert && (
            <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-200 flex-wrap">
              {cert.status === "revoked" ? (
                <div className="flex items-center justify-between gap-4 w-full flex-wrap">
                  <div className="flex items-center gap-2 text-red-500 text-sm font-medium">
                    <XCircle size={14} />
                    Certificate revoked — no longer valid for verification.
                  </div>
                  <button
                    disabled={loading === "reactivate"}
                    onClick={(e) => { e.stopPropagation(); handleReactivate(); }}
                    className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
                  >
                    {loading === "reactivate" ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                    Reactivate Certificate
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium">
                  <CheckCircle2 size={14} />
                  Certificate issued · #{cert.certificate_number}
                </div>
              )}
              {cert.status !== "revoked" && (
                <button
                  disabled={loading === "revoke"}
                  onClick={(e) => { e.stopPropagation(); handleRevoke(); }}
                  className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
                >
                  {loading === "revoke" ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                  Revoke Certificate
                </button>
              )}
            </div>
          )}

          {/* Return to step — visual step bar matching student portal logic */}
          <div className="pt-2 border-t border-slate-200">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={13} className="text-amber-500 flex-shrink-0" />
              <p className="text-xs font-semibold text-slate-600">Click a step to return the student there — undoes all progress after it</p>
            </div>

            {(() => {
              const { step: currentStep, variant } = getAdminProgress(row);

              return (
                <div className="flex items-start w-full">
                  {STEP_DEFS.map(({ step, label, sublabel, description }, idx) => {
                    const isSuspended = variant === "suspended" || variant === "suspended_no_app";
                    const done   = currentStep >= step;
                    // Active = the next step to complete — but not when student is suspended
                    const active = !isSuspended && currentStep === step - 1;

                    // Circle colors — mirrors student portal palette (adapted to light bg)
                    const circleClass = done
                      ? isSuspended && step === currentStep
                        ? "bg-red-100 text-red-600 border-red-300"   // suspended at this step
                        : "bg-emerald-100 text-emerald-700 border-emerald-300"  // completed step
                      : active
                      ? variant === "pending_review" || variant === "payment_submitted"
                        ? "bg-amber-100 text-amber-700 border-amber-300"   // waiting on admin
                        : "bg-blue-100 text-blue-700 border-blue-300"      // application in progress
                      : "bg-slate-100 text-slate-400 border-slate-200";   // future

                    const labelClass = done
                      ? isSuspended && step === currentStep ? "text-red-500" : "text-emerald-600"
                      : active
                      ? variant === "pending_review" || variant === "payment_submitted" ? "text-amber-600"
                        : "text-blue-600"
                      : "text-slate-400";

                    // Line turns grey after a suspended step (don't show green progress past it)
                    const lineClass = done && !(isSuspended && step === currentStep)
                      ? "bg-emerald-300"
                      : "bg-slate-200";

                    // Active step sub-label
                    const activeTag = active
                      ? variant === "pending_review"    ? "Under Review"
                        : variant === "payment_submitted" ? "Payment Processing"
                        : variant === "pending_payment"   ? "Applied"
                        : variant === "suspended_no_app"  ? "Suspended"
                        : ""
                      : done && isSuspended && step === currentStep ? "Suspended"
                      : "";

                    return (
                      <div key={step} className="flex items-start flex-1 last:flex-none">
                        <button
                          disabled={loading === `step${step}`}
                          onClick={(e) => { e.stopPropagation(); handleResetToStep(step, description); }}
                          className="flex flex-col items-center gap-1.5 group hover:opacity-80 transition-opacity flex-shrink-0 disabled:cursor-not-allowed"
                          title={`Return to ${label} — ${description}`}
                        >
                          {/* Circle */}
                          <div className={cn(
                            "w-9 h-9 rounded-full border-2 flex items-center justify-center text-sm font-bold transition-all group-hover:scale-105",
                            circleClass,
                            active && "ring-2 ring-offset-1 ring-current ring-opacity-30",
                          )}>
                            {loading === `step${step}`
                              ? <Loader2 size={14} className="animate-spin" />
                              : done
                              ? <Check size={16} className={isSuspended && step === currentStep ? "text-red-500" : "text-emerald-600"} />
                              : step}
                          </div>

                          {/* Labels */}
                          <div className="text-center w-20">
                            <span className={cn("text-[10px] font-bold whitespace-nowrap block", labelClass)}>
                              {label}
                            </span>
                            <span className="text-[9px] text-slate-400 leading-tight block">{sublabel}</span>
                            {activeTag && (
                              <span className={cn(
                                "text-[9px] font-semibold block mt-0.5",
                                variant === "suspended" || variant === "suspended_no_app" ? "text-red-500" : "text-amber-500"
                              )}>
                                {activeTag}
                              </span>
                            )}
                            {active && !activeTag && (
                              <span className="text-[9px] text-blue-500 font-semibold block mt-0.5">Current</span>
                            )}
                          </div>

                          {/* Hover hint */}
                          <span className="text-[8px] text-slate-300 group-hover:text-amber-500 flex items-center gap-0.5 transition-colors">
                            <RotateCcw size={8} /> Reset here
                          </span>
                        </button>

                        {/* Connector line */}
                        {idx < STEP_DEFS.length - 1 && (
                          <div className={cn("flex-1 h-0.5 mt-[18px] mx-1", lineClass)} />
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {row.status === "suspended" && !cert && (
            <div className="flex items-center gap-2 pt-2 border-t border-slate-200 text-red-500 text-sm">
              <XCircle size={14} />
              This enrollment has been marked as failed.
            </div>
          )}

          {/* Delete enrollment */}
          <div className="pt-2 border-t border-red-100 flex justify-end">
            <button
              disabled={loading === "delete"}
              onClick={(e) => { e.stopPropagation(); handleDelete(); }}
              className="flex items-center gap-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 border border-red-200 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
            >
              {loading === "delete" ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              Delete Enrollment
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CertificatesPage() {
  const { accessToken } = useAuthStore();
  const [page, setPage]     = useState(1);
  const [search, setSearch] = useState("");

  const { data, isLoading, error, mutate } = useSWR(
    accessToken ? [`/certificates/admin/enrollments?page=${page}&limit=25`, accessToken] : null,
    ([url, token]) => api.get<any>(url, token),
    { revalidateOnFocus: false },
  );

  const payload     = data?.data ?? data;
  const enrollments: any[] = Array.isArray(payload?.data) ? payload.data : [];
  const meta        = payload?.meta ?? { total: 0, totalPages: 1 };

  const filtered = search.trim()
    ? enrollments.filter((e) => {
        const name    = e.user?.profile ? `${e.user.profile.first_name} ${e.user.profile.last_name}`.toLowerCase() : "";
        const email   = (e.user?.email ?? "").toLowerCase();
        const acronym = (e.certification?.acronym ?? "").toLowerCase();
        const q       = search.toLowerCase();
        return name.includes(q) || email.includes(q) || acronym.includes(q);
      })
    : enrollments;

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-black text-navy-900">Issued Certificates</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {isLoading ? "Loading…" : `${meta.total} enrollment${meta.total !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button
          onClick={() => mutate()}
          className="btn-outline !py-1.5 !px-3 !text-xs flex items-center gap-1.5"
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
        <input
          type="text"
          placeholder="Search by name, email, or program…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 bg-white"
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <div className="p-10 text-center">
            <Loader2 size={24} className="animate-spin text-slate-300 mx-auto" />
            <p className="text-slate-400 text-sm mt-3">Loading enrollments…</p>
          </div>
        ) : error ? (
          <div className="p-10 text-center">
            <AlertCircle size={28} className="text-red-300 mx-auto mb-3" />
            <p className="text-slate-600 text-sm font-semibold">Could not load enrollments</p>
            <button onClick={() => mutate()} className="btn-outline !py-1.5 !px-4 !text-xs mx-auto mt-4">
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <Award size={28} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm font-semibold">No enrollments found</p>
          </div>
        ) : (
          <div>
            {/* Column headers */}
            <div className="flex items-center gap-4 px-5 py-2.5 border-b border-slate-100 bg-slate-50/80">
              <div className="w-9 flex-shrink-0" />
              <div className="flex-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Student</div>
              <div className="hidden sm:block text-[10px] font-bold text-slate-400 uppercase tracking-widest w-16">Program</div>
              <div className="hidden md:block text-[10px] font-bold text-slate-400 uppercase tracking-widest w-24">Enrolled</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest w-20">Status</div>
              <div className="hidden lg:block text-[10px] font-bold text-slate-400 uppercase tracking-widest w-20 text-right">Cert</div>
              <div className="w-4 flex-shrink-0" />
            </div>
            {filtered.map((row: any) => (
              <EnrollmentRow key={row.id} row={row} token={accessToken!} onRefresh={() => mutate()} />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-5">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="btn-outline !py-1.5 !px-3 !text-xs disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-slate-500">Page {page} of {meta.totalPages}</span>
          <button
            disabled={page >= meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="btn-outline !py-1.5 !px-3 !text-xs disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
