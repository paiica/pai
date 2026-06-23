"use client";

import { useState } from "react";
import useSWR from "swr";
import { BarChart2, CheckCircle, XCircle } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r) => r.data);
}

export default function StudentGradesPage() {
  const token = useAuthStore((s) => s.accessToken)!;
  const [selectedId, setSelectedId] = useState<string>("");

  const { data: enrollments } = useSWR(
    token ? ["/enrollments/my", token] : null,
    ([url, t]) => fetcher(url, t)
  );

  const enrollmentId = selectedId || enrollments?.[0]?.id;

  const { data: gradesData, isLoading } = useSWR(
    enrollmentId && token ? [`/learn/${enrollmentId}/grades`, token] : null,
    ([url, t]) => fetcher(url, t)
  );

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-black text-navy-900">My Grades</h1>
        <p className="text-slate-500 mt-1">Quiz scores and assignment grades.</p>
      </div>

      {/* Enrollment selector */}
      {enrollments?.length > 1 && (
        <div className="mb-6">
          <select
            className="input-base max-w-sm"
            value={enrollmentId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {enrollments.map((e: any) => (
              <option key={e.id} value={e.id}>
                {e.certification?.acronym} — {e.certification?.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="card h-16 animate-pulse bg-slate-100" />)}
        </div>
      ) : !gradesData?.graded_items?.length ? (
        <div className="card p-12 text-center text-slate-500">
          <BarChart2 size={40} className="mx-auto mb-4 text-slate-300" />
          <p className="font-semibold">No grades yet</p>
          <p className="text-sm mt-1">Complete quizzes and assignments to see your grades here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Progress summary */}
          <div className="card p-4 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full border-4 border-navy-500 flex items-center justify-center flex-shrink-0">
              <span className="text-lg font-black text-navy-800">{gradesData.progress_percentage}%</span>
            </div>
            <div>
              <p className="font-semibold text-navy-900">Overall Progress</p>
              <p className="text-sm text-slate-500">{gradesData.graded_items.length} graded items</p>
            </div>
          </div>

          {/* Graded items */}
          <div className="card divide-y divide-slate-100">
            {gradesData.graded_items.map((item: any) => {
              const isQuiz = item.type === "quiz";
              const score = isQuiz ? item.score : item.grade;
              const passed = isQuiz ? item.passed : (item.grade !== null ? item.grade >= 50 : null);

              return (
                <div key={item.lesson_id} className="flex items-center gap-4 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-navy-900 truncate">{item.title}</p>
                    <p className="text-xs text-slate-400 capitalize">{item.type}</p>
                  </div>
                  <div className="text-right">
                    {score !== null && score !== undefined ? (
                      <div className="flex items-center gap-2">
                        {passed === true ? (
                          <CheckCircle size={15} className="text-emerald-500" />
                        ) : passed === false ? (
                          <XCircle size={15} className="text-red-400" />
                        ) : null}
                        <span className={cn(
                          "text-sm font-bold",
                          passed === true ? "text-emerald-700" : passed === false ? "text-red-600" : "text-slate-700"
                        )}>
                          {isQuiz ? `${score}%` : `${score}/${item.max_score ?? 100}`}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-300 text-sm">—</span>
                    )}
                    {isQuiz && item.passing_score && (
                      <p className="text-xs text-slate-400">Pass: {item.passing_score}%</p>
                    )}
                    {item.feedback && (
                      <p className="text-xs text-slate-500 italic mt-0.5">"{item.feedback}"</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Exam attempts */}
          {gradesData.exam_attempts?.length > 0 && (
            <div className="card p-5">
              <p className="font-semibold text-navy-900 mb-3">Certification Exam</p>
              <div className="space-y-2">
                {gradesData.exam_attempts.map((attempt: any) => (
                  <div key={attempt.id} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Attempt #{attempt.attempt_number}</span>
                    <div className="flex items-center gap-2">
                      <span className={cn("font-bold", attempt.passed ? "text-emerald-700" : "text-red-600")}>
                        {attempt.score_percentage ? `${Number(attempt.score_percentage).toFixed(1)}%` : "—"}
                      </span>
                      <span className={cn("badge", attempt.passed ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>
                        {attempt.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
