"use client";

import { useMemo } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Users2, UserPlus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import EmptyState from "@/components/ui/EmptyState";
import { EnrollmentBadge } from "@/components/ui/StatusBadge";
import type { Employee } from "@/types";

function fullName(e: Employee["user"]) {
  const n = `${e.profile?.first_name ?? ""} ${e.profile?.last_name ?? ""}`.trim();
  return n || e.email;
}

export default function EmployeesPage() {
  const { accessToken } = useAuthStore();

  const { data: enrollments, isLoading, mutate } = useSWR(
    accessToken ? ["/org/employees", accessToken] : null,
    ([url, token]) => api.get<Employee[]>(url, token),
  );

  // Group flat enrollment rows into one card per employee, since a single
  // employee can be enrolled in multiple certifications.
  const employees = useMemo(() => {
    if (!enrollments) return [];
    const byUser = new Map<string, { user: Employee["user"]; enrollments: Employee[] }>();
    for (const e of enrollments) {
      const existing = byUser.get(e.user_id);
      if (existing) existing.enrollments.push(e);
      else byUser.set(e.user_id, { user: e.user, enrollments: [e] });
    }
    return [...byUser.values()];
  }, [enrollments]);

  async function handleRemove(userId: string, name: string) {
    if (!confirm(`Remove ${name} from your organization? Frees up their seat. Any completed certification is kept as-is; anything in progress is paused (not deleted) in case they're re-added later. If they never verified their email, their account is deleted instead.`)) return;
    try {
      const res = await api.delete<{ removed: boolean; account_deleted: boolean }>(`/org/employees/${userId}`, accessToken!);
      toast.success(res.account_deleted ? "Employee removed — their (never-verified) account was deleted" : "Employee removed — their seat is now free");
      mutate();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to remove employee");
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-display font-black text-navy-900">Employees</h2>
          <p className="text-sm text-slate-500 mt-0.5">{employees.length} employee{employees.length !== 1 ? "s" : ""} enrolled</p>
        </div>
        <Link href="/employees/invite" className="btn-primary">
          <UserPlus size={16} /> Invite Employees
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="card h-20 animate-pulse" />)}
        </div>
      ) : employees.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Users2}
            title="No employees yet"
            description="Invite your team to get them started on their certifications."
            action={<Link href="/employees/invite" className="btn-primary"><UserPlus size={16} /> Invite Employees</Link>}
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Employee</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Certifications</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Enrolled</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employees.map(({ user, enrollments: userEnrollments }) => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-navy-900">{fullName(user)}</p>
                    {/* fullName() already falls back to the email when no name is
                        set yet (an invited employee who hasn't logged in) — only
                        show the email again here if it's not just a repeat. */}
                    {fullName(user) !== user.email && <p className="text-xs text-slate-400">{user.email}</p>}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {userEnrollments.map((e) => (
                        <div key={e.id} className="inline-flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-slate-600">{e.certification.acronym}</span>
                          <EnrollmentBadge status={e.status} />
                          <span className="text-xs text-slate-400">{e.progress_percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-500 text-xs">
                    {formatDate(userEnrollments[0].enrolled_at)}
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => handleRemove(user.id, fullName(user))}
                      className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                      title="Remove employee"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
