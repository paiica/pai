"use client";

import useSWR from "swr";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-CA", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function NotificationsPage() {
  const { accessToken } = useAuthStore();
  const router = useRouter();
  const t = useTranslations("Notifications");
  const { data: notifications, isLoading, mutate } = useSWR(
    accessToken ? ["/notifications", accessToken] : null,
    ([url, t]) => fetcher(url, t)
  );

  async function handleMarkRead(id: string) {
    try {
      await api.patch(`/notifications/${id}/read`, {}, accessToken!);
      mutate();
    } catch {
      // best-effort
    }
  }

  function handleNotificationClick(n: any) {
    if (!n.read) handleMarkRead(n.id);
    const dest = TYPE_LINK[n.type];
    if (dest) router.push(dest);
  }

  async function handleMarkAllRead() {
    try {
      await api.patch("/notifications/read-all", {}, accessToken!);
      mutate();
    } catch {
      // best-effort
    }
  }

  async function handleClearAll() {
    if (!confirm(t("confirmClearAll"))) return;
    try {
      await api.delete("/notifications", accessToken!);
      mutate();
    } catch {
      // best-effort
    }
  }

  const list: any[] = notifications ?? [];
  const hasUnread = list.some((n) => !n.read);

  return (
    <div className="min-h-screen bg-[#f7f8fa] px-6 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-1 gap-3">
          <h1 className="font-display font-black text-navy-900 text-2xl">{t("heading")}</h1>
          <div className="flex items-center gap-4">
            {hasUnread && (
              <button onClick={handleMarkAllRead} className="text-xs font-semibold text-navy-600 hover:underline">
                {t("markAllRead")}
              </button>
            )}
            {list.length > 0 && (
              <button onClick={handleClearAll} className="text-xs font-semibold text-slate-400 hover:text-red-600 hover:underline">
                {t("clearAll")}
              </button>
            )}
          </div>
        </div>
        <p className="text-slate-500 text-sm mb-8">{t("subheading")}</p>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-2xl animate-pulse bg-slate-200" />)}
          </div>
        ) : list.length === 0 ? (
          <div className="card p-12 text-center">
            <Bell size={36} className="mx-auto mb-3 text-slate-300" />
            <p className="font-semibold text-navy-800">{t("emptyHeading")}</p>
            <p className="text-sm text-slate-400 mt-1">{t("emptyBody")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {list.map((n: any) => {
              const Icon = TYPE_ICON[n.type] ?? Bell;
              return (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
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
    </div>
  );
}
