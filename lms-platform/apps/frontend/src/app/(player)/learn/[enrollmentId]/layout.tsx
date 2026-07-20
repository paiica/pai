"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import {
  ChevronLeft, ChevronRight, ChevronDown,
  CheckCircle, Circle, Video, FileText, HelpCircle,
  File, Download, Link2, Menu, Search, X, GraduationCap,
  Maximize, Minimize,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const LESSON_ICONS: Record<string, React.ElementType> = {
  video: Video,
  reading: FileText,
  quiz: HelpCircle,
  assignment: File,
  download: Download,
  live_session: Link2,
};

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r) => r.data);
}

// ─── Module section in sidebar ─────────────────────────────────────────────────

function ModuleSection({
  mod, mi, enrollmentId, currentLessonId, search,
}: {
  mod: any; mi: number; enrollmentId: string; currentLessonId: string | null; search: string;
}) {
  const hasActive = mod.lessons.some((l: any) => l.id === currentLessonId);
  const [open, setOpen] = useState(true);

  const filteredLessons = search
    ? mod.lessons.filter((l: any) => l.title.toLowerCase().includes(search.toLowerCase()))
    : mod.lessons;

  if (search && filteredLessons.length === 0) return null;

  return (
    <div className="border-b border-slate-100 last:border-0">
      {/* Module header */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full flex items-start gap-2.5 px-4 py-3.5 text-left hover:bg-slate-50 transition-colors",
          hasActive && "bg-blue-50/50"
        )}
      >
        <ChevronDown
          size={16}
          className={cn(
            "mt-0.5 flex-shrink-0 text-slate-400 transition-transform",
            !open && "-rotate-90"
          )}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-navy-900 leading-snug">
            {mod.title}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {mod.completed_count}/{mod.total_count} Completed
          </p>
        </div>
      </button>

      {/* Lessons */}
      {open && (
        <div>
          {filteredLessons.map((lesson: any) => {
            const Icon = LESSON_ICONS[lesson.type] ?? FileText;
            const isActive = lesson.id === currentLessonId;

            return (
              <Link
                key={lesson.id}
                href={`/learn/${enrollmentId}/lesson/${lesson.id}`}
                className={cn(
                  "flex items-center gap-3 pl-9 pr-4 py-3 text-left hover:bg-slate-50 transition-colors relative group",
                  isActive && "bg-blue-50"
                )}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-600 rounded-r-full" />
                )}

                <Icon
                  size={16}
                  className={cn(
                    "flex-shrink-0",
                    isActive ? "text-blue-600" : "text-slate-400"
                  )}
                />

                <span
                  className={cn(
                    "flex-1 text-sm leading-snug line-clamp-2",
                    isActive
                      ? "text-blue-700 font-semibold"
                      : lesson.completed
                      ? "text-slate-400"
                      : "text-slate-700"
                  )}
                >
                  {lesson.title}
                </span>

                <div className="flex-shrink-0">
                  {lesson.completed ? (
                    <CheckCircle size={15} className="text-emerald-500" />
                  ) : (
                    <Circle size={15} className="text-slate-200 group-hover:text-slate-300" />
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Layout ────────────────────────────────────────────────────────────────────

export default function CoursePlayerLayout({ children }: { children: React.ReactNode }) {
  const { enrollmentId } = useParams<{ enrollmentId: string }>();
  const pathname = usePathname();
  const token = useAuthStore((s) => s.accessToken)!;

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  const lessonMatch = pathname.match(/\/lesson\/([^/]+)/);
  const currentLessonId = lessonMatch?.[1] ?? null;

  const { data } = useSWR(
    token && enrollmentId ? [`/learn/${enrollmentId}`, token] : null,
    ([url, t]) => fetcher(url, t)
  );

  const cert = data?.certification;
  const modules: any[] = data?.modules ?? [];

  const allLessons = useMemo(
    () => modules.flatMap((m) => m.lessons.map((l: any) => ({ ...l, moduleId: m.id, moduleTitle: m.title }))),
    [modules]
  );
  const currentIdx = allLessons.findIndex((l) => l.id === currentLessonId);
  const prevLesson = currentIdx > 0 ? allLessons[currentIdx - 1] : null;
  const nextLesson =
    currentIdx >= 0 && currentIdx < allLessons.length - 1
      ? allLessons[currentIdx + 1]
      : null;
  const nextStartsNewModule =
    !!nextLesson && allLessons[currentIdx]?.moduleId !== nextLesson.moduleId;

  const totalCompleted = allLessons.filter((l) => l.completed).length;
  const progressPct =
    allLessons.length > 0
      ? Math.round((totalCompleted / allLessons.length) * 100)
      : 0;

  return (
    <div ref={containerRef} className="flex flex-col h-screen overflow-hidden bg-white">

      {/* ── Top bar ────────────────────────────────────────────────────────── */}
      <div className="h-14 bg-[#1a1f3c] flex items-center px-4 gap-3 flex-shrink-0 border-b border-white/10">
        {/* Sidebar toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          <Menu size={17} />
        </button>

        {/* Fullscreen toggle */}
        <button
          onClick={toggleFullscreen}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          title={isFullscreen ? "Exit full screen" : "Full screen"}
        >
          {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
        </button>

        {/* Divider */}
        <div className="h-5 w-px bg-white/20" />

        {/* Back */}
        <Link
          href="/learn"
          className="flex items-center gap-1 text-white/60 hover:text-white text-xs font-medium transition-colors whitespace-nowrap"
        >
          <ChevronLeft size={14} /> My Courses
        </Link>

        {/* Divider */}
        <div className="h-5 w-px bg-white/20" />

        {/* Course name */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-6 h-6 rounded bg-gold-500/20 flex items-center justify-center flex-shrink-0">
            <GraduationCap size={13} className="text-gold-400" />
          </div>
          <span className="text-white font-semibold text-sm truncate">
            {cert?.title ?? "Loading…"}
          </span>
        </div>

        {/* Progress */}
        {!currentLessonId && allLessons.length > 0 && (
          <div className="hidden sm:flex items-center gap-2 mr-2">
            <div className="w-24 h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gold-400 rounded-full"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-white/40 text-xs">{progressPct}%</span>
          </div>
        )}

        {/* Lesson navigation */}
        {currentLessonId && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-white/40 text-xs hidden sm:block">
              {currentIdx + 1}/{allLessons.length}
            </span>
            <Link
              href={
                prevLesson
                  ? `/learn/${enrollmentId}/lesson/${prevLesson.id}`
                  : `/learn/${enrollmentId}`
              }
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              title="Previous lesson"
            >
              <ChevronLeft size={15} />
            </Link>
            {nextLesson ? (
              <Link
                href={`/learn/${enrollmentId}/lesson/${nextLesson.id}`}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                title="Next lesson"
              >
                <ChevronRight size={15} />
              </Link>
            ) : (
              <Link
                href={`/learn/${enrollmentId}`}
                className="h-8 px-3 rounded-lg bg-gold-500 hover:bg-gold-400 flex items-center justify-center text-white text-xs font-semibold transition-colors"
              >
                Finish
              </Link>
            )}
          </div>
        )}
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* Left sidebar */}
        {sidebarOpen && (
          <div className="w-80 flex-shrink-0 border-r border-slate-200 flex flex-col overflow-hidden bg-white">
            {/* Search */}
            <div className="px-3 py-3 border-b border-slate-100">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search titles, descriptions"
                  className="w-full pl-9 pr-7 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-navy-200 focus:border-navy-300 bg-slate-50"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Module list */}
            <div className="flex-1 overflow-y-auto">
              {modules.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-sm">Loading…</div>
              ) : (
                modules.map((mod: any, mi: number) => (
                  <ModuleSection
                    key={mod.id}
                    mod={mod}
                    mi={mi}
                    enrollmentId={enrollmentId}
                    currentLessonId={currentLessonId}
                    search={search}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0 overflow-y-auto bg-white">
          {children}
          {currentLessonId && (
            <div className="max-w-3xl mx-auto px-6 pb-16 pt-2">
              <div className="flex items-center justify-between gap-4 p-5 rounded-2xl border border-slate-200 bg-slate-50">
                <div className="min-w-0">
                  <p className="text-xs text-slate-400 font-medium mb-0.5">
                    {nextLesson ? (nextStartsNewModule ? "Next module" : "Up next") : "Course complete"}
                  </p>
                  <p className="text-sm font-semibold text-navy-900 truncate">
                    {nextLesson
                      ? (nextStartsNewModule ? nextLesson.moduleTitle : nextLesson.title)
                      : "You've reached the end of this course"}
                  </p>
                </div>
                <Link
                  href={nextLesson ? `/learn/${enrollmentId}/lesson/${nextLesson.id}` : `/learn/${enrollmentId}`}
                  className="btn-primary !py-2.5 !px-5 flex items-center gap-2 flex-shrink-0"
                >
                  {nextLesson ? (nextStartsNewModule ? "Next Module" : "Next Lesson") : "Finish"} <ChevronRight size={16} />
                </Link>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
