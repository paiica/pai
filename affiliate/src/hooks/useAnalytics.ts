import useSWR from "swr";
import { api } from "@/lib/api";
import type { AnalyticsData } from "@/types";

export function useAnalytics(range: "7d" | "30d" | "90d" = "30d") {
  const { data, error, isLoading, mutate } = useSWR(
    ["affiliate-analytics", range],
    () => api.get<AnalyticsData>(`/affiliate/analytics?range=${range}`),
    { revalidateOnFocus: false }
  );

  return {
    analytics: data ?? null,
    isLoading,
    error,
    refresh: mutate,
  };
}
