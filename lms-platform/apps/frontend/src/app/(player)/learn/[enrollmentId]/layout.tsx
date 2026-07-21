"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import {
  ChevronLeft, ChevronRight, ChevronDown,
  CheckCircle, Circle, Video, FileText, HelpCircle,
  File, Download, Link2, Menu, Search, X, GraduationCap,
  Maximize, Minimize, StickyNote, Check,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import AiProfessorWidget from "@/components/AiProfessorWidget";
import ContentZoomControl from "@/components/ContentZoomControl";
import { useContentZoom } from "@/lib/useContentZoom";

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
  mod, mi, enrollmentId, currentLessonId, search, onNavigate,
}: {
  mod: any; mi: number; enrollmentId: string; currentLessonId: string | null; search: string; onNavigate: () => void;
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
          hasActive && "bg-teal-50/60"
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
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 pl-9 pr-4 py-3 text-left hover:bg-slate-50 transition-colors relative group",
                  isActive && "bg-teal-50"
                )}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-teal-600 rounded-r-full" />
                )}

                <Icon
                  size={16}
                  className={cn(
                    "flex-shrink-0",
                    isActive ? "text-teal-600" : "text-slate-400"
                  )}
                />

                <span
                  className={cn(
                    "flex-1 text-sm leading-snug line-clamp-2",
                    isActive
                      ? "text-teal-700 font-semibold"
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

// ─── Notes panel ────────────────────────────────────────────────────────────

function NotesPanel({
  enrollmentId, lessonId, token, onClose,
}: { enrollmentId: string; lessonId: string; token: string; onClose: () => void }) {
  const { data } = useSWR(
    [`/learn/${enrollmentId}/lesson/${lessonId}/note`, token],
    ([url, t]) => api.get<any>(url, t).then((r) => (r as any).data ?? r)
  );

  const [content, setContent] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const loadedLessonRef = useRef<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (data && loadedLessonRef.current !== lessonId) {
      setContent(data.content ?? "");
      loadedLessonRef.current = lessonId;
    }
  }, [data, lessonId]);

  function handleChange(value: string) {
    setContent(value);
    setSaveState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await api.put(`/learn/${enrollmentId}/lesson/${lessonId}/note`, { content: value }, token);
        setSaveState("saved");
      } catch {
        setSaveState("idle");
      }
    }, 1000);
  }

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  return (
    <div className="fixed right-0 top-14 bottom-0 w-96 max-w-full z-40 bg-white border-l border-slate-200 shadow-2xl flex flex-col">
      <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-slate-100 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
          <StickyNote size={15} className="text-teal-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-navy-900">My Notes</p>
          <p className="text-[11px] text-slate-400 flex items-center gap-1">
            {saveState === "saving" && "Saving…"}
            {saveState === "saved" && (<><Check size={10} className="text-emerald-500" /> Saved</>)}
            {saveState === "idle" && "Private — only you can see this"}
          </p>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0">
          <X size={16} />
        </button>
      </div>
      <textarea
        value={content}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Jot down anything you want to remember from this lesson…"
        className="flex-1 p-4 text-sm text-slate-700 leading-relaxed resize-none focus:outline-none"
      />
    </div>
  );
}

// ─── Layout ────────────────────────────────────────────────────────────────────

