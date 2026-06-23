"use client";

import { useParams } from "next/navigation";
import useSWR from "swr";
import { User } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r: any) => r.data);
}

export default function GradebookPage() {
  const { certId } = useParams<{ certId: string }>();
  const token = useAuthStore((s) => s.accessToken)!;

  const { data } = useSWR(
    token ? [`/prof/certifications/${certId}/gradebook`, token] : null,
    ([url, t]) => fetcher(url, t)
  );

  if (!data) return (
    <div className="p-8">
      <div className="card p-8 animate-pulse h-64 bg-slate-100" />
    </div>
  );

  const { certification, gradable_items, students } = data;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-display font-black text-navy-900">Gradebook — {certification.acronym}</h1>
        <p className="text-slate-500 mt-1">{students.length} students · {gradable_items.length} graded items</p>
      </div>

      {students.length === 0 ? (
        <div className="card p-12 text-center text-slate-500">
          <User size={40} className="mx-auto mb-4 text-slate-300" />
          <p className="font-semibold">No enrolled students yet</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-navy-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-semibold text-navy-800 min-w-48">Student</th>
                  <th className="text-center px-3 py-3 font-semibold text-navy-800 w-20">Progress</th>
                  {gradable_items.map((item: any) => (
                    <th key={item.lesson_id} className="text-center px-3 py-3 font-semibold text-navy-800 min-w-28">
                      <div className="text-xs">{item.title}</div>
                      <div className={cn("text-xs font-normal mt-0.5", item.type === "quiz" ? "text-purple-500" : "text-amber-500")}>
                        {item.type}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((student: any) => (
                  <tr key={student.enrollment_id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-navy-900">
                        {student.user?.profile?.first_name} {student.user?.profile?.last_name}
                      </p>
                      <p className="text-xs text-slate-400">{student.status}</p>
                    </td>
                    <td className="text-center px-3 py-3">
                      <span className={cn(
                        "text-xs font-bold px-2 py-1 rounded-full",
                        student.progress_percentage === 100 ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                      )}>
                        {student.progress_percentage}%
                      </span>
                    </td>
                    {gradable_items.map((item: any) => {
                      const score = item.type === "quiz"
                        ? student.quiz_scores?.[item.lesson_id]
                        : student.assignment_grades?.[item.lesson_id];
                      return (
                        <td key={item.lesson_id} className="text-center px-3 py-3">
                          {score !== undefined && score !== null ? (
                            <span className={cn(
                              "text-xs font-semibold px-2 py-0.5 rounded-full",
                              score >= (item.passing_score ?? 70)
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-red-100 text-red-600"
                            )}>
                              {score}
                              {item.type === "quiz" ? "%" : `/${item.max_score ?? 100}`}
                            </span>
                          ) : (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
