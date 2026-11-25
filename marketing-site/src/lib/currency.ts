import { cookies } from "next/headers";

// The one place every server component reads the visitor's currency choice
// from — set by TopBar's switcher (a plain, non-httpOnly cookie so the
// client-side switcher can read it back too). Undefined here just means
// "let the backend fall back to its own default currency," never a crash.
export async function getCurrencyCookie(): Promise<string | undefined> {
  const store = await cookies();
  return store.get("paii_currency")?.value || undefined;
}

export interface ResolvedPrice {
  currency_code: string;
  symbol: string;
  price: number;
  compare_at_price: number | null;
  is_converted: boolean;
}
