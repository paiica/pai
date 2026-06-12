import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { CERTIFICATIONS } from "@/lib/certifications-data";
import { BookOpen, CheckCircle2, Play, FileText, ArrowRight, Lock } from "lucide-react";

const TYPE_ICONS: Record<string, React.ReactNode> = {
  video: <Play size={12} />,
  reading: <BookOpen size={12} />,
  quiz: <FileText size={12} />,
  assignment: <CheckCircle2 size={12} />,
};

export default async function LearnPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/learn");

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("*")
    .eq("user_id", user.id);

  const { data: progressRows } = await supabase
    .from("lesson_progress")
    .select("lesson_id, completed")
    .eq("user_id", user.id)
    .eq("completed", true);

  const completedLessons = new Set((progressRows || []).map((r: any) => r.lesson_id));

  const enrolledCerts = CERTIFICATIONS.filter(cert =>
    (enrollments || []).some((e: any) => e.certification_id === cert.id)
  );

  const getEnrollment = (certId: string) =>
    (enrollments || []).find((e: any) => e.certification_id === certId);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-50 pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-display font-black text-navy-900">My Learning</h1>
            <p className="text-slate-500 mt-1">Pick up where you left off.</p>
          </div>

          {enrolledCerts.length > 0 ? (
            <div className="space-y-6">
              {enrolledCerts.map((cert) => {
                const enrollment = getEnrollment(cert.id);
                const allLessons = cert.curriculum.flatMap(m => m.lessons);
                const nextLesson = allLessons.find(l => !completedLessons.has(l.id)) || allLessons[0];
                const progress = enrollment?.progress_percentage || 0;

                return (
                  <div key={cert.id} className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
                    {/* Course header */}
                    <div className="bg-navy-800 px-6 py-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <span className="text-3xl">{cert.badge_icon}</span>
                        <div>
                          <h2 className="font-display font-bold text-white text-base">{cert.title}</h2>
                          <div className="flex items-center gap-3 mt-1">
                            <div className="w-32 h-1.5 bg-white/20 rounded-full overflow-hidden">
                              <div className="h-full bg-gold-400 rounded-full" style={{ width: `${progress}%` }} />
                            </div>
                            <span className="text-white/50 text-xs">{progress}% complete</span>
                          </div>
                        </div>
                      </div>
                      <Link
                        href={`/learn/${cert.slug}/${nextLesson.id}`}
                        className="flex items-center gap-2 bg-gold-500 hover:bg-gold-400 text-white font-bold text-sm px-4 py-2 rounded-xl transition-all flex-shrink-0"
                      >
                        <Play size={13} />
                        {progress > 0 ? "Continue" : "Start"}
                      </Link>
                    </div>

                    {/* Modules & lessons */}
                    <div className="divide-y divide-slate-50">
                      {cert.curriculum.map((module, mi) => {
                        const moduleCompletedCount = module.lessons.filter(l => completedLessons.has(l.id)).length;
                        const moduleComplete = moduleCompletedCount === module.lessons.length;

                        return (
                          <div key={module.id}>
                            {/* Module row */}
                            <div className="flex items-center justify-between px-6 py-3 bg-slate-50 border-b border-slate-100">
                              <div className="flex items-center gap-2.5">
                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${moduleComplete ? "bg-emerald-500 text-white" : "bg-navy-800 text-white"}`}>
                                  {moduleComplete ? <CheckCircle2 size={12} /> : mi + 1}
                                </div>
                                <span className="text-sm font-semibold text-navy-900">{module.title}</span>
                              </div>
                              <span className="text-xs text-slate-400">{moduleCompletedCount}/{module.lessons.length}</span>
                            </div>

                            {/* Lessons */}
                            {module.lessons.map((lesson) => {
                              const done = completedLessons.has(lesson.id);
                              return (
                                <Link
                                  key={lesson.id}
                                  href={`/learn/${cert.slug}/${lesson.id}`}
                                  className="flex items-center justify-between px-6 py-3 hover:bg-slate-50 transition-colors group"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${done ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                                      {done ? <CheckCircle2 size={11} /> : TYPE_ICONS[lesson.type]}
                                    </div>
                                    <span className={`text-sm ${done ? "text-slate-400 line-through" : "text-slate-700 group-hover:text-navy-900"} transition-colors`}>
                                      {lesson.title}
                                    </span>
                                  </div>
                                  <span className="text-xs text-slate-400 flex-shrink-0 ml-4">{lesson.duration_minutes} min</span>
                                </Link>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Lock size={28} className="text-slate-300" />
              </div>
              <h3 className="text-lg font-display font-bold text-navy-900 mb-2">No courses enrolled yet</h3>
              <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
                Enroll in a certification program to start learning and tracking your progress.
              </p>
              <Link
                href="/certifications/certified-ai-professional"
                className="inline-flex items-center gap-2 bg-gold-500 hover:bg-gold-400 text-white font-bold px-6 py-3 rounded-xl transition-all"
              >
                Browse Certifications <ArrowRight size={15} />
              </Link>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
