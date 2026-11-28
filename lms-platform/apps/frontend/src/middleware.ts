import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Canada -> CAD, everywhere else stays on the platform's default (USD) —
// same deliberately small mapping as the marketing site's middleware.
const COUNTRY_CURRENCY: Record<string, string> = { CA: "CAD" };

export default function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Only fires on a visitor's first request with no currency cookie at all —
  // never overrides a choice they already made via the TopBar switcher.
  if (!request.cookies.get("paii_currency")) {
    // Vercel's edge network sets this on every request when deployed there —
    // no geo-IP API call. Empty/undefined locally and on any non-Vercel host.
    const country = request.headers.get("x-vercel-ip-country");
    const currency = country ? COUNTRY_CURRENCY[country] : undefined;
    if (currency) {
      response.cookies.set("paii_currency", currency, { path: "/", maxAge: 31536000 });
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
