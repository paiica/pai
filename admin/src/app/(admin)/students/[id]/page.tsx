"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import {
  ArrowLeft, GraduationCap, Award, BookOpen, CreditCard, Mail, Phone, MapPin,
  Briefcase, Calendar, Loader2, AlertCircle, RefreshCw, CheckCircle2, XCircle,
  Clock, RefreshCw as RenewIcon, ExternalLink, FileText, ShieldAlert, Building2,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { EnrollmentActions } from "@/components/EnrollmentActions";
import { DeleteCourseEnrollmentButton } from "@/components/CourseEnrollmentActions";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}
function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" });
}
function fmtMoney(v: number | string | null | undefined, currency = "USD") {
  const n = Number(v ?? 0);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(n);
}
function fullName(profile: any, email: string) {
  const n = `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim();
  return n || email;
}

const ENROLLMENT_STATUS_COLOR: Record<string, string> = {
  active: "bg-blue-50 text-blue-700 border border-blue-100",
  completed: "bg-emerald-50 text-emerald-700 border border-emerald-100",
  suspended: "bg-red-50 text-red-700 border border-red-100",
  expired: "bg-slate-100 text-slate-500 border border-slate-200",
};

const CERT_STATUS_COLOR: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border border-emerald-100",
  expired: "bg-amber-50 text-amber-700 border border-amber-100",
  lapsed: "bg-red-50 text-red-700 border border-red-100",
  revoked: "bg-red-50 text-red-700 border border-red-100",
  suspended: "bg-slate-100 text-slate-500 border border-slate-200",
};

const EXAM_STATUS_COLOR: Record<string, string> = {
  passed: "text-emerald-600",
  failed: "text-red-500",
  in_progress: "text-blue-600",
  abandoned: "text-slate-400",
};

const PAYMENT_STATUS_COLOR: Record<string, string> = {
  succeeded: "bg-emerald-50 text-emerald-700 border border-emerald-100",
  pending: "bg-amber-50 text-amber-700 border border-amber-100",
  failed: "bg-red-50 text-red-700 border border-red-100",
  refunded: "bg-slate-100 text-slate-500 border border-slate-200",
  partially_refunded: "bg-amber-50 text-amber-700 border border-amber-100",
};

const PAYMENT_TYPE_LABEL: Record<string, string> = {
  enrollment: "Enrollment",
  retake_fee: "Retake Fee",
  renewal_fee: "Renewal Fee",
  corporate_bundle: "Corporate Bundle",
  event_registration: "Event Registration",
};

// ── Section: Certification + Certificate card ────────────────────────────────

function CertificationCard({ enrollment, token, studentName, onRefresh }: {
  enrollment: any; token: string; studentName: string; onRefresh: () => void;
}) {
  const cert = enrollment.certificate;
  const certification = enrollment.certification;

  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden">
      <div className="flex items-start justify-between gap-4 p-5 bg-slate-50/60 border-b border-slate-100 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-display font-black text-navy-900 text-base">
              {certification?.acronym} — {certification?.title}
            </span>
            <span className={cn("badge", ENROLLMENT_STATUS_COLOR[enrollment.status] ?? "bg-slate-100 text-slate-500")}>
              {enrollment.status}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Enrolled {fmtDate(enrollment.enrolled_at)}
            {enrollment.completed_at && ` · Completed ${fmtDate(enrollment.completed_at)}`}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Progress</p>
          <p className="text-lg font-black text-navy-900">{enrollment.progress_percentage ?? 0}%</p>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Application / payment */}
        {enrollment.application && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <p className="font-bold text-slate-400 uppercase tracking-widest text-[10px] mb-0.5">Application</p>
              <p className="text-slate-700 capitalize">{enrollment.application.status?.replace(/_/g, " ")}</p>
            </div>
            <div>
              <p className="font-bold text-slate-400 uppercase tracking-widest text-[10px] mb-0.5">Amount Paid</p>
              <p className="text-slate-700">{enrollment.application.amount_paid != null ? fmtMoney(enrollment.application.amount_paid) : "—"}</p>
            </div>
            {enrollment.application.rejection_reason && (
              <div className="col-span-2 sm:col-span-3">
                <p className="font-bold text-red-400 uppercase tracking-widest text-[10px] mb-0.5">Rejection Reason</p>
                <p className="text-red-600">{enrollment.application.rejection_reason}</p>
              </div>
            )}
          </div>
        )}

        {/* Certificate + renewal */}
        {cert ? (
          <div className="rounded-xl border border-slate-200 p-4 bg-white">
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Award size={15} className="text-amber-500" />
                <span className="text-sm font-mono text-slate-700">{cert.certificate_number}</span>
                <span className={cn("badge", CERT_STATUS_COLOR[cert.status] ?? "bg-slate-100 text-slate-500")}>
                  {cert.status}
                </span>
              </div>
              <a href={cert.verification_url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-navy-600 hover:text-navy-800 flex items-center gap-1">
                Verify <ExternalLink size={11} />
              </a>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-3">
              <div>
                <p className="font-bold text-slate-400 uppercase tracking-widest text-[10px] mb-0.5">Issued</p>
                <p className="text-slate-700">{fmtDate(cert.issued_at)}</p>
              </div>
              <div>
                <p className="font-bold text-slate-400 uppercase tracking-widest text-[10px] mb-0.5">Expires</p>
                <p className={cn("font-semibold", cert.status === "expired" || cert.status === "lapsed" ? "text-red-600" : "text-slate-700")}>
                  {fmtDate(cert.expires_at)}
                </p>
              </div>
              <div>
                <p className="font-bold text-slate-400 uppercase tracking-widest text-[10px] mb-0.5">Exam Score</p>
                <p className="text-slate-700">{cert.exam_score != null ? `${cert.exam_score}%` : "—"}</p>
              </div>
              <div>
                <p className="font-bold text-slate-400 uppercase tracking-widest text-[10px] mb-0.5">Renewed</p>
                <p className="text-slate-700">
                  {cert.renewal_count > 0 ? `${cert.renewal_count}× — last ${fmtDate(cert.renewed_at)}` : "Never"}
                </p>
              </div>
            </div>

            {cert.status === "revoked" && cert.revocation_reason && (
              <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">
                <ShieldAlert size={13} className="flex-shrink-0 mt-0.5" />
                {cert.revocation_reason}
              </div>
            )}

            {/* PDU renewal progress — only relevant certs configured with a PDU requirement */}
            {certification?.renewal_pdu_required > 0 && cert.status !== "revoked" && (
              <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <RenewIcon size={11} /> Renewal Progress
                  </p>
                  <span className="text-xs font-semibold text-slate-600">
                    {cert.pdu_earned} / {cert.pdu_required} PDUs
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden mb-2">
                  <div
                    className={cn("h-full rounded-full", cert.renewal_eligible ? "bg-emerald-500" : "bg-teal-400")}
                    style={{ width: `${Math.min(100, Math.round((cert.pdu_earned / Math.max(cert.pdu_required, 1)) * 100))}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Window opens {fmtDate(cert.renewal_window_opens_at)}</span>
                  <span>Hard deadline {fmtDate(cert.renewal_hard_deadline)}</span>
                  <span className={cn("font-semibold", cert.renewal_eligible ? "text-emerald-600" : "text-slate-400")}>
                    {cert.status === "lapsed" ? "Window closed" : cert.renewal_eligible ? "Eligible now" : "Not yet eligible"}
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-xs text-slate-400 italic">No certificate issued for this enrollment yet.</div>
        )}

        {/* Exam attempts */}
        {enrollment.exam_attempts?.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Recent Exam Attempts</p>
            <div className="space-y-1">
              {enrollment.exam_attempts.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-50 last:border-0">
                  <span className="text-slate-500">#{a.attempt_number} · {fmtDate(a.submitted_at ?? a.started_at)}</span>
                  <span className="text-slate-600">{a.score_percentage != null ? `${a.score_percentage}%` : "—"}</span>
                  <span className={cn("font-semibold", EXAM_STATUS_COLOR[a.status] ?? "text-slate-400")}>{a.status?.replace(/_/g, " ")}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Exam bookings */}
        {enrollment.exam_bookings?.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Exam Bookings</p>
            <div className="space-y-1">
              {enrollment.exam_bookings.map((b: any) => (
                <div key={b.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-50 last:border-0">
                  <span className="text-slate-600">{b.exam_session?.title ?? "Exam Session"}</span>
                  <span className="text-slate-400">{fmtDateTime(b.exam_session?.scheduled_at)}</span>
                  <span className={cn("font-semibold capitalize", b.status === "cancelled" ? "text-red-500" : "text-emerald-600")}>{b.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Assignments tied to this certification enrollment */}
        {enrollment.assignment_submissions?.length > 0 && (
          <AssignmentList submissions={enrollment.assignment_submissions} />
        )}

        <EnrollmentActions row={enrollment} token={token} studentName={studentName} onRefresh={onRefresh} />
      </div>
    </div>
  );
}

function AssignmentList({ submissions }: { submissions: any[] }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Assignments</p>
      <div className="space-y-1">
        {submissions.map((s: any) => (
          <div key={s.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-50 last:border-0">
            <span className="text-slate-600 truncate flex-1 min-w-0 mr-2">{s.lesson?.title ?? "Assignment"}</span>
            <span className="text-slate-400 flex-shrink-0">{fmtDate(s.submitted_at)}</span>
            <span className="text-slate-700 font-semibold w-16 text-right flex-shrink-0">{s.grade != null ? `${s.grade}%` : "—"}</span>
            <span className={cn(
              "font-semibold capitalize w-20 text-right flex-shrink-0",
              s.status === "graded" ? "text-emerald-600" : s.status === "submitted" ? "text-blue-600" : "text-slate-400",
            )}>
              {s.status?.replace(/_/g, " ")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Section: Prep course card ────────────────────────────────────────────────

function CourseCard({ enrollment, token, studentName, onRefresh }: {
  enrollment: any; token: string; studentName: string; onRefresh: () => void;
}) {
  const course = enrollment.course;
  return (
    <div className="border border-slate-200 rounded-2xl p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
        <div className="min-w-0">
          <p className="font-display font-bold text-navy-900 text-sm">{course?.title}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            Enrolled {fmtDate(enrollment.enrolled_at)}
            {enrollment.completed_at && ` · Completed ${fmtDate(enrollment.completed_at)}`}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {Number(course?.pdu_value) > 0 && (
            <span className="badge bg-teal-50 text-teal-700 border border-teal-100">{course.pdu_value} PDU</span>
          )}
          <span className={cn("badge", enrollment.completed_at ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-blue-50 text-blue-700 border border-blue-100")}>
            {enrollment.completed_at ? "Completed" : `${enrollment.progress_percentage ?? 0}%`}
          </span>
        </div>
      </div>
      {enrollment.amount_paid != null && Number(enrollment.amount_paid) > 0 && (
        <p className="text-xs text-slate-400 mb-2">Paid {fmtMoney(enrollment.amount_paid)}</p>
      )}
      {enrollment.assignment_submissions?.length > 0 && (
        <AssignmentList submissions={enrollment.assignment_submissions} />
      )}
      <div className="pt-3 mt-3 border-t border-slate-100 flex justify-end">
        <DeleteCourseEnrollmentButton
          enrollmentId={enrollment.id}
          studentName={studentName}
          courseName={course?.title ?? "this course"}
          token={token}
          onRefresh={onRefresh}
        />
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { accessToken } = useAuthStore();

  const { data, isLoading, error, mutate } = useSWR(
    accessToken ? [`/users/${id}/full`, accessToken] : null,
    ([url, token]) => api.get<any>(url, token),
    { revalidateOnFocus: false },
  );

  const student = data?.data ?? data;

  if (isLoading) {
    return (
      <div className="p-10 text-center">
        <Loader2 size={24} className="animate-spin text-slate-300 mx-auto" />
        <p className="text-slate-400 text-sm mt-3">Loading student…</p>
      </div>
    );
  }
  if (error || !student) {
    return (
      <div className="p-10 text-center">
        <AlertCircle size={28} className="text-red-300 mx-auto mb-3" />
        <p className="text-slate-600 text-sm font-semibold">Could not load student</p>
        <button onClick={() => mutate()} className="btn-outline !py-1.5 !px-4 !text-xs mx-auto mt-4">
          <RefreshCw size={12} /> Retry
        </button>
      </div>
    );
  }

  const profile = student.profile;
  const enrollments: any[] = student.enrollments ?? [];
  const courseEnrollments: any[] = student.course_enrollments ?? [];
  const payments: any[] = student.payments ?? [];

  const certsIssued = enrollments.filter((e) => e.certificate).length;
  const certsActive = enrollments.filter((e) => e.certificate?.status === "active").length;
  const lifetimeSpend = payments
    .filter((p) => p.status === "succeeded")
    .reduce((sum, p) => sum + Number(p.amount ?? 0), 0);

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <Link href="/students" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-navy-700 transition-colors">
        <ArrowLeft size={13} /> Back to Students
      </Link>

      {/* Header card */}
      <div className="card p-6">
        <div className="flex items-start gap-5 flex-wrap">
          <div className="w-16 h-16 rounded-2xl bg-navy-100 text-navy-700 flex items-center justify-center text-2xl font-black flex-shrink-0">
            {fullName(profile, student.email).charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-xl font-display font-black text-navy-900">{fullName(profile, student.email)}</h1>
              <span className={cn("badge", student.is_active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>
                {student.is_active ? "Active" : "Disabled"}
              </span>
              {!student.email_verified && <span className="badge bg-amber-50 text-amber-700">Email unverified</span>}
            </div>
            <div className="flex items-center gap-4 flex-wrap text-xs text-slate-500">
              <span className="flex items-center gap-1"><Mail size={11} /> {student.email}</span>
              {profile?.phone && <span className="flex items-center gap-1"><Phone size={11} /> {profile.phone}</span>}
              {profile?.country && <span className="flex items-center gap-1"><MapPin size={11} /> {profile.country}</span>}
              {profile?.pai_id && <span className="font-mono">PAI ID: {profile.pai_id}</span>}
            </div>
            {(profile?.job_title || profile?.company) && (
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                <Briefcase size={11} /> {[profile?.job_title, profile?.company].filter(Boolean).join(" at ")}
              </p>
            )}
            {(profile?.university || profile?.degree_program) && (
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                <Building2 size={11} /> {[profile?.degree_program, profile?.university].filter(Boolean).join(", ")}
              </p>
            )}
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <Calendar size={11} /> Joined {fmtDate(student.created_at)} · Last login {fmtDate(student.last_login_at)}
            </p>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3 flex-shrink-0">
            <div className="text-center px-4 py-2 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-lg font-black text-navy-900">{enrollments.length}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Certifications</p>
            </div>
            <div className="text-center px-4 py-2 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-lg font-black text-navy-900">{certsActive}/{certsIssued}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Active Certs</p>
            </div>
            <div className="text-center px-4 py-2 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-lg font-black text-navy-900">{courseEnrollments.length}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Prep Courses</p>
            </div>
            <div className="text-center px-4 py-2 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-lg font-black text-navy-900">{fmtMoney(lifetimeSpend)}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Lifetime Spend</p>
            </div>
          </div>
        </div>
      </div>

      {/* Certifications & Certificates */}
      <div>
        <h2 className="text-sm font-black text-navy-900 uppercase tracking-widest flex items-center gap-2 mb-3">
          <Award size={16} className="text-amber-500" /> Certifications & Certificates
        </h2>
        {enrollments.length === 0 ? (
          <div className="border border-dashed border-slate-200 rounded-2xl py-10 text-center text-slate-400 text-sm">
            No certification enrollments yet.
          </div>
        ) : (
          <div className="space-y-4">
            {enrollments.map((e) => (
              <CertificationCard
                key={e.id}
                enrollment={e}
                token={accessToken!}
                studentName={fullName(profile, student.email)}
                onRefresh={() => mutate()}
              />
            ))}
          </div>
        )}
      </div>

      {/* Prep Courses */}
      <div>
        <h2 className="text-sm font-black text-navy-900 uppercase tracking-widest flex items-center gap-2 mb-3">
          <BookOpen size={16} className="text-teal-500" /> Prep Courses
        </h2>
        {courseEnrollments.length === 0 ? (
          <div className="border border-dashed border-slate-200 rounded-2xl py-10 text-center text-slate-400 text-sm">
            No prep course enrollments yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {courseEnrollments.map((ce) => (
              <CourseCard
                key={ce.id}
                enrollment={ce}
                token={accessToken!}
                studentName={fullName(profile, student.email)}
                onRefresh={() => mutate()}
              />
            ))}
          </div>
        )}
      </div>

      {/* Payment History */}
      <div>
        <h2 className="text-sm font-black text-navy-900 uppercase tracking-widest flex items-center gap-2 mb-3">
          <CreditCard size={16} className="text-navy-500" /> Payment History
        </h2>
        {payments.length === 0 ? (
          <div className="border border-dashed border-slate-200 rounded-2xl py-10 text-center text-slate-400 text-sm">
            No payments on record.
          </div>
        ) : (
          <div className="card overflow-hidden p-0">
            <div className="flex items-center gap-4 px-5 py-2.5 border-b border-slate-100 bg-slate-50/80">
              <div className="flex-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</div>
              <div className="hidden sm:block text-[10px] font-bold text-slate-400 uppercase tracking-widest w-28">Type</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest w-20 text-right">Amount</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest w-24 text-right">Status</div>
              <div className="hidden md:block text-[10px] font-bold text-slate-400 uppercase tracking-widest w-24 text-right">Date</div>
            </div>
            {payments.map((p) => (
              <div key={p.id} className="flex items-center gap-4 px-5 py-3 border-b border-slate-50 last:border-0 text-xs">
                <div className="flex-1 min-w-0">
                  <p className="text-slate-700 truncate">{p.description ?? "—"}</p>
                  {p.failure_reason && <p className="text-red-500 text-[11px] mt-0.5">{p.failure_reason}</p>}
                  {p.refund_amount != null && Number(p.refund_amount) > 0 && (
                    <p className="text-slate-400 text-[11px] mt-0.5">Refunded {fmtMoney(p.refund_amount, p.currency)} on {fmtDate(p.refunded_at)}</p>
                  )}
                </div>
                <div className="hidden sm:block text-slate-500 w-28 flex-shrink-0">{PAYMENT_TYPE_LABEL[p.type] ?? p.type}</div>
                <div className="text-slate-800 font-semibold w-20 text-right flex-shrink-0">{fmtMoney(p.amount, p.currency)}</div>
                <div className="w-24 text-right flex-shrink-0">
                  <span className={cn("badge", PAYMENT_STATUS_COLOR[p.status] ?? "bg-slate-100 text-slate-500")}>{p.status?.replace(/_/g, " ")}</span>
                </div>
                <div className="hidden md:block text-slate-400 w-24 text-right flex-shrink-0">{fmtDate(p.created_at)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
