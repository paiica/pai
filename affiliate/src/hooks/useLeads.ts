import useSWR from "swr";
import { api } from "@/lib/api";
import type { Lead, PaginatedResponse } from "@/types";

interface LeadsParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

function buildKey(params: LeadsParams) {
  return ["affiliate-leads", params.page, params.limit, params.status, params.search].join("|");
}

export function useLeads(params: LeadsParams = {}) {
  const { page = 1, limit = 20, status, search } = params;

  const { data, error, isLoading, mutate } = useSWR(
    buildKey(params),
    () => {
      const qs = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(status ? { status } : {}),
        ...(search ? { search } : {}),
      });
      return api.get<PaginatedResponse<Lead>>(`/affiliate/leads?${qs}`);
    },
    { revalidateOnFocus: false }
  );

  return {
    leads: data?.data ?? [],
    total: data?.total ?? 0,
    totalPages: data?.totalPages ?? 1,
    isLoading,
    error,
    refresh: mutate,
  };
}
