"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { ArrowRight, BookOpen, Clock, GraduationCap, Layers } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r) => (r as any).data ?? r);
}

const LEVEL_COLOR: Record<string, string> = {
  beginner:     "bg-emerald-50 text-emerald-700 border border-emerald-100",
  intermediate: "bg-blue-50 text-blue-700 border border-blue-100",
  advanced:     "bg-purple-50 text-purple-700 border border-purple-100",
};

type StatusKey = "completed" | "started" | "registered";

function statusOf(e: any): StatusKey {
  if (e.completed_at) return "completed";
  if ((e.progress_percentage ?? 0) > 0) return "started";
  return "registered";
}

const STATUS_META: Record<StatusKey, { label: string; badge: string; dot: string }> = {
  completed:  { label: "Completed",   badge: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  started:    { label: "In Progress", badge: "bg-amber-50 text-amber-700",     dot: "bg-amber-400" },
  registered: { label: "Not Started", badge: "bg-slate-100 text-slate-500",    dot: "bg-slate-300" },
};

const TABS: { key: "all" | StatusKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "registered", label: "Registered" },
  { key: "started", label: "In Progress" },
  { key: "completed", label: "Completed" },
];

function CourseRow({ enrollment }: { enrollment: any }) {
  const pct = enrollment.progress_percentage ?? 0;
  const status = statusOf(enrollment);
  const meta = STATUS_META[status];
  const isBundled = enrollment.source === "certification";
  const href = isBundled ? `/learn/${enrollment.cert_enrollment_id}` : `/learn/course/${enrollment.id}`;
  const enrolledDate = new Date(enrollment.enrolled_at).toLocaleDateString("en-CA", {
    month: "short", day: "numeric", year: "numeric",
  });

  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-4 px-5 py-4 rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-slate-300 transition-all group"
    >
      <div className="w-12 h-12 rounded-xl flex-shrink-0 bg-gradient-to-br from-violet-50 to-purple-100 ring-4 ring-violet-100 flex items-center justify-center">
        <GraduationCap size={20} className="text-violet-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          {enrollment.cert_acronym && (
            <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">{enrollment.cert_acronym}</span>
          )}
          <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full", meta.badge)}>
            <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", meta.dot)} />
            {meta.label}
          </span>
          {isBundled && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-100">
              Included with {enrollment.cert_acronym}
            </span>
          )}
        </div>
        <p className="font-display font-bold text-navy-900 text-[15px] leading-snug truncate mb-1.5">{enrollment.title}</p>
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          {enrollment.level && (
            <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-md capitalize", LEVEL_COLOR[enrollment.level] ?? "bg-slate-100 text-slate-600")}>
              {enrollment.level}
            </span>
          )}
          {parseFloat(enrollment.duration_hours) > 0 && (
            <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
              <Clock size={9} /> {parseFloat(enrollment.duration_hours)}h
            </span>
          )}
          <span className="text-[10px] text-slate-400">Enrolled {enrolledDate}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", status === "completed" ? "bg-emerald-500" : "bg-violet-500")}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[10px] font-semibold text-slate-400 flex-shrink-0 w-8 text-right">{pct}%</span>
        </div>
      </div>
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-navy-900 flex items-center justify-center transition-all">
        <ArrowRight size={15} className="text-slate-400 group-hover:text-white transition-colors" />
      </div>
    </Link>
  );
}

export default function MyCoursesListPage() {
  const token = useAuthStore((s) => s.accessToken)!;
  const [tab, setTab] = useState<"all" | StatusKey>("all");

  const { data, isLoading } = useSWR(
    token ? ["/prep-courses/my/all-courses", token] : null,
    ([url, t]) => fetcher(url, t)
  );

  const all: any[] = Array.isArray(data) ? data : [];
  const counts: Record<StatusKey, number> = { completed: 0, started: 0, registered: 0 };
  for (const e of all) counts[statusOf(e)]++;

  const shown = tab === "all" ? all : all.filter((e) => statusOf(e) === tab);

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="max-w-4xl mx-auto px-6 py-10">

        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-black text-navy-900 tracking-tight">My Courses</h1>
            <p className="text-sm text-slate-400 mt-1">
              Every course you have access to — standalone or bundled with a certification —
              registered, started, or completed.
            </p>
          </div>
          <Link
            href="/learn"
            className="inline-flex items-center gap-2 bg-white border border-slate-200 text-navy-700 text-xs font-semibold px-4 py-2.5 rounded-xl hover:border-slate-300 transition-colors shadow-sm"
          >
            <BookOpen size={13} /> My Learning
          </Link>
        </div>

        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm mb-6 w-fit">
          {TABS.map(({ key, label }) => {
            const count = key === "all" ? all.length : counts[key];
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  "px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all",
                  tab === key ? "bg-navy-900 text-white shadow-sm" : "text-slate-400 hover:text-slate-700"
                )}
              >
                {label}{count > 0 && <span className="ml-1 opacity-70">({count})</span>}
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-[102px] rounded-2xl animate-pulse bg-slate-200" />)}
          </div>
        ) : shown.length === 0 ? (
          <div className="py-14 text-center border border-dashed border-slate-200 rounded-2xl bg-white">
            <Layers size={32} className="mx-auto mb-3 text-slate-300" />
            <p className="font-semibold text-slate-500 text-sm mb-1">
              {all.length === 0 ? "No courses yet" : "Nothing in this category"}
            </p>
            <p className="text-xs text-slate-400">
              {all.length === 0
                ? "Browse courses from your My Learning page to get started."
                : "Try a different tab above."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {shown.map((e: any) => <CourseRow key={e.id} enrollment={e} />)}
          </div>
        )}

      </div>
    </div>
  );
}
