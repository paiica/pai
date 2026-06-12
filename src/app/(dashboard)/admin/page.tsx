import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Header from "@/components/layout/Header";
import {
  Users, Award, BookOpen, BarChart3, Shield, DollarSign,
  TrendingUp, Plus, CheckCircle2, Clock, XCircle, FileText,
  AlertCircle,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import ApplicationActions from "./ApplicationActions";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/dashboard");

  const [
    { count: totalStudents },
    { count: totalEnrollments },
    { count: totalCertificates },
    { count: pendingCount },
    { data: pendingApplications },
    { data: recentEnrollments },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("enrollments").select("*", { count: "exact", head: true }),
    supabase.from("certificates").select("*", { count: "exact", head: true }),
    supabase.from("applications").select("*", { count: "exact", head: true }).eq("status", "pending_review"),
    supabase
      .from("applications")
      .select("*")
      .eq("status", "pending_review")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("enrollments")
      .select("*, profiles(full_name, email)")
      .order("enrolled_at", { ascending: false })
      .limit(8),
  ]);

  const STATS = [
    { label: "Total Students", value: totalStudents || 0, icon: Users, color: "bg-blue-50 text-blue-600" },
    { label: "Active Enrollments", value: totalEnrollments || 0, icon: BookOpen, color: "bg-gold-50 text-gold-600" },
    { label: "Certificates Issued", value: totalCertificates || 0, icon: Award, color: "bg-emerald-50 text-emerald-600" },
    { label: "Pending Review", value: pendingCount || 0, icon: Clock, color: "bg-amber-50 text-amber-600" },
  ];

  const CERT_NAMES: Record<string, string> = {
    "caip-001": "CAIP",
    "caim-001": "CAIM",
    "caie-001": "CAIE",
    "caida-001": "CAIDA",
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-50 pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="badge-gold mb-2">Admin Panel</div>
              <h1 className="text-3xl font-display font-black text-navy-900">PAI Admin Dashboard</h1>
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
                  {stat.label === "Pending Review" && (stat.value as number) > 0 && (
                    <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full animate-pulse">
                      Action needed
                    </span>
                  )}
                </div>
                <div className="text-3xl font-display font-black text-navy-900 mb-0.5">{stat.value}</div>
                <div className="text-slate-500 text-xs font-medium">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* ── Pending Applications (primary action area) ── */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-card mb-6">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="font-display font-bold text-navy-900 text-base">Pending Applications</h2>
                {(pendingCount || 0) > 0 && (
                  <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                    {pendingCount} awaiting review
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400">Review each application and approve or reject</div>
            </div>

            {pendingApplications && pendingApplications.length > 0 ? (
              <div className="divide-y divide-slate-50">
                {pendingApplications.map((app: any) => (
                  <div key={app.id} className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      {/* Applicant info */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 bg-navy-800 rounded-full flex items-center justify-center text-white text-sm font-black flex-shrink-0">
                          {(app.full_name || "?").slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-navy-900 text-sm">{app.full_name}</div>
                          <div className="text-slate-400 text-xs truncate">{app.email}</div>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="bg-navy-50 text-navy-700 px-2 py-1 rounded-lg font-semibold">
                          {CERT_NAMES[app.certification_id] || app.certification_id}
                        </span>
                        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg capitalize">
                          {app.career_status}
                        </span>
                        {app.job_title && (
                          <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">
                            {app.job_title}{app.company ? ` @ ${app.company}` : ""}
                          </span>
                        )}
                        {app.university && (
                          <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">
                            {app.university}
                          </span>
                        )}
                        <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded-lg">
                          {app.country}
                        </span>
                        <span className="text-slate-400 px-2 py-1">
                          Applied {formatDate(app.created_at)}
                        </span>
                      </div>

                      {/* Actions */}
                      <ApplicationActions applicationId={app.id} />
                    </div>

                    {/* Motivation */}
                    {app.motivation && (
                      <div className="mt-3 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Motivation</p>
                        <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">{app.motivation}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <CheckCircle2 size={36} className="text-emerald-300 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">No pending applications. All caught up!</p>
              </div>
            )}
          </div>

          {/* Recent Enrollments */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-card">
              <div className="p-5 border-b border-slate-100">
                <h2 className="font-display font-bold text-navy-900 text-base">Recent Enrollments</h2>
              </div>
              <div className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
                {recentEnrollments && recentEnrollments.length > 0 ? (
                  recentEnrollments.map((e: any) => (
                    <div key={e.id} className="flex items-center gap-3 p-4">
                      <div className="w-8 h-8 bg-navy-800 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {(e.profiles?.full_name || "U").slice(0, 1).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-navy-900 truncate">
                          {e.profiles?.full_name || e.profiles?.email}
                        </div>
                        <div className="text-xs text-slate-400">{formatDate(e.enrolled_at)}</div>
                      </div>
                      <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full flex-shrink-0">
                        Enrolled
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-400 text-sm">No enrollments yet</div>
                )}
              </div>
            </div>

            {/* Admin Quick Actions */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-6">
              <h2 className="font-display font-bold text-navy-900 text-base mb-5">Admin Actions</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Manage Students", icon: Users, color: "bg-blue-50 text-blue-700", href: "/admin/students" },
                  { label: "Issue Certificate", icon: Award, color: "bg-gold-50 text-gold-700", href: "/admin/certificates/new" },
                  { label: "View Analytics", icon: BarChart3, color: "bg-purple-50 text-purple-700", href: "/admin/analytics" },
                  { label: "Verify Certificates", icon: Shield, color: "bg-emerald-50 text-emerald-700", href: "/verify" },
                  { label: "Payments", icon: DollarSign, color: "bg-rose-50 text-rose-700", href: "/admin/payments" },
                  { label: "All Applications", icon: FileText, color: "bg-amber-50 text-amber-700", href: "/admin/applications" },
                ].map(({ label, icon: Icon, color, href }) => (
                  <Link
                    key={label}
                    href={href}
                    className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all group"
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                      <Icon size={15} />
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
