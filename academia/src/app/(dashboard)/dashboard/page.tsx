"use client";

import Link from "next/link";
import useSWR from "swr";
import { Users2, GraduationCap, BookOpen, Loader2, Copy, ExternalLink, Check, AlertTriangle, Clock } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { describeActivity } from "@/lib/activity";
import type { InstitutionDashboard } from "@/types";

function KPICard({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className="w-11 h-11 rounded-xl bg-navy-50 flex items-center justify-center flex-shrink-0">
        <Icon size={20} className="text-navy-700" />
      </div>
      <div>
        <p className="text-2xl font-display font-black text-navy-900">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { accessToken, currentInstitutionId } = useAuthStore();
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useSWR(
    accessToken && currentInstitutionId ? [`/institutions/${currentInstitutionId}/dashboard`, accessToken] : null,
    ([url, token]) => api.get<InstitutionDashboard>(url, token),
  );

  if (isLoading || !data) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-slate-300" size={28} /></div>;
  }

  function copyCode() {
    navigator.clipboard.writeText(data!.institution.code);
    setCopied(true);
    toast.success("Institution code copied");
    setTimeout(() => setCopied(false), 1500);
  }

  const storefrontUrl = `${process.env.NEXT_PUBLIC_MARKETING_URL || "https://paii.ca"}/institutions/${data.institution.slug}`;
  const onboardingSteps = [
    { done: data.onboarding.has_professors, label: "Invite your first professor or admin", href: "/professors" },
    { done: data.onboarding.has_active_subscription, label: "Subscribe to a package", href: "/billing" },
    { done: data.onboarding.sso_enabled, label: "Set up single sign-on (optional)", href: "/settings" },
  ];
  const incomplete = onboardingSteps.filter((s) => !s.done);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-black text-navy-900">{data.institution.name}</h2>
          <p className="text-slate-500 text-sm mt-0.5">{data.institution.status}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={copyCode} className="btn-outline !py-2 !px-3 !text-xs flex items-center gap-1.5">
            {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
            Code: <span className="font-mono font-semibold">{data.institution.code}</span>
          </button>
          <a href={storefrontUrl} target="_blank" rel="noopener noreferrer" className="btn-outline !py-2 !px-3 !text-xs flex items-center gap-1.5">
            <ExternalLink size={12} /> View public page
          </a>
        </div>
      </div>

      {data.subscription_status === "past_due" && (
        <div className="card p-4 bg-red-50 border-red-200 flex items-center gap-3">
          <AlertTriangle size={18} className="text-red-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-red-800 font-semibold">Your last payment failed</p>
            <p className="text-xs text-red-700">Update your payment method to keep your subscription active.</p>
          </div>
          <Link href="/billing" className="btn-primary !bg-red-600 hover:!bg-red-700 !py-1.5 !px-3 !text-xs">Go to Billing</Link>
        </div>
      )}

      {incomplete.length > 0 && (
        <div className="card p-5">
          <p className="font-semibold text-navy-900 text-sm mb-3">Get set up</p>
          <div className="space-y-2">
            {onboardingSteps.map((s) => (
              <Link key={s.label} href={s.href} className={`flex items-center gap-2.5 text-sm rounded-xl px-3 py-2 transition-colors ${s.done ? "text-slate-400" : "text-navy-700 hover:bg-slate-50"}`}>
                <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${s.done ? "bg-emerald-500 border-emerald-500" : "border-slate-300"}`}>
                  {s.done && <Check size={10} className="text-white" />}
                </span>
                <span className={s.done ? "line-through" : ""}>{s.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {data.pending_invite_count > 0 && (
        <div className="card p-4 bg-amber-50 border-amber-200 flex items-center gap-3">
          <Clock size={16} className="text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            {data.pending_invite_count} pending invite{data.pending_invite_count === 1 ? "" : "s"} awaiting acceptance.
          </p>
          <Link href="/professors" className="text-xs font-semibold text-amber-800 underline underline-offset-2 ml-auto">View</Link>
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-4">
        <KPICard icon={Users2} label="Professors & Admins" value={data.professor_count} />
        <KPICard icon={GraduationCap} label="Students" value={data.student_count} />
        <KPICard icon={BookOpen} label="Courses" value={data.course_count} />
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold text-navy-900 text-sm">Recent Activity</p>
          <Link href="/activity" className="text-xs font-semibold text-navy-600 hover:text-navy-800">View all</Link>
        </div>
        {data.recent_activity.length === 0 ? (
          <p className="text-sm text-slate-400">Nothing yet — activity will show up here as you use the portal.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {data.recent_activity.map((a) => (
              <div key={a.id} className="py-2.5 flex items-center justify-between text-sm gap-3">
                <span className="text-slate-700">{describeActivity(a)}</span>
                <span className="text-xs text-slate-400 shrink-0">{formatDateTime(a.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
