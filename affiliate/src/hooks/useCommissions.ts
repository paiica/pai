import useSWR from "swr";
import { api } from "@/lib/api";
import type { Commission, CommissionSummary, PaginatedResponse } from "@/types";

interface CommissionsParams {
  page?: number;
  limit?: number;
  status?: string;
}

function buildKey(params: CommissionsParams) {
  return ["affiliate-commissions", params.page, params.limit, params.status].join("|");
}

export function useCommissions(params: CommissionsParams = {}) {
  const { page = 1, limit = 20, status } = params;

  const { data, error, isLoading, mutate } = useSWR(
    buildKey(params),
    () => {
      const qs = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(status ? { status } : {}),
      });
      return api.get<PaginatedResponse<Commission>>(`/affiliate/commissions?${qs}`);
    },
    { revalidateOnFocus: false }
  );

  const { data: summary } = useSWR(
    "affiliate-commission-summary",
    () => api.get<CommissionSummary>("/affiliate/commissions/summary"),
    { revalidateOnFocus: false }
  );

  return {
    commissions: data?.data ?? [],
    total: data?.total ?? 0,
    totalPages: data?.totalPages ?? 1,
    summary: summary ?? null,
    isLoading,
    error,
    refresh: mutate,
  };
}
