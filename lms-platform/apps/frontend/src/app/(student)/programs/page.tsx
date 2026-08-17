"use client";

import Link from "next/link";
import useSWR from "swr";
import { useTranslations } from "next-intl";
import { ArrowRight, GraduationCap, Award, Layers } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r) => (r as any).data ?? r);
}

type StatusKey = "completed" | "started" | "registered";

function statusOf(e: any): StatusKey {
  if (e.completed_at) return "completed";
  if ((e.progress_percentage ?? 0) > 0) return "started";
  return "registered";
}

const STATUS_META: Record<StatusKey, { badge: string; dot: string }> = {
  completed:  { badge: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  started:    { badge: "bg-amber-50 text-amber-700",     dot: "bg-amber-400" },
  registered: { badge: "bg-slate-100 text-slate-500",    dot: "bg-slate-300" },
};

function ProgramRow({ enrollment }: { enrollment: any }) {
  const t = useTranslations("Programs");
  const pct = enrollment.progress_percentage ?? 0;
  const status = statusOf(enrollment);
  const meta = STATUS_META[status];
  const statusLabel = status === "completed" ? t("statusCompleted") : status === "started" ? t("statusInProgress") : t("statusNotStarted");
  const program = enrollment.program;

  return (
    <Link
      href={`/programs/${program.id}`}
      className="flex items-center gap-4 px-5 py-4 rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-slate-300 transition-all group"
    >
      <div className="w-12 h-12 rounded-xl flex-shrink-0 bg-gradient-to-br from-teal-50 to-emerald-100 ring-4 ring-teal-100 flex items-center justify-center">
        <GraduationCap size={20} className="text-teal-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full", meta.badge)}>
            <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", meta.dot)} />
            {statusLabel}
          </span>
          {status === "completed" && program.certificate_title && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-100 flex items-center gap-1">
              <Award size={10} /> {t("certificateEarned")}
            </span>
          )}
        </div>
        <p className="font-display font-bold text-navy-900 text-[15px] leading-snug truncate mb-2">{program.title}</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", status === "completed" ? "bg-emerald-500" : "bg-teal-500")}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[10px] font-semibold text-slate-400 flex-shrink-0 w-8 text-right">{pct}%</span>
        </div>
      </div>
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-navy-900 flex items-center justify-center transition-all">
        <ArrowRight size={15} className="text-slate-400 group-hover:text-white transition-colors" />
      </div>
    </Link>
  );
}

export default function MyProgramsPage() {
  const t = useTranslations("Programs");
  const token = useAuthStore((s) => s.accessToken)!;

  const { data, isLoading } = useSWR(
    token ? ["/programs/my", token] : null,
    ([url, t]) => fetcher(url, t),
  );

  const enrollments: any[] = Array.isArray(data) ? data : [];

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-black text-navy-900 tracking-tight">{t("myPrograms")}</h1>
          <p className="text-sm text-slate-400 mt-1">
            {t("pageDescription")}
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <div key={i} className="h-[92px] rounded-2xl animate-pulse bg-slate-200" />)}
          </div>
        ) : enrollments.length === 0 ? (
          <div className="py-14 text-center border border-dashed border-slate-200 rounded-2xl bg-white">
            <Layers size={32} className="mx-auto mb-3 text-slate-300" />
            <p className="font-semibold text-slate-500 text-sm mb-1">{t("noProgramsYet")}</p>
            <p className="text-xs text-slate-400 mb-4">{t("browseToGetStarted")}</p>
            <a
              href={`${process.env.NEXT_PUBLIC_MARKETING_URL || "https://paii.ca"}/programs`}
              className="inline-flex items-center gap-2 bg-navy-900 hover:bg-navy-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors"
            >
              {t("browsePrograms")} <ArrowRight size={13} />
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            {enrollments.map((e: any) => <ProgramRow key={e.enrollment_id} enrollment={e} />)}
          </div>
        )}
      </div>
    </div>
  );
}
