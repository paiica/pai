"use client";

import { useState } from "react";
import useSWR from "swr";
import { Loader2, History, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { describeActivity } from "@/lib/activity";
import type { AuditLogEntry } from "@/types";

interface ActivityResponse {
  items: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
}

export default function ActivityPage() {
  const { accessToken, currentInstitutionId } = useAuthStore();
  const [page, setPage] = useState(1);
  const limit = 30;

  const { data, isLoading } = useSWR(
    accessToken && currentInstitutionId ? [`/institutions/${currentInstitutionId}/activity?page=${page}&limit=${limit}`, accessToken] : null,
    ([url, token]) => api.get<ActivityResponse>(url, token),
  );

  const items = data?.items ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / limit)) : 1;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <p className="text-slate-500 text-sm">Everything that's happened in your institution — invites, role changes, billing events, and more.</p>

      {isLoading ? (
        <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-slate-300" size={24} /></div>
      ) : items.length === 0 ? (
        <div className="card p-12 text-center">
          <History size={32} className="text-slate-200 mx-auto mb-3" />
          <p className="font-semibold text-slate-500">No activity yet</p>
        </div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <div className="divide-y divide-slate-100">
              {items.map((a) => (
                <div key={a.id} className="px-4 py-3 flex items-center justify-between text-sm gap-3">
                  <span className="text-slate-700">{describeActivity(a)}</span>
                  <span className="text-xs text-slate-400 shrink-0">{formatDateTime(a.created_at)}</span>
                </div>
              ))}
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="btn-outline !p-2 disabled:opacity-40">
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs text-slate-500">Page {page} of {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="btn-outline !p-2 disabled:opacity-40">
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
