"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { useTranslations } from "next-intl";
import {
  ArrowRight, ArrowLeft, CheckCircle2, Lock, Play, Loader2, Award, Clock,
  Layers, Briefcase, GraduationCap, FileText,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r) => (r as any).data ?? r);
}

type CourseState = "completed" | "in_progress" | "locked" | "available";

const STATE_META: Record<CourseState, { badge: string }> = {
  completed:   { badge: "bg-emerald-50 text-emerald-700" },
  in_progress: { badge: "bg-amber-50 text-amber-700" },
  available:   { badge: "bg-slate-100 text-slate-500" },
  locked:      { badge: "bg-slate-100 text-slate-400" },
};

function CurriculumTile({ item }: { item: any }) {
  const t = useTranslations("ProgramDetail");
  const state: CourseState = item.state;
  const meta = STATE_META[state];
  const stateLabel = state === "completed" ? t("stateCompleted")
    : state === "in_progress" ? t("stateInProgress")
    : state === "available" ? t("stateAvailable")
    : t("stateLocked");
  const locked = state === "locked";
  const href = `/learn/course/${item.enrollment_id}`;

  const content = (
    <div
      className={cn(
        "flex items-center gap-4 p-4 rounded-2xl border transition-all",
        locked ? "bg-slate-50 border-slate-100 opacity-70" : "bg-white border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300",
        item.special_type && !locked && "border-2 border-navy-900",
      )}
    >
      <div className={cn(
        "w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center",
        state === "completed" ? "bg-emerald-100 text-emerald-600"
          : item.special_type ? "bg-navy-900 text-white"
          : locked ? "bg-slate-200 text-slate-400" : "bg-teal-50 text-teal-600",
      )}>
        {state === "completed" ? <CheckCircle2 size={18} />
          : locked ? <Lock size={16} />
          : item.special_type === "internship" ? <Briefcase size={16} />
          : item.special_type === "capstone" ? <Layers size={16} />
          : <Play size={16} />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className={cn("inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full", meta.badge)}>
            {stateLabel}
          </span>
          {item.special_type && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-navy-50 text-navy-700 border border-navy-100 capitalize">
              {item.special_type}
            </span>
          )}
          <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", item.is_required ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500")}>
            {item.is_required ? t("required") : t("elective")}
          </span>
        </div>
        <p className="font-display font-bold text-navy-900 text-sm leading-snug truncate">{item.course.title}</p>
        {item.course.subtitle && <p className="text-xs text-slate-400 mt-0.5 truncate">{item.course.subtitle}</p>}
        {!locked && state !== "completed" && item.progress_percentage > 0 && (
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden max-w-[140px]">
              <div className="h-full rounded-full bg-teal-500" style={{ width: `${item.progress_percentage}%` }} />
            </div>
            <span className="text-[10px] text-slate-400">{item.progress_percentage}%</span>
          </div>
        )}
      </div>

      {!locked && (
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
          <ArrowRight size={15} className="text-slate-400" />
        </div>
      )}
    </div>
  );

  return locked ? <div title={t("completeEarlierCoursesFirst")}>{content}</div> : <Link href={href}>{content}</Link>;
}

export default function ProgramDashboardPage() {
  const t = useTranslations("ProgramDetail");
  const { id } = useParams<{ id: string }>();
  const token = useAuthStore((s) => s.accessToken)!;

  const { data, isLoading, error } = useSWR(
    token && id ? [`/programs/${id}/dashboard`, token] : null,
    ([url, t]) => fetcher(url, t),
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f7f8fa] flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-slate-300" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#f7f8fa] flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 text-sm font-semibold mb-1">{t("couldntLoadProgram")}</p>
          <Link href="/programs" className="text-xs text-teal-700 hover:underline">{t("backToMyPrograms")}</Link>
        </div>
      </div>
    );
  }

  const { enrollment, program, curriculum } = data;
  const items: any[] = Array.isArray(curriculum) ? curriculum : [];
  const isComplete = !!enrollment.completed_at;

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <Link href="/programs" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 mb-4">
          <ArrowLeft size={12} /> {t("myPrograms")}
        </Link>

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <GraduationCap size={18} className="text-teal-600" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-teal-600">{t("program")}</span>
          </div>
          <div className="flex items-start justify-between gap-3 mb-3">
            <h1 className="text-2xl font-display font-black text-navy-900">{program.title}</h1>
            <Link
              href={`/programs/${id}/transcript`}
              className="flex-shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-navy-700 border border-slate-200 bg-white px-3 py-2 rounded-xl hover:border-navy-300 hover:bg-slate-50 transition-colors"
            >
              <FileText size={13} /> {t("transcript")}
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden max-w-xs">
              <div
                className={cn("h-full rounded-full transition-all", isComplete ? "bg-emerald-500" : "bg-teal-500")}
                style={{ width: `${enrollment.progress_percentage ?? 0}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-slate-500">{t("pctComplete", { pct: enrollment.progress_percentage ?? 0 })}</span>
          </div>
        </div>

        {isComplete && (
          <div className="mb-6 p-5 rounded-2xl bg-gradient-to-br from-navy-900 to-navy-800 text-white flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
              <Award size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display font-bold text-sm">{t("programCompleted")}</p>
              <p className="text-xs text-white/70 mt-0.5">
                {program.certificate_title || t("certificateReady")}
              </p>
            </div>
            <Link
              href={`/programs/${id}/certificate`}
              className="flex-shrink-0 inline-flex items-center gap-1.5 bg-white text-navy-900 text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-teal-50 transition-colors"
            >
              {t("viewCertificate")} <ArrowRight size={12} />
            </Link>
          </div>
        )}

        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t("curriculum")}</p>
          <p className="text-xs text-slate-400 flex items-center gap-1"><Clock size={11} /> {t("courseCount", { count: items.length })}</p>
        </div>
        <div className="space-y-2.5">
          {items.map((item) => <CurriculumTile key={item.program_course_id} item={item} />)}
        </div>
      </div>
    </div>
  );
}
