"use client";

import Link from "next/link";
import useSWR from "swr";
import { FileText, Clock, CheckCircle, AlertCircle, Circle } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r) => r.data);
}

function getStatus(assignment: any) {
  const sub = assignment.submission;
  if (!sub) {
    const due = assignment.due_date ? new Date(assignment.due_date) : null;
    if (due && due < new Date()) return { label: "Overdue", style: "badge bg-red-100 text-red-700" };
    return { label: "Not submitted", style: "badge bg-slate-100 text-slate-500" };
  }
  if (sub.grade !== null && sub.grade !== undefined) {
    return { label: `Graded: ${sub.grade}/${assignment.max_score ?? 100}`, style: "badge bg-emerald-100 text-emerald-700" };
  }
  return { label: "Submitted · Pending", style: "badge bg-blue-100 text-blue-700" };
}

export default function StudentAssignmentsPage() {
  const token = useAuthStore((s) => s.accessToken)!;
  const { data: assignments, isLoading } = useSWR(
    token ? ["/learn/assignments", token] : null,
    ([url, t]) => fetcher(url, t)
  );

  const grouped = assignments?.reduce((acc: Record<string, any[]>, a: any) => {
    const key = a.certification.acronym;
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {}) ?? {};

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-display font-black text-navy-900">My Assignments</h1>
        <p className="text-slate-500 mt-1">All assignments across your enrolled certifications.</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="card h-20 animate-pulse bg-slate-100" />)}
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="card p-12 text-center text-slate-500">
          <FileText size={40} className="mx-auto mb-4 text-slate-300" />
          <p className="font-semibold">No assignments yet</p>
          <p className="text-sm mt-1">Assignments will appear here once your instructor creates them.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([cert, items]) => (
            <div key={cert}>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">{cert}</p>
              <div className="space-y-2">
                {(items as any[]).map((a) => {
                  const status = getStatus(a);
                  const due = a.due_date ? new Date(a.due_date) : null;
                  return (
                    <div key={a.lesson_id} className="card p-4 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-navy-900 text-sm">{a.title}</p>
                          <span className={status.style}>{status.label}</span>
                        </div>
                        {due && (
                          <p className={cn("text-xs mt-0.5 flex items-center gap-1",
                            due < new Date() && !a.submission ? "text-red-500" : "text-slate-400"
                          )}>
                            <Clock size={11} />
                            Due {due.toLocaleDateString("en-CA", { dateStyle: "medium" })}
                          </p>
                        )}
                        {a.submission?.feedback && (
                          <p className="text-xs text-slate-500 mt-1 italic">"{a.submission.feedback}"</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
