import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Header from "@/components/layout/Header";
import {
  Award, BookOpen, Clock, CheckCircle2, Download,
  ArrowRight, BarChart3, Calendar, Shield, GraduationCap
} from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/dashboard");

  // Fetch enrollments + certificates
  const [{ data: enrollments }, { data: certificates }] = await Promise.all([
    supabase
      .from("enrollments")
      .select("*, certifications(title, acronym, badge_icon, level)")
      .eq("user_id", user.id)
      .order("enrolled_at", { ascending: false }),
    supabase
      .from("certificates")
      .select("*")
      .eq("user_id", user.id)
      .order("issue_date", { ascending: false }),
  ]);

  const firstName = user.user_metadata?.full_name?.split(" ")[0] || "Professional";

  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-50 pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {/* Welcome header */}
          <div className="mb-8">
            <h1 className="text-3xl font-display font-black text-navy-900">
              Welcome back, {firstName} 👋
            </h1>
            <p className="text-slate-500 mt-1">
              Track your certification progress and manage your credentials.
            </p>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Enrolled Programs", value: enrollments?.length || 0, icon: BookOpen, color: "bg-blue-50 text-blue-600" },
              { label: "Certificates Earned", value: certificates?.length || 0, icon: Award, color: "bg-gold-50 text-gold-600" },
              { label: "In Progress", value: enrollments?.filter(e => e.status === "in_progress").length || 0, icon: Clock, color: "bg-amber-50 text-amber-600" },
              { label: "Completed", value: enrollments?.filter(e => e.status === "completed").length || 0, icon: CheckCircle2, color: "bg-emerald-50 text-emerald-600" },
            ].map((stat) => (
              <div key={stat.label} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-card">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${stat.color}`}>
                  <stat.icon size={18} />
                </div>
                <div className="text-3xl font-display font-black text-navy-900 mb-1">{stat.value}</div>
                <div className="text-slate-500 text-xs font-medium">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* LMS Banner */}
          <Link
            href="/lms"
            className="flex items-center justify-between gap-4 bg-gradient-to-r from-navy-800 to-navy-700 rounded-2xl p-5 mb-6 border border-navy-600 hover:from-navy-700 hover:to-navy-600 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gold-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <GraduationCap size={24} className="text-gold-400" />
              </div>
              <div>
                <div className="text-white font-display font-bold text-base">Go to My Learning Dashboard</div>
                <div className="text-white/60 text-sm">Access your courses, lessons, and exams on the LMS</div>
              </div>
            </div>
            <ArrowRight size={20} className="text-white/40 group-hover:text-white group-hover:translate-x-1 transition-all flex-shrink-0" />
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Enrollments */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-card">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-display font-bold text-navy-900 text-lg">My Certifications</h2>
                <Link href="/certifications" className="text-xs font-semibold text-navy-600 hover:text-navy-800">
                  Browse more →
                </Link>
              </div>
              <div className="divide-y divide-slate-50">
                {enrollments && enrollments.length > 0 ? (
                  enrollments.map((enrollment: any) => (
                    <div key={enrollment.id} className="p-5 flex items-center gap-4">
                      <div className="w-12 h-12 bg-gold-50 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">
                        {enrollment.certifications?.badge_icon || "🎓"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-navy-900 text-sm">
                          {enrollment.certifications?.title || "Certification"}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gold-400 rounded-full transition-all"
                              style={{ width: `${enrollment.progress_percentage}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-500 flex-shrink-0">
                            {enrollment.progress_percentage}%
                          </span>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${
                          enrollment.status === "completed"
                            ? "bg-emerald-50 text-emerald-700"
                            : enrollment.status === "in_progress"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-slate-100 text-slate-600"
                        }`}>
                          {enrollment.status.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-10 text-center">
                    <BookOpen size={32} className="text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm mb-4">You haven&apos;t enrolled in any certifications yet.</p>
                    <Link
                      href="/certifications/certified-ai-professional"
                      className="inline-flex items-center gap-2 bg-navy-800 text-white font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-navy-700 transition-colors"
                    >
                      Start with CAIP <ArrowRight size={14} />
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Certificates sidebar */}
            <div className="space-y-5">
              <div className="bg-white rounded-2xl border border-slate-100 shadow-card">
                <div className="p-5 border-b border-slate-100">
                  <h2 className="font-display font-bold text-navy-900 text-base">My Certificates</h2>
                </div>
                <div className="p-5">
                  {certificates && certificates.length > 0 ? (
                    <div className="space-y-4">
                      {certificates.map((cert: any) => (
                        <div key={cert.id} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-gold-600 font-display font-black text-lg">
                              {cert.certification_acronym}
                            </span>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              cert.status === "active"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-red-50 text-red-700"
                            }`}>
                              {cert.status}
                            </span>
                          </div>
                          <p className="text-navy-900 font-semibold text-xs mb-1">{cert.certification_title}</p>
                          <p className="text-slate-400 text-xs mb-3">ID: {cert.certificate_id}</p>
                          <div className="flex gap-2">
                            <Link
                              href={`/verify?id=${cert.certificate_id}`}
                              className="flex-1 text-center text-xs font-semibold py-1.5 rounded-lg bg-navy-50 text-navy-700 hover:bg-navy-100 transition-colors"
                            >
                              <Shield size={10} className="inline mr-1" />
                              Verify
                            </Link>
                            <button className="flex-1 text-center text-xs font-semibold py-1.5 rounded-lg bg-gold-50 text-gold-700 hover:bg-gold-100 transition-colors">
                              <Download size={10} className="inline mr-1" />
                              Download
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Award size={28} className="text-slate-200 mx-auto mb-2" />
                      <p className="text-slate-400 text-xs">No certificates yet.</p>
                      <p className="text-slate-400 text-xs">Complete a certification to earn your credential.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick actions */}
              <div className="bg-navy-800 rounded-2xl p-5 text-white">
                <h3 className="font-display font-bold text-base mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  <Link
                    href="/lms"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 transition-colors text-sm text-white/80 hover:text-white"
                  >
                    <GraduationCap size={14} className="text-gold-400" />
                    My Learning
                  </Link>
                  {[
                    { label: "Browse Certifications", href: "/certifications", icon: BookOpen },
                    { label: "Verify a Certificate", href: "/verify", icon: Shield },
                    { label: "Corporate Training", href: "/corporate", icon: BarChart3 },
                  ].map(({ label, href, icon: Icon }) => (
                    <Link
                      key={label}
                      href={href}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 transition-colors text-sm text-white/80 hover:text-white"
                    >
                      <Icon size={14} className="text-gold-400" />
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
