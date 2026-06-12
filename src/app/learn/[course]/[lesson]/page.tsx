"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getCertificationBySlug } from "@/lib/certifications-data";
import { getLessonContent } from "@/lib/lms-content";
import { Lesson, QuizQuestion } from "@/types";
import {
  ChevronLeft, ChevronRight, CheckCircle2, Play, BookOpen,
  FileText, Menu, X, Award,
} from "lucide-react";
import { cn } from "@/lib/utils";

function VideoPlayer({ url }: { url: string }) {
  return (
    <div className="aspect-video bg-black rounded-2xl overflow-hidden">
      <iframe src={url} className="w-full h-full" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
    </div>
  );
}

function ReadingContent({ content }: { content: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-8 prose prose-slate max-w-none prose-headings:font-display prose-headings:text-navy-900 prose-a:text-navy-700">
      {content.split("\n").map((line, i) => {
        if (line.startsWith("## ")) return <h2 key={i}>{line.slice(3)}</h2>;
        if (line.startsWith("### ")) return <h3 key={i}>{line.slice(4)}</h3>;
        if (line.startsWith("**") && line.endsWith("**")) return <p key={i}><strong>{line.slice(2, -2)}</strong></p>;
        if (line.startsWith("- ")) return <li key={i} className="text-slate-700">{line.slice(2)}</li>;
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

  function handleSelect(idx: number) {
    if (selected !== null) return;
    setSelected(idx);
  }

  function handleNext() {
    const newAnswers = [...answers, selected!];
    setAnswers(newAnswers);
    if (isLast) {
      setShowResult(true);
    } else {
      setCurrent(c => c + 1);
      setSelected(null);
    }
  }

  if (showResult) {
    const pct = Math.round((score / questions.length) * 100);
    const passed = pct >= 70;
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl ${passed ? "bg-emerald-100" : "bg-amber-100"}`}>
          {passed ? "🎉" : "📚"}
        </div>
        <h2 className="text-2xl font-display font-black text-navy-900 mb-2">
          {passed ? "Well done!" : "Keep studying!"}
        </h2>
        <p className="text-slate-500 mb-1">You scored <span className="font-bold text-navy-900">{score}/{questions.length}</span> ({pct}%)</p>
        <p className="text-slate-400 text-sm mb-6">{passed ? "You passed this quiz." : "Review the material and try again."}</p>
        {passed ? (
          <button onClick={onComplete} className="bg-gold-500 hover:bg-gold-400 text-white font-bold px-8 py-3 rounded-xl transition-all">
            Mark Complete & Continue
          </button>
        ) : (
          <button onClick={() => { setCurrent(0); setSelected(null); setAnswers([]); setShowResult(false); }}
            className="bg-navy-800 hover:bg-navy-700 text-white font-bold px-8 py-3 rounded-xl transition-all">
            Try Again
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-8">
      <div className="flex items-center justify-between mb-6">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Question {current + 1} of {questions.length}</span>
        <div className="flex gap-1">
          {questions.map((_, i) => (
            <div key={i} className={`w-2 h-2 rounded-full ${i < current ? "bg-gold-400" : i === current ? "bg-navy-800" : "bg-slate-200"}`} />
          ))}
        </div>
      </div>

      <h3 className="text-lg font-display font-bold text-navy-900 mb-6">{q.question}</h3>

      <div className="space-y-3 mb-6">
        {q.options.map((opt, i) => {
          const isSelected = selected === i;
          const isCorrect = selected !== null && i === q.correct;
          const isWrong = selected !== null && isSelected && i !== q.correct;
          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              className={cn(
                "w-full text-left px-4 py-3.5 rounded-xl border-2 text-sm font-medium transition-all",
                selected === null && "border-slate-200 hover:border-navy-300 hover:bg-navy-50 text-slate-700",
                isCorrect && "border-emerald-400 bg-emerald-50 text-emerald-800",
                isWrong && "border-red-300 bg-red-50 text-red-800",
                isSelected && selected !== null && !isWrong && "border-emerald-400 bg-emerald-50 text-emerald-800",
                !isSelected && selected !== null && i !== q.correct && "border-slate-100 text-slate-400"
              )}
            >
              <span className="font-bold mr-3">{String.fromCharCode(65 + i)}.</span>
              {opt}
            </button>
          );
        })}
      </div>

      {selected !== null && q.explanation && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 text-sm text-blue-800">
          <strong>Explanation:</strong> {q.explanation}
        </div>
      )}

      <button
        onClick={handleNext}
        disabled={selected === null}
        className="w-full bg-navy-800 hover:bg-navy-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all"
      >
        {isLast ? "See Results" : "Next Question"}
      </button>
    </div>
  );
}

export default function LessonPage({ params }: { params: Promise<{ course: string; lesson: string }> }) {
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

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push(`/login?redirect=/learn/${course}/${lessonId}`); return; }

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
      if (nextLesson) router.push(`/learn/${course}/${nextLesson.id}`);
    }
    setMarking(false);
  }

  if (!lesson) return <div className="min-h-screen flex items-center justify-center text-slate-400">Lesson not found.</div>;

  const isDone = completedLessons.has(lessonId);

  const Sidebar = () => (
    <div className="h-full overflow-y-auto">
      <div className="p-4 border-b border-slate-100">
        <Link href={`/learn/${course}`} className="flex items-center gap-2 text-sm font-semibold text-navy-800 hover:text-navy-600">
          <ChevronLeft size={16} /> {cert.acronym} Overview
        </Link>
      </div>
      <div className="p-3 space-y-1">
        {cert.curriculum.map((module, mi) => (
          <div key={module.id}>
            <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider mt-2">
              {mi + 1}. {module.title}
            </div>
            {module.lessons.map((l) => {
              const done = completedLessons.has(l.id);
              const active = l.id === lessonId;
              return (
                <Link
                  key={l.id}
                  href={`/learn/${course}/${l.id}`}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors",
                    active ? "bg-navy-800 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-navy-900"
                  )}
                >
                  <span className={cn("w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0",
                    done ? "bg-emerald-500 text-white" : active ? "bg-white/20" : "bg-slate-200"
                  )}>
                    {done && <CheckCircle2 size={10} />}
                  </span>
                  <span className="leading-tight">{l.title}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Top bar */}
      <div className="h-14 bg-navy-900 flex items-center justify-between px-4 flex-shrink-0 z-50">
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden text-white/60 hover:text-white p-1">
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <Link href="/" className="text-white font-display font-black text-sm">PAI</Link>
          <span className="text-white/30 text-sm">/</span>
          <span className="text-white/70 text-sm hidden sm:block">{cert.title}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-white/40 text-xs hidden sm:block">
            {currentIndex + 1} / {allLessons.length}
          </span>
          {isDone && (
            <span className="flex items-center gap-1 text-emerald-400 text-xs font-semibold">
              <CheckCircle2 size={13} /> Completed
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar desktop */}
        <aside className="hidden lg:flex flex-col w-72 bg-white border-r border-slate-100 flex-shrink-0">
          <Sidebar />
        </aside>

        {/* Sidebar mobile overlay */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-40 flex">
            <div className="w-72 bg-white flex flex-col shadow-xl">
              <Sidebar />
            </div>
            <div className="flex-1 bg-black/40" onClick={() => setSidebarOpen(false)} />
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-8">
            <div className="mb-6">
              <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full",
                lesson.type === "video" ? "bg-blue-50 text-blue-700" :
                lesson.type === "quiz" ? "bg-amber-50 text-amber-700" :
                lesson.type === "assignment" ? "bg-purple-50 text-purple-700" :
                "bg-slate-100 text-slate-600"
              )}>
                {lesson.type === "video" && <Play size={10} />}
                {lesson.type === "reading" && <BookOpen size={10} />}
                {lesson.type === "quiz" && <FileText size={10} />}
                {lesson.type.charAt(0).toUpperCase() + lesson.type.slice(1)} · {lesson.duration_minutes} min
              </span>
              <h1 className="text-2xl font-display font-black text-navy-900 mt-3">{lesson.title}</h1>
            </div>

            {lesson.type === "video" && mergedLesson.video_url && (
              <VideoPlayer url={mergedLesson.video_url} />
            )}

            {lesson.type === "video" && !mergedLesson.video_url && (
              <div className="aspect-video bg-navy-900 rounded-2xl flex items-center justify-center">
                <div className="text-center">
                  <Play size={48} className="text-white/20 mx-auto mb-3" />
                  <p className="text-white/40 text-sm">Video content coming soon</p>
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
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Award size={20} className="text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-navy-900">Assignment</h3>
                    <p className="text-slate-400 text-xs">Complete and submit for review</p>
                  </div>
                </div>
                <p className="text-slate-600 text-sm">Assignment details will be provided by your instructor. Once submitted, your instructor will review and provide feedback.</p>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200">
              {prevLesson ? (
                <Link href={`/learn/${course}/${prevLesson.id}`}
                  className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-navy-900 transition-colors">
                  <ChevronLeft size={16} /> Previous
                </Link>
              ) : <div />}

              {lesson.type !== "quiz" && (
                <button
                  onClick={markComplete}
                  disabled={marking || isDone}
                  className={cn(
                    "flex items-center gap-2 font-bold text-sm px-6 py-2.5 rounded-xl transition-all",
                    isDone
                      ? "bg-emerald-100 text-emerald-700 cursor-default"
                      : "bg-gold-500 hover:bg-gold-400 text-white shadow-gold hover:-translate-y-0.5"
                  )}
                >
                  <CheckCircle2 size={15} />
                  {isDone ? "Completed" : marking ? "Saving..." : nextLesson ? "Complete & Next" : "Mark Complete"}
                </button>
              )}

              {nextLesson ? (
                <Link href={`/learn/${course}/${nextLesson.id}`}
                  className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-navy-900 transition-colors">
                  Next <ChevronRight size={16} />
                </Link>
              ) : <div />}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