export default function CoursePlayerLayout({ children }: { children: React.ReactNode }) {
  const { enrollmentId } = useParams<{ enrollmentId: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken)!;

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notesOpen, setNotesOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [readingPct, setReadingPct] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const zoom = useContentZoom();

  // Sidebar defaults open on desktop, closed on mobile (it's a full-screen
  // overlay drawer below the lg breakpoint — see className below).
  useEffect(() => {
    setSidebarOpen(window.innerWidth >= 1024);
  }, []);

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

  function closeSidebarOnMobile() {
    if (window.innerWidth < 1024) setSidebarOpen(false);
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

  // Keyboard shortcuts — left/right arrow between lessons. Ignored while
  // typing in the notes textarea, the AI Professor chat input, or the
  // sidebar search box.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;
      if (!currentLessonId) return;
      if (e.key === "ArrowLeft" && prevLesson) {
        router.push(`/learn/${enrollmentId}/lesson/${prevLesson.id}`);
      } else if (e.key === "ArrowRight" && nextLesson) {
        router.push(`/learn/${enrollmentId}/lesson/${nextLesson.id}`);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentLessonId, prevLesson, nextLesson, enrollmentId, router]);

  // Reading progress bar — fills as the student scrolls through the current
  // lesson's content.
  const handleScroll = useCallback(() => {
    const el = mainRef.current;
    if (!el) return;
    const scrollable = el.scrollHeight - el.clientHeight;
    setReadingPct(scrollable > 0 ? Math.min(100, Math.round((el.scrollTop / scrollable) * 100)) : 0);
  }, []);

  useEffect(() => {
    setReadingPct(0);
    mainRef.current?.scrollTo({ top: 0 });
  }, [currentLessonId]);

  return (
    <div ref={containerRef} className="flex flex-col h-screen overflow-hidden bg-white">

      {/* ── Top bar ────────────────────────────────────────────────────────── */}
      <div className="h-14 bg-[#171527] flex items-center px-4 gap-3 flex-shrink-0 border-b border-white/10">
        {/* Sidebar toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          <Menu size={17} />
        </button>

        {/* Notes toggle */}
        <button
          onClick={() => setNotesOpen((o) => !o)}
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
            notesOpen ? "text-teal-400 bg-white/10" : "text-white/60 hover:text-white hover:bg-white/10"
          )}
          title="My notes"
        >
          <StickyNote size={16} />
        </button>

        {/* Fullscreen toggle */}
        <button
          onClick={toggleFullscreen}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          title={isFullscreen ? "Exit full screen" : "Full screen"}
        >
          {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
        </button>

        {/* Content zoom */}
        <ContentZoomControl
          zoomLevel={zoom.zoomLevel}
          min={zoom.min}
          max={zoom.max}
          onZoomIn={zoom.zoomIn}
          onZoomOut={zoom.zoomOut}
          onReset={zoom.reset}
        />

        {/* Divider */}
        <div className="h-5 w-px bg-white/20 hidden sm:block" />

        {/* Back */}
        <Link
          href="/learn"
          className="hidden sm:flex items-center gap-1 text-white/60 hover:text-white text-xs font-medium transition-colors whitespace-nowrap"
        >
          <ChevronLeft size={14} /> My Courses
        </Link>

        {/* Divider */}
        <div className="h-5 w-px bg-white/20 hidden sm:block" />

        {/* Course name */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-6 h-6 rounded bg-teal-500/20 flex items-center justify-center flex-shrink-0">
            <GraduationCap size={13} className="text-teal-400" />
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
                className="h-full bg-teal-400 rounded-full"
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
                className="h-8 px-3 rounded-lg bg-teal-500 hover:bg-teal-400 flex items-center justify-center text-white text-xs font-semibold transition-colors"
              >
                Finish
              </Link>
            )}
          </div>
        )}
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 relative">

        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 top-14 z-30 bg-black/40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Left sidebar */}
        <div
          className={cn(
            "flex-shrink-0 border-r border-slate-200 flex flex-col overflow-hidden bg-white transition-transform duration-300 z-40",
            "fixed inset-y-14 left-0 w-[85vw] max-w-sm shadow-2xl",
            "lg:static lg:inset-auto lg:w-80 lg:max-w-none lg:shadow-none lg:translate-x-0 lg:transition-none",
            sidebarOpen ? "translate-x-0" : "-translate-x-full",
            !sidebarOpen && "lg:hidden"
          )}
        >
          {/* Search */}
          <div className="px-3 py-3 border-b border-slate-100">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search titles, descriptions"
                className="w-full pl-9 pr-7 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-300 bg-slate-50"
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
                  onNavigate={closeSidebarOnMobile}
                />
              ))
            )}
          </div>
        </div>

        {/* Main content */}
        <main ref={mainRef} onScroll={handleScroll} className="flex-1 min-w-0 overflow-y-auto bg-white">
          {currentLessonId && (
            <div className="sticky top-0 z-20 h-[3px] bg-slate-100">
              <div className="h-full bg-teal-500 transition-[width] duration-150" style={{ width: `${readingPct}%` }} />
            </div>
          )}
          <div
            style={{
              width: `${10000 / zoom.zoomLevel}%`,
              transform: `scale(${zoom.zoomLevel / 100})`,
              transformOrigin: "top left",
            }}
          >
            {children}
          </div>
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

        {notesOpen && currentLessonId && (
          <NotesPanel
            enrollmentId={enrollmentId}
            lessonId={currentLessonId}
            token={token}
            onClose={() => setNotesOpen(false)}
          />
        )}
      </div>

      {currentLessonId && cert?.ai_professor_enabled && (
        <AiProfessorWidget
          enrollmentId={enrollmentId}
          lessonId={currentLessonId}
          lessonTitle={allLessons[currentIdx]?.title ?? ""}
          courseTitle={cert?.title ?? ""}
          apiBasePath="/learn"
        />
      )}
    </div>
  );
}
