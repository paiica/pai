"use client";

import { useState } from "react";
import useSWR from "swr";
import { BarChart2, CheckCircle2, XCircle, HelpCircle, ClipboardList, Trophy, Clock } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r) => r.data);
}

const LEVEL_ACCENT: Record<string, string> = {
  foundation: "from-teal-400 to-teal-600",
  advanced: "from-sky-400 to-sky-600",
  executive: "from-amber-400 to-amber-600",
  specialist: "from-purple-400 to-purple-600",
  pre_certificate: "from-slate-400 to-slate-600",
  other: "from-navy-500 to-navy-700",
};

function pctOf(item: any) {
  if (item.type === "quiz") return item.score;
  if (item.grade === null || item.grade === undefined) return null;
  return Math.round((item.grade / (item.max_score || 100)) * 100);
}

// ─── Overall average ring ──────────────────────────────────────────────────

function AverageRing({ value }: { value: number | null }) {
  const r = 38;
  const circumference = 2 * Math.PI * r;
  const pct = value ?? 0;
  const offset = circumference - (pct / 100) * circumference;
  const color = value === null ? "#cbd5e1" : pct >= 70 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative flex-shrink-0" style={{ width: 96, height: 96 }}>
      <svg width="96" height="96" className="-rotate-90">
        <circle cx="48" cy="48" r={r} fill="none" stroke="#eef1f5" strokeWidth="8" />
        {value !== null && (
          <circle
            cx="48" cy="48" r={r}
            fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-black text-navy-900">{value !== null ? `${value}%` : "—"}</span>
      </div>
    </div>
  );
}

// ─── Graded item row ────────────────────────────────────────────────────────

function GradeRow({ item }: { item: any }) {
  const isQuiz = item.type === "quiz";
  const pct = pctOf(item);
  const passed = isQuiz ? item.passed : (item.grade !== null && item.grade !== undefined ? pct! >= 50 : null);
  const hasScore = pct !== null && pct !== undefined;
  const barColor = passed === true ? "bg-emerald-500" : passed === false ? "bg-red-400" : "bg-slate-300";

  return (
    <div className="px-5 py-3.5">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-navy-900 truncate">{item.title}</p>
          {item.feedback && (
            <p className="text-xs text-slate-400 italic mt-0.5 truncate">"{item.feedback}"</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {hasScore ? (
            <>
              {passed !== null && (
                passed ? <CheckCircle2 size={14} className="text-emerald-500" /> : <XCircle size={14} className="text-red-400" />
              )}
              <span className={cn(
                "text-sm font-black tabular-nums",
                passed === true ? "text-emerald-700" : passed === false ? "text-red-600" : "text-slate-700"
              )}>
                {isQuiz ? `${item.score}%` : `${item.grade}/${item.max_score ?? 100}`}
              </span>
            </>
          ) : (
            <span className="text-xs font-medium text-slate-300 px-2 py-0.5 rounded-full bg-slate-50">Not yet graded</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <div className="flex-1 h-1 rounded-full bg-slate-100 overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-500", barColor)}
            style={{ width: `${hasScore ? Math.min(pct!, 100) : 0}%` }}
          />
        </div>
        {isQuiz && item.passing_score && (
          <span className="text-[10px] text-slate-400 flex-shrink-0">pass {item.passing_score}%</span>
        )}
      </div>
    </div>
  );
}

// ─── Section card ───────────────────────────────────────────────────────────

function GradeSection({
  icon: Icon, label, accent, items, doneCount,
}: { icon: any; label: string; accent: string; items: any[]; doneCount: string }) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-100">
        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0", accent)}>
          <Icon size={14} className="text-white" />
        </div>
        <p className="font-display font-bold text-navy-900 text-sm">{label}</p>
        <span className="ml-auto text-xs text-slate-400 font-medium">{doneCount}</span>
      </div>
      <div className="divide-y divide-slate-50">
        {items.map((item) => <GradeRow key={item.lesson_id} item={item} />)}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StudentGradesPage() {
  const token = useAuthStore((s) => s.accessToken)!;
  const [selectedId, setSelectedId] = useState<string>("");

  const { data: enrollmentsRaw } = useSWR(
    token ? ["/enrollments/my", token] : null,
    ([url, t]) => fetcher(url, t)
  );
  // The sidebar (mounted on every student page) shares this exact SWR key with
  // a fetcher that doesn't unwrap the {success, data} envelope — whichever
  // fetch SWR dedupes to determines the shape everyone sees, so handle both.
  const enrollments: any[] = Array.isArray(enrollmentsRaw) ? enrollmentsRaw : (enrollmentsRaw?.data ?? []);

  const enrollmentId = selectedId || enrollments[0]?.id;
  const activeCert = enrollments.find((e: any) => e.id === enrollmentId)?.certification;

  const { data: gradesData, isLoading } = useSWR(
    enrollmentId && token ? [`/learn/${enrollmentId}/grades`, token] : null,
    ([url, t]) => fetcher(url, t)
  );

  const items: any[] = gradesData?.graded_items ?? [];
  const quizItems = items.filter((i) => i.type === "quiz");
  const assignmentItems = items.filter((i) => i.type === "assignment");
  const scored = items.map((i) => pctOf(i)).filter((v): v is number => v !== null && v !== undefined);
  const overallAvg = scored.length ? Math.round(scored.reduce((s, v) => s + v, 0) / scored.length) : null;
  const quizzesPassed = quizItems.filter((i) => i.passed === true).length;
  const quizzesGraded = quizItems.filter((i) => i.score !== null && i.score !== undefined).length;
  const assignmentsGraded = assignmentItems.filter((i) => i.grade !== null && i.grade !== undefined).length;
  const latestAttempt = gradesData?.exam_attempts?.[0];
  const accentClass = LEVEL_ACCENT[activeCert?.level] ?? "from-navy-500 to-navy-700";

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="max-w-3xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="mb-6">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.14em] mb-1">Performance</p>
          <h1 className="text-3xl font-display font-black text-navy-900 tracking-tight">My Grades</h1>
          <p className="text-slate-500 mt-1 text-sm">Every quiz score and assignment grade, in one place.</p>
        </div>

        {/* Certification switcher */}
        {enrollments.length > 1 && (
          <div className="flex items-center gap-2 flex-wrap mb-6">
            {enrollments.map((e: any) => (
              <button
                key={e.id}
                onClick={() => setSelectedId(e.id)}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors",
                  e.id === enrollmentId
                    ? "bg-navy-900 text-white border-navy-900"
                    : "bg-white text-slate-500 border-slate-200 hover:border-navy-300 hover:text-navy-700"
                )}
              >
                {e.certification?.acronym}
              </button>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4">
            <div className="rounded-2xl h-28 bg-white border border-slate-200 animate-pulse" />
            <div className="rounded-2xl h-40 bg-white border border-slate-200 animate-pulse" />
          </div>
        ) : !items.length ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-14 text-center">
            <BarChart2 size={36} className="mx-auto mb-4 text-slate-200" />
            <p className="font-semibold text-slate-600">No grades yet</p>
            <p className="text-sm mt-1 text-slate-400">Complete quizzes and assignments to see your grades here.</p>
          </div>
        ) : (
          <div className="space-y-5">

            {/* Hero summary */}
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5 flex items-center gap-5">
              <AverageRing value={overallAvg} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className={cn("w-6 h-6 rounded-md bg-gradient-to-br flex-shrink-0", accentClass)} />
                  <p className="font-display font-bold text-navy-900 text-sm truncate">{activeCert?.title}</p>
                </div>
                <div className="flex items-center gap-4 flex-wrap text-xs">
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <HelpCircle size={12} className="text-slate-400" />
                    Quizzes <span className="font-bold text-navy-800">{quizzesPassed}/{quizItems.length}</span> passed
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <ClipboardList size={12} className="text-slate-400" />
                    Assignments <span className="font-bold text-navy-800">{assignmentsGraded}/{assignmentItems.length}</span> graded
                  </span>
                </div>
              </div>
            </div>

            {/* Quizzes & Assignments */}
            <GradeSection
              icon={HelpCircle}
              label="Quizzes"
              accent="bg-purple-500"
              items={quizItems}
              doneCount={`${quizzesGraded}/${quizItems.length} taken`}
            />
            <GradeSection
              icon={ClipboardList}
              label="Assignments"
              accent="bg-amber-500"
              items={assignmentItems}
              doneCount={`${assignmentsGraded}/${assignmentItems.length} graded`}
            />

            {/* Certification exam */}
            {gradesData?.exam_attempts?.length > 0 && (
              <div className="rounded-2xl bg-navy-900 p-5">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-gold-500/20 flex items-center justify-center flex-shrink-0">
                    <Trophy size={14} className="text-gold-400" />
                  </div>
                  <p className="font-display font-bold text-white text-sm">Certification Exam</p>
                  {latestAttempt && (
                    <span className={cn(
                      "ml-auto text-[10px] font-bold px-2.5 py-1 rounded-full",
                      latestAttempt.passed ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"
                    )}>
                      {latestAttempt.passed ? "Passed" : latestAttempt.status.replace("_", " ")}
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  {gradesData.exam_attempts.map((attempt: any) => (
                    <div key={attempt.id} className="flex items-center justify-between text-sm px-3.5 py-2.5 rounded-xl bg-white/5">
                      <span className="text-white/60 flex items-center gap-1.5">
                        <Clock size={11} /> Attempt #{attempt.attempt_number}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={cn("font-black tabular-nums", attempt.passed ? "text-emerald-400" : "text-red-400")}>
                          {attempt.score_percentage ? `${Number(attempt.score_percentage).toFixed(1)}%` : "—"}
                        </span>
                        <span className="text-white/40 text-xs capitalize">{attempt.status.replace("_", " ")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
