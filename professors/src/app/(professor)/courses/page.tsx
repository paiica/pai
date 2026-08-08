"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import toast from "react-hot-toast";
import { BookOpen, Settings, Users, FileText, Share2, Plus, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ShareCourseModal } from "@/components/ShareCourseModal";
import { CreateCourseModal } from "@/components/CreateCourseModal";

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r: any) => r.data);
}

const STATUS_COLORS: Record<string, string> = {
  active: "badge bg-emerald-100 text-emerald-700",
  draft: "badge bg-slate-100 text-slate-600",
  archived: "badge bg-slate-100 text-slate-600",
  coming_soon: "badge bg-amber-100 text-amber-700",
};

const LEVEL_COLORS: Record<string, string> = {
  beginner: "bg-emerald-50 text-emerald-600",
  intermediate: "bg-amber-50 text-amber-600",
  advanced: "bg-purple-50 text-purple-600",
};

const APPROVAL_BADGES: Record<string, { label: string; className: string }> = {
  none: { label: "Private — Never Submitted", className: "badge bg-slate-100 text-slate-600" },
  pending: { label: "Pending Approval", className: "badge bg-amber-100 text-amber-700" },
  approved: { label: "PAII Approved", className: "badge bg-emerald-100 text-emerald-700" },
  rejected: { label: "Rejected", className: "badge bg-red-100 text-red-700" },
};

export default function ProfCoursesPage() {
  const token = useAuthStore((s) => s.accessToken);
  const { data: courses, isLoading, mutate } = useSWR(
    token ? ["/prof/courses", token] : null,
    ([url, t]) => fetcher(url, t)
  );
  const [sharing, setSharing] = useState<{ id: string; title: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  async function handleSubmitForApproval(courseId: string) {
    setSubmittingId(courseId);
    try {
      await api.post(`/prof/courses/${courseId}/submit-for-approval`, {}, token!);
      toast.success("Submitted for PAII approval");
      mutate();
    } catch (err: any) {
      toast.error(err instanceof ApiError ? err.message : "Failed to submit for approval");
    } finally {
      setSubmittingId(null);
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-black text-navy-900">My Courses</h1>
          <p className="text-slate-500 mt-1">Manage details and content for your assigned courses.</p>
        </div>
        <button onClick={() => setCreating(true)} className="btn-primary text-sm px-4 py-2 whitespace-nowrap">
          <Plus size={15} /> Create Course
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-5 animate-pulse h-20 bg-slate-100" />
          ))}
        </div>
      ) : !courses || courses.length === 0 ? (
        <div className="card p-12 text-center text-slate-500">
          <BookOpen size={40} className="mx-auto mb-4 text-slate-300" />
          <p className="font-semibold text-navy-800">No courses yet</p>
          <p className="text-sm mt-1">Create your own course, or ask an administrator to assign you as an instructor.</p>
          <button onClick={() => setCreating(true)} className="btn-primary text-sm px-4 py-2 mt-4 mx-auto">
            <Plus size={15} /> Create Course
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {courses.map((course: any) => {
            const approval = APPROVAL_BADGES[course.approval_status ?? "none"] ?? APPROVAL_BADGES.none;
            const canSubmit = course.created_by && ["none", "rejected"].includes(course.approval_status ?? "none");
            return (
              <div key={course.id} className="card p-5">
                <div className="flex items-center gap-4">
                  <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0", LEVEL_COLORS[course.level] ?? "bg-slate-50 text-slate-500")}>
                    <BookOpen size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <p className="font-bold text-navy-900 truncate">{course.title}</p>
                      <span className={cn(STATUS_COLORS[course.status] ?? "badge bg-slate-100 text-slate-600")}>
                        {course.status}
                      </span>
                      {course.cert_acronym && (
                        <span className="badge bg-navy-50 text-navy-700">{course.cert_acronym}</span>
                      )}
                      {course.created_by && (
                        <span className={approval.className}>{approval.label}</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 truncate">{course.subtitle || course.description}</p>
                    {course.approval_status === "rejected" && course.rejection_reason && (
                      <p className="text-xs text-red-600 mt-1">Rejection reason: {course.rejection_reason}</p>
                    )}
                  </div>
                  <div className="hidden sm:flex items-center gap-6 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <BookOpen size={14} /> {course.module_count ?? 0} modules
                    </span>
                    <Link
                      href={`/courses/${course.id}/students`}
                      className="flex items-center gap-1 hover:text-navy-700 hover:underline transition-colors"
                    >
                      <Users size={14} /> {course.enrollment_count ?? 0} students
                    </Link>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Link
                      href={`/courses/${course.id}/builder`}
                      className="btn-primary text-xs px-3 py-2"
                    >
                      <Settings size={14} /> Builder
                    </Link>
                    <Link
                      href={`/courses/${course.id}/submissions`}
                      className="btn-outline text-xs px-3 py-2"
                    >
                      <FileText size={14} /> Submissions
                    </Link>
                    <button
                      onClick={() => setSharing({ id: course.id, title: course.title })}
                      className="btn-outline text-xs px-3 py-2"
                    >
                      <Share2 size={14} /> Share
                    </button>
                    {canSubmit && (
                      <button
                        onClick={() => handleSubmitForApproval(course.id)}
                        disabled={submittingId === course.id}
                        className="btn-outline text-xs px-3 py-2 disabled:opacity-50"
                      >
                        {submittingId === course.id ? <Loader2 size={14} className="animate-spin" /> : null}
                        {course.approval_status === "rejected" ? "Resubmit" : "Submit for Approval"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {sharing && (
        <ShareCourseModal courseId={sharing.id} courseTitle={sharing.title} onClose={() => setSharing(null)} />
      )}

      {creating && <CreateCourseModal onClose={() => setCreating(false)} />}
    </div>
  );
}
