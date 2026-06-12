"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getCertificationBySlug } from "@/lib/certifications-data";
import { getLessonContent } from "@/lib/lms-content";
import type { Lesson, QuizQuestion } from "@/types";
import {
  ChevronLeft, ChevronRight, CheckCircle2, Play, BookOpen,
  FileText, Menu, X, Award, ChevronDown, LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Sub-components ──────────────────────────────────────────────────────────

function VideoPlayer({ url }: { url: string }) {
  return (
    <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-lg">
      <iframe
        src={url}
        className="w-full h-full"
        allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      />
    </div>
  );
}

function ReadingContent({ content }: { content: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-8 prose prose-slate max-w-none
      prose-headings:font-display prose-headings:text-navy-900 prose-h2:text-xl prose-h3:text-base
      prose-a:text-navy-700 prose-strong:text-navy-900 prose-li:text-slate-700">
      {content.split("\n").map((line, i) => {
        if (line.startsWith("## ")) return <h2 key={i}>{line.slice(3)}</h2>;
        if (line.startsWith("### ")) return <h3 key={i}>{line.slice(4)}</h3>;
        if (line.startsWith("**") && line.endsWith("**")) return <p key={i}><strong>{line.slice(2, -2)}</strong></p>;
        if (line.startsWith("- ")) return <li key={i}>{line.slice(2)}</li>;
        if (line.startsWith("| ")) return null;
        if (line.trim() === "") return <br key={i} />;
        return <p key={i} className="text-slate-700 leading-relaxed">{line}</p>;
      })}
    </div>
  );
}

function QuizPlayer({ questions, onComplete }: { questions: QuizQuestion[]; onComplete: () => void }) {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);

  const q = questions[current];
  const isLast = current === questions.length - 1;
  const score = answers.filter((a, i) => a === questions[i].correct).length;

  if (showResult) {
    const pct = Math.round((score / questions.length) * 100);
    const passed = pct >= 70;
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 text-3xl ${passed ? "bg-emerald-100" : "bg-amber-100"}`}>
          {passed ? "🎉" : "📚"}
        </div>
        <h2 className="text-2xl font-display font-black text-navy-900 mb-2">
          {passed ? "Well done!" : "Keep studying!"}
        </h2>
        <p className="text-slate-500 mb-1">
          You scored <span className="font-bold text-navy-900">{score}/{questions.length}</span> ({pct}%)
        </p>
        <p className="text-slate-400 text-sm mb-8">{passed ? "You passed this quiz." : "Review the material and try again."}</p>
        {passed ? (
          <button
            onClick={onComplete}
            className="bg-gold-500 hover:bg-gold-400 text-white font-bold px-10 py-3 rounded-xl transition-all"
          >
            Mark Complete &amp; Continue
          </button>
        ) : (
          <button
            onClick={() => { setCurrent(0); setSelected(null); setAnswers([]); setShowResult(false); }}
            className="bg-navy-800 hover:bg-navy-700 text-white font-bold px-10 py-3 rounded-xl transition-all"
          >
            Try Again
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-8">
      <div className="flex items-center justify-between mb-6">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Question {current + 1} of {questions.length}
        </span>
        <div className="flex gap-1.5">
          {questions.map((_, i) => (
            <div key={i} className={`w-2 h-2 rounded-full transition-colors ${
              i < current ? "bg-gold-400" : i === current ? "bg-navy-800" : "bg-slate-200"
            }`} />
          ))}
        </div>
      </div>
      <h3 className="text-lg font-display font-bold text-navy-900 mb-6 leading-snug">{q.question}</h3>
      <div className="space-y-3 mb-6">
        {q.options.map((opt, i) => {
          const isSelected = selected === i;
          const isCorrect = selected !== null && i === q.correct;
          const isWrong = selected !== null && isSelected && i !== q.correct;
          return (
            <button
              key={i}
              onClick={() => { if (selected === null) setSelected(i); }}
              className={cn(
                "w-full text-left px-4 py-3.5 rounded-xl border-2 text-sm font-medium transition-all",
                selected === null && "border-slate-200 hover:border-navy-300 hover:bg-navy-50 text-slate-700",
                isCorrect && "border-emerald-400 bg-emerald-50 text-emerald-800",
                isWrong && "border-red-300 bg-red-50 text-red-800",
                !isSelected && selected !== null && i !== q.correct && "border-slate-100 text-slate-400 opacity-60"
              )}
            >
              <span className="font-bold mr-3 text-slate-400">{String.fromCharCode(65 + i)}.</span>
              {opt}
            </button>
          );
        })}
      </div>
      {selected !== null && q.explanation && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-6 text-sm text-blue-800">
          <strong>Explanation:</strong> {q.explanation}
        </div>
      )}
      <button
        onClick={() => {
          const newAnswers = [...answers, selected!];
          setAnswers(newAnswers);
          if (isLast) setShowResult(true);
          else { setCurrent(c => c + 1); setSelected(null); }
        }}
        disabled={selected === null}
        className="w-full bg-navy-800 hover:bg-navy-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all"
      >
        {isLast ? "See Results" : "Next Question →"}
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LessonPage({
  params,
}: {
  params: Promise<{ course: string; lesson: string }>;
}) {
  const { course, lesson: lessonId } = use(params);
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [marking, setMarking] = useState(false);
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);

  const cert = getCertificationBySlug(course);
  if (!cert) return null;

  const allLessons = cert.curriculum.flatMap(m => m.lessons);
  const currentIndex = allLessons.findIndex(l => l.id === lessonId);
  const lesson: Lesson | undefined = allLessons[currentIndex];
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  const content = lesson ? getLessonContent(lesson.id) : {};
  const mergedLesson: Lesson = lesson ? { ...lesson, ...content } : lesson!;

  // Which module contains the current lesson — expanded by default
  const activeModuleId = cert.curriculum.find(m => m.lessons.some(l => l.id === lessonId))?.id || "";
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set([activeModuleId]));

  function toggleModule(id: string) {
    setExpandedModules(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push(`/login?redirect=/lms/${course}/${lessonId}`); return; }

      const { data: enroll } = await supabase
        .from("enrollments")
        .select("id")
        .eq("user_id", user.id)
        .eq("certification_id", cert.id)
        .single();

      if (!enroll) { router.push(`/certifications/${course}`); return; }
      setEnrollmentId(enroll.id);

      const { data: progress } = await supabase
        .from("lesson_progress")
        .select("lesson_id")
        .eq("user_id", user.id)
        .eq("completed", true);

      setCompletedLessons(new Set((progress || []).map((r: any) => r.lesson_id)));
    });
  }, [course, lessonId]);

  // Also expand the module containing the new lesson on navigation
  useEffect(() => {
    const modId = cert.curriculum.find(m => m.lessons.some(l => l.id === lessonId))?.id;
    if (modId) setExpandedModules(prev => new Set([...prev, modId]));
  }, [lessonId]);

  async function markComplete() {
    if (!enrollmentId || marking || !cert) return;
    setMarking(true);
    const res = await fetch("/api/lms/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessonId, certificationId: cert.id, enrollmentId }),
    });
    if (res.ok) {
      setCompletedLessons(prev => new Set([...prev, lessonId]));
      if (nextLesson) router.push(`/lms/${course}/${nextLesson.id}`);
    }
    setMarking(false);
  }

  if (!lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        Lesson not found.
      </div>
    );
  }

  const isDone = completedLessons.has(lessonId);

  const TYPE_ICON: Record<string, React.ReactNode> = {
    video:      <Play size={11} />,
    reading:    <BookOpen size={11} />,
    quiz:       <FileText size={11} />,
    assignment: <Award size={11} />,
  };

  const SidebarContent = () => (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Sidebar header */}
      <div className="px-5 py-4 border-b border-slate-100 flex-shrink-0">
        <Link href={`/lms/${course}`} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-navy-800 transition-colors mb-3">
          <ChevronLeft size={13} /> Course Overview
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-base">{cert.badge_icon}</span>
          <span className="text-xs font-bold text-navy-900 leading-tight">{cert.acronym}</span>
        </div>
        <div className="mt-2 h-1 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gold-400 rounded-full"
            style={{ width: `${Math.round((completedLessons.size / allLessons.length) * 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-slate-400">{completedLessons.size}/{allLessons.length} lessons</span>
          <span className="text-[10px] text-gold-600 font-semibold">
            {Math.round((completedLessons.size / allLessons.length) * 100)}%
          </span>
        </div>
      </div>

      {/* Module list */}
      <div className="flex-1 overflow-y-auto py-2">
        {cert.curriculum.map((module, mi) => {
          const isExpanded = expandedModules.has(module.id);
          const modDone = module.lessons.filter(l => completedLessons.has(l.id)).length;
          const modComplete = modDone === module.lessons.length;

          return (
            <div key={module.id}>
              <button
                onClick={() => toggleModule(module.id)}
                className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black flex-shrink-0 ${
                    modComplete ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-600"
                  }`}>
                    {modComplete ? "✓" : mi + 1}
                  </span>
                  <span className="text-xs font-semibold text-navy-900 leading-tight truncate">{module.title}</span>
                </div>
                <ChevronDown size={13} className={cn("text-slate-400 flex-shrink-0 ml-2 transition-transform", isExpanded && "rotate-180")} />
              </button>

              {isExpanded && (
                <div className="pb-1">
                  {module.lessons.map((l) => {
                    const done = completedLessons.has(l.id);
                    const active = l.id === lessonId;
                    return (
                      <Link
                        key={l.id}
                        href={`/lms/${course}/${l.id}`}
                        onClick={() => setSidebarOpen(false)}
                        className={cn(
                          "flex items-center gap-2.5 pl-10 pr-4 py-2.5 transition-colors",
                          active
                            ? "bg-navy-800 text-white"
                            : "text-slate-500 hover:bg-slate-50 hover:text-navy-900"
                        )}
                      >
                        <span className={cn(
                          "w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-[9px]",
                          done && !active ? "bg-emerald-100 text-emerald-600" :
                          active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-400"
                        )}>
                          {done ? <CheckCircle2 size={9} /> : TYPE_ICON[l.type]}
                        </span>
                        <span className="text-xs leading-tight flex-1 truncate">{l.title}</span>
                        <span className={cn("text-[10px] flex-shrink-0", active ? "text-white/50" : "text-slate-300")}>
                          {l.duration_minutes}m
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const TYPE_BADGE: Record<string, string> = {
    video:      "bg-blue-50 text-blue-700 border-blue-100",
    reading:    "bg-emerald-50 text-emerald-700 border-emerald-100",
    quiz:       "bg-amber-50 text-amber-700 border-amber-100",
    assignment: "bg-purple-50 text-purple-700 border-purple-100",
  };
  const TYPE_LABEL: Record<string, string> = {
    video: "Video", reading: "Reading", quiz: "Quiz", assignment: "Assignment",
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">

      {/* ── Top Bar ── */}
      <header className="h-14 bg-navy-900 flex items-center justify-between px-4 flex-shrink-0 z-50">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(s => !s)}
            className="lg:hidden text-white/60 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <Link href="/lms">
            <Image src="/logo.png" alt="PAI" width={120} height={60} className="h-7 w-auto brightness-0 invert opacity-90" />
          </Link>
          <span className="text-white/20 hidden sm:block">/</span>
          <Link href={`/lms/${course}`} className="text-white/50 text-sm hover:text-white/80 transition-colors hidden sm:block truncate max-w-48">
            {cert.acronym}
          </Link>
          <span className="text-white/20 hidden sm:block">/</span>
          <span className="text-white/80 text-sm hidden sm:block truncate max-w-48">{lesson.title}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-white/40 text-xs hidden sm:block">
            {currentIndex + 1} / {allLessons.length}
          </span>
          {isDone && (
            <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
              <CheckCircle2 size={13} /> Completed
            </span>
          )}
          <Link href="/lms" className="flex items-center gap-1.5 text-white/40 hover:text-white/80 transition-colors text-xs">
            <LayoutDashboard size={13} />
            <span className="hidden sm:block">My Courses</span>
          </Link>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Desktop Sidebar ── */}
        <aside className="hidden lg:flex flex-col w-72 bg-white border-r border-slate-100 flex-shrink-0">
          <SidebarContent />
        </aside>

        {/* ── Mobile Sidebar Overlay ── */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-40 flex">
            <div className="w-72 bg-white flex flex-col shadow-2xl">
              <SidebarContent />
            </div>
            <div className="flex-1 bg-black/50" onClick={() => setSidebarOpen(false)} />
          </div>
        )}

        {/* ── Main Content ── */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">

            {/* Lesson header */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${TYPE_BADGE[lesson.type]}`}>
                  {TYPE_ICON[lesson.type]}
                  {TYPE_LABEL[lesson.type]} &middot; {lesson.duration_minutes} min
                </span>
              </div>
              <h1 className="text-2xl font-display font-black text-navy-900 leading-tight">{lesson.title}</h1>
            </div>

            {/* Content */}
            {lesson.type === "video" && mergedLesson.video_url && (
              <VideoPlayer url={mergedLesson.video_url} />
            )}
            {lesson.type === "video" && !mergedLesson.video_url && (
              <div className="aspect-video bg-navy-900 rounded-2xl flex items-center justify-center shadow-lg">
                <div className="text-center">
                  <Play size={52} className="text-white/10 mx-auto mb-3" />
                  <p className="text-white/30 text-sm font-medium">Video coming soon</p>
                </div>
              </div>
            )}
            {lesson.type === "reading" && mergedLesson.content && (
              <ReadingContent content={mergedLesson.content} />
            )}
            {lesson.type === "reading" && !mergedLesson.content && (
              <div className="bg-white rounded-2xl border border-slate-100 p-8">
                <p className="text-slate-400 text-sm">Reading content coming soon.</p>
              </div>
            )}
            {lesson.type === "quiz" && mergedLesson.quiz_questions && (
              <QuizPlayer questions={mergedLesson.quiz_questions} onComplete={markComplete} />
            )}
            {lesson.type === "assignment" && (
              <div className="bg-white rounded-2xl border border-slate-100 p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Award size={20} className="text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-navy-900">Assignment</h3>
                    <p className="text-slate-400 text-xs mt-0.5">Complete and submit for review</p>
                  </div>
                </div>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Assignment details will be provided by your instructor. Once submitted, your instructor will review and provide feedback within 5 business days.
                </p>
              </div>
            )}

            {/* Bottom Navigation */}
            <div className="flex items-center justify-between mt-10 pt-6 border-t border-slate-200">
              {prevLesson ? (
                <Link
                  href={`/lms/${course}/${prevLesson.id}`}
                  className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-navy-900 transition-colors px-4 py-2.5 rounded-xl hover:bg-slate-100"
                >
                  <ChevronLeft size={15} /> Previous
                </Link>
              ) : <div />}

              {lesson.type !== "quiz" && (
                <button
                  onClick={markComplete}
                  disabled={marking || isDone}
                  className={cn(
                    "flex items-center gap-2 font-bold text-sm px-7 py-2.5 rounded-xl transition-all",
                    isDone
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-100 cursor-default"
                      : "bg-gold-500 hover:bg-gold-400 text-white shadow-gold hover:-translate-y-0.5 disabled:opacity-50"
                  )}
                >
                  <CheckCircle2 size={15} />
                  {isDone ? "Completed" : marking ? "Saving..." : nextLesson ? "Complete & Next" : "Mark Complete"}
                </button>
              )}

              {nextLesson ? (
                <Link
                  href={`/lms/${course}/${nextLesson.id}`}
                  className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-navy-900 transition-colors px-4 py-2.5 rounded-xl hover:bg-slate-100"
                >
                  Next <ChevronRight size={15} />
                </Link>
              ) : <div />}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
