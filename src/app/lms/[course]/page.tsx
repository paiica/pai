import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { getCertificationBySlug } from "@/lib/certifications-data";
import {
  Play, BookOpen, FileText, CheckCircle2, ChevronRight,
  Clock, ExternalLink, LayoutDashboard, Award,
} from "lucide-react";

const TYPE_META: Record<string, { label: string; color: string }> = {
  video:      { label: "Video",      color: "text-blue-600 bg-blue-50 border-blue-100" },
  reading:    { label: "Reading",    color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
  quiz:       { label: "Quiz",       color: "text-amber-600 bg-amber-50 border-amber-100" },
  assignment: { label: "Assignment", color: "text-purple-600 bg-purple-50 border-purple-100" },
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  video:      <Play size={13} />,
  reading:    <BookOpen size={13} />,
  quiz:       <FileText size={13} />,
  assignment: <CheckCircle2 size={13} />,
};

export default async function CourseOverviewPage({
  params,
}: {
  params: Promise<{ course: string }>;
}) {
  const { course } = await params;
  const cert = getCertificationBySlug(course);
  if (!cert || cert.status !== "active") notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/lms/${course}`);

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("*")
    .eq("user_id", user.id)
    .eq("certification_id", cert.id)
    .single();

  if (!enrollment) redirect(`/certifications/${course}`);

  const { data: progressRows } = await supabase
    .from("lesson_progress")
    .select("lesson_id, completed")
    .eq("user_id", user.id);

  const completedLessons = new Set(
    (progressRows || []).filter((r: any) => r.completed).map((r: any) => r.lesson_id)
  );

  const allLessons = cert.curriculum.flatMap(m => m.lessons);
  const nextLesson = allLessons.find(l => !completedLessons.has(l.id)) || allLessons[0];
  const pct = enrollment.progress_percentage || 0;
  const completedCount = allLessons.filter(l => completedLessons.has(l.id)).length;
  const totalMinutes = allLessons.reduce((s, l) => s + l.duration_minutes, 0);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* LMS Top Nav */}
      <nav className="bg-white border-b border-slate-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Image src="/logo.png" alt="Professional AI Institute" width={240} height={120} className="h-9 w-auto" priority />
            </Link>
            <span className="text-slate-200 hidden sm:block">|</span>
            <div className="hidden sm:flex items-center gap-1.5 text-sm">
              <Link href="/lms" className="flex items-center gap-1.5 text-slate-500 hover:text-navy-800 font-medium transition-colors">
                <LayoutDashboard size={14} /> My Courses
              </Link>
              <ChevronRight size={13} className="text-slate-300" />
              <span className="text-navy-800 font-semibold">{cert.acronym}</span>
            </div>
          </div>
          <Link href="/" className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-navy-700 transition-colors font-medium">
            <ExternalLink size={12} /> Back to Main Site
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Course Header Card */}
        <div className="bg-navy-900 rounded-2xl p-7 mb-8 text-white">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div className="w-16 h-16 bg-gold-500/20 border border-gold-400/20 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0">
              {cert.badge_icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-gold-400 bg-gold-400/10 border border-gold-400/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
                  {cert.acronym}
                </span>
                <span className="text-xs text-white/40">
                  {cert.curriculum.length} modules &middot; {allLessons.length} lessons &middot; {Math.round(totalMinutes / 60)} hours
                </span>
              </div>
              <h1 className="text-2xl font-display font-black">{cert.title}</h1>
              <p className="text-white/50 text-sm mt-1 leading-relaxed max-w-xl">{cert.description}</p>
              <div className="mt-4">
                <div className="flex justify-between text-xs text-white/50 mb-2">
                  <span>{completedCount} of {allLessons.length} lessons completed</span>
                  <span className="text-gold-400 font-bold">{pct}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gold-400 rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>
            <Link
              href={`/lms/${course}/${nextLesson.id}`}
              className="flex items-center gap-2 bg-gold-500 hover:bg-gold-400 text-white font-bold text-sm px-6 py-3 rounded-xl transition-all flex-shrink-0 shadow-gold"
            >
              <Play size={14} className="fill-white" />
              {pct > 0 ? "Continue Learning" : "Start Course"}
            </Link>
          </div>
        </div>

        {/* Learning Outcomes */}
        {cert.learning_outcomes.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-6 mb-6">
            <h2 className="text-sm font-bold text-navy-900 mb-4 flex items-center gap-2">
              <Award size={15} className="text-gold-500" /> What You Will Learn
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {cert.learning_outcomes.map((outcome, i) => (
                <div key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
                  <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                  {outcome}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Curriculum */}
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Course Curriculum</h2>
        <div className="space-y-3">
          {cert.curriculum.map((module, mi) => {
            const modCompleted = module.lessons.filter(l => completedLessons.has(l.id)).length;
            const modComplete = modCompleted === module.lessons.length;
            const modMin = module.lessons.reduce((s, l) => s + l.duration_minutes, 0);

            return (
              <div key={module.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                {/* Module Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0 ${
                      modComplete ? "bg-emerald-500 text-white" : "bg-navy-800 text-white"
                    }`}>
                      {modComplete ? <CheckCircle2 size={14} /> : mi + 1}
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-navy-900 text-sm">{module.title}</h3>
                      <p className="text-slate-400 text-xs mt-0.5">{module.description}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-6">
                    <div className={`text-xs font-semibold ${modComplete ? "text-emerald-600" : "text-slate-400"}`}>
                      {modCompleted}/{module.lessons.length} done
                    </div>
                    <div className="text-xs text-slate-300 flex items-center justify-end gap-1 mt-0.5">
                      <Clock size={10} /> {modMin} min
                    </div>
                  </div>
                </div>

                {/* Lesson Rows */}
                <div className="divide-y divide-slate-50">
                  {module.lessons.map((lesson, li) => {
                    const done = completedLessons.has(lesson.id);
                    const isNext = lesson.id === nextLesson.id && pct < 100;
                    const meta = TYPE_META[lesson.type];

                    return (
                      <Link
                        key={lesson.id}
                        href={`/lms/${course}/${lesson.id}`}
                        className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50 transition-colors group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                            done
                              ? "bg-emerald-100 text-emerald-600"
                              : "bg-slate-100 text-slate-400 group-hover:bg-navy-100 group-hover:text-navy-600"
                          }`}>
                            {done ? <CheckCircle2 size={13} /> : TYPE_ICONS[lesson.type]}
                          </div>
                          <div className="min-w-0">
                            <span className={`text-sm font-medium ${
                              done ? "text-slate-400 line-through" : "text-slate-700 group-hover:text-navy-900"
                            } transition-colors`}>
                              {lesson.title}
                            </span>
                            {isNext && (
                              <span className="ml-2 text-xs font-bold text-gold-600 bg-gold-50 border border-gold-100 px-2 py-0.5 rounded-full">
                                Next Up
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5 flex-shrink-0 ml-4">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium border hidden sm:inline-flex ${meta.color}`}>
                            {meta.label}
                          </span>
                          <span className="text-xs text-slate-300 w-12 text-right">{lesson.duration_minutes} min</span>
                          <ChevronRight size={14} className="text-slate-200 group-hover:text-navy-600 transition-colors" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
