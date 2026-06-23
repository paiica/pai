"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Play, BookOpen, Clock, Calendar, ArrowRight, CheckCircle, GraduationCap } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

function authFetcher(url: string, token: string) {
  return fetch(`${API_BASE}${url}`, { headers: { Authorization: `Bearer ${token}` } })
    .then(r => r.json()).then(r => r.data ?? r);
}

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r) => r.data);
}

// Decorative card header patterns (CSS-only, no images needed)
const CARD_GRADIENTS = [
  "from-[#e8d5c4] to-[#c9b8a8]",
  "from-[#c4d5e8] to-[#a8b8c9]",
  "from-[#d5c4e8] to-[#b8a8c9]",
  "from-[#c4e8d5] to-[#a8c9b8]",
  "from-[#e8c4c4] to-[#c9a8a8]",
];

function CardPattern({ index }: { index: number }) {
  const colors = ["#fff", "#fff8"];
  return (
    <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice">
      <polygon points="0,120 80,20 160,120" fill={colors[0]} opacity="0.4" />
      <polygon points="60,120 140,10 220,120" fill={colors[1]} opacity="0.3" />
      <polygon points="120,120 200,30 280,120" fill={colors[0]} opacity="0.2" />
    </svg>
  );
}

function CourseCard({ enrollment, index }: { enrollment: any; index: number }) {
  const cert = enrollment.certification;
  const pct = enrollment.progress_percentage ?? 0;
  const isCompleted = enrollment.status === "completed";
  const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];

  const enrolledDate = new Date(enrollment.enrolled_at).toLocaleDateString("en-CA", { day: "numeric", month: "long", year: "numeric" });
  const lastAccessed = enrollment.last_accessed_at
    ? new Date(enrollment.last_accessed_at).toLocaleDateString("en-CA", { day: "numeric", month: "long", year: "numeric" })
    : enrolledDate;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow">
      {/* Decorative header */}
      <div className={cn("relative h-28 bg-gradient-to-br overflow-hidden", gradient)}>
        <CardPattern index={index} />
        {/* Cert badge */}
        <div className="absolute top-3 left-3">
          <span className="inline-flex items-center gap-1.5 bg-white/80 backdrop-blur-sm text-navy-700 text-[11px] font-semibold px-2.5 py-1 rounded-full border border-white/60">
            {cert?.badge_icon} {cert?.acronym}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 flex flex-col flex-1">
        {/* Title + status */}
        <div className="mb-3">
          <h3 className="font-display font-bold text-navy-900 text-base leading-snug mb-2">
            {cert?.title}
          </h3>
          <span className={cn(
            "inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full",
            isCompleted ? "bg-emerald-100 text-emerald-700" :
            pct > 0 ? "bg-gold-50 text-gold-700 border border-gold-200" :
            "bg-slate-100 text-slate-500"
          )}>
            {isCompleted ? <><CheckCircle size={10} /> Completed</> :
             pct > 0 ? <><Play size={9} className="fill-gold-600" /> In Progress — {pct}%</> :
             "Not Started"}
          </span>
        </div>

        {/* Progress bar */}
        {!isCompleted && (
          <div className="h-1 bg-slate-100 rounded-full overflow-hidden mb-4">
            <div className="h-full bg-navy-600 rounded-full" style={{ width: `${pct}%` }} />
          </div>
        )}

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs mb-4 mt-auto">
          <div>
            <p className="text-slate-400 flex items-center gap-1"><BookOpen size={10} /> Duration</p>
            <p className="font-semibold text-navy-800 mt-0.5">{cert?.duration_weeks} weeks</p>
          </div>
          <div>
            <p className="text-slate-400 flex items-center gap-1"><Calendar size={10} /> Enrolled</p>
            <p className="font-semibold text-navy-800 mt-0.5">{enrolledDate}</p>
          </div>
          <div>
            <p className="text-slate-400 flex items-center gap-1"><Clock size={10} /> Last Activity</p>
            <p className="font-semibold text-navy-800 mt-0.5">{lastAccessed}</p>
          </div>
          <div>
            <p className="text-slate-400">Total Hours</p>
            <p className="font-semibold text-navy-800 mt-0.5">{cert?.total_hours}h</p>
          </div>
        </div>

        {/* CTA */}
        <div className="flex justify-end">
          <Link
            href={`/learn/${enrollment.id}`}
            className="inline-flex items-center gap-2 bg-navy-900 hover:bg-navy-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            {isCompleted ? "Review Course" : pct > 0 ? "Continue Course" : "Start Course"}
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Prep Course Card ─────────────────────────────────────────────────────────

