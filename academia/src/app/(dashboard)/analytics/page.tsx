"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { Loader2, TrendingUp, Users, BookOpen } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";

type Range = "7d" | "30d" | "90d";

interface AnalyticsData {
  enrollments_over_time: { date: string; value: number }[];
  active_students_over_time: { date: string; value: number }[];
  active_students_total: number;
  top_courses: { id: string; title: string; enrollment_count: number; completed_count: number; completion_rate: number }[];
}

function RangeButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={active ? "btn-primary !py-1.5 !px-3 !text-xs" : "btn-outline !py-1.5 !px-3 !text-xs"}>
      {label}
    </button>
  );
}

// Backend buckets days by UTC calendar date (see InstitutionsService.getAnalytics) —
// format with timeZone: "UTC" here too, so a "2026-08-31" bucket doesn't
// silently shift to Aug 30 for anyone west of UTC.
const formatUtcDate = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

export default function AnalyticsPage() {
  const { accessToken, currentInstitutionId } = useAuthStore();
  const [range, setRange] = useState<Range>("30d");

  const { data, isLoading } = useSWR(
    accessToken && currentInstitutionId ? [`/institutions/${currentInstitutionId}/analytics?range=${range}`, accessToken] : null,
    ([url, token]) => api.get<AnalyticsData>(url, token),
  );

  const totalEnrollments = data?.enrollments_over_time.reduce((sum, d) => sum + d.value, 0) ?? 0;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-slate-500 text-sm">Real enrollment and lesson-activity trends — not just roster size</p>
        <div className="flex items-center gap-2">
          <RangeButton label="7 days" active={range === "7d"} onClick={() => setRange("7d")} />
          <RangeButton label="30 days" active={range === "30d"} onClick={() => setRange("30d")} />
          <RangeButton label="90 days" active={range === "90d"} onClick={() => setRange("90d")} />
        </div>
      </div>

      {isLoading || !data ? (
        <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-slate-300" size={24} /></div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="card p-5 flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-navy-50 flex items-center justify-center flex-shrink-0">
                <TrendingUp size={20} className="text-navy-700" />
              </div>
              <div>
                <p className="text-2xl font-display font-black text-navy-900">{totalEnrollments}</p>
                <p className="text-xs text-slate-500">New enrollments in this period</p>
              </div>
            </div>
            <div className="card p-5 flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-navy-50 flex items-center justify-center flex-shrink-0">
                <Users size={20} className="text-navy-700" />
              </div>
              <div>
                <p className="text-2xl font-display font-black text-navy-900">{data.active_students_total}</p>
                <p className="text-xs text-slate-500">Students who engaged with a lesson in this period</p>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="card p-5">
              <p className="text-sm font-semibold text-navy-900 mb-4">Enrollments Over Time</p>
              {totalEnrollments === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-sm text-slate-400">No new enrollments in this period.</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={data.enrollments_over_time} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="grad-enrollments" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1e3a5f" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#1e3a5f" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tickFormatter={formatUtcDate} tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                    <Tooltip labelFormatter={(v) => formatUtcDate(v as string)} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                    <Area type="monotone" dataKey="value" name="Enrollments" stroke="#1e3a5f" strokeWidth={2} fill="url(#grad-enrollments)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="card p-5">
              <p className="text-sm font-semibold text-navy-900 mb-4">Active Students Per Day</p>
              {data.active_students_total === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-sm text-slate-400">No lesson activity in this period.</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.active_students_over_time} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tickFormatter={formatUtcDate} tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                    <Tooltip labelFormatter={(v) => formatUtcDate(v as string)} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                    <Bar dataKey="value" name="Active students" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="card p-5">
            <p className="text-sm font-semibold text-navy-900 mb-4 flex items-center gap-2">
              <BookOpen size={15} className="text-slate-400" /> Top Courses by Enrollment
            </p>
            {data.top_courses.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No enrollments yet.</p>
            ) : (
              <div className="space-y-3">
                {data.top_courses.map((c, i) => (
                  <div key={c.id} className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-xs flex items-center justify-center font-bold shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1 gap-2">
                        <p className="text-xs font-semibold text-slate-700 truncate">{c.title}</p>
                        <p className="text-xs font-bold text-navy-700 shrink-0">{c.enrollment_count} enrolled</p>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-teal-500 rounded-full" style={{ width: `${Math.round(c.completion_rate * 100)}%` }} />
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{c.completed_count} completed · {Math.round(c.completion_rate * 100)}% completion rate</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
