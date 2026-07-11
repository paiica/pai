"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Loader2, AlertTriangle, RotateCcw, Trash2, Check } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

// Mirrors the student portal's getProgress() — returns the last completed step (0–4)
// and a variant string describing the current state. Shared by the Issued
// Certificates queue and the Students profile page so both render the same
// step-bar logic from the same enrollment shape.
export function getAdminProgress(row: any): { step: number; variant: string } {
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

const STEP_DEFS = [
  {
    step: 1 as const,
    label: "Step 1",
    sublabel: "Unpaid application",
    description: "Reverts to application submitted. Removes: payment approval, enrollment, exam bookings, exam attempts, certificate, lesson progress, and assignment/quiz grades.",
  },
  {
    step: 2 as const,
    label: "Step 2",
    sublabel: "Payment received",
    description: "Keeps payment on record but removes approval. Removes: enrollment activation, exam bookings, exam attempts, certificate, lesson progress, and assignment/quiz grades.",
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

// Admin actions for a single certification enrollment — grant/fail, revoke/
// reactivate the certificate, reset to an earlier step, or delete the
// enrollment outright. Used by both the Issued Certificates queue
// (admin/certificates/page.tsx) and the Students profile page
// (admin/students/[id]/page.tsx) so there's one implementation of these
// mutations, not two.
export function EnrollmentActions({ row, token, studentName, onRefresh }: {
  row: any; token: string; studentName: string; onRefresh: () => void;
}) {
  const [score, setScore]     = useState("");
  const [loading, setLoading] = useState<"grant" | "fail" | "revoke" | "reactivate" | "reset" | "delete" | `step${1|2|3|4}` | null>(null);

  const cert = row.certificate;
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
    if (!confirm(`Permanently delete ${studentName}'s enrollment in ${row.certification?.acronym}?\n\nThis will also delete all lesson progress, exam attempts, and any issued certificate. This cannot be undone.`)) return;
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
    <div className="space-y-4">
      {/* Grant / Fail */}
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

      {/* Certificate issued / revoked */}
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
  );
}
