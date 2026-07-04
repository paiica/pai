"use client";

import Link from "next/link";
import useSWR from "swr";
import { BookOpen, Settings, Users, BarChart2, FileText } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r: any) => r.data);
}

const STATUS_COLORS: Record<string, string> = {
  active: "badge bg-emerald-100 text-emerald-700",
  draft: "badge bg-slate-100 text-slate-600",
  archived: "badge bg-slate-100 text-slate-600",
  coming_soon: "badge bg-amber-100 text-amber-700",
};

const LEVEL_COLORS: Record<string, string> = {
  beginner: "bg-emerald-50 text-emerald-600",
  intermediate: "bg-amber-50 text-amber-600",
  advanced: "bg-purple-50 text-purple-600",
};

export default function ProfCoursesPage() {
  const token = useAuthStore((s) => s.accessToken);
  const { data: courses, isLoading } = useSWR(
    token ? ["/prof/courses", token] : null,
    ([url, t]) => fetcher(url, t)
  );

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-display font-black text-navy-900">My Courses</h1>
        <p className="text-slate-500 mt-1">Manage details and content for your assigned courses.</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-5 animate-pulse h-20 bg-slate-100" />
          ))}
        </div>
      ) : !courses || courses.length === 0 ? (
        <div className="card p-12 text-center text-slate-500">
          <BookOpen size={40} className="mx-auto mb-4 text-slate-300" />
          <p className="font-semibold text-navy-800">No courses assigned</p>
          <p className="text-sm mt-1">Contact an administrator to be assigned as an instructor.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {courses.map((course: any) => (
            <div key={course.id} className="card p-5 flex items-center gap-4">
              <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0", LEVEL_COLORS[course.level] ?? "bg-slate-50 text-slate-500")}>
                <BookOpen size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <p className="font-bold text-navy-900 truncate">{course.title}</p>
                  <span className={cn(STATUS_COLORS[course.status] ?? "badge bg-slate-100 text-slate-600")}>
                    {course.status}
                  </span>
                  {course.cert_acronym && (
                    <span className="badge bg-navy-50 text-navy-700">{course.cert_acronym}</span>
                  )}
                </div>
                <p className="text-sm text-slate-500 truncate">{course.subtitle || course.description}</p>
              </div>
              <div className="hidden sm:flex items-center gap-6 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <BookOpen size={14} /> {course.module_count ?? 0} modules
                </span>
                <span className="flex items-center gap-1">
                  <Users size={14} /> {course.enrollment_count ?? 0} students
                </span>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <Link
                  href={`/courses/${course.id}/builder`}
                  className="btn-primary text-xs px-3 py-2"
                >
                  <Settings size={14} /> Builder
                </Link>
                <Link
                  href={`/courses/${course.id}/submissions`}
                  className="btn-outline text-xs px-3 py-2"
                >
                  <FileText size={14} /> Submissions
                </Link>
                <Link
                  href={`/courses/${course.id}/gradebook`}
                  className="btn-outline text-xs px-3 py-2"
                >
                  <BarChart2 size={14} /> Gradebook
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
