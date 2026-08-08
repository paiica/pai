"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { ArrowLeft, Users, Mail, Phone, MapPin, CheckCircle2, FileText, XCircle, Clock } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r: any) => r.data);
}

const INVITATION_STATUS: Record<string, { label: string; cls: string; icon: typeof Clock }> = {
  pending:  { label: "Pending",  cls: "badge bg-amber-100 text-amber-700",   icon: Clock },
  rejected: { label: "Declined", cls: "badge bg-red-100 text-red-600",      icon: XCircle },
  accepted: { label: "Accepted", cls: "badge bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
};

export default function CourseStudentsPage() {
  const { certId: courseId } = useParams<{ certId: string }>();
  const token = useAuthStore((s) => s.accessToken)!;

  const { data: students, isLoading } = useSWR(
    courseId && token ? [`/prof/courses/${courseId}/students`, token] : null,
    ([url, t]) => fetcher(url, t)
  );
  const { data: invitations } = useSWR(
    courseId && token ? [`/prof/courses/${courseId}/invitations`, token] : null,
    ([url, t]) => fetcher(url, t)
  );
  // Accepted invitations are already reflected in the enrolled list above —
  // this section is only useful for statuses that aren't visible there yet.
  const pendingOrRejected = (invitations ?? []).filter((i: any) => i.status !== "accepted");

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Link href="/courses" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-navy-700 mb-4 transition-colors">
        <ArrowLeft size={14} /> Back to My Courses
      </Link>
      <div className="mb-8">
        <h1 className="text-2xl font-display font-black text-navy-900">Enrolled Students</h1>
        <p className="text-slate-500 mt-1">{students?.length ?? 0} student{students?.length === 1 ? "" : "s"} enrolled</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="card p-5 animate-pulse h-24 bg-slate-100" />)}
        </div>
      ) : !students || students.length === 0 ? (
        <div className="card p-12 text-center text-slate-500">
          <Users size={40} className="mx-auto mb-4 text-slate-300" />
          <p className="font-semibold text-navy-800">No students enrolled yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {students.map((e: any) => {
            const profile = e.user?.profile;
            const name = profile?.display_name || `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() || e.user?.email;
            const initials = `${profile?.first_name?.[0] ?? ""}${profile?.last_name?.[0] ?? ""}`.toUpperCase() || "?";
            const isDone = !!e.completed_at;
            return (
              <div key={e.id} className="card p-5">
                <div className="flex items-start gap-4">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt={name} className="w-11 h-11 rounded-full flex-shrink-0 object-cover" />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-navy-100 flex items-center justify-center flex-shrink-0 text-navy-700 font-bold text-sm">
                      {initials}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-semibold text-navy-900">{name}</p>
                      <span className={isDone ? "badge bg-emerald-100 text-emerald-700" : "badge bg-blue-100 text-blue-700"}>
                        {isDone ? "completed" : "active"}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 flex-wrap text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Mail size={11} /> {e.user?.email}</span>
                      {profile?.phone && <span className="flex items-center gap-1"><Phone size={11} /> {profile.phone}</span>}
                      {profile?.country && <span className="flex items-center gap-1"><MapPin size={11} /> {profile.country}</span>}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Enrolled {formatDate(e.enrolled_at)}
                      {e.completed_at && ` · Completed ${formatDate(e.completed_at)}`}
                      {e.user?.last_login_at && ` · Last active ${formatDate(e.user.last_login_at)}`}
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden max-w-xs">
                        <div
                          className={isDone ? "h-full rounded-full bg-emerald-500" : "h-full rounded-full bg-navy-600"}
                          style={{ width: `${e.progress_percentage ?? 0}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-navy-700">{e.progress_percentage ?? 0}%</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 flex flex-col items-end gap-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-emerald-500" /> {e._count?.lesson_progress ?? 0} lessons done</span>
                    <span className="flex items-center gap-1"><FileText size={12} className="text-amber-500" /> {e._count?.assignment_submissions ?? 0} submissions</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pendingOrRejected.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-display font-black text-navy-900 mb-1">Pending &amp; Declined Invitations</h2>
          <p className="text-slate-500 text-sm mb-4">Students you've invited who haven't enrolled yet.</p>
          <div className="space-y-2">
            {pendingOrRejected.map((inv: any) => {
              const status = INVITATION_STATUS[inv.status] ?? INVITATION_STATUS.pending;
              const Icon = status.icon;
              return (
                <div key={inv.id} className="card p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-navy-900 text-sm truncate">{inv.name}</p>
                    <p className="text-xs text-slate-400 truncate">{inv.email}</p>
                  </div>
                  <div className="text-xs text-slate-400 flex-shrink-0">
                    Invited {formatDate(inv.invited_at)}
                    {inv.responded_at && ` · Responded ${formatDate(inv.responded_at)}`}
                  </div>
                  <span className={`${status.cls} flex items-center gap-1 flex-shrink-0`}>
                    <Icon size={11} /> {status.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
