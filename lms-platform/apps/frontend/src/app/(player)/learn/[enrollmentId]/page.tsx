"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import {
  CheckCircle, Circle, Video, FileText, HelpCircle,
  File, Download, Link2, Award, Clock, Play, ClipboardList, ChevronDown,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r) => r.data);
}

const LESSON_ICONS: Record<string, React.ElementType> = {
  video: Video, reading: FileText, quiz: HelpCircle,
  assignment: File, download: Download, live_session: Link2,
};

const LESSON_COLORS: Record<string, string> = {
  video: "text-blue-500", reading: "text-emerald-500", quiz: "text-purple-500",
  assignment: "text-amber-500", download: "text-slate-400", live_session: "text-rose-500",
};

const COURSE_ACCENTS = [
  { bg: "bg-gradient-to-br from-amber-50 to-orange-100",  bar: "bg-amber-400"  },
  { bg: "bg-gradient-to-br from-sky-50 to-blue-100",      bar: "bg-sky-500"    },
  { bg: "bg-gradient-to-br from-violet-50 to-purple-100", bar: "bg-violet-500" },
  { bg: "bg-gradient-to-br from-emerald-50 to-teal-100",  bar: "bg-emerald-500"},
  { bg: "bg-gradient-to-br from-rose-50 to-pink-100",     bar: "bg-rose-500"   },
];

// ─── Per-course accordion ─────────────────────────────────────────────────────

