"use client";

import Link from "next/link";
import useSWR from "swr";
import { BookOpen, Users, FileText, ChevronRight } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r: any) => r.data);
}

export default function ProfDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.accessToken);

  const { data: certs } = useSWR(
    token ? ["/prof/courses", token] : null,
    ([url, t]) => fetcher(url, t)
  );

  const totalEnrollments = certs?.reduce((s: number, c: any) => s + (c._count?.enrollments ?? 0), 0) ?? 0;
  const totalModules = certs?.reduce((s: number, c: any) => s + (c._count?.modules ?? 0), 0) ?? 0;

  const firstName = user?.profile?.first_name ?? "Professor";

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-display font-black text-navy-900">
          Welcome back, {firstName}
        </h1>
        <p className="text-slate-500 mt-1">Manage your course content and student progress.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: "Assigned Certifications", value: certs?.length ?? 0, icon: BookOpen, color: "text-navy-700 bg-navy-50" },
          { label: "Active Students", value: totalEnrollments, icon: Users, color: "text-gold-600 bg-gold-50" },
          { label: "Total Modules", value: totalModules, icon: FileText, color: "text-emerald-700 bg-emerald-50" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
              <Icon size={22} />
            </div>
            <div>
              <p className="text-2xl font-bold text-navy-900">{value}</p>
              <p className="text-sm text-slate-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Certifications */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-navy-900">My Certifications</h2>
          <Link href="/courses" className="text-sm text-navy-600 hover:text-navy-800 font-medium">
            View all →
          </Link>
        </div>

        {!certs || certs.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <BookOpen size={36} className="mx-auto mb-3 text-slate-300" />
            <p className="font-medium">No certifications assigned yet</p>
            <p className="text-sm mt-1">Contact an admin to be assigned to a certification.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {certs.slice(0, 5).map((cert: any) => (
              <Link
                key={cert.id}
                href={`/courses/${cert.id}/builder`}
                className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-navy-200 hover:bg-navy-50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{cert.badge_icon}</span>
                  <div>
                    <p className="font-semibold text-navy-900">{cert.acronym}</p>
                    <p className="text-sm text-slate-500">{cert.title}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm text-slate-500">
                  <span>{cert._count?.modules ?? 0} modules</span>
                  <span>{cert._count?.enrollments ?? 0} students</span>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-navy-400" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/grades" className="card p-5 hover:shadow-md transition-shadow flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-50 text-amber-700 rounded-lg flex items-center justify-center">
            <FileText size={18} />
          </div>
          <div>
            <p className="font-semibold text-navy-900">Review Submissions</p>
            <p className="text-sm text-slate-500">Grade pending assignments</p>
          </div>
          <ChevronRight size={16} className="ml-auto text-slate-300" />
        </Link>
        <Link href="/courses" className="card p-5 hover:shadow-md transition-shadow flex items-center gap-3">
          <div className="w-10 h-10 bg-navy-50 text-navy-700 rounded-lg flex items-center justify-center">
            <BookOpen size={18} />
          </div>
          <div>
            <p className="font-semibold text-navy-900">Course Builder</p>
            <p className="text-sm text-slate-500">Manage modules and lessons</p>
          </div>
          <ChevronRight size={16} className="ml-auto text-slate-300" />
        </Link>
      </div>
    </div>
  );
}
