"use client";

import { useState } from "react";
import useSWR from "swr";
import { History, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";

interface LogEntry {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  old_value: any;
  new_value: any;
  created_at: string;
  user: { email: string; profile: { first_name: string | null; last_name: string | null } | null } | null;
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" });
}

const ACTION_COLOR: Record<string, string> = {
  created: "bg-emerald-50 text-emerald-700",
  approved: "bg-emerald-50 text-emerald-700",
  invited: "bg-blue-50 text-blue-700",
  joined: "bg-blue-50 text-blue-700",
  resumed: "bg-blue-50 text-blue-700",
  rejected: "bg-red-50 text-red-700",
  suspended: "bg-red-50 text-red-700",
  removed: "bg-red-50 text-red-700",
  ended: "bg-slate-100 text-slate-500",
  cancel_scheduled: "bg-amber-50 text-amber-700",
  submitted_for_approval: "bg-amber-50 text-amber-700",
};

function actionBadgeClass(action: string) {
  const suffix = action.split(".").pop() ?? "";
  return ACTION_COLOR[suffix] ?? "bg-slate-100 text-slate-500";
}

export default function AuditLogPage() {
  const { accessToken } = useAuthStore();
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  const params = new URLSearchParams({ page: String(page), limit: "30" });
  if (entityType) params.set("entityType", entityType);
  if (actionFilter) params.set("action", actionFilter);

  const { data, isLoading } = useSWR(
    accessToken ? [`/admin/audit-log?${params.toString()}`, accessToken] : null,
    ([url, t]) => api.get<any>(url, t).then((r) => r.data ?? r),
  );

  const items: LogEntry[] = data?.items ?? [];
  const total: number = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 30));

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-black text-navy-900">Audit Log</h1>
          <p className="text-slate-500 text-sm mt-0.5">Academic Cloud lifecycle events — institutions, professors, courses, billing</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <select value={entityType} onChange={(e) => { setEntityType(e.target.value); setPage(1); }} className="input-base !py-2 !w-auto text-sm">
          <option value="">All Entity Types</option>
          <option value="Institution">Institution</option>
          <option value="Course">Course</option>
          <option value="Package">Package</option>
        </select>
        <input
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          placeholder="Filter by action (e.g. professor_invited)"
          className="input-base !py-2 !w-64 text-sm"
        />
      </div>

      {isLoading ? (
        <div className="card p-12 text-center text-slate-400">Loading…</div>
      ) : items.length === 0 ? (
        <div className="card p-12 text-center">
          <History size={32} className="text-slate-200 mx-auto mb-3" />
          <p className="font-semibold text-slate-500">No matching events</p>
        </div>
      ) : (
        <div className="card overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">When</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Action</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Entity</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors align-top">
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmtDateTime(log.created_at)}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {log.user ? (log.user.profile?.first_name ? `${log.user.profile.first_name} ${log.user.profile.last_name ?? ""}` : log.user.email) : <span className="text-slate-300">System</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${actionBadgeClass(log.action)}`}>{log.action}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{log.entity_type ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs max-w-md truncate" title={JSON.stringify(log.new_value ?? log.old_value ?? {})}>
                    {JSON.stringify(log.new_value ?? log.old_value ?? {})}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-outline !p-2 disabled:opacity-40">
            <ChevronLeft size={14} />
          </button>
          <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-outline !p-2 disabled:opacity-40">
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
