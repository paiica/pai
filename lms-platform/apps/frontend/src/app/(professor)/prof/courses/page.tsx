"use client";

import Link from "next/link";
import useSWR from "swr";
import { BookOpen, Settings, Users, ChevronRight, BarChart2 } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r) => r.data);
}

const STATUS_COLORS: Record<string, string> = {
  active: "badge bg-emerald-100 text-emerald-700",
  archived: "badge bg-slate-100 text-slate-600",
  coming_soon: "badge bg-amber-100 text-amber-700",
};

export default function ProfCoursesPage() {
  const token = useAuthStore((s) => s.accessToken);
  const { data: certs, isLoading } = useSWR(
    token ? ["/prof/certifications", token] : null,
    ([url, t]) => fetcher(url, t)
  );

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-display font-black text-navy-900">My Certifications</h1>
        <p className="text-slate-500 mt-1">Manage course content for your assigned certifications.</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-5 animate-pulse h-20 bg-slate-100" />
          ))}
        </div>
      ) : !certs || certs.length === 0 ? (
        <div className="card p-12 text-center text-slate-500">
          <BookOpen size={40} className="mx-auto mb-4 text-slate-300" />
          <p className="font-semibold text-navy-800">No certifications assigned</p>
          <p className="text-sm mt-1">Contact an administrator to be assigned as an instructor.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {certs.map((cert: any) => (
            <div key={cert.id} className="card p-5 flex items-center gap-4">
              <span className="text-3xl">{cert.badge_icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-bold text-navy-900">{cert.acronym}</p>
                  <span className={cn(STATUS_COLORS[cert.status] ?? "badge bg-slate-100 text-slate-600")}>
                    {cert.status}
                  </span>
                </div>
                <p className="text-sm text-slate-500 truncate">{cert.title}</p>
              </div>
              <div className="hidden sm:flex items-center gap-6 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <BookOpen size={14} /> {cert._count?.modules ?? 0} modules
                </span>
                <span className="flex items-center gap-1">
                  <Users size={14} /> {cert._count?.enrollments ?? 0} students
                </span>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <Link
                  href={`/prof/courses/${cert.id}/builder`}
                  className="btn-primary text-xs px-3 py-2"
                >
                  <Settings size={14} /> Builder
                </Link>
                <Link
                  href={`/prof/courses/${cert.id}/gradebook`}
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
