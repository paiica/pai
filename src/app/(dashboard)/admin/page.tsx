import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Header from "@/components/layout/Header";
import {
  Users, Award, BookOpen, BarChart3, Shield, DollarSign,
  TrendingUp, Plus, Search, Filter, CheckCircle2, Clock, XCircle
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/admin");

  // Check admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/dashboard");

  // Fetch analytics data
  const [
    { count: totalStudents },
    { count: totalEnrollments },
    { count: totalCertificates },
    { data: recentEnrollments },
    { data: recentCertificates },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("enrollments").select("*", { count: "exact", head: true }),
    supabase.from("certificates").select("*", { count: "exact", head: true }),
    supabase
      .from("enrollments")
      .select("*, profiles(full_name, email), certifications(title, acronym)")
      .order("enrolled_at", { ascending: false })
      .limit(10),
    supabase
      .from("certificates")
      .select("*")
      .order("issue_date", { ascending: false })
      .limit(10),
  ]);

  const STATS = [
    { label: "Total Students", value: totalStudents || 0, icon: Users, change: "+12%", color: "bg-blue-50 text-blue-600" },
    { label: "Active Enrollments", value: totalEnrollments || 0, icon: BookOpen, change: "+8%", color: "bg-gold-50 text-gold-600" },
    { label: "Certificates Issued", value: totalCertificates || 0, icon: Award, change: "+15%", color: "bg-emerald-50 text-emerald-600" },
    { label: "Est. Revenue", value: formatCurrency((totalEnrollments || 0) * 495), icon: DollarSign, change: "+8%", color: "bg-purple-50 text-purple-600" },
  ];

  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-50 pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="badge-gold mb-2">Admin Panel</div>
              <h1 className="text-3xl font-display font-black text-navy-900">PAI Admin Dashboard</h1>
            </div>
            <div className="flex gap-3">
              <button className="inline-flex items-center gap-2 bg-white border border-slate-200 text-slate-700 font-semibold text-sm px-4 py-2.5 rounded-xl hover:border-slate-300 transition-colors shadow-sm">
                <BarChart3 size={15} />
                Reports
              </button>
              <button className="inline-flex items-center gap-2 bg-navy-800 text-white font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-navy-700 transition-colors">
                <Plus size={15} />
                Issue Certificate
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {STATS.map((stat) => (
              <div key={stat.label} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-card">
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color}`}>
                    <stat.icon size={18} />
                  </div>
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    {stat.change}
                  </span>
                </div>
                <div className="text-3xl font-display font-black text-navy-900 mb-0.5">{stat.value}</div>
                <div className="text-slate-500 text-xs font-medium">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Enrollments */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-card">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-display font-bold text-navy-900 text-base">Recent Enrollments</h2>
                <div className="flex gap-2">
                  <button className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600">
                    <Search size={14} />
                  </button>
                  <button className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600">
                    <Filter size={14} />
                  </button>
                </div>
              </div>
              <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto">
                {recentEnrollments && recentEnrollments.length > 0 ? (
                  recentEnrollments.map((enrollment: any) => (
                    <div key={enrollment.id} className="flex items-center gap-3 p-4">
                      <div className="w-8 h-8 bg-navy-800 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {(enrollment.profiles?.full_name || "U").slice(0, 1).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-navy-900 truncate">
                          {enrollment.profiles?.full_name || enrollment.profiles?.email}
                        </div>
                        <div className="text-xs text-slate-400">
                          {enrollment.certifications?.acronym} · {formatDate(enrollment.enrolled_at)}
                        </div>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize flex-shrink-0 ${
                        enrollment.status === "completed"
                          ? "bg-emerald-50 text-emerald-700"
                          : enrollment.status === "in_progress"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-slate-100 text-slate-600"
                      }`}>
                        {enrollment.status.replace("_", " ")}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-400 text-sm">No enrollments yet</div>
                )}
              </div>
            </div>

            {/* Recent Certificates */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-card">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-display font-bold text-navy-900 text-base">Certificates Issued</h2>
                <button className="inline-flex items-center gap-1.5 text-xs font-semibold bg-gold-50 text-gold-700 px-3 py-1.5 rounded-lg hover:bg-gold-100 transition-colors">
                  <Plus size={12} />
                  Issue New
                </button>
              </div>
              <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto">
                {recentCertificates && recentCertificates.length > 0 ? (
                  recentCertificates.map((cert: any) => (
                    <div key={cert.id} className="flex items-center gap-3 p-4">
                      <div className="w-8 h-8 bg-gold-50 rounded-full flex items-center justify-center flex-shrink-0">
                        <Award size={14} className="text-gold-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-navy-900 truncate">{cert.student_name}</div>
                        <div className="text-xs text-slate-400 font-mono">{cert.certificate_id}</div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          cert.status === "active"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        }`}>
                          {cert.status}
                        </span>
                        <div className="text-xs text-slate-400 mt-0.5">{formatDate(cert.issue_date)}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-400 text-sm">No certificates issued yet</div>
                )}
              </div>
            </div>

            {/* Admin Quick Actions */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-card p-6">
              <h2 className="font-display font-bold text-navy-900 text-base mb-5">Admin Actions</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Manage Students", icon: Users, color: "bg-blue-50 text-blue-700", href: "/admin/students" },
                  { label: "Issue Certificate", icon: Award, color: "bg-gold-50 text-gold-700", href: "/admin/certificates/new" },
                  { label: "View Analytics", icon: BarChart3, color: "bg-purple-50 text-purple-700", href: "/admin/analytics" },
                  { label: "Verification Logs", icon: Shield, color: "bg-emerald-50 text-emerald-700", href: "/admin/verifications" },
                  { label: "Manage Certifications", icon: BookOpen, color: "bg-navy-50 text-navy-700", href: "/admin/certifications" },
                  { label: "Testimonials", icon: CheckCircle2, color: "bg-teal-50 text-teal-700", href: "/admin/testimonials" },
                  { label: "Payments", icon: DollarSign, color: "bg-rose-50 text-rose-700", href: "/admin/payments" },
                  { label: "Export Data", icon: TrendingUp, color: "bg-amber-50 text-amber-700", href: "/admin/export" },
                ].map(({ label, icon: Icon, color, href }) => (
                  <Link
                    key={label}
                    href={href}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all text-center group"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color} group-hover:scale-105 transition-transform`}>
                      <Icon size={18} />
                    </div>
                    <span className="text-xs font-semibold text-slate-700">{label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
