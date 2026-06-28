import useSWR from "swr";
import { api } from "@/lib/api";
import type { Notification } from "@/types";

export function useNotifications() {
  const { data, error, isLoading, mutate } = useSWR(
    "affiliate-notifications",
    () => api.get<Notification[]>("/affiliate/notifications"),
    { refreshInterval: 30_000 }
  );

  async function markAsRead(id: string) {
    await api.patch(`/affiliate/notifications/${id}/read`, {});
    mutate();
  }

  async function markAllAsRead() {
    await api.post("/affiliate/notifications/read-all", {});
    mutate();
  }

  const unreadCount = (data ?? []).filter((n) => !n.is_read).length;

  return {
    notifications: data ?? [],
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    refresh: mutate,
  };
}
