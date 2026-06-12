import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { CERTIFICATIONS } from "@/lib/certifications-data";
import { BookOpen, GraduationCap, Award, ChevronRight, Play, CheckCircle2, ExternalLink, LayoutDashboard, Medal } from "lucide-react";

function CircularProgress({ pct, size = 80 }: { pct: number; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={5} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#c9a84c" strokeWidth={5}
        strokeDasharray={circ} strokeDashoffset={dash} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.7s ease" }}
      />
    </svg>
  );
}

export default async function LMSDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/lms");

  const [
    { data: enrollments },
    { data: progressRows },
    { data: pendingApps },
  ] = await Promise.all([
    supabase.from("enrollments").select("*").eq("user_id", user.id),
    supabase.from("lesson_progress").select("lesson_id, completed").eq("user_id", user.id).eq("completed", true),
    supabase.from("applications").select("certification_id, status, created_at").eq("user_id", user.id).eq("status", "pending_review"),
  ]);

  const completedLessons = new Set((progressRows || []).map((r: any) => r.lesson_id));

  const enrolledCerts = CERTIFICATIONS.filter(cert =>
    (enrollments || []).some((e: any) => e.certification_id === cert.id)
  );

  const getEnrollment = (certId: string) =>
    (enrollments || []).find((e: any) => e.certification_id === certId);

  const totalCompleted = completedLessons.size;
  const avgProgress = enrolledCerts.length > 0
    ? Math.round(enrolledCerts.reduce((sum, c) => sum + (getEnrollment(c.id)?.progress_percentage || 0), 0) / enrolledCerts.length)
    : 0;

  const userName = (user.user_metadata?.full_name as string)?.split(" ")[0] || "there";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* LMS Top Nav */}
      <nav className="bg-white border-b border-slate-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/">
              <Image src="/logo.png" alt="Professional AI Institute" width={240} height={120} className="h-9 w-auto" priority />
            </Link>
            <div className="hidden sm:flex items-center gap-1">
              <Link href="/lms" className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-navy-900 bg-navy-50">
                <LayoutDashboard size={14} /> My Courses
              </Link>
              <Link href="/lms/certificates" className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-slate-500 hover:text-navy-800 hover:bg-slate-50 transition-colors">
                <Medal size={14} /> My Certificates
              </Link>
            </div>
          </div>
          <Link href="/" className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-navy-700 transition-colors font-medium">
            <ExternalLink size={12} /> Back to Main Site
          </Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-display font-black text-navy-900">Welcome back, {userName}</h1>
          <p className="text-slate-400 text-sm mt-1">Continue your professional AI certification journey.</p>
        </div>

        {/* Pending applications banner */}
        {pendingApps && pendingApps.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6 flex items-start gap-4">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <BookOpen size={20} className="text-amber-600" />
            </div>
            <div>
              <div className="font-display font-bold text-amber-900">Application Under Review</div>
              <p className="text-amber-700 text-sm mt-0.5">
                You have {pendingApps.length === 1 ? "an application" : `${pendingApps.length} applications`} currently being reviewed by PAI. You&apos;ll receive an email with your access within 3–5 business days.
              </p>
            </div>
          </div>
        )}

        {enrolledCerts.length > 0 ? (
          <>
            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
              {[
                { label: "Courses Enrolled", value: enrolledCerts.length.toString(), icon: BookOpen, color: "bg-blue-50 text-blue-700" },
                { label: "Lessons Completed", value: totalCompleted.toString(), icon: CheckCircle2, color: "bg-emerald-50 text-emerald-700" },
                { label: "Avg. Progress", value: `${avgProgress}%`, icon: GraduationCap, color: "bg-gold-50 text-gold-700" },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-white rounded-2xl border border-slate-100 px-6 py-5 flex items-center gap-4">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <div className="text-2xl font-display font-black text-navy-900">{value}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Course Cards */}
            <div className="space-y-1 mb-3">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">My Enrolled Courses</h2>
            </div>
            <div className="space-y-4">
              {enrolledCerts.map((cert) => {
                const enrollment = getEnrollment(cert.id);
                const pct = enrollment?.progress_percentage || 0;
                const allLessons = cert.curriculum.flatMap(m => m.lessons);
                const nextLesson = allLessons.find(l => !completedLessons.has(l.id)) || allLessons[0];
                const completedCount = allLessons.filter(l => completedLessons.has(l.id)).length;
                const nextModule = cert.curriculum.find(m => m.lessons.some(l => l.id === nextLesson.id));

                return (
                  <div key={cert.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-6 sm:p-7 flex flex-col sm:flex-row items-start gap-6">

                      {/* Circular Progress */}
                      <div className="relative flex-shrink-0 self-center sm:self-start">
                        <CircularProgress pct={pct} size={88} />
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-base font-black text-navy-900 leading-none">{pct}%</span>
                          <span className="text-[9px] text-slate-400 mt-0.5">done</span>
                        </div>
                      </div>

                      {/* Course Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-xl">{cert.badge_icon}</span>
                              <span className="text-xs font-bold text-gold-600 bg-gold-50 border border-gold-100 px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                                {cert.acronym}
                              </span>
                            </div>
                            <h3 className="text-lg font-display font-bold text-navy-900">{cert.title}</h3>
                            <p className="text-slate-400 text-xs mt-1">
                              {cert.curriculum.length} modules &middot; {allLessons.length} lessons &middot; {cert.duration_weeks} weeks
                            </p>
                          </div>
                          <Link
                            href={`/lms/${cert.slug}/${nextLesson.id}`}
                            className="flex items-center gap-2 bg-navy-800 hover:bg-navy-700 text-white text-sm font-bold px-6 py-2.5 rounded-xl transition-all flex-shrink-0 shadow-sm"
                          >
                            <Play size={13} className="fill-white" />
                            {pct > 0 ? "Continue" : "Start"}
                          </Link>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-4">
                          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                            <span>{completedCount} of {allLessons.length} lessons completed</span>
                            {pct < 100 && nextModule && (
                              <span className="text-navy-600 font-semibold truncate max-w-48 ml-4">
                                Up next: {nextLesson.title}
                              </span>
                            )}
                            {pct === 100 && (
                              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                                <CheckCircle2 size={11} /> Course Complete!
                              </span>
                            )}
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-gold-400 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>

                        {/* Module Progress Pills + Link */}
                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                          {cert.curriculum.map((mod, i) => {
                            const modDone = mod.lessons.filter(l => completedLessons.has(l.id)).length;
                            const modComplete = modDone === mod.lessons.length;
                            return (
                              <span key={mod.id} className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                                modComplete
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                  : "bg-slate-50 text-slate-500 border-slate-100"
                              }`}>
                                {modComplete ? "✓" : `${modDone}/${mod.lessons.length}`} &nbsp;M{i + 1}
                              </span>
                            );
                          })}
                          <Link href={`/lms/${cert.slug}`} className="text-xs text-navy-600 hover:text-navy-800 font-semibold flex items-center gap-1 ml-1">
                            Full Curriculum <ChevronRight size={11} />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="text-center py-28">
            <div className="w-24 h-24 bg-navy-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <GraduationCap size={44} className="text-navy-200" />
            </div>
            <h3 className="text-xl font-display font-bold text-navy-900 mb-2">No courses enrolled yet</h3>
            <p className="text-slate-400 text-sm mb-8 max-w-sm mx-auto leading-relaxed">
              Enroll in a certification program to start learning and tracking your progress here.
            </p>
            <Link
              href="/certifications/certified-ai-professional"
              className="inline-flex items-center gap-2 bg-gold-500 hover:bg-gold-400 text-white font-bold px-8 py-3.5 rounded-xl transition-all shadow-gold"
            >
              <Award size={16} /> Browse Certifications
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
