"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

// Notification types with an obvious in-app destination — clicking one
// takes the student straight there instead of just marking it read.
const TYPE_LINK: Record<string, string> = {
  course_invitation_received: "/invitations",
  certification_recommendation_received: "/invitations",
};

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const token = useAuthStore((s) => s.accessToken);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const { data: countData, mutate: mutateCount } = useSWR(
    token ? ["/notifications/unread-count", token] : null,
    ([url, t]) => fetcher(url, t),
    { refreshInterval: 30000 }
  );
  const { data: notifications, mutate: mutateList } = useSWR(
    open && token ? ["/notifications", token] : null,
    ([url, t]) => fetcher(url, t)
  );

  const unreadCount = countData?.count ?? 0;
  const recent = (notifications ?? []).slice(0, 8);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function handleMarkRead(id: string) {
    try {
      await api.patch(`/notifications/${id}/read`, {}, token!);
      mutateList();
      mutateCount();
    } catch {
      // best-effort — a failed mark-read isn't worth surfacing an error toast for
    }
  }

  function handleNotificationClick(n: any) {
    if (!n.read) handleMarkRead(n.id);
    const dest = TYPE_LINK[n.type];
    if (dest) {
      setOpen(false);
      router.push(dest);
    }
  }

  async function handleMarkAllRead() {
    try {
      await api.patch("/notifications/read-all", {}, token!);
      mutateList();
      mutateCount();
    } catch {
      // best-effort
    }
  }

  async function handleClearAll() {
    if (!confirm("Clear all notifications? This can't be undone.")) return;
    try {
      await api.delete("/notifications", token!);
      mutateList();
      mutateCount();
    } catch {
      // best-effort
    }
  }

  if (!token) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="flex items-center gap-1.5 text-slate-500 hover:text-navy-700 transition-colors text-xs font-medium"
      >
        <div className="relative">
          <Bell size={16} />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-700">Notifications</span>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button onClick={handleMarkAllRead} className="text-[11px] font-medium text-navy-600 hover:underline">
                  Mark all read
                </button>
              )}
              {recent.length > 0 && (
                <button onClick={handleClearAll} className="text-[11px] font-medium text-slate-400 hover:text-red-600 hover:underline">
                  Clear all
                </button>
              )}
            </div>
          </div>

          {recent.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">No notifications yet</div>
          ) : (
            <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
              {recent.map((n: any) => {
                const Icon = TYPE_ICON[n.type] ?? Bell;
                return (
                  <button
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={cn(
                      "w-full flex items-start gap-2.5 px-4 py-3 text-left hover:bg-slate-50 transition-colors",
                      !n.read && "bg-navy-50/60"
                    )}
                  >
                    <Icon size={14} className="text-navy-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 leading-snug">{n.title}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug line-clamp-2">{n.body}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                    {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-navy-600 flex-shrink-0 mt-1.5" />}
                  </button>
                );
              })}
            </div>
          )}

          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block text-center text-xs font-bold text-navy-700 hover:bg-slate-50 px-4 py-2.5 border-t border-slate-100 transition-colors"
          >
            View All
          </Link>
        </div>
      )}
    </div>
  );
}
