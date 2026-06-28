import useSWR from "swr";
import { api } from "@/lib/api";
import type { AffiliateProduct } from "@/types";

export function useProducts() {
  const { data, error, isLoading, mutate } = useSWR(
    "affiliate-products",
    () => api.get<AffiliateProduct[]>("/affiliate/products"),
    { revalidateOnFocus: false }
  );

  return {
    products: data ?? [],
    isLoading,
    error,
    refresh: mutate,
  };
}
