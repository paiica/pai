"use client";

import { use } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  ArrowLeft, Mail, Loader2, AlertCircle, RefreshCw, Users2, BookOpen,
  Send, Award, Compass,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const APPROVAL_COLORS: Record<string, string> = {
  none: "bg-slate-100 text-slate-500",
  pending: "bg-amber-50 text-amber-700",
  approved: "bg-emerald-50 text-emerald-700",
  rejected: "bg-red-50 text-red-700",
};
const APPROVAL_LABELS: Record<string, string> = {
  none: "Not Submitted",
  pending: "Pending Approval",
  approved: "PAII Approved",
  rejected: "Rejected",
};
const INVITATION_STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  accepted: "bg-emerald-50 text-emerald-700",
  rejected: "bg-slate-100 text-slate-500",
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}

function fetcher(url: string, token: string) {
  return api.get<any>(url, token);
}

function SectionCard({ title, icon: Icon, count, children }: { title: string; icon: any; count: number; children: React.ReactNode }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100 bg-slate-50/80">
        <Icon size={15} className="text-navy-600" />
        <h2 className="text-sm font-bold text-navy-900">{title}</h2>
        <span className="ml-auto text-xs text-slate-400">{count}</span>
      </div>
      {count === 0 ? (
        <div className="p-8 text-center text-sm text-slate-400">Nothing here yet.</div>
      ) : (
        children
      )}
    </div>
  );
}

export default function ProfessorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const token = useAuthStore((s) => s.accessToken)!;

  const { data, isLoading, error, mutate } = useSWR(
    token ? [`/admin/professors/${id}`, token] : null,
    ([url, t]) => fetcher(url, t)
  );

  const detail = data?.data ?? data;

  if (isLoading) {
    return (
      <div className="p-10 text-center">
        <Loader2 size={24} className="animate-spin text-slate-300 mx-auto" />
        <p className="text-slate-400 text-sm mt-3">Loading professor…</p>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="p-10 text-center">
        <AlertCircle size={28} className="text-red-300 mx-auto mb-3" />
        <p className="text-slate-600 text-sm font-semibold">Could not load this professor</p>
        <button onClick={() => mutate()} className="btn-outline !py-1.5 !px-4 !text-xs mx-auto mt-4">
          <RefreshCw size={12} /> Retry
        </button>
      </div>
    );
  }

  const { profile, roster, courses_taught, courses_created, invitations, cert_recommendations } = detail;
  const fullName = `${profile.first_name} ${profile.last_name}`.trim() || profile.email;

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      <Link href="/professors" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-navy-700 mb-4">
        <ArrowLeft size={13} /> Back to Professors
      </Link>

      {/* Profile header */}
      <div className="card p-6 mb-6 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-navy-100 text-navy-700 flex items-center justify-center text-xl font-bold flex-shrink-0">
          {fullName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-display font-black text-navy-900">{fullName}</h1>
            <span className={`badge ${profile.is_active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
              {profile.is_active ? "Active" : "Disabled"}
            </span>
          </div>
          <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
            <Mail size={12} /> {profile.email}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Joined {fmtDate(profile.created_at)} · Last login {fmtDate(profile.last_login_at)}
            {profile.country ? ` · ${profile.country}` : ""}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Roster */}
        <SectionCard title="Student Roster" icon={Users2} count={roster.length}>
          <div className="divide-y divide-slate-50">
            {roster.map((s: any) => (
              <div key={s.id} className="flex items-center gap-4 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-navy-900 truncate">{`${s.first_name} ${s.last_name}`.trim() || s.email}</p>
                  <p className="text-xs text-slate-400 truncate">{s.email}</p>
                </div>
                <div className="text-xs text-slate-500 flex-shrink-0">
                  {s.invitations_accepted}/{s.invitations_sent} accepted
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Courses taught */}
        <SectionCard title="Courses Taught" icon={BookOpen} count={courses_taught.length}>
          <div className="divide-y divide-slate-50">
            {courses_taught.map((c: any) => (
              <div key={c.id} className="flex items-center gap-3 px-5 py-3">
                <p className="text-sm font-medium text-navy-900 flex-1 truncate">{c.title}</p>
                {c.is_lead && <span className="badge bg-gold-50 text-gold-700">Lead</span>}
                <span className="badge bg-slate-100 text-slate-600">{c.status}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Courses created */}
        <SectionCard title="Courses Created" icon={Compass} count={courses_created.length}>
          <div className="divide-y divide-slate-50">
            {courses_created.map((c: any) => (
              <div key={c.id} className="px-5 py-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-navy-900 flex-1 truncate">{c.title}</p>
                  <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", APPROVAL_COLORS[c.approval_status ?? "none"])}>
                    {APPROVAL_LABELS[c.approval_status ?? "none"]}
                  </span>
                  {c.is_listed && <span className="badge bg-emerald-50 text-emerald-700">Public</span>}
                </div>
                {c.approval_status === "rejected" && c.rejection_reason && (
                  <p className="text-xs text-red-600 mt-1">Rejection reason: {c.rejection_reason}</p>
                )}
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Invitations sent */}
        <SectionCard title="Course Invitations & Recommendations Sent" icon={Send} count={invitations.length}>
          <div className="divide-y divide-slate-50">
            {invitations.map((inv: any) => (
              <div key={inv.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-navy-900 truncate">{inv.course_title}</p>
                  <p className="text-xs text-slate-400 truncate">
                    {inv.student_name} · {inv.is_recommendation ? "Recommendation" : "Invitation"}
                  </p>
                </div>
                <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0", INVITATION_STATUS_COLORS[inv.status] ?? "bg-slate-100 text-slate-500")}>
                  {inv.status}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Certification recommendations */}
        <SectionCard title="Certification Recommendations Sent" icon={Award} count={cert_recommendations.length}>
          <div className="divide-y divide-slate-50">
            {cert_recommendations.map((rec: any) => (
              <div key={rec.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-navy-900 truncate">{rec.certification_title}</p>
                  <p className="text-xs text-slate-400 truncate">{rec.student_name}</p>
                </div>
                <span className="text-xs text-slate-400 flex-shrink-0">{fmtDate(rec.created_at)}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
