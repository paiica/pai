export interface ResolvedPrice {
  currency_code: string;
  symbol: string;
  price: number;
  compare_at_price: number | null;
  is_converted: boolean;
}

// Shared formatting for anywhere a catalog card shows a resolved_price from
// the backend (certificates, tools) — appends the currency code only when
// it's actually been converted, so a USD-default price still reads as the
// plain "$249.00" students are used to.
export function formatResolvedPrice(resolved: ResolvedPrice | undefined, fallbackAmount: number): string {
  if (!resolved) return `$${fallbackAmount.toFixed(2)}`;
  const amount = `${resolved.symbol}${resolved.price.toFixed(2)}`;
  return resolved.is_converted ? `${amount} ${resolved.currency_code}` : amount;
}