function PrepCourseCard({ enrollment, index }: { enrollment: any; index: number }) {
  const COLORS = ["from-[#e6d5f7] to-[#c8a8ef]", "from-[#cfe8f5] to-[#b0d0ea]", "from-[#f0e2cc] to-[#dfc5a0]", "from-[#cdf0e2] to-[#a0d8c0]", "from-[#f5cfe0] to-[#e8a8c5]", "from-[#d0d8f5] to-[#a8b8ee]"];
  const pct = enrollment.progress_percentage ?? 0;
  const enrolledDate = new Date(enrollment.enrolled_at).toLocaleDateString("en-CA", { day: "numeric", month: "short", year: "numeric" });
  const marketingUrl = process.env.NEXT_PUBLIC_MARKETING_URL || "http://localhost:3000";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow">
      <div className={cn("relative h-28 bg-gradient-to-br overflow-hidden flex items-end p-4", COLORS[index % COLORS.length])}>
        <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 bg-white/80 backdrop-blur-sm text-navy-700 text-[11px] font-semibold px-2.5 py-1 rounded-full border border-white/60">
          <GraduationCap size={11} /> {enrollment.cert_acronym || "eLearning"}
        </div>
      </div>
      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-display font-bold text-navy-900 text-base leading-snug mb-2">{enrollment.title}</h3>
        <div className="h-1 bg-slate-100 rounded-full overflow-hidden mb-3">
          <div className="h-full bg-navy-600 rounded-full" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex items-center justify-between text-xs text-slate-400 mb-4">
          <span>{pct > 0 ? `${pct}% complete` : "Not started"}</span>
          <span className="flex items-center gap-1"><Calendar size={10} /> {enrolledDate}</span>
        </div>
        <div className="flex items-center justify-between mt-auto gap-2">
          <a
            href={enrollment.slug ? `${marketingUrl}/courses/${enrollment.slug}` : `${marketingUrl}/courses`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-navy-700 font-medium transition-colors border border-slate-200 px-3 py-2 rounded-xl hover:border-navy-300"
          >
            Learn More
          </a>
          <Link
            href={`/learn/course/${enrollment.id}`}
            className="inline-flex items-center gap-2 bg-navy-900 hover:bg-navy-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            {pct > 0 ? "Continue" : "Start Course"}
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MyCoursesPage() {
  const token = useAuthStore((s) => s.accessToken)!;
  const [tab, setTab] = useState<"active" | "completed">("active");

  const { data, isLoading } = useSWR(
    token ? ["/enrollments/my", token] : null,
    ([url, t]) => fetcher(url, t)
  );
  const { data: prepRaw, isLoading: loadingPrep } = useSWR(
    token ? ["/prep-courses/my/enrollments", token] : null,
    ([url, t]) => authFetcher(url, t)
  );

  const all: any[] = data?.data ?? data ?? [];
  const active = all.filter((e: any) => e.status === "active");
  const completed = all.filter((e: any) => e.status === "completed");
  const shown = tab === "active" ? active : completed;
  const prepEnrollments: any[] = Array.isArray(prepRaw) ? prepRaw : [];

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-5xl mx-auto">

        <h1 className="text-2xl font-display font-black text-navy-900 mb-6">Your Courses</h1>

        {/* Prep Courses section */}
        {(loadingPrep || prepEnrollments.length > 0) && (
          <div className="mb-10">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Prep Courses</p>
            {loadingPrep ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {[1, 2].map(i => <div key={i} className="h-52 rounded-2xl animate-pulse bg-slate-200" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {prepEnrollments.map((e: any, i: number) => (
                  <PrepCourseCard key={e.id} enrollment={e} index={i} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Certification courses section */}
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Certification Programs</p>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 mb-8">
          {[
            { key: "active", label: "Start & Continue", count: active.length },
            { key: "completed", label: "Completed", count: completed.length },
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setTab(key as any)}
              className={cn(
                "px-5 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors",
                tab === key
                  ? "border-navy-800 text-navy-900"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              )}
            >
              {label} ({count})
            </button>
          ))}
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map(i => <div key={i} className="h-72 rounded-2xl animate-pulse bg-slate-200" />)}
          </div>
        ) : shown.length === 0 ? (
          <div className="py-12 text-center">
            <BookOpen size={40} className="mx-auto mb-4 text-slate-300" />
            <p className="font-semibold text-slate-500">
              {tab === "active" ? "No certification courses in progress" : "No completed courses yet"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {shown.map((e: any, i: number) => (
              <CourseCard key={e.id} enrollment={e} index={i} />
            ))}
          </div>
        )}

        {/* Find More Courses banner */}
        <div className="mt-12 rounded-2xl bg-navy-900 overflow-hidden relative">
          <div className="absolute inset-0 opacity-10">
            <svg viewBox="0 0 600 200" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
              <polygon points="400,200 550,0 700,200" fill="white" opacity="0.4" />
              <polygon points="500,200 650,20 800,200" fill="white" opacity="0.3" />
              <polygon points="450,200 520,60 600,200" fill="white" opacity="0.2" />
            </svg>
          </div>
          <div className="relative px-8 py-8 flex items-center justify-between flex-wrap gap-6">
            <div>
              <h3 className="text-white font-display font-black text-xl mb-1">Find More Courses</h3>
              <p className="text-white/50 text-sm max-w-sm">
                Looking to expand your AI expertise? We have certification programs to support your journey.
              </p>
            </div>
            <a
              href={`${process.env.NEXT_PUBLIC_MARKETING_URL || "https://paii.ca"}/certifications`}
              className="inline-flex items-center gap-2 bg-white text-navy-900 text-sm font-bold px-6 py-3 rounded-xl hover:bg-gold-50 transition-colors flex-shrink-0"
            >
              Explore All Certifications <ArrowRight size={14} />
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
