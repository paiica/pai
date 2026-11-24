"use client";

import Link from "next/link";
import useSWR from "swr";
import { useTranslations } from "next-intl";
import { FlaskConical, CheckCircle2, ArrowRight, Sparkles } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";

type LabItem = {
  lesson_id: string;
  lesson_title: string;
  course_id: string;
  course_title: string;
  course_slug: string;
  enrollment_id: string;
  has_exercises: boolean;
  total_exercises: number;
  passed_exercises: number;
  completed: boolean;
};

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r) => (r as any).data ?? r);
}

function LabCard({ item }: { item: LabItem }) {
  const t = useTranslations("Labs");
  const href = `/labs/${item.enrollment_id}/${item.lesson_id}?course=${encodeURIComponent(item.course_title)}`;

  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-200 bg-white p-5 hover:border-navy-300 hover:shadow-md transition-all flex flex-col"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center flex-shrink-0">
          <FlaskConical size={18} className="text-navy-700" />
        </div>
        {item.completed ? (
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full">
            <CheckCircle2 size={10} /> {t("completed")}
          </span>
        ) : item.has_exercises && item.passed_exercises > 0 ? (
          <span className="text-[10px] font-bold uppercase tracking-wide bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
            {t("inProgress")}
          </span>
        ) : null}
      </div>

      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{item.course_title}</p>
      <h3 className="font-display font-bold text-navy-900 leading-snug mb-3 flex-1">{item.lesson_title}</h3>

      {item.has_exercises && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="flex items-center gap-1"><Sparkles size={11} /> {t("exercisesProgress", { passed: item.passed_exercises, total: item.total_exercises })}</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-teal-500 rounded-full transition-all"
              style={{ width: `${item.total_exercises > 0 ? (item.passed_exercises / item.total_exercises) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      <span className="flex items-center gap-1.5 text-sm font-semibold text-navy-700 group-hover:text-navy-900 mt-auto">
        {item.completed ? t("review") : item.passed_exercises > 0 || item.completed ? t("continueLab") : t("startLab")}
        <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

export default function LabsHubPage() {
  const token = useAuthStore((s) => s.accessToken);
  const t = useTranslations("Labs");

  const { data, isLoading } = useSWR(
    token ? ["/labs/my", token] : null,
    ([url, tok]) => fetcher(url, tok),
  );

  const labs: LabItem[] = Array.isArray(data) ? data : [];
  const byCourse = labs.reduce<Record<string, LabItem[]>>((acc, lab) => {
    (acc[lab.course_id] ??= []).push(lab);
    return acc;
  }, {});

  return (
    <div className="min-h-screen p-8" style={{ background: "#f5f0eb" }}>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <FlaskConical size={22} className="text-navy-700" />
            <h1 className="text-3xl font-display font-black text-navy-900">{t("heading")}</h1>
          </div>
          <p className="text-slate-500">{t("subheading")}</p>
        </div>

        <Link
          href="/labs/playground"
          className="group flex items-center justify-between rounded-2xl border border-navy-200 bg-navy-900 text-white p-5 mb-8 hover:bg-navy-800 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
              <Sparkles size={18} />
            </div>
            <div>
              <p className="font-display font-bold">{t("playgroundTitle")}</p>
              <p className="text-sm text-white/60">{t("playgroundSubtitle")}</p>
            </div>
          </div>
          <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5 flex-shrink-0" />
        </Link>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => <div key={i} className="h-44 rounded-2xl animate-pulse bg-slate-200" />)}
          </div>
        ) : labs.length === 0 ? (
          <div className="py-20 text-center">
            <FlaskConical size={36} className="mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500 font-medium">{t("noLabsHeading")}</p>
            <p className="text-sm text-slate-400 mt-1">{t("noLabsBody")}</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(byCourse).map(([courseId, items]) => (
              <div key={courseId}>
                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3">{items[0].course_title}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {items.map((item) => <LabCard key={item.lesson_id} item={item} />)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
