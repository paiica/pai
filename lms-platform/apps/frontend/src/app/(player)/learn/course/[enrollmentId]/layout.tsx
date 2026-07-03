"use client";

import { useState, useMemo } from "react";
import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import {
  ChevronLeft, ChevronRight, ChevronDown,
  Video, FileText, HelpCircle, File, Download, Link2,
  Menu, Search, X, BookOpen,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const LESSON_ICONS: Record<string, React.ElementType> = {
  video: Video, reading: FileText, quiz: HelpCircle,
  assignment: File, download: Download, live_session: Link2,
};

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r) => r.data ?? r);
}

function ModuleSection({
  mod, enrollmentId, currentLessonId, search,
}: { mod: any; enrollmentId: string; currentLessonId: string | null; search: string }) {
  const [open, setOpen] = useState(true);
  const lessons: any[] = Array.isArray(mod.lessons) ? mod.lessons : [];
  const filtered = search ? lessons.filter(l => l.title.toLowerCase().includes(search.toLowerCase())) : lessons;
  if (search && filtered.length === 0) return null;

  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-start gap-2.5 px-4 py-3.5 text-left hover:bg-slate-50 transition-colors"
      >
        <ChevronDown size={16} className={cn("mt-0.5 flex-shrink-0 text-slate-400 transition-transform", !open && "-rotate-90")} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-navy-900 leading-snug">{mod.title}</p>
          <p className="text-xs text-slate-400 mt-0.5">{lessons.length} lesson{lessons.length !== 1 ? "s" : ""}</p>
        </div>
      </button>
      {open && (
        <div>
          {filtered.map((lesson: any) => {
            const Icon = LESSON_ICONS[lesson.type] ?? FileText;
            const isActive = lesson.id === currentLessonId;
            return (
              <Link
                key={lesson.id}
                href={`/learn/course/${enrollmentId}/lesson/${lesson.id}`}
                className={cn(
                  "flex items-center gap-3 pl-9 pr-4 py-3 hover:bg-slate-50 transition-colors relative group",
                  isActive && "bg-blue-50"
                )}
              >
                {isActive && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-600 rounded-r-full" />}
                <Icon size={16} className={cn("flex-shrink-0", isActive ? "text-blue-600" : "text-slate-400")} />
                <span className={cn("flex-1 text-sm leading-snug line-clamp-2", isActive ? "text-blue-700 font-semibold" : "text-slate-700")}>
                  {lesson.title}
                </span>
                {lesson.duration_minutes > 0 && (
                  <span className="text-xs text-slate-400 flex-shrink-0">{lesson.duration_minutes}m</span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function CoursePrepPlayerLayout({ children }: { children: React.ReactNode }) {
  const { enrollmentId } = useParams<{ enrollmentId: string }>();
  const pathname = usePathname();
  const token = useAuthStore((s) => s.accessToken)!;
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [search, setSearch] = useState("");

  const lessonMatch = pathname.match(/\/lesson\/([^/]+)/);
  const currentLessonId = lessonMatch?.[1] ?? null;

  const { data } = useSWR(
    token && enrollmentId ? [`/prep-courses/learn/${enrollmentId}`, token] : null,
    ([url, t]) => fetcher(url, t)
  );

  const modules: any[] = data?.modules ?? [];
  const allLessons = useMemo(() => modules.flatMap((m: any) => Array.isArray(m.lessons) ? m.lessons : []), [modules]);
  const currentIdx = allLessons.findIndex((l: any) => l.id === currentLessonId);
  const prevLesson = currentIdx > 0 ? allLessons[currentIdx - 1] : null;
  const nextLesson = currentIdx >= 0 && currentIdx < allLessons.length - 1 ? allLessons[currentIdx + 1] : null;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white">
      {/* Top bar */}
      <div className="h-14 bg-[#1a1f3c] flex items-center px-4 gap-3 flex-shrink-0 border-b border-white/10">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          <Menu size={17} />
        </button>
        <div className="h-5 w-px bg-white/20" />
        <Link href="/learn" className="flex items-center gap-1 text-white/60 hover:text-white text-xs font-medium transition-colors whitespace-nowrap">
          <ChevronLeft size={14} /> My Courses
        </Link>
        <div className="h-5 w-px bg-white/20" />
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-6 h-6 rounded bg-blue-500/20 flex items-center justify-center flex-shrink-0">
            <BookOpen size={13} className="text-blue-400" />
          </div>
          <span className="text-white font-semibold text-sm truncate">{data?.title ?? "Loading…"}</span>
        </div>
        {currentLessonId && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-white/40 text-xs">
              <span className="hidden sm:inline">Lesson </span>
              {currentIdx + 1}<span className="hidden sm:inline"> of {allLessons.length}</span>
              <span className="sm:hidden">/{allLessons.length}</span>
            </span>
            <Link
              href={prevLesson ? `/learn/course/${enrollmentId}/lesson/${prevLesson.id}` : `/learn/course/${enrollmentId}`}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <ChevronLeft size={15} />
            </Link>
            {nextLesson ? (
              <Link
                href={`/learn/course/${enrollmentId}/lesson/${nextLesson.id}`}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <ChevronRight size={15} />
              </Link>
            ) : (
              <Link
                href={`/learn/course/${enrollmentId}`}
                className="h-8 px-3 rounded-lg bg-blue-500 hover:bg-blue-400 flex items-center justify-center text-white text-xs font-semibold transition-colors"
              >
                Finish
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {sidebarOpen && (
          <div className="w-80 flex-shrink-0 border-r border-slate-200 flex flex-col overflow-hidden bg-white">
            <div className="px-3 py-3 border-b border-slate-100">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search lessons"
                  className="w-full pl-9 pr-7 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-navy-200 bg-slate-50"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {modules.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-sm">Loading…</div>
              ) : (
                modules.map((mod: any) => (
                  <ModuleSection key={mod.id} mod={mod} enrollmentId={enrollmentId} currentLessonId={currentLessonId} search={search} />
                ))
              )}
            </div>
          </div>
        )}
        <main className="flex-1 min-w-0 overflow-y-auto bg-white">{children}</main>
      </div>
    </div>
  );
}