function CourseCard({
  course, modules, enrollmentId, index, defaultOpen,
}: {
  course: { id: string; title: string } | null;
  modules: any[];
  enrollmentId: string;
  index: number;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const accent = COURSE_ACCENTS[index % COURSE_ACCENTS.length];

  const allLessons = modules.flatMap((m: any) => m?.lessons ?? []);
  const completedCount = allLessons.filter((l: any) => l.completed).length;
  const totalCount = allLessons.length;
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const statusLabel = pct === 100 ? "Done" : pct > 0 ? `${pct}%` : "Not started";
  const statusClass  = pct === 100
    ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
    : pct > 0
    ? "bg-amber-50 text-amber-700"
    : "bg-slate-100 text-slate-400";

  return (
    <div className={cn(
      "rounded-2xl border bg-white overflow-hidden transition-all duration-200",
      open ? "border-slate-300 shadow-md" : "border-slate-200 shadow-sm"
    )}>
      {/* Header */}
      <div
        className="flex items-center gap-4 px-5 py-4 cursor-pointer select-none hover:bg-slate-50/60 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        {/* Course number badge */}
        <div className={cn(
          "w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center font-black text-navy-700 text-sm",
          accent.bg
        )}>
          {index + 1}
        </div>

        {/* Course info + progress */}
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-navy-900 text-sm leading-snug truncate mb-1.5">
            {course?.title ?? "Course Content"}
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-500", pct === 100 ? "bg-emerald-500" : accent.bar)}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[10px] font-medium text-slate-400 flex-shrink-0 whitespace-nowrap">
              {completedCount}/{totalCount}
            </span>
          </div>
        </div>

        {/* Status + chevron */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", statusClass)}>
            {statusLabel}
          </span>
          <div className={cn(
            "w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200",
            open ? "bg-navy-900" : "bg-slate-100 hover:bg-slate-200"
          )}>
            <ChevronDown
              size={14}
              className={cn("transition-transform duration-200", open ? "rotate-180 text-white" : "text-slate-400")}
            />
          </div>
        </div>
      </div>

      {/* Expandable module + lesson list */}
      <div className={cn("overflow-hidden transition-all duration-300 ease-in-out", open ? "max-h-[1200px]" : "max-h-0")}>
        <div className="px-5 pb-5 space-y-3">
          {modules.map((mod: any, mi: number) => (
            <div key={mod.id} className="rounded-xl border border-slate-100 overflow-hidden">
              {/* Module header */}
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-navy-900 text-xs truncate">
                    {modules.length > 1 ? `Module ${mi + 1}: ` : ""}{mod.title}
                  </p>
                  {mod.description && (
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">{mod.description}</p>
                  )}
                </div>
                <span className={cn(
                  "flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full",
                  mod.completed_count === mod.total_count && mod.total_count > 0
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-200 text-slate-500"
                )}>
                  {mod.completed_count}/{mod.total_count}
                </span>
              </div>

              {/* Lessons */}
              <div className="divide-y divide-slate-50">
                {(mod.lessons ?? []).map((lesson: any) => {
                  const Icon = LESSON_ICONS[lesson.type] ?? FileText;
                  const color = LESSON_COLORS[lesson.type] ?? "text-slate-400";
                  return (
                    <Link
                      key={lesson.id}
                      href={`/learn/${enrollmentId}/lesson/${lesson.id}`}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors group"
                    >
                      {lesson.completed ? (
                        <CheckCircle size={14} className="text-emerald-500 flex-shrink-0" />
                      ) : (
                        <Circle size={14} className="text-slate-200 group-hover:text-slate-300 flex-shrink-0" />
                      )}
                      <Icon size={12} className={cn("flex-shrink-0", color)} />
                      <span className={cn(
                        "flex-1 text-xs truncate",
                        lesson.completed ? "text-slate-400" : "text-slate-700 group-hover:text-navy-900"
                      )}>
                        {lesson.title}
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 flex-shrink-0">
                        <Clock size={9} /> {lesson.duration_minutes}m
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CourseOverviewPage() {
  const { enrollmentId } = useParams<{ enrollmentId: string }>();
  const token = useAuthStore((s) => s.accessToken)!;

  const { data, isLoading } = useSWR(
    token ? [`/learn/${enrollmentId}`, token] : null,
    ([url, t]) => fetcher(url, t)
  );

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-[72px] rounded-2xl bg-slate-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const { enrollment, certification: cert, modules, certificate } = data;
  const linkedCourses: any[] = data.linked_courses ?? [];
  const allLessons = (modules ?? []).flatMap((m: any) => m?.lessons ?? []);
  const completedCount = allLessons.filter((l: any) => l.completed).length;
  const firstIncomplete = allLessons.find((l: any) => !l.completed);
  const pct = enrollment.progress_percentage ?? 0;

  // Build per-course entries — always separate, even for single-course certs
  const courseEntries = linkedCourses.length > 0
    ? linkedCourses.map((c) => ({
        course: c,
        modules: (modules ?? []).filter((m: any) => m._source_course_id === c.id),
      }))
    : [{ course: null, modules: modules ?? [] }];

  // Auto-open the course containing the first incomplete lesson
  const firstIncompleteCourseIdx = courseEntries.findIndex(({ modules: mods }) =>
    mods.flatMap((m: any) => m?.lessons ?? []).some((l: any) => !l.completed)
  );
  const defaultOpenIdx = firstIncompleteCourseIdx >= 0 ? firstIncompleteCourseIdx : 0;

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">

      {/* Cert hero */}
      <div className="mb-7">
        <div className="flex items-center gap-4 mb-4">
          <span className="text-5xl">{cert?.badge_icon}</span>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-0.5">{cert?.acronym}®</p>
            <h1 className="text-2xl font-display font-black text-navy-900 leading-tight">{cert?.title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-3 mb-1.5">
          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", pct === 100 ? "bg-emerald-500" : "bg-navy-600")}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-navy-700 whitespace-nowrap">{pct}%</span>
        </div>
        <p className="text-xs text-slate-400">{completedCount} of {allLessons.length} lessons completed</p>
      </div>

      {/* Certificate earned */}
      {certificate && (
        <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3">
          <Award size={20} className="text-amber-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-amber-800 text-sm">Certificate Earned</p>
            <p className="text-xs text-amber-600">{certificate.certificate_number}</p>
          </div>
          <Link href="/certificates" className="ml-auto text-xs font-semibold text-amber-700 hover:text-amber-900">
            View →
          </Link>
        </div>
      )}

      {/* All lessons complete banner */}
      {!certificate && pct === 100 && (
        <div className="mb-5 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
          <CheckCircle size={20} className="text-emerald-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-emerald-800 text-sm">All lessons complete!</p>
            <p className="text-xs text-emerald-600">You can now take the certification exam.</p>
          </div>
        </div>
      )}

      {/* Continue CTA */}
      {firstIncomplete && (
        <Link
          href={`/learn/${enrollmentId}/lesson/${firstIncomplete.id}`}
          className="flex items-center gap-3 mb-6 p-4 bg-navy-900 hover:bg-navy-800 rounded-2xl transition-colors group"
        >
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
            <Play size={16} className="text-white fill-white ml-0.5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm">{pct > 0 ? "Continue Learning" : "Start Learning"}</p>
            <p className="text-white/50 text-xs truncate mt-0.5">{firstIncomplete.title}</p>
          </div>
        </Link>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Courses",   value: linkedCourses.length || 1 },
          { label: "Lessons",   value: allLessons.length },
          { label: "Completed", value: `${completedCount}/${allLessons.length}` },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-slate-100 bg-white px-4 py-3 text-center shadow-sm">
            <p className="text-lg font-black text-navy-900">{value}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</p>
          </div>
        ))}
      </div>

      {/* Exam CTA */}
      {pct === 100 && !certificate && (
        <Link
          href={`/learn/${enrollmentId}/exam`}
          className="flex items-center gap-3 mb-6 p-4 bg-emerald-600 hover:bg-emerald-700 rounded-2xl transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <ClipboardList size={18} className="text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Book & Take Your Exam</p>
            <p className="text-white/70 text-xs mt-0.5">All lessons done — schedule your proctored exam</p>
          </div>
        </Link>
      )}

      {/* Per-course accordion list */}
      <div className="space-y-3">
        {courseEntries.map(({ course, modules: courseMods }, i) => (
          <CourseCard
            key={course?.id ?? "default"}
            course={course}
            modules={courseMods}
            enrollmentId={enrollmentId}
            index={i}
            defaultOpen={i === defaultOpenIdx}
          />
        ))}
      </div>

    </div>
  );
}
