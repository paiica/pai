import useSWR from "swr";
import { api } from "@/lib/api";
import type { Invite, InviteStats } from "@/types";

export function useInvites() {
  const { data: stats, error: statsError, isLoading: statsLoading, mutate: mutateStats } = useSWR(
    "affiliate-invite-stats",
    () => api.get<InviteStats>("/affiliate/invites/stats"),
    { revalidateOnFocus: false }
  );

  const { data: invites, error: invitesError, isLoading: invitesLoading, mutate: mutateInvites } = useSWR(
    "affiliate-invites",
    () => api.get<Invite[]>("/affiliate/invites"),
    { revalidateOnFocus: false }
  );

  async function sendInvite(email: string, name?: string) {
    await api.post("/affiliate/invites", { email, name });
    mutateStats();
    mutateInvites();
  }

  async function resendInvite(id: string) {
    await api.post(`/affiliate/invites/${id}/resend`, {});
  }

  async function deleteInvite(id: string) {
    await api.delete(`/affiliate/invites/${id}`);
    mutateStats();
    mutateInvites();
  }

  return {
    stats: stats ?? null,
    invites: invites ?? [],
    isLoading: statsLoading || invitesLoading,
    error: statsError || invitesError,
    sendInvite,
    resendInvite,
    deleteInvite,
    refresh: () => { mutateStats(); mutateInvites(); },
  };
}
