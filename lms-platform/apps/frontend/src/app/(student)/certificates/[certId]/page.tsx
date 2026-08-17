"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { useTranslations } from "next-intl";
import {
  RefreshCw, CheckCircle2, Clock, BookOpen, ExternalLink,
  ChevronRight, X, User, Briefcase, GraduationCap, MessageSquare,
  AlertTriangle, Upload, FileText, Loader2, CalendarDays,
  Users, Check, Info, Award, Download, Share2, Shield, Linkedin, Twitter, Link2,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { CertIcon } from "@/lib/cert-icons";
import toast from "react-hot-toast";

function getSteps(t: ReturnType<typeof useTranslations>) {
  return [
    { id: 1, label: t("stepRequirements"),  doneLabel: t("stepRequirementsDone") },
    { id: 2, label: t("stepPayExam"),       doneLabel: t("stepPayExamDone") },
    { id: 3, label: t("stepApproval"),      doneLabel: t("stepApprovalDone") },
    { id: 4, label: t("stepScheduleExam"),  doneLabel: t("stepScheduleExamDone") },
  ];
}

function getStatusLabels(t: ReturnType<typeof useTranslations>): Record<string, string> {
  return {
    pending_payment:   t("statusApplicationSubmitted"),
    payment_submitted: t("statusPaymentProcessing"),
    pending_review:    t("statusUnderReview"),
    approved:          t("statusApproved"),
    rejected:          t("statusNotApproved"),
    withdrawn:         t("statusWithdrawn"),
  };
}

// badgeKind drives color/comparison logic so it stays language-independent;
// `badge` is the display string shown to the user.
function getProgress(application: any, enrollment: any, t: ReturnType<typeof useTranslations>) {
  // Enrollment always wins — unless suspended (admin revoked/set back to pending)
  if (enrollment && enrollment.status !== "suspended") {
    const isCompleted = enrollment.status === "completed";
    return {
      step: isCompleted ? 4 : 3,
      badgeKind: isCompleted ? "completed" : "enrolled",
      badge: isCompleted ? t("badgeCompleted") : t("badgeEnrolled"),
      title: isCompleted ? t("titleCompleted") : t("titleEnrolled"),
      subtitle: isCompleted ? t("subtitleCompleted") : t("subtitleEnrolled"),
    };
  }

  // Paused, not abandoned — most commonly because an organization removed
  // this person from its roster. Nothing was deleted (progress, exam
  // attempts, etc. are all still there), access is just on hold until they
  // pay to continue on their own or get re-invited by an org.
  if (enrollment && enrollment.status === "suspended") {
    return {
      step: 3,
      badgeKind: "accessPaused",
      badge: t("badgeAccessPaused"),
      title: t("titleAccessPaused"),
      subtitle: t("subtitleAccessPausedBase", {
        progressNote: enrollment.progress_percentage ? t("progressCompleteNote", { percentage: enrollment.progress_percentage }) : "",
      }),
      suspended: true,
    };
  }

  if (!application) {
    return {
      step: 0,
      badgeKind: "notStarted",
      badge: t("badgeNotStarted"),
      title: t("titleNotStarted"),
      subtitle: t("subtitleNotStarted"),
    };
  }

  const status = application.status;

  if (status === "rejected") return {
    step: 0,
    badgeKind: "notApproved",
    badge: t("statusNotApproved"),
    title: t("titleNotApproved"),
    subtitle: application.rejection_reason || t("subtitleNotApprovedFallback"),
  };
  if (status === "pending_payment") return {
    step: 1,
    badgeKind: "applicationInProgress",
    badge: t("badgeApplicationInProgress"),
    title: t("titleApplicationReceived"),
    subtitle: t("subtitleApplicationReceived", { date: new Date(application.created_at).toLocaleDateString("en-CA", { dateStyle: "long" }) }),
  };
  if (status === "payment_submitted") return {
    step: 1,
    badgeKind: "paymentProcessing",
    badge: t("statusPaymentProcessing"),
    title: t("titlePaymentAwaitingConfirmation"),
    subtitle: t("subtitlePaymentAwaitingConfirmation"),
    paymentPending: true,
  };
  if (status === "pending_review") return {
    step: 2,
    badgeKind: "approvalPending",
    badge: t("badgeApprovalPending"),
    title: t("titlePaymentVerified"),
    subtitle: t("subtitlePaymentVerified"),
  };
  return {
    step: 3,
    badgeKind: "approved",
    badge: t("statusApproved"),
    title: t("titleApproved"),
    subtitle: t("subtitleApproved"),
  };
}

/* ── Step progress bar ───────────────────────────────────────────────── */
function StepBar({
  currentStep, docsRequested, certId, isEnrolled, hasBooking, paymentPending, onStepClick, hasApplication,
}: {
  currentStep: number;
  docsRequested: boolean;
  certId: string;
  isEnrolled: boolean;
  hasBooking: boolean;
  paymentPending?: boolean;
  onStepClick?: (stepId: number) => void;
  hasApplication?: boolean;
}) {
  const t = useTranslations("CertificateDetail");
  const STEPS = getSteps(t);
  return (
    <div className="flex items-center w-full mt-8">
      {STEPS.map((step, i) => {
        const done              = currentStep >= step.id;
        const active            = currentStep > 0 && currentStep === step.id - 1;
        const needsAction       = docsRequested && step.id === 3 && !done;
        const isScheduleStep    = step.id === 4;
        const isPaymentStep     = step.id === 2;
        const examBooked        = isScheduleStep && hasBooking && !done;
        const scheduleClickable = isScheduleStep && isEnrolled && !hasBooking && !done;
        const paymentSubmitted  = isPaymentStep && paymentPending && !done;

        const isVerificationStep = step.id === 3;
        const waitingForAdmin    = isVerificationStep && active;

        // Step 1 only clickable when there's an application to show
        // Step 2 only clickable when there's meaningful content (application or going to pay)
        const step1Clickable = step.id === 1 && currentStep >= 1 && !!onStepClick && !!hasApplication;
        const step2Clickable = step.id === 2 && currentStep >= 1 && !!onStepClick && (!!hasApplication || (!isEnrolled && currentStep <= 1));

        const label = examBooked
          ? t("examScheduled")
          : paymentSubmitted
          ? t("paymentProcessed")
          : waitingForAdmin
          ? t("badgeApprovalPending")
          : done
          ? step.doneLabel
          : step.label;

        const circle = (
          <div className={cn(
            "rounded-full border-2 flex items-center justify-center text-sm font-bold transition-all",
            needsAction
              ? "w-11 h-11 bg-red-500 text-white border-red-400 shadow-lg shadow-red-900/40 animate-pulse"
            : done || examBooked
              ? "w-9 h-9 bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-900/30"
            : paymentSubmitted
              ? "w-9 h-9 bg-amber-400 text-white border-amber-300 shadow-md shadow-amber-900/30"
            : waitingForAdmin
              ? "w-9 h-9 bg-amber-400 text-white border-amber-300 shadow-md shadow-amber-900/30"
            : active || scheduleClickable
              ? "w-9 h-9 bg-red-500 text-white border-red-400 shadow-md shadow-red-900/40"
              : "w-9 h-9 bg-ink-800/70 text-red-300/60 border-red-500/25"
          )}>
            {done || examBooked ? <CheckCircle2 size={18} className="text-white" />
            : needsAction       ? <AlertTriangle size={16} />
            : step.id}
          </div>
        );

        const labelEl = (
          <span className={cn(
            "text-[11px] font-semibold whitespace-nowrap text-center",
            needsAction                    ? "text-red-300 font-bold"
            : done || examBooked           ? "text-emerald-300"
            : paymentSubmitted             ? "text-amber-300"
            : waitingForAdmin              ? "text-amber-300"
            : active                       ? "text-red-300"
                                           : "text-red-400/50"
          )}>
            {label}
            {needsAction       && <span className="block text-[9px] text-red-400 text-center">{t("actionNeeded")}</span>}
            {scheduleClickable && <span className="block text-[9px] text-red-400 text-center">{t("clickToBook")}</span>}
            {paymentSubmitted  && <span className="block text-[9px] text-amber-300 text-center">{t("awaitingVerification")}</span>}
            {waitingForAdmin   && <span className="block text-[9px] text-amber-400 text-center">{t("awaitingApproval")}</span>}
            {step1Clickable && !waitingForAdmin && done && <span className="block text-[9px] text-emerald-400/70 text-center">{t("clickToView")}</span>}
            {step2Clickable && !paymentSubmitted && !done && active && <span className="block text-[9px] text-red-400 text-center">{t("clickToPay")}</span>}
          </span>
        );

        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
              {step1Clickable || step2Clickable ? (
                <button
                  onClick={() => onStepClick?.(step.id)}
                  className="flex flex-col items-center gap-1.5 group hover:opacity-75 transition-opacity cursor-pointer"
                >
                  {circle}
                  {labelEl}
                </button>
              ) : (scheduleClickable || examBooked) ? (
                <a href="#schedule" className="flex flex-col items-center gap-1.5 group">
                  {circle}
                  {labelEl}
                </a>
              ) : (
                <>
                  {circle}
                  {labelEl}
                </>
              )}
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn(
                "flex-1 h-0.5 mx-3 mb-4",
                done || examBooked ? "bg-emerald-500" : "bg-white/10"
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Application detail drawer ───────────────────────────────────────── */
function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === "") return null;
  return (
    <div className="flex gap-3 text-sm">
      <span className="text-slate-400 w-36 flex-shrink-0 text-xs mt-0.5">{label}</span>
      <span className="text-slate-800 font-medium">{String(value)}</span>
    </div>
  );
}

function SectionHead({ icon: Icon, title }: { icon: any; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon size={13} className="text-slate-400" />
      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</span>
    </div>
  );
}

function ApplicationDrawer({ app, onClose, onWithdraw }: { app: any; onClose: () => void; onWithdraw: () => void }) {
  const t = useTranslations("CertificateDetail");
  const STATUS_LABELS = getStatusLabels(t);
  const statusColor: Record<string, string> = {
    pending_payment:   "bg-blue-50 text-blue-700",
    payment_submitted: "bg-amber-50 text-amber-700",
    pending_review:    "bg-purple-50 text-purple-700",
    approved:          "bg-emerald-50 text-emerald-700",
    rejected:          "bg-red-50 text-red-700",
    withdrawn:         "bg-slate-100 text-slate-500",
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-white shadow-2xl flex flex-col h-full overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="font-display font-black text-navy-900 text-base">{t("applicationDetails")}</h2>
            <p className="text-xs text-slate-400">{t("submittedOn", { date: new Date(app.created_at).toLocaleDateString("en-CA", { dateStyle: "long" }) })}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 px-6 py-5 space-y-6">
          {/* Status + cert */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="badge bg-ink-100 text-ink-700 font-bold">
              {app.certification?.acronym ?? "—"}
            </span>
            <span className={cn("badge", statusColor[app.status] ?? "bg-slate-100 text-slate-600")}>
              {STATUS_LABELS[app.status] ?? app.status}
            </span>
          </div>

          {/* Personal */}
          <div>
            <SectionHead icon={User} title={t("personalInformation")} />
            <div className="space-y-2 pl-5">
              <DetailRow label={t("fullName")}     value={app.full_name} />
              <DetailRow label={t("email")}        value={app.email} />
              <DetailRow label={t("phone")}        value={app.phone} />
              <DetailRow label={t("dateOfBirth")}  value={app.date_of_birth ? new Date(app.date_of_birth).toLocaleDateString("en-CA", { dateStyle: "long" }) : null} />
              <DetailRow label={t("gender")}       value={app.gender} />
              <DetailRow label={t("country")}      value={app.country} />
            </div>
          </div>

          {/* Professional */}
          <div>
            <SectionHead icon={Briefcase} title={t("professionalBackground")} />
            <div className="space-y-2 pl-5">
              <DetailRow label={t("careerStatus")}     value={app.career_status?.replace(/_/g, " ")} />
              <DetailRow label={t("jobTitle")}         value={app.job_title} />
              <DetailRow label={t("company")}          value={app.company} />
              <DetailRow label={t("yearsExperience")}  value={app.years_experience != null ? t("yearsExperienceValue", { count: app.years_experience }) : null} />
              <DetailRow label={t("linkedin")}         value={app.linkedin_url} />
            </div>
          </div>

          {/* Education */}
          <div>
            <SectionHead icon={GraduationCap} title={t("education")} />
            <div className="space-y-2 pl-5">
              <DetailRow label={t("university")}      value={app.university} />
              <DetailRow label={t("degree")}          value={app.degree_program} />
              <DetailRow label={t("graduationYear")}  value={app.graduation_year} />
            </div>
          </div>

          {/* Motivation */}
          {app.motivation && (
            <div>
              <SectionHead icon={MessageSquare} title={t("motivation")} />
              <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-xl p-4 pl-5">
                {app.motivation}
              </p>
            </div>
          )}

          {/* How heard */}
          {app.how_heard && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{t("howTheyHeard")}</p>
              <p className="text-sm text-slate-600 pl-5">{app.how_heard}</p>
            </div>
          )}

          {/* Payment info — shown when a payment was submitted */}
          {(app.payment_status === "succeeded" || app.status === "payment_submitted") && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-2.5">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t("payment")}</p>
              </div>
              <div className="px-4 py-3 space-y-2">
                <DetailRow
                  label={t("amount")}
                  value={app.amount_paid !== null && app.amount_paid !== undefined
                    ? (Number(app.amount_paid) === 0 ? t("freePromo") : `$${Number(app.amount_paid).toFixed(2)}`)
                    : undefined}
                />
                {app.promo_code && <DetailRow label={t("promoCode")} value={app.promo_code} />}
                <DetailRow
                  label={t("paidOn")}
                  value={app.paid_at ? new Date(app.paid_at).toLocaleDateString("en-CA", { dateStyle: "long" }) : undefined}
                />
                <DetailRow
                  label={t("status")}
                  value={app.status === "payment_submitted" ? t("paymentProcessingConfirmation") : t("confirmed")}
                />
              </div>
            </div>
          )}

          {/* Rejection reason */}
          {app.rejection_reason && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-xs font-bold text-red-500 uppercase tracking-wider mb-1">{t("rejectionReason")}</p>
              <p className="text-sm text-red-700">{app.rejection_reason}</p>
            </div>
          )}

          {/* Submitted documents */}
          {Array.isArray(app.documents) && app.documents.length > 0 && (
            <div>
              <SectionHead icon={FileText} title={t("submittedDocuments")} />
              <div className="space-y-2 pl-5">
                {app.documents.map((doc: any) => (
                  <div key={doc.id} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <FileText size={13} className="text-slate-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-navy-900 truncate">{doc.file_name}</p>
                      {doc.file_size && <p className="text-[10px] text-slate-400">{(doc.file_size / 1024).toFixed(0)} KB</p>}
                    </div>
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-navy-600 hover:underline font-semibold flex-shrink-0">
                      {t("view")}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Withdraw — only available before any payment is made */}
          {app.status === "pending_payment" && (
            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={onWithdraw}
                className="w-full py-2.5 text-sm font-semibold text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
              >
                {t("withdrawApplication")}
              </button>
              <p className="text-[10px] text-slate-400 text-center mt-2">
                {t("withdrawHint")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Document upload section ─────────────────────────────────────────── */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

function DocumentUploadSection({
  applicationId,
  message,
  existingDocs,
  token,
  onUploaded,
}: {
  applicationId: string;
  message?: string | null;
  existingDocs: any[];
  token: string;
  onUploaded: () => void;
}) {
  const fileRef   = useRef<HTMLInputElement>(null);
  const [uploading,  setUploading]  = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const t = useTranslations("CertificateDetail");

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    let anyUploaded = false;
    for (const file of Array.from(files)) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch(`${API_BASE}/uploads/document?purpose=application_document`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message ?? `Upload failed (${res.status})`);
        }
        const json = await res.json();
        const { file_url, s3_key, file_name, mime_type, file_size } = json.data ?? json;

        await api.post(`/applications/${applicationId}/documents`, {
          file_url,
          s3_key,
          file_name: file_name ?? file.name,
          mime_type: mime_type ?? file.type ?? undefined,
          file_size: file_size ?? file.size,
        }, token);

        anyUploaded = true;
      } catch (err: any) {
        toast.error(t("toastUploadFailed", { name: file.name, error: err.message ?? "unknown error" }));
      }
    }
    setUploading(false);
    if (anyUploaded) { toast.success(t("toastDocumentsUploaded")); onUploaded(); }
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await api.post(`/applications/${applicationId}/submit-documents`, {}, token);
      toast.success(t("toastDocumentsSubmitted"));
      onUploaded();
    } catch (err: any) {
      toast.error(err.message ?? t("toastDocumentsSubmitFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-red-50 border-2 border-red-200 rounded-2xl overflow-hidden mb-8">
      {/* Header */}
      <div className="bg-red-100 px-6 py-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
          <AlertTriangle size={16} className="text-white" />
        </div>
        <div>
          <p className="font-display font-black text-red-900 text-sm">{t("supportingDocsRequired")}</p>
          <p className="text-xs text-red-700">{t("supportingDocsBody")}</p>
        </div>
      </div>

      <div className="px-6 py-5 space-y-4">
        {/* Admin message */}
        {message && (
          <div className="bg-white border border-red-200 rounded-xl p-4">
            <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-1">{t("messageFromAdmissions")}</p>
            <p className="text-sm text-slate-700 leading-relaxed">{message}</p>
          </div>
        )}

        {/* Already uploaded */}
        {existingDocs.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t("uploadedCount", { count: existingDocs.length })}</p>
            {existingDocs.map((doc: any) => (
              <div key={doc.id} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl">
                <FileText size={14} className="text-slate-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-navy-900 truncate">{doc.file_name}</p>
                  {doc.file_size && <p className="text-[10px] text-slate-400">{(doc.file_size / 1024).toFixed(0)} KB</p>}
                </div>
                <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-navy-600 hover:underline font-semibold flex-shrink-0">
                  {t("view")}
                </a>
              </div>
            ))}
          </div>
        )}

        {/* Upload area */}
        <div
          className="border-2 border-dashed border-red-200 rounded-xl p-6 text-center cursor-pointer hover:border-red-400 hover:bg-red-50/50 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          {uploading ? (
            <div className="flex items-center justify-center gap-2 text-red-600">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm font-semibold">{t("uploading")}</span>
            </div>
          ) : (
            <>
              <Upload size={24} className="text-red-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-red-800">{t("clickToUploadDocuments")}</p>
              <p className="text-xs text-red-500 mt-1">{t("uploadHint")}</p>
            </>
          )}
        </div>

        {/* Submit button — only shown when at least one doc is uploaded */}
        {existingDocs.length > 0 && (
          <button
            onClick={handleSubmit}
            disabled={submitting || uploading}
            className="w-full py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? <><Loader2 size={16} className="animate-spin" /> {t("submitting")}</> : t("submitDocuments")}
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Prep course card ────────────────────────────────────────────────── */
function PrepCourseCard({ course }: { course: any }) {
  const price = Number(course.price);
  const t = useTranslations("CertificateDetail");
  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow">
      <div className="relative h-44 bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden flex-shrink-0">
        {course.thumbnail_url ? (
          <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <BookOpen size={40} className="text-slate-300" />
          </div>
        )}
        {course.level && (
          <div className="absolute top-3 left-3">
            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-white/90 text-slate-700 border border-slate-200 capitalize">
              {course.level}
            </span>
          </div>
        )}
      </div>
      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-display font-bold text-navy-900 text-base leading-snug mb-2">{course.title}</h3>
        {course.description && (
          <p className="text-sm text-slate-500 leading-relaxed flex-1 line-clamp-3 mb-4">{course.description}</p>
        )}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <span className="font-black text-navy-900 text-sm">
            {price === 0 ? t("free") : `$${price.toFixed(2)}`}
          </span>
          <Link
            href={`/tools/course/${course.slug}`}
            className="inline-flex items-center gap-1.5 bg-navy-900 hover:bg-navy-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            {t("learnMore")} <ChevronRight size={12} />
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ── Exam scheduling helpers ─────────────────────────────────────────── */
function fmtFull(iso: string) {
  return new Date(iso).toLocaleString("en-CA", { dateStyle: "full", timeStyle: "short" });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", { dateStyle: "long" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-CA", { timeStyle: "short" });
}

function useCountdown(targetIso: string | null, serverOffsetMs: number) {
  const [remaining, setRemaining] = useState<number | null>(null);
  useEffect(() => {
    if (!targetIso) { setRemaining(null); return; }
    const tick = () => {
      const serverNow = Date.now() + serverOffsetMs;
      const diff = new Date(targetIso).getTime() - serverNow;
      setRemaining(diff > 0 ? diff : 0);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetIso, serverOffsetMs]);
  return remaining;
}

function fmtCountdown(ms: number) {
  const s = Math.floor(ms / 1000);
  return { days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60 };
}

function BookingPanel({ booking, serverOffsetMs, onStartExam, starting, onCancel, cancelling, latestAttempt, certSlug, certId: bpCertId, enrollmentId, token }: {
  booking: any; serverOffsetMs: number; onStartExam: () => void; starting: boolean;
  onCancel: () => void; cancelling: boolean;
  latestAttempt: any | null; certSlug?: string; certId: string;
  enrollmentId?: string | null; token?: string | null;
}) {
  const t = useTranslations("CertificateDetail");
  const session = booking.exam_session;
  const unlockAt = new Date(new Date(session.scheduled_at).getTime() - 3 * 60 * 1000).toISOString();
  const remaining = useCountdown(session.scheduled_at, serverOffsetMs);
  const unlockRemaining = useCountdown(unlockAt, serverOffsetMs);
  const isUnlocked = unlockRemaining !== null && unlockRemaining <= 0;
  const { days, hours, minutes, seconds } = fmtCountdown(remaining ?? 0);
  const isOver = remaining !== null && remaining <= 0;

  const attemptStatus = latestAttempt?.status ?? null;
  const examPassed = latestAttempt?.passed === true;
  const examFailed = attemptStatus === "failed" && !examPassed;
  const examInProgress = attemptStatus === "in_progress";

  const { data: retakeData } = useSWR(
    token && enrollmentId && examFailed ? [`/exams/enrollments/${enrollmentId}/retake-status`, token] : null,
    ([url, t]) => api.get<any>(url, t),
  );
  const retakeStatus: any = retakeData?.data ?? retakeData ?? null;
  const [purchasingRetake, setPurchasingRetake] = useState(false);

  async function handlePurchaseRetake() {
    if (!token || !enrollmentId) return;
    setPurchasingRetake(true);
    try {
      const res = await api.post<any>("/payments/retake-checkout", { enrollment_id: enrollmentId }, token);
      const url = res?.data?.checkout_url ?? res?.checkout_url;
      if (url) window.location.href = url;
      else toast.error(t("toastCheckoutFailed"));
    } catch (e: any) {
      toast.error(e?.message ?? t("toastRetakeCheckoutFailed"));
    } finally {
      setPurchasingRetake(false);
    }
  }

  return (
    <div className="bg-ink-900 rounded-2xl overflow-hidden">
      <div className="px-6 py-5 border-b border-white/10 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Check size={14} className="text-emerald-400" />
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">{t("examBooked")}</span>
          </div>
          <h3 className="text-base font-display font-black text-white">{session.title || t("examSessionFallback")}</h3>
          <p className="text-sm text-white/60 mt-0.5">{fmtFull(session.scheduled_at)}</p>
        </div>
        {!isOver && (
          <button
            onClick={onCancel}
            disabled={cancelling}
            className="text-xs text-white/40 hover:text-red-400 border border-white/10 hover:border-red-500/40 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
          >
            {cancelling ? <Loader2 size={11} className="animate-spin" /> : t("cancelBooking")}
          </button>
        )}
      </div>

      <div className="px-6 py-6">
        {/* ── Pre-exam: countdown ── */}
        {!isOver && (
          <>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-4">{t("timeUntilExam")}</p>
            <div className="grid grid-cols-4 gap-3 mb-6">
              {[{ val: days, label: t("days") }, { val: hours, label: t("hrs") }, { val: minutes, label: t("min") }, { val: seconds, label: t("sec") }].map(({ val, label }) => (
                <div key={label} className="text-center bg-white/8 rounded-xl py-3">
                  <div className="text-2xl font-black font-display text-teal-300 tabular-nums">{String(val).padStart(2, "0")}</div>
                  <div className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5">{label}</div>
                </div>
              ))}
            </div>
            <button
              disabled={!isUnlocked || starting}
              onClick={onStartExam}
              className={cn(
                "w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2",
                isUnlocked ? "bg-teal-500 hover:bg-teal-400 text-white" : "bg-white/5 text-white/25 cursor-not-allowed"
              )}
            >
              {starting ? <Loader2 size={15} className="animate-spin" /> : null}
              {isUnlocked ? t("enterExamRoom") : t("unlocksIn3Min")}
            </button>
            {session.meeting_link && isUnlocked && (
              <a href={session.meeting_link} target="_blank" rel="noreferrer"
                className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 border border-white/15 rounded-xl text-sm text-white/60 hover:text-white hover:border-white/30 transition-colors">
                <ExternalLink size={12} /> {t("openMeetingLink")}
              </a>
            )}
          </>
        )}

        {/* ── Post-exam: exam is ready / in-progress ── */}
        {isOver && !examPassed && !examFailed && (
          <div className="text-center space-y-4">
            {examInProgress ? (
              <>
                <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center mx-auto">
                  <Clock size={20} className="text-white" />
                </div>
                <div>
                  <p className="font-bold text-amber-300 text-sm">{t("pendingExamResults")}</p>
                  <p className="text-white/50 text-xs mt-1">{t("pendingExamResultsHint")}</p>
                </div>
                <button
                  onClick={onStartExam}
                  disabled={starting}
                  className="w-full py-3 bg-teal-500 hover:bg-teal-400 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {starting ? <Loader2 size={15} className="animate-spin" /> : null}
                  {t("returnToExamRoom")}
                </button>
              </>
            ) : (
              <>
                <div className="w-12 h-12 bg-teal-500 rounded-full flex items-center justify-center mx-auto">
                  <ExternalLink size={20} className="text-white" />
                </div>
                <p className="font-bold text-teal-300 text-sm">{t("examReady")}</p>
                <button
                  onClick={onStartExam}
                  disabled={starting}
                  className="w-full py-3 bg-teal-500 hover:bg-teal-400 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {starting ? <Loader2 size={15} className="animate-spin" /> : null}
                  {t("enterExamRoom")}
                </button>
              </>
            )}
          </div>
        )}

        {/* ── Post-exam: passed ── */}
        {isOver && examPassed && (
          <div className="text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-900/40">
              <Award size={24} className="text-white" />
            </div>
            <div>
              <p className="font-black text-emerald-300 text-base">{t("examPassed")}</p>
              <p className="text-white/50 text-xs mt-1">
                {t.rich("scorePercentage", { score: latestAttempt.score_percentage, b: (chunks) => <span className="text-emerald-300 font-semibold">{chunks}</span> })}
                {" · "}{t("correctAnswers", { correct: latestAttempt.correct_answers, total: latestAttempt.total_questions })}
              </p>
              <p className="text-white/40 text-xs mt-2">{t("certificateWillBeIssued")}</p>
            </div>
            <Link
              href={`/certificates/${bpCertId}`}
              className="flex items-center justify-center gap-2 w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm transition-colors"
            >
              <Award size={15} /> {t("viewCertificate")}
            </Link>
          </div>
        )}

        {/* ── Post-exam: failed ── */}
        {isOver && examFailed && (
          <div className="text-center space-y-4">
            <div className="w-14 h-14 bg-red-500/20 border-2 border-red-500/40 rounded-full flex items-center justify-center mx-auto">
              <X size={24} className="text-red-400" />
            </div>
            <div>
              <p className="font-black text-red-400 text-base">{t("notPassed")}</p>
              <p className="text-white/50 text-xs mt-1">
                Score: <span className="text-red-400 font-semibold">{latestAttempt.score_percentage}%</span>
                {" · "}{t("correctAnswers", { correct: latestAttempt.correct_answers, total: latestAttempt.total_questions })}
              </p>
              {retakeStatus?.exhausted ? (
                <p className="text-white/40 text-xs mt-2 leading-relaxed">
                  {t("retakesExhausted")}
                </p>
              ) : retakeStatus?.needs_payment ? (
                <p className="text-white/40 text-xs mt-2 leading-relaxed">
                  {t("retakeNeedsPayment", { fee: Number(retakeStatus.retake_fee).toFixed(2) })}
                </p>
              ) : (
                <p className="text-white/40 text-xs mt-2 leading-relaxed">
                  {t("retakeReady")}
                </p>
              )}
            </div>
            {retakeStatus?.exhausted ? (
              certSlug && (
                <Link
                  href={`/apply/${certSlug}`}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl font-bold text-sm transition-colors"
                >
                  {t("submitNewApplication")}
                </Link>
              )
            ) : retakeStatus?.needs_payment ? (
              <button
                onClick={handlePurchaseRetake}
                disabled={purchasingRetake}
                className="flex items-center justify-center gap-2 w-full py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-60"
              >
                {purchasingRetake ? <Loader2 size={15} className="animate-spin" /> : t("purchaseRetake", { fee: Number(retakeStatus.retake_fee).toFixed(2) })}
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function SessionCard({ session, isBooked, onBook, booking }: {
  session: any; isBooked: boolean; onBook: (id: string) => void; booking: boolean;
}) {
  const t = useTranslations("CertificateDetail");
  const booked = session._count?.bookings ?? 0;
  const full = session.max_seats != null && booked >= session.max_seats;
  const past = new Date(session.scheduled_at) <= new Date();

  return (
    <div className={cn("rounded-xl border-2 p-4 transition-all bg-white", isBooked ? "border-teal-400" : "border-slate-200 hover:border-slate-300")}>
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="font-semibold text-slate-800 text-sm">{session.title || t("examSessionFallback")}</span>
            {full && !past && <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-semibold rounded-full">{t("full")}</span>}
            {past && <span className="px-1.5 py-0.5 bg-slate-100 text-slate-400 text-[10px] font-semibold rounded-full">{t("past")}</span>}
          </div>
          <div className="space-y-1 text-xs text-slate-500">
            <div className="flex items-center gap-1.5"><CalendarDays size={11} className="text-slate-400" /> {fmtDate(session.scheduled_at)} at {fmtTime(session.scheduled_at)}</div>
            <div className="flex items-center gap-1.5"><Clock size={11} className="text-slate-400" /> {session.duration_minutes} minutes</div>
            <div className="flex items-center gap-1.5"><Users size={11} className="text-slate-400" />
              {session.max_seats == null ? t("registeredCount", { count: booked }) : t("seatsCount", { booked, max: session.max_seats })}
            </div>
            {session.notes && (
              <div className="flex items-start gap-1.5 mt-1"><Info size={11} className="text-slate-400 flex-shrink-0 mt-0.5" /><span className="leading-relaxed">{session.notes}</span></div>
            )}
          </div>
        </div>
        <button
          onClick={() => onBook(session.id)}
          disabled={booking || full || past}
          className="flex-shrink-0 px-4 py-2 text-sm font-bold bg-teal-500 text-white rounded-xl hover:bg-teal-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {booking ? <Loader2 size={13} className="animate-spin" /> : t("book")}
        </button>
      </div>
    </div>
  );
}

/* ── Certificate display ─────────────────────────────────────────────── */

function fmt(d: string | null | undefined) {
  if (!d) return "—";
  const date = new Date(d);
  return isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-CA", { dateStyle: "long" });
}

function renderTemplate(html: string, cert: any): string {
  const verifyUrl = cert.verification_url || `https://paii.ca/verify?id=${cert.certificate_number}`;
  const qrUrl     = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(verifyUrl)}`;

  return html
    .replace(/\{\{\s*STUDENT_NAME\s*\}\}/gi,    cert.holder_name ?? "")
    .replace(/\{\{\s*CERT_TITLE\s*\}\}/gi,       cert.certification_title ?? "")
    .replace(/\{\{\s*CERT_ACRONYM\s*\}\}/gi,     cert.certification_acronym ?? "")
    .replace(/\{\{\s*CERT_NUMBER\s*\}\}/gi,      cert.certificate_number ?? "")
    .replace(/\{\{\s*ISSUE_DATE\s*\}\}/gi,       fmt(cert.issued_at))
    .replace(/\{\{\s*EXPIRY_DATE\s*\}\}/gi,      fmt(cert.expires_at))
    .replace(/\{\{\s*EXAM_SCORE\s*\}\}/gi,       String(cert.exam_score ?? ""))
    .replace(/\{\{\s*VERIFICATION_URL\s*\}\}/gi, verifyUrl)
    .replace(/\{\{\s*QR_CODE_URL\s*\}\}/gi,      qrUrl);
}

function CertificateSection({ issuedCert }: { issuedCert: any }) {
  const [copied, setCopied] = useState(false);
  const t = useTranslations("CertificateDetail");

  const templateHtml: string | undefined =
    (issuedCert.certification?.marketing_meta as any)?.certificate_template_html;

  const verifyUrl = issuedCert.verification_url || `https://paii.ca/verify?id=${issuedCert.certificate_number}`;
  const rendered  = templateHtml ? renderTemplate(templateHtml, issuedCert) : null;

  function handleDownloadPdf() {
    if (!rendered) return;
    const win = window.open("", "_blank");
    if (!win) { toast.error(t("popupBlocked")); return; }
    win.document.write(rendered);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 300);
  }

  async function handleCopyLink() {
    await navigator.clipboard.writeText(verifyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function shareLinkedIn() {
    const url = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(verifyUrl)}&title=${encodeURIComponent(t("linkedinShareText", { acronym: issuedCert.certification_acronym }))}`;
    window.open(url, "_blank", "width=600,height=520");
  }

  function shareTwitter() {
    const text = t("twitterShareText", { acronym: issuedCert.certification_acronym, title: issuedCert.certification_title });
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(verifyUrl)}`, "_blank", "width=600,height=400");
  }

  return (
    <div className="max-w-5xl mx-auto px-6 lg:px-8 py-8">
      <h2 className="text-xl font-display font-black text-navy-900 flex items-center gap-2 mb-6">
        <Award size={20} className="text-gold-500" />
        {t("yourCertificate")}
      </h2>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Certificate render */}
        {rendered ? (
          <iframe
            srcDoc={rendered}
            className="w-full"
            style={{ height: "580px", border: "none" }}
            title="Certificate"
            sandbox="allow-same-origin allow-scripts"
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
            <Award size={48} className="text-slate-200 mb-4" />
            <h3 className="font-display font-bold text-navy-900 mb-2">{t("certificateDesignComingSoon")}</h3>
            <p className="text-slate-400 text-sm max-w-sm mb-6">
              {t("certificateDesignComingSoonBody")}
            </p>
            <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 text-left w-full max-w-sm space-y-2 mb-4">
              <p className="text-xs text-slate-500"><span className="font-semibold text-slate-700">{t("holder")}</span> {issuedCert.holder_name}</p>
              <p className="text-xs text-slate-500"><span className="font-semibold text-slate-700">{t("certificationLabel")}</span> {issuedCert.certification_title}</p>
              <p className="text-xs text-slate-500"><span className="font-semibold text-slate-700">{t("certificateNo")}</span> {issuedCert.certificate_number}</p>
              <p className="text-xs text-slate-500"><span className="font-semibold text-slate-700">{t("issued")}</span> {fmt(issuedCert.issued_at)}</p>
              <p className="text-xs text-slate-500"><span className="font-semibold text-slate-700">{t("validUntilLabel")}</span> {fmt(issuedCert.expires_at)}</p>
            </div>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(verifyUrl)}`}
              alt="QR code"
              width={120}
              height={120}
              className="rounded-xl border border-slate-200"
            />
            <p className="text-[10px] text-slate-400 mt-2">{t("scanToVerify")}</p>
          </div>
        )}

        {/* Action bar */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center gap-2 flex-wrap">
          <p className="text-xs text-slate-500 mr-auto">
            {t("validUntil")}{" "}
            <span className={cn(
              "font-semibold",
              issuedCert.status === "lapsed" || issuedCert.status === "expired" ? "text-red-600" :
              new Date(issuedCert.expires_at).getTime() - Date.now() < 90 * 24 * 60 * 60 * 1000 ? "text-amber-600" :
              "text-slate-700",
            )}>{fmt(issuedCert.expires_at)}</span>
          </p>

          <Link href={verifyUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:border-navy-300 hover:text-navy-700 transition-colors">
            <Shield size={12} /> {t("verify")}
          </Link>

          {rendered && (
            <button onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:border-navy-300 hover:text-navy-700 transition-colors">
              <Download size={12} /> {t("downloadPdf")}
            </button>
          )}

          <button onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:border-navy-300 hover:text-navy-700 transition-colors">
            {copied ? <Check size={12} className="text-emerald-500" /> : <Link2 size={12} />}
            {copied ? t("copied") : t("copyLink")}
          </button>

          <button onClick={shareLinkedIn}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0A66C2] text-white text-xs font-semibold hover:bg-[#004182] transition-colors">
            <Linkedin size={12} /> {t("linkedin")}
          </button>

          <button onClick={shareTwitter}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black text-white text-xs font-semibold hover:bg-neutral-800 transition-colors">
            <Twitter size={12} /> {t("share")}
          </button>
        </div>
      </div>
    </div>
  );
}

const EXTERNAL_PDU_STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border border-amber-100",
  approved: "bg-emerald-50 text-emerald-700 border border-emerald-100",
  rejected: "bg-red-50 text-red-600 border border-red-100",
};

/* ── External PDU submission form ────────────────────────────────────── */
function ExternalPduForm({ certificateId, token, onSubmitted, onCancel }: {
  certificateId: string; token: string; onSubmitted: () => void; onCancel: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const t = useTranslations("CertificateDetail");
  const [title, setTitle] = useState("");
  const [provider, setProvider] = useState("");
  const [description, setDescription] = useState("");
  const [activityDate, setActivityDate] = useState("");
  const [requestedValue, setRequestedValue] = useState("");
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [proofName, setProofName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleFile(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_BASE}/uploads/document?purpose=pdu_proof`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? `Upload failed (${res.status})`);
      }
      const json = await res.json();
      const { file_url, file_name } = json.data ?? json;
      setProofUrl(file_url);
      setProofName(file_name ?? file.name);
    } catch (err: any) {
      toast.error(t("toastUploadFailed", { name: file.name, error: err.message ?? "unknown error" }));
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    if (!title.trim()) return toast.error(t("toastTitleRequired"));
    if (!activityDate) return toast.error(t("toastActivityDateRequired"));
    setSubmitting(true);
    try {
      await api.post(`/certificates/${certificateId}/external-pdus`, {
        title: title.trim(),
        provider: provider.trim() || undefined,
        description: description.trim() || undefined,
        activity_date: activityDate,
        proof_url: proofUrl ?? undefined,
        requested_pdu_value: requestedValue ? Number(requestedValue) : undefined,
      }, token);
      toast.success(t("toastSubmittedForReview"));
      onSubmitted();
    } catch (e: any) {
      toast.error(e?.message ?? t("toastSubmitFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3 mb-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] font-semibold text-slate-500 mb-1 block">{t("activityTitleLabel")}</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("activityTitlePlaceholder")}
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white" />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-slate-500 mb-1 block">{t("providerLabel")}</label>
          <input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder={t("providerPlaceholder")}
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white" />
        </div>
      </div>
      <div>
        <label className="text-[11px] font-semibold text-slate-500 mb-1 block">{t("descriptionLabel")}</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
          placeholder={t("descriptionPlaceholder")}
          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white resize-none" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] font-semibold text-slate-500 mb-1 block">{t("dateCompletedLabel")}</label>
          <input type="date" value={activityDate} onChange={(e) => setActivityDate(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white" />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-slate-500 mb-1 block">{t("suggestedPduLabel")}</label>
          <input type="number" min={0} step={0.5} value={requestedValue} onChange={(e) => setRequestedValue(e.target.value)}
            placeholder={t("suggestedPduPlaceholder")}
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white" />
        </div>
      </div>
      <div>
        <label className="text-[11px] font-semibold text-slate-500 mb-1 block">{t("proofLabel")}</label>
        <input ref={fileRef} type="file" className="hidden" onChange={(e) => handleFile(e.target.files)} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2 border border-dashed border-slate-300 rounded-lg py-2.5 text-xs font-semibold text-slate-500 hover:border-teal-400 hover:text-teal-600 transition-colors disabled:opacity-50"
        >
          {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
          {proofName ? proofName : uploading ? t("uploading") : t("attachFile")}
        </button>
      </div>
      <div className="flex items-center justify-end gap-2 pt-1">
        <button onClick={onCancel} className="text-xs font-semibold text-slate-500 hover:text-slate-700 px-3 py-2">
          {t("cancel")}
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting || uploading}
          className="inline-flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          {submitting ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
          {t("submitForReview")}
        </button>
      </div>
    </div>
  );
}

/* ── Renewal ──────────────────────────────────────────────────────────── */
function RenewalSection({ certificateId, token }: { certificateId: string; token: string }) {
  const { data, mutate } = useSWR(
    token ? [`/certificates/${certificateId}/renewal-progress`, token] : null,
    ([url, t]) => api.get<any>(url, t),
    { revalidateOnFocus: true },
  );
  const t = useTranslations("CertificateDetail");
  const [renewing, setRenewing] = useState(false);
  const [showExternalForm, setShowExternalForm] = useState(false);

  const progress: any = data?.data ?? data ?? null;
  if (!progress || progress.pdu_required <= 0) return null;

  const pduPct = Math.min(100, Math.round((progress.pdu_earned / progress.pdu_required) * 100));
  const isLapsed = progress.status === "lapsed";

  async function handleRenew() {
    if (!token) return;
    setRenewing(true);
    try {
      const res = await api.post<any>("/payments/renewal-checkout", { certificate_id: certificateId }, token);
      const url = res?.data?.checkout_url ?? res?.checkout_url;
      if (url) window.location.href = url;
      else toast.error(t("toastCheckoutFailed"));
    } catch (e: any) {
      toast.error(e?.message ?? t("toastRenewalCheckoutFailed"));
    } finally {
      setRenewing(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 lg:px-8 pt-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h2 className="text-lg font-display font-black text-navy-900 flex items-center gap-2">
            <RefreshCw size={18} className="text-teal-500" /> {t("certificateRenewal")}
          </h2>
          {!isLapsed && (
            <span className="text-xs font-semibold text-slate-500">
              {t("pduEarnedCount", { earned: progress.pdu_earned, required: progress.pdu_required })}
            </span>
          )}
        </div>

        {isLapsed ? (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            <p className="text-sm text-red-700">
              {t("renewalWindowClosed")} <Link href="/contact" className="underline font-semibold">{t("contactUs")}</Link>{t("aboutReapplying")}
            </p>
          </div>
        ) : (
          <>
            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden mb-4">
              <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${pduPct}%` }} />
            </div>

            {progress.courses?.length > 0 && (
              <div className="space-y-2 mb-5">
                {progress.courses.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      {c.completed
                        ? <CheckCircle2 size={14} className="text-teal-500 flex-shrink-0" />
                        : <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-200 flex-shrink-0" />}
                      <span className={cn("truncate", c.completed ? "text-slate-700" : "text-slate-400")}>{c.title}</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-400 flex-shrink-0 ml-2">{c.pdu_value} {Number(c.pdu_value) !== 1 ? t("pduPlural") : t("pduSingular")}</span>
                  </div>
                ))}
              </div>
            )}

            {/* External PDU submissions */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{t("externalPduCredits")}</p>
                {!showExternalForm && (
                  <button
                    onClick={() => setShowExternalForm(true)}
                    className="text-xs font-semibold text-teal-600 hover:text-teal-800"
                  >
                    {t("submitExternalPdu")}
                  </button>
                )}
              </div>

              {showExternalForm && (
                <ExternalPduForm
                  certificateId={certificateId}
                  token={token}
                  onCancel={() => setShowExternalForm(false)}
                  onSubmitted={() => { setShowExternalForm(false); mutate(); }}
                />
              )}

              {progress.external_pdus?.length > 0 ? (
                <div className="space-y-2">
                  {progress.external_pdus.map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-50 last:border-0">
                      <div className="min-w-0">
                        <p className="text-slate-700 truncate">{s.title}</p>
                        {s.status === "rejected" && s.rejection_reason && (
                          <p className="text-[11px] text-red-500 mt-0.5">{s.rejection_reason}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        {s.status === "approved" && (
                          <span className="text-xs font-semibold text-slate-400">
                            {Number(s.awarded_pdu_value)} {Number(s.awarded_pdu_value) !== 1 ? t("pduPlural") : t("pduSingular")}
                          </span>
                        )}
                        <span className={cn("badge text-[10px]", EXTERNAL_PDU_STATUS_STYLE[s.status])}>{s.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : !showExternalForm && (
                <p className="text-xs text-slate-400">
                  {t("externalPduHint")}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
              <p className="text-xs text-slate-400">
                {progress.eligible
                  ? t("renewalFee", { fee: Number(progress.fee).toFixed(2) })
                  : progress.pdu_earned < progress.pdu_required
                    ? t("completeMorePdus", { count: progress.pdu_required - progress.pdu_earned })
                    : t("renewalOpensOn", { date: fmt(progress.window_opens_at) })}
              </p>
              <button
                onClick={handleRenew}
                disabled={!progress.eligible || renewing}
                className="inline-flex items-center gap-1.5 bg-navy-900 hover:bg-navy-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {renewing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                {t("renewFor", { fee: Number(progress.fee).toFixed(2) })}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────── */
export default function CertDetailPage() {
  const { certId } = useParams<{ certId: string }>();
  const token      = useAuthStore((s) => s.accessToken);
  const router     = useRouter();
  const t          = useTranslations("CertificateDetail");
  const [showApp,  setShowApp]  = useState(false);
  const [booking,  setBooking]  = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [starting, setStarting] = useState(false);
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const [reactivating, setReactivating] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/time`)
      .then((r) => r.json())
      .then((d) => {
        const serverTs: number = d?.data?.ts ?? d?.ts;
        if (serverTs) setServerOffsetMs(serverTs - Date.now());
      })
      .catch(() => {});
  }, []);

  const { data: enrollmentsData, mutate: refetchEnrollments, isValidating: enrollmentsLoading } = useSWR(
    token ? ["/enrollments/my", token] : null,
    ([url, t]) => api.get<any>(url, t),
    { refreshInterval: 7000, revalidateOnFocus: true },
  );

  const { data: appsData, mutate: refetchApps, isValidating: appsLoading } = useSWR(
    token ? ["/applications/my", token] : null,
    ([url, t]) => api.get<any>(url, t),
    { refreshInterval: 7000, revalidateOnFocus: true },
  );

  const { data: prepData } = useSWR(
    "/prep-courses",
    (url) => api.get<any>(url),
    { revalidateOnFocus: false },
  );

  const { data: certsData } = useSWR(
    token ? ["/certificates/my", token] : null,
    ([url, t]) => api.get<any>(url, t),
    { revalidateOnFocus: false },
  );

  // Compute enrollment presence before sessions SWR (avoids "before initialization" error)
  const isEnrolledHere = Array.isArray(enrollmentsData?.data) &&
    enrollmentsData.data.some((e: any) =>
      (e.certification?.id === certId || e.certification_id === certId) && e.status !== "suspended"
    );

  const { data: sessionsRaw, mutate: mutateSessions } = useSWR(
    token && isEnrolledHere ? [`/exam-sessions?certification_id=${certId}`, token] : null,
    ([url, t]) => api.get<any>(url, t),
    { revalidateOnFocus: true, refreshInterval: 60000 },
  );

  const enrollmentId = (Array.isArray(enrollmentsData?.data)
    ? enrollmentsData.data.find((e: any) => e.certification?.id === certId || e.certification_id === certId)
    : null)?.id ?? null;

  const { data: attemptsRaw } = useSWR(
    token && enrollmentId ? [`/exams/enrollments/${enrollmentId}/attempts`, token] : null,
    ([url, t]) => api.get<any>(url, t),
    { revalidateOnFocus: true, refreshInterval: 15000 },
  );
  const allAttempts: any[] = Array.isArray(attemptsRaw?.data) ? attemptsRaw.data : Array.isArray(attemptsRaw) ? attemptsRaw : [];
  const latestAttempt: any | null = allAttempts.length > 0 ? allAttempts[allAttempts.length - 1] : null;

  const enrollments: any[]   = Array.isArray(enrollmentsData?.data) ? enrollmentsData.data : [];
  const applications: any[]  = Array.isArray(appsData?.data) ? appsData.data : Array.isArray(appsData) ? appsData : [];
  const allPrep: any[]       = Array.isArray(prepData?.data) ? prepData.data : Array.isArray(prepData) ? prepData : [];

  const enrollment  = enrollments.find((e) => e.certification?.id === certId || e.certification_id === certId);
  const application = applications.find((a) => a.certification_id === certId);
  const cert        = enrollment?.certification ?? application?.certification ?? null;
  const prepCourses = allPrep.filter((c) => c.certification_id === certId);

  const allCerts: any[]  = Array.isArray(certsData?.data) ? certsData.data : Array.isArray(certsData) ? certsData : [];
  const issuedCert: any | null = allCerts.find((c) => c.certification_id === certId) ?? null;

  const sessionsPayload = sessionsRaw?.data ?? sessionsRaw;
  const sessions: any[] = Array.isArray(sessionsPayload?.sessions) ? sessionsPayload.sessions : [];
  const myBooking: any | null = sessionsPayload?.myBooking ?? null;
  const hasBooking = !!myBooking;

  async function handleReactivate() {
    if (!token || !enrollment?.id) return;
    setReactivating(true);
    try {
      const res = await api.post<any>("/payments/reactivation-checkout", { enrollment_id: enrollment.id }, token);
      const url = res?.data?.checkout_url ?? res?.checkout_url;
      if (url) window.location.href = url;
      else toast.error(t("toastCheckoutFailed"));
    } catch (e: any) {
      toast.error(e?.message ?? t("toastReactivationCheckoutFailed"));
    } finally {
      setReactivating(false);
    }
  }

  async function handleBook(sessionId: string) {
    if (!token) return;
    setBooking(true);
    try {
      await api.post(`/exam-sessions/${sessionId}/book`, {}, token);
      toast.success(t("toastExamBooked"));
      mutateSessions();
    } catch (e: any) {
      toast.error(e?.message ?? t("toastBookFailed"));
    } finally {
      setBooking(false);
    }
  }

  async function handleCancel() {
    if (!token || !myBooking) return;
    if (!confirm(t("confirmCancelBooking"))) return;
    setCancelling(true);
    try {
      await api.delete(`/exam-sessions/${myBooking.exam_session_id}/book`, token);
      toast.success(t("toastBookingCancelled"));
      mutateSessions();
    } catch (e: any) {
      toast.error(e?.message ?? t("toastCancelFailed"));
    } finally {
      setCancelling(false);
    }
  }

  async function handleStartExam() {
    if (!token || !myBooking) return;
    setStarting(true);
    try {
      const res = await api.post<any>(`/exam-sessions/bookings/${myBooking.id}/link`, {}, token);
      const { url } = res?.data ?? res;
      window.location.href = url;
    } catch (e: any) {
      toast.error(e?.message ?? t("toastEnterExamFailed"));
      setStarting(false);
    }
  }

  function handleStepClick(stepId: number) {
    if (stepId === 1) {
      if (application) setShowApp(true);
    } else if (stepId === 2) {
      if (application && application.status !== "pending_payment") {
        // Payment already processed — show drawer with payment details
        setShowApp(true);
      } else if (!enrollment || enrollment.status === "suspended") {
        // Not yet enrolled — navigate to payment page
        const slug = (cert as any)?.slug ?? application?.certification?.slug;
        if (slug) router.push(`/apply/${slug}`);
      }
      // If enrolled without application (cart flow), do nothing — step bar won't show as clickable anyway
    }
  }

  async function handleWithdraw() {
    if (!token || !application) return;
    if (!confirm(t("confirmWithdraw"))) return;
    try {
      await api.patch(`/applications/${application.id}/withdraw`, {}, token);
      toast.success(t("toastApplicationWithdrawn"));
      setShowApp(false);
      refetchApps();
    } catch (e: any) {
      toast.error(e?.message ?? t("toastWithdrawFailed"));
    }
  }

  // Documents requested by admin
  const docsRequested  = application?.documents_requested ?? false;
  const docsMessage    = application?.documents_request_message ?? null;
  const uploadedDocs   = Array.isArray(application?.documents) ? application.documents : [];

  // Enrich application with certification info for the drawer
  const appWithCert = application
    ? { ...application, certification: cert ?? application.certification }
    : null;

  // Neither SWR call has resolved for the first time yet — without this
  // guard, a slow connection would hit the "not found" branch below before
  // enrollment/application data ever arrives, showing a false error instead
  // of a loading state.
  if (enrollmentsData === undefined && appsData === undefined) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[40vh]">
        <Loader2 size={24} className="animate-spin text-slate-300" />
      </div>
    );
  }

  if (!cert && !application) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[40vh]">
        <div className="text-center">
          <p className="text-slate-400 text-sm">{t("notFoundOrNotEnrolled")}</p>
          <Link href="/certificates" className="text-navy-700 text-sm font-semibold mt-2 inline-block hover:underline">
            {t("backToCertifications")}
          </Link>
        </div>
      </div>
    );
  }

  const acronym   = cert?.acronym    ?? "—";
  const badgeIcon = cert?.badge_icon ?? "";

  const { step, badgeKind, badge, title: statusTitle, subtitle, paymentPending, suspended } = getProgress(application, enrollment, t) as any;

  const badgeColor =
    badgeKind === "approved" || badgeKind === "completed" || badgeKind === "enrolled"
      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
      : badgeKind === "notApproved"
      ? "bg-red-500/20 text-red-300 border-red-500/30"
      : badgeKind === "paymentProcessing" || badgeKind === "approvalPending" || badgeKind === "accessPaused"
      ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
      : badgeKind === "applicationInProgress"
      ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
      : "bg-ink-700/40 text-ink-200 border-ink-600/40";

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #171527 0%, #1f1d38 50%, #2d1b69 100%)" }}>
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-teal-400" />
          <div className="absolute bottom-0 left-1/3 w-64 h-64 rounded-full bg-ink-600" />
        </div>

        <div className="relative max-w-5xl mx-auto px-6 lg:px-8 py-10">
          {/* Top row */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <CertIcon iconKey={badgeIcon} size={26} className="text-white/90" />
              <div className="border-2 border-white/30 rounded-xl px-4 py-1.5">
                <span className="text-white font-black text-lg tracking-wide">{acronym}</span>
              </div>
            </div>
            <button
              onClick={() => { refetchEnrollments(); refetchApps(); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-colors text-sm"
            >
              <RefreshCw size={13} className={cn(appsLoading || enrollmentsLoading ? "animate-spin" : "")} /> {t("refresh")}
            </button>
          </div>

          {/* Status badge */}
          <div className="mb-4">
            <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border", badgeColor)}>
              <Clock size={11} /> {badge}
            </span>
          </div>

          {/* Title + CTA */}
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-display font-black text-white mb-2">{statusTitle}</h1>
              <p className="text-white/60 text-sm leading-relaxed max-w-xl">{subtitle}</p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {suspended && enrollment && (
                <button
                  onClick={handleReactivate}
                  disabled={reactivating}
                  className="flex items-center gap-2 px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-white font-semibold text-sm rounded-xl transition-colors disabled:opacity-60"
                >
                  {reactivating ? <Loader2 size={14} className="animate-spin" /> : null}
                  {reactivating ? t("startingCheckout") : cert?.price ? t("reactivateWithPrice", { price: Number(cert.price).toFixed(2) }) : t("reactivate")}
                </button>
              )}
              {application && (
                <button
                  onClick={() => setShowApp(true)}
                  className="px-5 py-2.5 bg-white/10 border border-white/20 text-white font-semibold text-sm rounded-xl hover:bg-white/20 transition-colors"
                >
                  {t("viewApplication")}
                </button>
              )}
              {enrollment && enrollment.status === "active" && (
                <a
                  href="#schedule"
                  className="flex items-center gap-2 px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-white font-semibold text-sm rounded-xl transition-colors"
                >
                  <CalendarDays size={14} />
                  {hasBooking ? t("viewBooking") : t("scheduleExam")}
                </a>
              )}
              {!application && cert?.slug && (
                <Link
                  href={`/apply/${cert.slug}`}
                  className="px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-white font-semibold text-sm rounded-xl transition-colors"
                >
                  {t("applyNow")}
                </Link>
              )}
            </div>
          </div>

          <StepBar currentStep={step} docsRequested={docsRequested} certId={certId} isEnrolled={isEnrolledHere} hasBooking={hasBooking} paymentPending={!!paymentPending} onStepClick={handleStepClick} hasApplication={!!application} />
        </div>
      </div>

      {/* ── Issued Certificate ───────────────────────────────────────────── */}
      {issuedCert?.status === "revoked" && (
        <div className="max-w-5xl mx-auto px-6 lg:px-8 pt-8">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 flex items-start gap-4">
            <AlertTriangle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800 text-sm">{t("certificateRevoked")}</p>
              <p className="text-red-700 text-xs mt-1">{t("certificateRevokedBody")}</p>
            </div>
          </div>
        </div>
      )}
      {issuedCert && issuedCert.status !== "revoked" && enrollment?.status === "completed" && (
        <CertificateSection issuedCert={issuedCert} />
      )}

      {/* ── Document Upload (when requested by admin) ────────────────────── */}
      {docsRequested && token && application && (
        <div className="max-w-5xl mx-auto px-6 lg:px-8 pt-8">
          <DocumentUploadSection
            applicationId={application.id}
            message={docsMessage}
            existingDocs={uploadedDocs}
            token={token}
            onUploaded={() => refetchApps()}
          />
        </div>
      )}

      {/* ── Exam Scheduling ──────────────────────────────────────────────── */}
      {enrollment && enrollment.status === "active" && (
        <div id="schedule" className="max-w-5xl mx-auto px-6 lg:px-8 py-8">
          <h2 className="text-xl font-display font-black text-ink-900 flex items-center gap-2 mb-5">
            <CalendarDays size={20} className="text-teal-500" />
            {t("examScheduling")}
          </h2>

          {myBooking ? (
            <BookingPanel
              booking={myBooking}
              serverOffsetMs={serverOffsetMs}
              onStartExam={handleStartExam}
              starting={starting}
              onCancel={handleCancel}
              cancelling={cancelling}
              latestAttempt={latestAttempt}
              certSlug={cert?.slug}
              certId={certId}
              enrollmentId={enrollmentId}
              token={token}
            />
          ) : sessions.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl py-12 text-center">
              <CalendarDays size={32} className="mx-auto mb-3 text-slate-200" />
              <p className="text-slate-500 font-semibold text-sm">{t("noUpcomingSessions")}</p>
              <p className="text-slate-400 text-xs mt-1">{t("noUpcomingSessionsHint")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((s) => (
                <SessionCard
                  key={s.id}
                  session={s}
                  isBooked={false}
                  onBook={handleBook}
                  booking={booking}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Renewal ───────────────────────────────────────────────────────── */}
      {issuedCert && issuedCert.status !== "revoked" && token && (
        <RenewalSection certificateId={issuedCert.id} token={token} />
      )}

      {/* ── Prep Courses ─────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-display font-black text-navy-900">{t("beginExamPrep")}</h2>
            <p className="text-slate-500 text-sm mt-0.5">
              {t("beginExamPrepBody")}
            </p>
          </div>
          <Link
            href="/learn"
            className="inline-flex items-center gap-1.5 border border-slate-300 hover:border-navy-400 text-navy-700 text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            {t("viewAllExamPrep", { acronym })} <ExternalLink size={12} />
          </Link>
        </div>

        {prepCourses.length === 0 ? (
          <div className="py-16 text-center">
            <BookOpen size={32} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">{t("noPrepCourses")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {prepCourses.map((course) => (
              <PrepCourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </div>

      {/* ── Application drawer ───────────────────────────────────────────── */}
      {showApp && appWithCert && (
        <ApplicationDrawer app={appWithCert} onClose={() => setShowApp(false)} onWithdraw={handleWithdraw} />
      )}
    </div>
  );
}
