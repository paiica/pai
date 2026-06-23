"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { BookOpen, Clock, Play, ChevronRight, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r) => r.data ?? r);
}

export default function CoursePrepOverviewPage() {
  const { enrollmentId } = useParams<{ enrollmentId: string }>();
  const token = useAuthStore((s) => s.accessToken)!;

  const { data, isLoading } = useSWR(
    token ? [`/prep-courses/learn/${enrollmentId}`, token] : null,
    ([url, t]) => fetcher(url, t)
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-slate-300" />
      </div>
    );
  }

  if (!data) return null;

  const modules: any[] = Array.isArray(data.modules) ? data.modules : [];
  const totalLessons = modules.reduce((s: number, m: any) => s + (Array.isArray(m.lessons) ? m.lessons.length : 0), 0);
  const firstLesson = modules.flatMap((m: any) => Array.isArray(m.lessons) ? m.lessons : [])[0];

  return (
    <div className="max-w-3xl mx-auto p-8">
      {/* Course header */}
      <div className="mb-8">
        {data.cert_acronym && (
          <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full bg-blue-50 text-blue-700 mb-3">
            {data.cert_acronym} — {data.cert_title}
          </span>
        )}
        <h1 className="text-2xl font-display font-black text-navy-900 mb-2">{data.title}</h1>
        {data.description && (
          <p className="text-slate-600 text-sm leading-relaxed mb-4">{data.description}</p>
        )}
        <div className="flex items-center gap-4 text-xs text-slate-500">
          {data.duration_hours > 0 && (
            <span className="flex items-center gap-1.5"><Clock size={12} /> {data.duration_hours}h of content</span>
          )}
          <span className="flex items-center gap-1.5"><BookOpen size={12} /> {totalLessons} lessons</span>
          <span className="flex items-center gap-1.5">{modules.length} modules</span>
        </div>
      </div>

      {/* Start / progress CTA */}
      {firstLesson && (
        <Link
          href={`/learn/course/${enrollmentId}/lesson/${firstLesson.id}`}
          className="inline-flex items-center gap-2 bg-navy-900 hover:bg-navy-700 text-white text-sm font-bold px-6 py-3 rounded-xl transition-colors mb-8"
        >
          <Play size={14} className="fill-white" />
          {(data.progress_percentage ?? 0) > 0 ? "Continue Course" : "Start Course"}
        </Link>
      )}

      {/* Module list */}
      <div className="space-y-3">
        {modules.map((mod: any, mi: number) => {
          const lessons: any[] = Array.isArray(mod.lessons) ? mod.lessons : [];
          return (
            <div key={mod.id} className="rounded-2xl border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 bg-slate-50">
                <div>
                  <p className="font-semibold text-navy-900 text-sm">{mod.title}</p>
                  {mod.description && <p className="text-xs text-slate-500 mt-0.5">{mod.description}</p>}
                </div>
                <span className="text-xs text-slate-400">{lessons.length} lesson{lessons.length !== 1 ? "s" : ""}</span>
              </div>
              {lessons.length > 0 && (
                <div className="divide-y divide-slate-100">
                  {lessons.map((lesson: any) => (
                    <Link
                      key={lesson.id}
                      href={`/learn/course/${enrollmentId}/lesson/${lesson.id}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors group"
                    >
                      <BookOpen size={13} className="text-slate-400 flex-shrink-0" />
                      <span className="text-sm text-slate-700 flex-1 group-hover:text-navy-900 transition-colors">{lesson.title}</span>
                      {lesson.duration_minutes > 0 && (
                        <span className="text-xs text-slate-400">{lesson.duration_minutes}m</span>
                      )}
                      <ChevronRight size={13} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
