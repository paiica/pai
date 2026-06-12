import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Header from "@/components/layout/Header";
import { getCertificationBySlug } from "@/lib/certifications-data";
import { Play, BookOpen, FileText, CheckCircle2, Clock, ChevronRight, Lock } from "lucide-react";

const TYPE_ICONS = {
  video: <Play size={13} />,
  reading: <BookOpen size={13} />,
  quiz: <FileText size={13} />,
  assignment: <CheckCircle2 size={13} />,
};

export default async function CourseOverviewPage({ params }: { params: Promise<{ course: string }> }) {
  const { course } = await params;
  const cert = getCertificationBySlug(course);
  if (!cert || cert.status !== "active") notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/learn/${course}`);

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

  const totalLessons = cert.curriculum.reduce((acc, m) => acc + m.lessons.length, 0);

  const firstIncomplete = cert.curriculum
    .flatMap(m => m.lessons)
    .find(l => !completedLessons.has(l.id));

  const nextLesson = firstIncomplete || cert.curriculum[0].lessons[0];

  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-50 pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-6">
            <Link href="/learn" className="hover:text-navy-800">My Learning</Link>
            <ChevronRight size={12} />
            <span className="text-navy-800 font-medium">{cert.acronym}</span>
          </div>

          {/* Header */}
          <div className="bg-navy-800 rounded-2xl p-6 mb-6 flex flex-col sm:flex-row items-start gap-5">
            <div className="w-16 h-16 bg-gold-500/20 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0">
              {cert.badge_icon}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-display font-black text-white">{cert.title}</h1>
              <p className="text-white/60 text-sm mt-1">{cert.curriculum.length} modules · {totalLessons} lessons · {cert.duration_weeks} weeks</p>
              <div className="mt-3">
                <div className="flex justify-between text-xs text-white/50 mb-1">
                  <span>Your progress</span>
                  <span>{enrollment.progress_percentage}%</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gold-400 rounded-full" style={{ width: `${enrollment.progress_percentage}%` }} />
                </div>
              </div>
            </div>
            <Link
              href={`/learn/${course}/${nextLesson.id}`}
              className="flex items-center gap-2 bg-gold-500 hover:bg-gold-400 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-all flex-shrink-0"
            >
              <Play size={14} />
              {enrollment.progress_percentage > 0 ? "Continue" : "Start"}
            </Link>
          </div>

          {/* Curriculum */}
          <div className="space-y-3">
            {cert.curriculum.map((module, mi) => {
              const moduleCompleted = module.lessons.filter(l => completedLessons.has(l.id)).length;
              return (
                <div key={module.id} className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
                  <div className="flex items-center justify-between p-5 bg-slate-50 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-navy-800 text-white flex items-center justify-center text-xs font-bold">
                        {mi + 1}
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-navy-900 text-sm">{module.title}</h3>
                        <p className="text-slate-400 text-xs mt-0.5">{module.description}</p>
                      </div>
                    </div>
                    <span className="text-xs text-slate-400 flex-shrink-0 ml-4">
                      {moduleCompleted}/{module.lessons.length} done
                    </span>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {module.lessons.map((lesson) => {
                      const done = completedLessons.has(lesson.id);
                      return (
                        <Link
                          key={lesson.id}
                          href={`/learn/${course}/${lesson.id}`}
                          className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${done ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                              {done ? <CheckCircle2 size={13} /> : TYPE_ICONS[lesson.type]}
                            </div>
                            <span className={`text-sm ${done ? "text-slate-400 line-through" : "text-slate-700"} group-hover:text-navy-900 transition-colors`}>
                              {lesson.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="text-xs text-slate-400">{lesson.duration_minutes} min</span>
                            <ChevronRight size={14} className="text-slate-300 group-hover:text-navy-800 transition-colors" />
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
      </main>
    </>
  );
}
