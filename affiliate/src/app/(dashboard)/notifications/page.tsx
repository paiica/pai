"use client";

import { Bell, CheckCheck, DollarSign, Users, Tag, Info } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { Skeleton } from "@/components/ui/LoadingSkeleton";
import EmptyState from "@/components/ui/EmptyState";
import { timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { NotificationType } from "@/types";
import toast from "react-hot-toast";

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case "commission_approved":
    case "commission_paid":
      return { icon: DollarSign, bg: "bg-gold-50", color: "text-gold-600" };
    case "new_lead":
    case "lead_converted":
      return { icon: Users, bg: "bg-blue-50", color: "text-blue-600" };
    case "promo_expiring":
      return { icon: Tag, bg: "bg-amber-50", color: "text-amber-600" };
    default:
      return { icon: Info, bg: "bg-slate-100", color: "text-slate-500" };
  }
}

export default function NotificationsPage() {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotifications();

  async function handleMarkAll() {
    await markAllAsRead();
    toast.success("All notifications marked as read");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
        </p>
        {unreadCount > 0 && (
          <button onClick={handleMarkAll} className="btn-ghost !py-1.5 !px-3 !text-xs flex items-center gap-1.5">
            <CheckCheck size={13} />
            Mark all as read
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-5 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState icon={Bell} title="No notifications" description="You're all caught up!" className="py-16" />
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map((n) => {
              const { icon: Icon, bg, color } = getNotificationIcon(n.type);
              return (
                <div
                  key={n.id}
                  className={cn(
                    "px-5 py-4 flex items-start gap-3 cursor-pointer hover:bg-slate-50 transition-colors",
                    !n.is_read && "bg-gold-50/30"
                  )}
                  onClick={() => !n.is_read && markAsRead(n.id)}
                >
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", bg)}>
                    <Icon size={16} className={color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm", n.is_read ? "text-slate-600" : "font-semibold text-slate-800")}>
                      {n.title}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{n.message}</p>
                    <p className="text-xs text-slate-400 mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.is_read && (
                    <div className="w-2 h-2 rounded-full bg-gold-500 shrink-0 mt-1.5" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
