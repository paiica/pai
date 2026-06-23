"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import {
  CheckCircle, Circle, Video, FileText, HelpCircle,
  File, Download, Link2, Award, BookOpen, Clock, Play, ClipboardList,
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

export default function CourseOverviewPage() {
  const { enrollmentId } = useParams<{ enrollmentId: string }>();
  const token = useAuthStore((s) => s.accessToken)!;

  const { data, isLoading } = useSWR(
    token ? [`/learn/${enrollmentId}`, token] : null,
    ([url, t]) => fetcher(url, t)
  );

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto p-8 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-slate-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const { enrollment, certification: cert, modules, certificate } = data;
  const allLessons = (modules ?? []).flatMap((m: any) => m?.lessons ?? []);
  const completed = allLessons.filter((l: any) => l.completed).length;
  const firstIncomplete = allLessons.find((l: any) => !l.completed);
  const pct = enrollment.progress_percentage ?? 0;

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">

      {/* Course hero */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <span className="text-5xl">{cert?.badge_icon}</span>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
              {cert?.acronym}®
            </p>
            <h1 className="text-2xl font-display font-black text-navy-900 leading-tight">
              {cert?.title}
            </h1>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-3 mb-2">
          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                pct === 100 ? "bg-emerald-500" : "bg-navy-600"
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-navy-700 whitespace-nowrap">
            {pct}% complete
          </span>
        </div>
        <p className="text-xs text-slate-400">
          {completed} of {allLessons.length} lessons completed
        </p>
      </div>

      {/* Certificate earned */}
      {certificate && (
        <div className="mb-6 p-4 bg-gold-50 border border-gold-200 rounded-xl flex items-center gap-3">
          <Award size={20} className="text-gold-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-gold-800 text-sm">Certificate Earned</p>
            <p className="text-xs text-gold-600">{certificate.certificate_number}</p>
          </div>
          <Link
            href="/certificates"
            className="ml-auto text-xs font-semibold text-gold-700 hover:text-gold-900"
          >
            View →
          </Link>
        </div>
      )}

      {/* All lessons complete, ready for exam */}
      {!certificate && pct === 100 && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
          <CheckCircle size={20} className="text-emerald-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-emerald-800 text-sm">All lessons complete!</p>
            <p className="text-xs text-emerald-600">You can now take the certification exam.</p>
          </div>
        </div>
      )}

      {/* CTA */}
      {firstIncomplete && (
        <Link
          href={`/learn/${enrollmentId}/lesson/${firstIncomplete.id}`}
          className="flex items-center gap-3 mb-8 p-4 bg-navy-900 hover:bg-navy-700 rounded-xl transition-colors group"
        >
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
            <Play size={16} className="text-white fill-white ml-0.5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm">
              {pct > 0 ? "Continue where you left off" : "Start Learning"}
            </p>
            <p className="text-white/50 text-xs truncate mt-0.5">{firstIncomplete.title}</p>
          </div>
        </Link>
      )}

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { icon: BookOpen, label: "Modules", value: modules.length },
          { icon: Clock, label: "Total", value: `${cert?.total_hours ?? "—"}h` },
          { icon: CheckCircle, label: "Completed", value: `${completed}/${allLessons.length}` },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-center">
            <Icon size={16} className="mx-auto text-slate-400 mb-1" />
            <p className="text-lg font-black text-navy-900">{value}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</p>
          </div>
        ))}
      </div>

      {/* Exam CTA */}
      {pct === 100 && !certificate && (
        <Link
          href={`/learn/${enrollmentId}/exam`}
          className="flex items-center gap-3 mb-8 p-4 bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors group"
        >
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <ClipboardList size={18} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="text-white font-semibold text-sm">Book & Take Your Exam</p>
            <p className="text-white/70 text-xs mt-0.5">You've finished all lessons — schedule your proctored exam</p>
          </div>
        </Link>
      )}

      {/* Module list */}
      <div className="space-y-4">
        {modules.map((mod: any, mi: number) => (
          <div key={mod.id} className="rounded-xl border border-slate-200 overflow-hidden">
            {/* Module header */}
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="font-semibold text-navy-900 text-sm">
                  Module {mi + 1}: {mod.title}
                </p>
                {mod.description && (
                  <p className="text-xs text-slate-500 mt-0.5">{mod.description}</p>
                )}
              </div>
              <span className={cn(
                "text-xs font-semibold px-2.5 py-0.5 rounded-full",
                mod.completed_count === mod.total_count && mod.total_count > 0
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-200 text-slate-500"
              )}>
                {mod.completed_count}/{mod.total_count}
              </span>
            </div>

            {/* Lessons */}
            <div className="divide-y divide-slate-50">
              {mod.lessons.map((lesson: any) => {
                const Icon = LESSON_ICONS[lesson.type] ?? FileText;
                const color = LESSON_COLORS[lesson.type] ?? "text-slate-400";
                return (
                  <Link
                    key={lesson.id}
                    href={`/learn/${enrollmentId}/lesson/${lesson.id}`}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors group"
                  >
                    <div className="flex-shrink-0">
                      {lesson.completed ? (
                        <CheckCircle size={16} className="text-emerald-500" />
                      ) : (
                        <Circle size={16} className="text-slate-200 group-hover:text-slate-300" />
                      )}
                    </div>
                    <Icon size={14} className={cn("flex-shrink-0", color)} />
                    <span className={cn(
                      "flex-1 text-sm",
                      lesson.completed ? "text-slate-400" : "text-slate-700 group-hover:text-navy-900"
                    )}>
                      {lesson.title}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1 flex-shrink-0">
                      <Clock size={11} /> {lesson.duration_minutes}m
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
