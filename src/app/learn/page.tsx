import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { CERTIFICATIONS } from "@/lib/certifications-data";
import { BookOpen, Clock, CheckCircle2, Lock, ArrowRight, Play } from "lucide-react";

export default async function LearnPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/learn");

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("*")
    .eq("user_id", user.id);

  const enrolledSlugs = new Set(
    (enrollments || []).map((e: any) => {
      const cert = CERTIFICATIONS.find(c => c.id === e.certification_id);
      return cert?.slug;
    }).filter(Boolean)
  );

  const activeCerts = CERTIFICATIONS.filter(c => c.status === "active");

  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-50 pt-24 pb-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-display font-black text-navy-900">My Learning</h1>
            <p className="text-slate-500 mt-1">Access your enrolled courses and track your progress.</p>
          </div>

          <div className="space-y-4">
            {activeCerts.map((cert) => {
              const isEnrolled = enrolledSlugs.has(cert.slug);
              const enrollment = (enrollments || []).find((e: any) => {
                const c = CERTIFICATIONS.find(x => x.id === e.certification_id);
                return c?.slug === cert.slug;
              });
              const totalLessons = cert.curriculum.reduce((acc, m) => acc + m.lessons.length, 0);
              const progress = enrollment?.progress_percentage || 0;

              return (
                <div key={cert.slug} className="bg-white rounded-2xl border border-slate-100 shadow-card p-6 flex flex-col sm:flex-row items-start gap-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-gold-400 to-gold-600 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0">
                    {cert.badge_icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <h2 className="font-display font-bold text-navy-900 text-lg">{cert.title}</h2>
                        <p className="text-slate-500 text-sm mt-0.5">{cert.acronym} · {cert.curriculum.length} modules · {totalLessons} lessons</p>
                      </div>
                      {isEnrolled ? (
                        <Link
                          href={`/learn/${cert.slug}`}
                          className="flex items-center gap-2 bg-navy-800 hover:bg-navy-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-all"
                        >
                          <Play size={14} />
                          {progress > 0 ? "Continue" : "Start Learning"}
                        </Link>
                      ) : (
                        <Link
                          href={`/certifications/${cert.slug}`}
                          className="flex items-center gap-2 border-2 border-navy-800 text-navy-800 font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-navy-800 hover:text-white transition-all"
                        >
                          <Lock size={14} />
                          Enroll to Access
                        </Link>
                      )}
                    </div>

                    {isEnrolled && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                          <span>Progress</span>
                          <span>{progress}% complete</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gold-400 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><Clock size={11} />{cert.duration_weeks} weeks</span>
                      <span className="flex items-center gap-1"><BookOpen size={11} />{totalLessons} lessons</span>
                      {isEnrolled && enrollment?.status === "completed" && (
                        <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 size={11} />Completed</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {enrolledSlugs.size === 0 && (
            <div className="text-center py-16">
              <BookOpen size={48} className="text-slate-200 mx-auto mb-4" />
              <h3 className="text-lg font-display font-bold text-navy-900 mb-2">No courses enrolled yet</h3>
              <p className="text-slate-500 text-sm mb-6">Enroll in a certification program to start learning.</p>
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
