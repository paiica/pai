import useSWR from "swr";
import { api } from "@/lib/api";
import type { DashboardStats, DashboardCharts } from "@/types";

async function fetchDashboard() {
  const [stats, charts] = await Promise.all([
    api.get<DashboardStats>("/affiliate/dashboard/stats"),
    api.get<DashboardCharts>("/affiliate/dashboard/charts"),
  ]);
  return { stats, charts };
}

export function useAffiliateDashboard() {
  const { data, error, isLoading, mutate } = useSWR("affiliate-dashboard", fetchDashboard, {
    refreshInterval: 60_000,
  });

  return {
    stats: data?.stats ?? null,
    charts: data?.charts ?? null,
    isLoading,
    error,
    refresh: mutate,
  };
}
