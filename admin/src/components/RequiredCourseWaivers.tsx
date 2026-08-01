"use client";

import { useState } from "react";
import useSWR from "swr";
import { ShieldCheck, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r: any) => r.data ?? r);
}

// Lets an admin exempt a student from having to purchase/complete specific
// required courses before booking this certification's exam — per-course,
// with a one-click "exempt all" that just checks every box at once. Renders
// nothing if this certification has no required courses.
export function RequiredCourseWaivers({ enrollmentId, token }: { enrollmentId: string; token: string }) {
  const [reason, setReason] = useState("");
  const [busyCourseId, setBusyCourseId] = useState<string | null>(null);
  const [busyAll, setBusyAll] = useState(false);

  const { data, mutate } = useSWR(
    token ? [`/certificates/${enrollmentId}/required-courses`, token] : null,
    ([url, t]) => fetcher(url, t)
  );

  const courses: any[] = data ?? [];
  if (!courses.length) return null;

  async function toggle(courseId: string, waived: boolean) {
    setBusyCourseId(courseId);
    try {
      if (waived) {
        await api.delete(`/certificates/${enrollmentId}/course-waivers/${courseId}`, token);
        toast.success("Exemption removed");
      } else {
        await api.put(`/certificates/${enrollmentId}/course-waivers/${courseId}`, { reason: reason || undefined }, token);
        toast.success("Course exempted");
      }
      mutate();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update exemption");
    } finally {
      setBusyCourseId(null);
    }
  }

  async function waiveAll() {
    setBusyAll(true);
    try {
      await api.put(`/certificates/${enrollmentId}/course-waivers`, { reason: reason || undefined }, token);
      toast.success("All required courses exempted");
      mutate();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to exempt all courses");
    } finally {
      setBusyAll(false);
    }
  }

  const allWaived = courses.every((c) => c.waived);

  return (
    <div className="pt-3 mt-1 border-t border-slate-200">
      <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
          <ShieldCheck size={12} /> Required Courses — Exam Prerequisites
        </p>
        {!allWaived && (
          <button
            disabled={busyAll}
            onClick={(e) => { e.stopPropagation(); waiveAll(); }}
            className="flex items-center gap-1 text-[11px] font-semibold text-navy-600 hover:text-navy-800 disabled:opacity-60"
          >
            {busyAll && <Loader2 size={11} className="animate-spin" />}
            Exempt from all
          </button>
        )}
      </div>
      <input
        type="text"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        placeholder="Reason for exemption (optional — applied to the next toggle)"
        className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 mb-2 focus:outline-none focus:ring-2 focus:ring-gold-400 bg-white"
      />
      <div className="space-y-1">
        {courses.map((c) => (
          <label
            key={c.course_id}
            className="flex items-center justify-between gap-3 text-xs py-1.5 border-b border-slate-50 last:border-0 cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="flex items-center gap-2 min-w-0 flex-1">
              <input
                type="checkbox"
                checked={c.waived}
                disabled={busyCourseId === c.course_id}
                onChange={() => toggle(c.course_id, c.waived)}
                className="accent-navy-600 flex-shrink-0"
              />
              <span className="truncate text-slate-700">{c.course_title}</span>
            </span>
            <span className="flex items-center gap-2 flex-shrink-0">
              {c.waived ? (
                <span className="badge bg-violet-50 text-violet-600 border border-violet-100">Exempted</span>
              ) : (
                <span className={cn(
                  "badge",
                  c.completed
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                    : c.purchased
                    ? "bg-blue-50 text-blue-700 border border-blue-100"
                    : "bg-slate-100 text-slate-500 border border-slate-200",
                )}>
                  {c.completed ? "Completed" : c.purchased ? "In progress" : "Not purchased"}
                </span>
              )}
            </span>
          </label>
        ))}
      </div>
      {courses.some((c) => c.waived && (c.waiver?.reason || c.waiver?.waived_by)) && (
        <div className="mt-2 space-y-0.5">
          {courses.filter((c) => c.waived).map((c) => (
            <p key={c.course_id} className="text-[10px] text-slate-400 truncate">
              {c.course_title}: waived by {c.waiver?.waived_by?.profile
                ? `${c.waiver.waived_by.profile.first_name} ${c.waiver.waived_by.profile.last_name}`
                : c.waiver?.waived_by?.email}
              {c.waiver?.reason ? ` — "${c.waiver.reason}"` : ""}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
