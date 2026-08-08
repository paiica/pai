"use client";

import useSWR from "swr";
import { Bell, CheckCircle2, XCircle, Mail, Award, ClipboardList } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r: any) => r.data);
}

const TYPE_ICON: Record<string, any> = {
  course_invitation_received: Mail,
  course_invitation_accepted: CheckCircle2,
  course_invitation_rejected: XCircle,
  course_approved: CheckCircle2,
  course_rejected: XCircle,
  certification_recommendation_received: Award,
  application_submitted: ClipboardList,
  application_approved: CheckCircle2,
  application_rejected: XCircle,
};

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-CA", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function ProfNotificationsPage() {
  const token = useAuthStore((s) => s.accessToken);
  const { data: notifications, isLoading, mutate } = useSWR(
    token ? ["/notifications", token] : null,
    ([url, t]) => fetcher(url, t)
  );

  async function handleMarkRead(id: string) {
    try {
      await api.patch(`/notifications/${id}/read`, {}, token!);
      mutate();
    } catch {
      // best-effort
    }
  }

  async function handleMarkAllRead() {
    try {
      await api.patch("/notifications/read-all", {}, token!);
      mutate();
    } catch {
      // best-effort
    }
  }

  async function handleClearAll() {
    if (!confirm("Clear all notifications? This can't be undone.")) return;
    try {
      await api.delete("/notifications", token!);
      mutate();
    } catch {
      // best-effort
    }
  }

  const list: any[] = notifications ?? [];
  const hasUnread = list.some((n) => !n.read);

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-black text-navy-900">Notifications</h1>
          <p className="text-slate-500 mt-1">Updates on your invitations, recommendations, and course approvals.</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {hasUnread && (
            <button onClick={handleMarkAllRead} className="btn-outline text-xs px-3 py-2 whitespace-nowrap">
              Mark all read
            </button>
          )}
          {list.length > 0 && (
            <button onClick={handleClearAll} className="btn-outline text-xs px-3 py-2 whitespace-nowrap !text-red-500 !border-red-200 hover:!bg-red-50">
              Clear all
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-5 animate-pulse h-16 bg-slate-100" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="card p-12 text-center text-slate-500">
          <Bell size={40} className="mx-auto mb-4 text-slate-300" />
          <p className="font-semibold text-navy-800">No notifications yet</p>
          <p className="text-sm mt-1">You'll see updates here when students respond or admins review your courses.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((n: any) => {
            const Icon = TYPE_ICON[n.type] ?? Bell;
            return (
              <button
                key={n.id}
                onClick={() => !n.read && handleMarkRead(n.id)}
                className={cn(
                  "card p-4 w-full text-left flex items-start gap-3 transition-colors",
                  !n.read && "bg-navy-50/40 border-navy-100"
                )}
              >
                <div className="w-9 h-9 rounded-xl bg-navy-50 text-navy-700 flex items-center justify-center flex-shrink-0">
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-navy-900">{n.title}</p>
                  <p className="text-sm text-slate-500 mt-0.5">{n.body}</p>
                  <p className="text-xs text-slate-400 mt-1.5">{fmtDateTime(n.created_at)}</p>
                </div>
                {!n.read && <span className="w-2 h-2 rounded-full bg-navy-600 flex-shrink-0 mt-1.5" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
