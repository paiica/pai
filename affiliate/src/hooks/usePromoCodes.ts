import useSWR from "swr";
import { api } from "@/lib/api";
import type { AffiliatePromoCode } from "@/types";

export function usePromoCodes() {
  const { data, error, isLoading, mutate } = useSWR(
    "affiliate-promo-codes",
    () => api.get<AffiliatePromoCode[]>("/affiliate/promo-codes"),
    { revalidateOnFocus: false }
  );

  return {
    promoCodes: data ?? [],
    isLoading,
    error,
    refresh: mutate,
  };
}
