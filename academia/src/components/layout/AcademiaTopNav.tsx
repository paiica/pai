"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import useSWR from "swr";
import { Bell } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard":  "Dashboard",
  "/professors": "Professors",
  "/students":   "Students",
  "/courses":    "Courses",
  "/terms":      "Terms",
  "/cohorts":    "Cohorts",
  "/activity":   "Activity",
  "/billing":    "Billing",
  "/settings":   "Settings",
};

interface Notification {
  id: string; type: string; title: string; body: string; read: boolean; created_at: string;
}

function NotificationBell() {
  const { accessToken } = useAuthStore();
  const [open, setOpen] = useState(false);

  const { data: unread, mutate: mutateCount } = useSWR(
    accessToken ? ["/notifications/unread-count", accessToken] : null,
    ([url, token]) => api.get<{ count: number }>(url, token),
    { refreshInterval: 60000 },
  );

  const { data: notifications, mutate: mutateList } = useSWR(
    open && accessToken ? ["/notifications", accessToken] : null,
    ([url, token]) => api.get<Notification[]>(url, token),
  );

  async function markRead(id: string) {
    await api.patch(`/notifications/${id}/read`, {}, accessToken!);
    mutateList();
    mutateCount();
  }

  async function markAllRead() {
    await api.patch("/notifications/read-all", {}, accessToken!);
    mutateList();
    mutateCount();
  }

  const count = unread?.count ?? 0;

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="relative w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors">
        <Bell size={17} className="text-slate-500" />
        {count > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 z-40 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-navy-900">Notifications</p>
              {count > 0 && (
                <button onClick={markAllRead} className="text-xs font-semibold text-navy-600 hover:text-navy-800">Mark all read</button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {!notifications ? (
                <p className="text-sm text-slate-400 px-4 py-6 text-center">Loading…</p>
              ) : notifications.length === 0 ? (
                <p className="text-sm text-slate-400 px-4 py-6 text-center">No notifications yet</p>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => !n.read && markRead(n.id)}
                    className={`w-full text-left px-4 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors ${!n.read ? "bg-navy-50/50" : ""}`}
                  >
                    <p className="text-sm font-semibold text-navy-900">{n.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{n.body}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{formatDateTime(n.created_at)}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function AcademiaTopNav() {
  const pathname = usePathname();
  const { user } = useAuthStore();

  const title = Object.entries(PAGE_TITLES).find(([k]) => pathname.startsWith(k))?.[1] ?? "Dashboard";

  return (
    <header className="h-16 bg-white border-b border-slate-100 flex items-center pl-16 lg:pl-6 pr-6 gap-4 flex-shrink-0">
      <h1 className="text-lg font-display font-black text-navy-900 flex-1">{title}</h1>
      <NotificationBell />
      <div className="w-8 h-8 rounded-full bg-navy-700 flex items-center justify-center text-xs font-bold text-white">
        {user?.profile?.first_name?.[0]}{user?.profile?.last_name?.[0]}
      </div>
    </header>
  );
}
