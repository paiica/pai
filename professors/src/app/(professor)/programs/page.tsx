"use client";

import { useState } from "react";
import useSWR from "swr";
import { GraduationCap, Users, BookOpen, Share2, Star } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ShareCourseModal } from "@/components/ShareCourseModal";

const MARKETING = process.env.NEXT_PUBLIC_MARKETING_URL || "https://paii.ca";

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r: any) => r.data);
}

const STATUS_COLORS: Record<string, string> = {
  published: "badge bg-emerald-100 text-emerald-700",
  draft: "badge bg-slate-100 text-slate-600",
  archived: "badge bg-slate-100 text-slate-600",
};

const LEVEL_COLORS: Record<string, string> = {
  beginner: "bg-emerald-50 text-emerald-600",
  intermediate: "bg-amber-50 text-amber-600",
  advanced: "bg-purple-50 text-purple-600",
};

export default function ProfProgramsPage() {
  const token = useAuthStore((s) => s.accessToken);
  const { data: programs, isLoading } = useSWR(
    token ? ["/programs/instructor/mine", token] : null,
    ([url, t]) => fetcher(url, t)
  );
  const [recommending, setRecommending] = useState<{ id: string; title: string; slug: string } | null>(null);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-display font-black text-navy-900">My Programs</h1>
        <p className="text-slate-500 mt-1">Programs you're assigned as an instructor on.</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-5 animate-pulse h-20 bg-slate-100" />
          ))}
        </div>
      ) : !programs || programs.length === 0 ? (
        <div className="card p-12 text-center text-slate-500">
          <GraduationCap size={40} className="mx-auto mb-4 text-slate-300" />
          <p className="font-semibold text-navy-800">No programs yet</p>
          <p className="text-sm mt-1">Ask an administrator to assign you as an instructor on a program.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {programs.map((program: any) => (
            <div key={program.id} className="card p-5">
              <div className="flex items-center gap-4">
                <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0", LEVEL_COLORS[program.level] ?? "bg-slate-50 text-slate-500")}>
                  <GraduationCap size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <p className="font-bold text-navy-900 truncate">{program.title}</p>
                    <span className={cn(STATUS_COLORS[program.status] ?? "badge bg-slate-100 text-slate-600")}>
                      {program.status}
                    </span>
                    {program.is_lead && (
                      <span className="badge bg-gold-50 text-gold-700 flex items-center gap-1">
                        <Star size={10} className="fill-gold-500 text-gold-500" /> Lead Instructor
                      </span>
                    )}
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-6 text-sm text-slate-500">
                  <span className="flex items-center gap-1">
                    <BookOpen size={14} /> {program.course_count ?? 0} courses
                  </span>
                  <span className="flex items-center gap-1">
                    <Users size={14} /> {program.learner_count ?? 0} learners
                  </span>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => setRecommending({ id: program.id, title: program.title, slug: program.slug })}
                    className="btn-outline text-xs px-3 py-2"
                  >
                    <Share2 size={14} /> Recommend
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {recommending && (
        <ShareCourseModal
          courseId={recommending.id}
          courseTitle={recommending.title}
          itemType="program"
          itemUrl={`${MARKETING}/programs/${recommending.slug}`}
          mode="recommend"
          onClose={() => setRecommending(null)}
        />
      )}
    </div>
  );
}
